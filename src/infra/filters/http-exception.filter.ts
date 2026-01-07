import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status >= 400 && status < 500) {
      this.logger.warn(`HTTP ${status} - ${request.method} ${request.url}`, {
        message,
        body: request.body,
        query: request.query,
      });
    } else if (status >= 500) {
      this.logger.error(
        `HTTP ${status} - ${request.method} ${request.url}`,
        exception,
      );
    }

    const isObjectMessage =
      typeof message === 'object' &&
      message !== null &&
      !Array.isArray(message);

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: isObjectMessage
        ? (message as Record<string, unknown>).message || message
        : message,
      error: isObjectMessage
        ? (message as Record<string, unknown>).error || null
        : null,
    };

    response.status(status).json(errorResponse);
  }
}
