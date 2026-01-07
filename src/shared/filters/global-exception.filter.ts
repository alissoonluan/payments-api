import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppLoggerService } from '../logger/app-logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: AppLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: httpStatus,
            message: 'Internal Server Error',
          };

    const responseBodyObj =
      typeof responseBody === 'object' && responseBody !== null
        ? (responseBody as Record<string, unknown>)
        : { message: responseBody };

    const message =
      (responseBodyObj.message as string) ||
      (exception as Error).message ||
      'Unknown Error';

    this.logger.logError(
      'HTTP_REQUEST_ERROR',
      `Request Failed: ${message}`,
      exception,
      {
        statusCode: httpStatus,
        path: httpAdapter.getRequestUrl(request),
      },
    );

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
