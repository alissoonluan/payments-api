import { ApiPropertyOptional } from '@nestjs/swagger';

export class MercadoPagoWebhookQueryDto {
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
    name: 'data.id',
    description: 'Payment ID sent as query parameter',
    example: '12345678',
  })
  'data.id'?: string;
}
