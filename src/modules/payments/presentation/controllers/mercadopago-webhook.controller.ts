import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MercadoPagoWebhookService } from '../../application/services/mercadopago-webhook.service';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

@ApiTags('Payments Webhooks')
@Controller('api/webhooks/mercadopago')
@UsePipes(
  new ValidationPipe({
    validateCustomDecorators: false,
    whitelist: false,
    forbidNonWhitelisted: false,
  }),
)
export class MercadoPagoWebhookController {
  constructor(
    private readonly webhookService: MercadoPagoWebhookService,
    private readonly logger: AppLoggerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Mercado Pago webhook notifications',
    description: 'Robust webhook handler. Always returns 200 to Mercado Pago.',
  })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async handleWebhook(
    @Query() query: any,
    @Body() body: any,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ ok: boolean }> {
    const startTime = Date.now();

    try {
      const paymentId = this.extractId(query, body);
      const type = query?.type || body?.type;
      const topic = query?.topic || body?.action || body?.type;

      this.logger.logInfo(
        'MP_WEBHOOK_RECEIVED',
        `[mercadopago-webhook] Received topic=${topic} type=${type} paymentId=${paymentId}`,
        {
          requestId,
          query,
          body,
        },
      );

      if (topic === 'merchant_order') {
        this.logger.logInfo(
          'MP_WEBHOOK_IGNORED',
          `[mercadopago-webhook] Ignoring merchant_order topic`,
          { paymentId },
        );
        return { ok: true };
      }

      if (!paymentId) {
        this.logger.logWarn(
          'MP_WEBHOOK_NO_ID',
          `[mercadopago-webhook] No paymentId found in request`,
          { query, body },
        );
        return { ok: true };
      }

      await this.webhookService.handleEvent({
        paymentId,
        action: topic,
        type,
        rawPayload: body,
        requestId,
      });

      const durationMs = Date.now() - startTime;
      this.logger.logInfo(
        'MP_WEBHOOK_SUCCESS',
        `[mercadopago-webhook] Processed successfully durationMs=${durationMs}`,
        { paymentId },
      );

      return { ok: true };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.logError(
        'MP_WEBHOOK_INTERNAL_ERROR',
        `[mercadopago-webhook] Internal error durationMs=${durationMs}`,
        error as Error,
        {
          body,
        },
      );

      return { ok: true };
    }
  }

  private extractId(query: any, body: any): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (
      query?.['data.id'] || body?.data?.id || query?.id || body?.id || undefined
    );
  }
}
