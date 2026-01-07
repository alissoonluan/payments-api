import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from '../context/request-context.service';
import { LogSanitizer } from './log-sanitizer';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logLevel: string;
  private readonly nodeEnv: string;

  constructor(private readonly configService: ConfigService) {
    this.logLevel = this.configService.get('LOG_LEVEL') || 'info';
    this.nodeEnv = this.configService.get('NODE_ENV') || 'development';
  }

  logInfo(code: string, message: string, meta?: Record<string, any>) {
    this.print('info', code, message, meta);
  }

  logWarn(code: string, message: string, meta?: Record<string, any>) {
    this.print('warn', code, message, meta);
  }

  logError(
    code: string,
    message: string,
    error?: unknown,
    meta?: Record<string, any>,
  ) {
    const errorMeta =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          }
        : { rawError: error };

    this.print('error', code, message, { ...meta, error: errorMeta });
  }

  log(message: any, ...optionalParams: any[]) {
    this.logInfo('NEST_LOG', String(message), { params: optionalParams });
  }

  error(message: any, ...optionalParams: any[]) {
    this.logError('NEST_ERROR', String(message), undefined, {
      params: optionalParams,
    });
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logWarn('NEST_WARN', String(message), { params: optionalParams });
  }

  debug(message: any, ...optionalParams: any[]) {
    if (this.logLevel === 'debug') {
      this.logInfo('NEST_DEBUG', String(message), { params: optionalParams });
    }
  }

  verbose(message: any, ...optionalParams: any[]) {
    if (this.logLevel === 'debug') {
      this.logInfo('NEST_VERBOSE', String(message), { params: optionalParams });
    }
  }

  private print(
    level: 'info' | 'warn' | 'error',
    code: string,
    message: string,
    meta?: Record<string, any>,
  ) {
    const context = RequestContextService.getContext();
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      level,
      code,
      message,
      serviceInfo: {
        name: 'payments-api',
        version: process.env.npm_package_version || '0.0.1',
        env: this.nodeEnv,
      },
      tracing: {
        correlationId: context?.correlationId,
        requestId: context?.requestId,
      },
      context: {
        route: context?.url,
        method: context?.method,
      },
      ...LogSanitizer.sanitize(meta),
    };

    const runLog = (data: string) => {
      if (level === 'error') console.error(data);
      else console.log(data);
    };

    runLog(JSON.stringify(logEntry));
  }
}
