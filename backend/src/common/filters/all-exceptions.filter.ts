import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  errorMessage: string | string[];
  [propiedadExtra: string]: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const { errorMessage, propiedadesExtra } = isHttpException
      ? this.extractBody(exception)
      : {
          errorMessage: 'Ocurrió un error interno. Intentá nuevamente más tarde.',
          propiedadesExtra: {},
        };

    this.logError(isHttpException, statusCode, request, exception);

    const errorResponse: ErrorResponse = {
      statusCode,
      errorMessage,
      ...propiedadesExtra,
    };
    response.status(statusCode).json(errorResponse);
  }

  private extractBody(exception: HttpException): {
    errorMessage: string | string[];
    propiedadesExtra: Record<string, unknown>;
  } {
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return { errorMessage: body, propiedadesExtra: {} };
    }

    if (typeof body === 'object' && body !== null) {
      const { message, ...propiedadesExtra } = body as Record<string, unknown>;
      return {
        errorMessage: (message as string | string[] | undefined) ?? exception.message,
        propiedadesExtra,
      };
    }

    return { errorMessage: exception.message, propiedadesExtra: {} };
  }

  private logError(
    isHttpException: boolean,
    statusCode: number,
    request: Request,
    exception: unknown,
  ) {
    const context = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      body: request.body,
      statusCode,
    };

    if (isHttpException) {
      this.logger.warn(JSON.stringify(context));
      return;
    }

    const detail = exception instanceof Error ? exception.stack : exception;
    this.logger.error(JSON.stringify({ ...context, detail }));
  }
}
