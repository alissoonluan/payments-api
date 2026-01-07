import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProcessMercadoPagoWebhookUseCase } from '../../application/use-cases/process-mercadopago-webhook.usecase';

import { MercadoPagoWebhookBodyDto } from '../../presentation/dtos/mercadopago-webhook-body.dto';
import { MercadoPagoWebhookQueryDto } from '../../presentation/dtos/mercadopago-webhook-query.dto';
import { MercadoPagoWebhookResponseDto } from '../../presentation/dtos/mercadopago-webhook-response.dto';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';
import { WebhookIdempotencyService } from '../../application/services/webhook-idempotency.service';

@ApiTags('Payments Webhooks')
@Controller('api/mercadopago')
export class MercadoPagoWebhookController {
  constructor(
    private readonly processWebhookUseCase: ProcessMercadoPagoWebhookUseCase,
    private readonly logger: AppLoggerService,
    private readonly idempotencyService: WebhookIdempotencyService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Mercado Pago webhook notifications',
    description:
      'Processes webhook notifications from Mercado Pago. Only processes "payment" type webhooks. ' +
      'Payment ID can be sent via query param "data.id" or in request body (data.id or id). ' +
      'Webhook is idempotent - duplicate notifications are safely ignored.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully (or safely ignored)',
    type: MercadoPagoWebhookResponseDto,
    schema: {
      example: {
        ok: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload',
    schema: {
      example: {
        message: 'Validation failed',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async handleWebhook(
    @Query() query: MercadoPagoWebhookQueryDto,
    @Body() body: MercadoPagoWebhookBodyDto,
  ): Promise<MercadoPagoWebhookResponseDto> {
    const type = query.type || body.type;
    const mpPaymentId = this.extractMpPaymentId(query, body);

    this.logger.logInfo('MP_WEBHOOK_RECEIVED', 'Webhook received', {
      type,
      mpPaymentId,
      action: body.action,
      live_mode: body.live_mode,
      source: 'mercadopago',
    });

    if (type === 'payment' && mpPaymentId) {
      const idempotencyKey = `mp_payment_${mpPaymentId}_${body.action || 'update'}`;

      if (this.idempotencyService.isDuplicate(idempotencyKey)) {
        this.logger.logInfo('MP_WEBHOOK_DUPLICATE', 'Duplicate event ignored', {
          idempotencyKey,
          duplicate_event_ignored: true,
        });
        return { ok: true };
      }

      await this.processWebhookUseCase.execute(mpPaymentId);

      this.idempotencyService.markAsProcessed(idempotencyKey);

      this.logger.logInfo(
        'MP_WEBHOOK_PROCESSED',
        'Webhook processed successfully',
        {
          mpPaymentId,
        },
      );
    }

    return { ok: true };
  }

  private extractMpPaymentId(
    query: MercadoPagoWebhookQueryDto,
    body: MercadoPagoWebhookBodyDto,
  ): string | undefined {
    if (query['data.id']) {
      return query['data.id'];
    }

    if (body.data?.id) {
      return body.data.id;
    }

    if (body.id) {
      return body.id;
    }

    return undefined;
  }
}
