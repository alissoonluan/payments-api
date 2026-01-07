import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLoggerService } from '../logger/app-logger.service';

export const LOG_BODY_KEY = 'log_body';
export const LogBody = () => SetMetadata(LOG_BODY_KEY, true);

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();
    const res = httpContext.getResponse();

    this.logger.logInfo('HTTP_REQUEST_START', 'Incoming Request', {
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      body: this.shouldLogBody(context) ? req.body : undefined,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          const statusCode = res.statusCode;

          this.logger.logInfo('HTTP_REQUEST_END', 'Request Completed', {
            statusCode,
            durationMs,
          });
        },
        error: (error: Error) => {
          const durationMs = Date.now() - start;
          this.logger.logInfo(
            'HTTP_REQUEST_FAILED_TIMING',
            'Request Failed (Metric)',
            {
              durationMs,
              errorMessage: error.message,
            },
          );
        },
      }),
    );
  }

  private shouldLogBody(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const handlerValue = Reflect.getMetadata(LOG_BODY_KEY, handler);
    const classValue = Reflect.getMetadata(LOG_BODY_KEY, classRef);
    return !!(handlerValue || classValue);
  }
}
