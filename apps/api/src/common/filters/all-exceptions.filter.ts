import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@rater/db';
import type { ApiError, ApiErrorCode } from '@rater/types';
import type { Request, Response } from 'express';

const STATUS_CODE_MAP: Record<number, ApiErrorCode> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE',
};

function codeForStatus(status: number): ApiErrorCode {
  return STATUS_CODE_MAP[status] ?? (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST');
}

type ResolvedError = {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  /** Set for 5xx so the filter logs the underlying cause; never sent to the client. */
  cause?: unknown;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const resolved = this.resolve(exception);

    if (resolved.statusCode >= 500) {
      const cause = resolved.cause ?? exception;
      this.logger.error(
        `${req.method} ${req.url}`,
        cause instanceof Error ? cause.stack : String(cause),
      );
    }

    const body: ApiError = {
      statusCode: resolved.statusCode,
      code: resolved.code,
      message: resolved.message,
      ...(resolved.details !== undefined ? { details: resolved.details } : {}),
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    res.status(resolved.statusCode).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { statusCode, code: codeForStatus(statusCode), message: response };
      }

      const { message } = response as { message?: string | string[] };
      if (Array.isArray(message)) {
        return {
          statusCode,
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details: message,
        };
      }
      return {
        statusCode,
        code: codeForStatus(statusCode),
        message: typeof message === 'string' ? message : exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'Resource already exists',
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Resource not found',
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: 'Internal server error',
      cause: exception,
    };
  }
}
