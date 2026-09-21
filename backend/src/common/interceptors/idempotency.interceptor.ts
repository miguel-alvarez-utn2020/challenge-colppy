import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import {
  IDEMPOTENCY_ESTADO_LISTO,
  IDEMPOTENCY_TTL_SEGUNDOS,
  idempotencyRedisKey,
} from '../constants/idempotency.constants';
import { RequestConIdempotencyKey } from '../guards/idempotency.guard';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestConIdempotencyKey>();

    return next.handle().pipe(
      tap(() => {
        if (!request.idempotencyKey) {
          return;
        }

        void this.redis.set(
          idempotencyRedisKey(request.idempotencyKey),
          IDEMPOTENCY_ESTADO_LISTO,
          'EX',
          IDEMPOTENCY_TTL_SEGUNDOS,
        );
      }),
      catchError((error) => {
        if (request.idempotencyKey) {
          void this.redis.del(idempotencyRedisKey(request.idempotencyKey));
        }

        return throwError(() => error);
      }),
    );
  }
}
