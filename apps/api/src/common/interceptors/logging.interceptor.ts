import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          this.logger.log(`${method} ${url} ${res.statusCode} - ${Date.now() - start}ms`);
        },
        error: (err: unknown) => {
          const status =
            err && typeof err === 'object' && 'status' in err
              ? Number((err as { status?: unknown }).status) || 500
              : 500;
          this.logger.warn(`${method} ${url} ${status} - ${Date.now() - start}ms`);
        },
      }),
    );
  }
}
