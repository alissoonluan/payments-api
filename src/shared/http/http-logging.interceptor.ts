import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AppLoggerService } from '../logger/app-logger.service';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class HttpLoggingInterceptor implements OnModuleInit {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: AppLoggerService,
  ) {}

  onModuleInit() {
    const axios = this.httpService.axiosRef;

    axios.interceptors.request.use((config) => {
      const start = Date.now();
      (config as any).metadata = { start };

      const correlationId = RequestContextService.getCorrelationId();
      if (correlationId) {
        config.headers['x-correlation-id'] = correlationId;
      }

      this.logger.logInfo(
        'HTTP_OUTBOUND_START',
        `Outbound Request: ${config.method?.toUpperCase()} ${config.url}`,
        {
          url: config.url,
          method: config.method,
          headers: {
            ...config.headers,
            Authorization: config.headers['Authorization']
              ? 'Bearer ***MASKED***'
              : undefined,
          },
        },
      );

      return config;
    });

    axios.interceptors.response.use(
      (response) => {
        const { config } = response;
        const start = (config as any).metadata?.start;
        const durationMs = start ? Date.now() - start : 0;

        const mpRequestId = response.headers['x-request-id'];
        const paymentId = response.data?.id;

        this.logger.logInfo(
          'HTTP_OUTBOUND_END',
          `Outbound Response: ${response.status}`,
          {
            url: config.url,
            method: config.method,
            statusCode: response.status,
            durationMs,
            provider: config.url?.includes('mercadopago')
              ? 'mercadopago'
              : undefined,
            mpRequestId,
            paymentId,
          },
        );

        return response;
      },
      (error) => {
        const config = error.config;
        const start = config?.metadata?.start;
        const durationMs = start ? Date.now() - start : 0;

        this.logger.logError(
          'HTTP_OUTBOUND_ERROR',
          `Outbound Failed: ${error.message}`,
          error,
          {
            url: config?.url,
            method: config?.method,
            statusCode: error.response?.status,
            durationMs,
          },
        );

        return Promise.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      },
    );
  }
}
