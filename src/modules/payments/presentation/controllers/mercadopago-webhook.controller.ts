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

@ApiTags('Payments Webhooks')
@Controller('api/mercadopago')
export class MercadoPagoWebhookController {
  constructor(
    private readonly processWebhookUseCase: ProcessMercadoPagoWebhookUseCase,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Mercado Pago webhook notifications' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: MercadoPagoWebhookResponseDto,
  })
  async handleWebhook(
    @Query() query: MercadoPagoWebhookQueryDto,
    @Body() body: MercadoPagoWebhookBodyDto,
  ): Promise<MercadoPagoWebhookResponseDto> {
    const type = query.type || body.type;
    const mpPaymentId = this.extractMpPaymentId(query, body);

    if (type === 'payment' && mpPaymentId) {
      await this.processWebhookUseCase.execute(mpPaymentId);
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
