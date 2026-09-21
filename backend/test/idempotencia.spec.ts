import { BadRequestException, ConflictException, ExecutionContext } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { IdempotencyGuard, RequestConIdempotencyKey } from '../src/common/guards/idempotency.guard';
import { IdempotencyInterceptor } from '../src/common/interceptors/idempotency.interceptor';
import {
  IDEMPOTENCY_ESTADO_LISTO,
  IDEMPOTENCY_ESTADO_PROCESANDO,
  IDEMPOTENCY_TTL_SEGUNDOS,
  idempotencyRedisKey,
} from '../src/common/constants/idempotency.constants';

// Contra el Redis del docker-compose, pero en la base 1: la app usa la 0, así
// que un flush de los tests nunca toca sus claves. Redis real y no un mock
// porque lo que se prueba es la atomicidad de SET NX, que es justamente lo que
// un mock daría por supuesto.
const REDIS_URL_TEST = (process.env.REDIS_URL ?? 'redis://localhost:6379').replace(/\/?\d*$/, '/1');

// El guard lee el header y deja la key en el request; el interceptor la lee de
// ahí. Este doble reproduce esa parte del contrato de Express.
function contextoConHeader(header?: string) {
  const request: Partial<RequestConIdempotencyKey> = {
    header: ((nombre: string) => (nombre === 'idempotency-key' ? header : undefined)) as never,
  };
  return {
    contexto: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext,
    request,
  };
}

describe('Idempotencia por lote (Redis)', () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis(REDIS_URL_TEST);
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  describe('IdempotencyGuard', () => {
    it('rechaza la request cuando falta el header', async () => {
      const guard = new IdempotencyGuard(redis);
      const { contexto } = contextoConHeader(undefined);

      await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deja pasar una key nueva y la marca como en curso', async () => {
      const guard = new IdempotencyGuard(redis);
      const { contexto, request } = contextoConHeader('importacion-1-lote-1');

      await expect(guard.canActivate(contexto)).resolves.toBe(true);

      expect(request.idempotencyKey).toBe('importacion-1-lote-1');
      expect(await redis.get(idempotencyRedisKey('importacion-1-lote-1'))).toBe(
        IDEMPOTENCY_ESTADO_PROCESANDO,
      );
    });

    it('rebota con 409 la segunda request que llega con la misma key', async () => {
      const guard = new IdempotencyGuard(redis);

      await guard.canActivate(contextoConHeader('repetida').contexto);

      await expect(
        guard.canActivate(contextoConHeader('repetida').contexto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    // El SET NX es atómico: de N requests en paralelo con la misma key, entra
    // exactamente una. Es la garantía que sostiene toda la capa por lote.
    it('con 10 requests en paralelo y la misma key, solo una pasa', async () => {
      const guard = new IdempotencyGuard(redis);

      const intentos = Array.from({ length: 10 }, () =>
        guard.canActivate(contextoConHeader('carrera').contexto).then(
          () => 'paso',
          () => 'rebotado',
        ),
      );
      const resultados = await Promise.all(intentos);

      expect(resultados.filter((r) => r === 'paso')).toHaveLength(1);
      expect(resultados.filter((r) => r === 'rebotado')).toHaveLength(9);
    });

    it('la key queda con vencimiento, para no bloquear para siempre', async () => {
      const guard = new IdempotencyGuard(redis);

      await guard.canActivate(contextoConHeader('con-ttl').contexto);

      const ttl = await redis.ttl(idempotencyRedisKey('con-ttl'));
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(IDEMPOTENCY_TTL_SEGUNDOS);
    });
  });

  describe('IdempotencyInterceptor', () => {
    const contextoConKey = (key: string) =>
      ({
        switchToHttp: () => ({ getRequest: () => ({ idempotencyKey: key }) }),
      }) as ExecutionContext;

    // Redis aplica el set del tap fuera de la promesa del observable (es un
    // `void`), así que hay que darle un tick antes de leer.
    const esperarEscritura = () => new Promise((r) => setTimeout(r, 50));

    it('marca la key como lista cuando el lote termina bien', async () => {
      const interceptor = new IdempotencyInterceptor(redis);

      await lastValueFrom(
        interceptor.intercept(contextoConKey('ok'), { handle: () => of({ insertadas: 2 }) }),
      );
      await esperarEscritura();

      expect(await redis.get(idempotencyRedisKey('ok'))).toBe(IDEMPOTENCY_ESTADO_LISTO);
    });

    // Sin este borrado, un error transitorio dejaría la key tomada los 10
    // minutos del TTL y el reintento legítimo del usuario rebotaría con 409.
    it('borra la key cuando el lote falla, para que el reintento pueda usarla', async () => {
      const interceptor = new IdempotencyInterceptor(redis);
      await redis.set(idempotencyRedisKey('falla'), IDEMPOTENCY_ESTADO_PROCESANDO);

      await expect(
        lastValueFrom(
          interceptor.intercept(contextoConKey('falla'), {
            handle: () => throwError(() => new Error('se cayó la base')),
          }),
        ),
      ).rejects.toThrow('se cayó la base');
      await esperarEscritura();

      expect(await redis.get(idempotencyRedisKey('falla'))).toBeNull();
    });

    it('después de un fallo, la misma key vuelve a pasar el guard', async () => {
      const guard = new IdempotencyGuard(redis);
      const interceptor = new IdempotencyInterceptor(redis);

      await guard.canActivate(contextoConHeader('reintento').contexto);
      await expect(
        lastValueFrom(
          interceptor.intercept(contextoConKey('reintento'), {
            handle: () => throwError(() => new Error('timeout')),
          }),
        ),
      ).rejects.toThrow();
      await esperarEscritura();

      await expect(
        guard.canActivate(contextoConHeader('reintento').contexto),
      ).resolves.toBe(true);
    });
  });
});
