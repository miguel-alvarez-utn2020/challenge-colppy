import {
  BadRequestException,
  CanActivate,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import {
  IDEMPOTENCY_ESTADO_PROCESANDO,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_TTL_SEGUNDOS,
  idempotencyRedisKey,
} from '../constants/idempotency.constants';

export interface RequestConIdempotencyKey extends Request {
  idempotencyKey?: string;
}

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConIdempotencyKey>();
    const idempotencyKey = request.header(IDEMPOTENCY_HEADER);

    if (!idempotencyKey) {
      throw new BadRequestException(
        `Falta el header "${IDEMPOTENCY_HEADER}". Es obligatorio para esta operación: identifica el lote para evitar reprocesarlo si la request se reintenta.`,
      );
    }

    const seteoExitoso = await this.redis.set(
      idempotencyRedisKey(idempotencyKey),
      IDEMPOTENCY_ESTADO_PROCESANDO,
      'EX',
      IDEMPOTENCY_TTL_SEGUNDOS,
      'NX',
    );

    if (seteoExitoso === null) {
      throw new ConflictException(
        'Esta operación ya fue procesada (o está en curso) con esa Idempotency-Key. Si el resultado no es el esperado, generá una key nueva para reintentar.',
      );
    }

    request.idempotencyKey = idempotencyKey;
    return true;
  }
}
