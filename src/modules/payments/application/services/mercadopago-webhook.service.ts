import { Injectable } from '@nestjs/common';
import { ProcessMercadoPagoWebhookUseCase } from '../use-cases/process-mercadopago-webhook.usecase';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

export interface WebhookEventData {
  paymentId: string;
  action?: string;
  type?: string;
  rawPayload?: any;
  requestId?: string;
}

@Injectable()
export class MercadoPagoWebhookService {
  constructor(
    private readonly processWebhookUseCase: ProcessMercadoPagoWebhookUseCase,
    private readonly idempotencyService: WebhookIdempotencyService,
    private readonly logger: AppLoggerService,
  ) {}

  async handleEvent(data: WebhookEventData): Promise<{ ok: boolean }> {
    const { paymentId, rawPayload, requestId } = data;

    try {
      const idempotencyKey = `${data.type || 'unknown'}-${paymentId}`;
      const isDuplicate =
        await this.idempotencyService.isDuplicate(idempotencyKey);

      if (isDuplicate) {
        this.logger.logInfo(
          'WEBHOOK_DUPLICATE',
          `Duplicate webhook event ignored (idempotency)`,
          { paymentId, idempotencyKey },
        );
        return { ok: true };
      }

      this.logger.logInfo(
        'WEBHOOK_PROCESSING',
        `Processing webhook event for payment`,
        {
          paymentId,
          type: data.type,
          action: data.action,
          requestId,
        },
      );

      await this.processWebhookUseCase.execute(paymentId);

      await this.idempotencyService.markAsProcessed(
        idempotencyKey,
        rawPayload || {},
      );

      this.logger.logInfo(
        'WEBHOOK_PROCESSED',
        `Webhook event processed successfully`,
        { paymentId },
      );

      return { ok: true };
    } catch (error) {
      this.logger.logError(
        'WEBHOOK_PROCESSING_ERROR',
        `Error processing webhook event`,
        error as Error,
        { paymentId, requestId },
      );
      return { ok: true };
    }
  }
}
