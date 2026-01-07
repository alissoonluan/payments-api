import { ApiPropertyOptional } from '@nestjs/swagger';

export class MercadoPagoWebhookQueryDto {
  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  topic?: string;

  @ApiPropertyOptional({ name: 'data.id' })
  'data.id'?: string;
}
