import { ApiPropertyOptional } from '@nestjs/swagger';

class WebhookDataDto {
  @ApiPropertyOptional({
    description: 'Payment ID within data object',
    example: '12345678',
  })
  id?: string;
}

export class MercadoPagoWebhookBodyDto {
  @ApiPropertyOptional({
    description: 'Type of webhook notification',
    example: 'payment',
    enum: ['payment', 'merchant_order', 'plan', 'subscription'],
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'Topic of the notification (legacy)',
    example: 'payment',
  })
  topic?: string;

  @ApiPropertyOptional({
    description: 'Data object containing payment information',
    type: WebhookDataDto,
  })
  data?: WebhookDataDto;

  @ApiPropertyOptional({
    description: 'Payment ID at root level (alternative format)',
    example: '12345678',
  })
  id?: string;

  @ApiPropertyOptional({
    description: 'Action performed',
    example: 'payment.created',
  })
  action?: string;

  @ApiPropertyOptional({
    description: 'Whether the event is from live or sandbox environment',
    example: true,
  })
  live_mode?: boolean;
}
