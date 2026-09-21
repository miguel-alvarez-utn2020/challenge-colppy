export const IDEMPOTENCY_HEADER = 'idempotency-key';

export const IDEMPOTENCY_TTL_SEGUNDOS = 60 * 10;

export const idempotencyRedisKey = (key: string) => `idempotency:importar:${key}`;

export const IDEMPOTENCY_ESTADO_PROCESANDO = 'procesando';
export const IDEMPOTENCY_ESTADO_LISTO = 'listo';
