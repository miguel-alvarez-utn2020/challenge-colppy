import axios from 'axios';

export const httpClient = axios.create({
  baseURL: 'http://localhost:3000',
});

export class ErrorDeApi extends Error {
  readonly statusCode: number | null;
  readonly mensajes: string[];
  readonly extra: Record<string, unknown>;

  constructor(
    mensajes: string[],
    statusCode: number | null = null,
    extra: Record<string, unknown> = {},
  ) {
    super(mensajes.join(', '));
    this.name = 'ErrorDeApi';
    this.mensajes = mensajes;
    this.statusCode = statusCode;
    this.extra = extra;
  }

  get esDeValidacion(): boolean {
    return this.statusCode === 400;
  }
}

export function aErrorDeApi(error: unknown): ErrorDeApi {
  if (error instanceof ErrorDeApi) return error;

  if (axios.isAxiosError(error)) {
    const { errorMessage, statusCode, ...extra } = (error.response?.data ?? {}) as {
      errorMessage?: string | string[];
      statusCode?: number;
    } & Record<string, unknown>;

    if (errorMessage) {
      return new ErrorDeApi(
        Array.isArray(errorMessage) ? errorMessage : [errorMessage],
        statusCode ?? error.response?.status ?? null,
        extra,
      );
    }

    if (error.request) {
      return new ErrorDeApi([
        'No se pudo conectar con el servidor. ¿Está corriendo el backend?',
      ]);
    }
  }

  return new ErrorDeApi(['Ocurrió un error inesperado.']);
}

export function extraerMensajeError(error: unknown): string {
  return aErrorDeApi(error).message;
}
