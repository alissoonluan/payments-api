import { ApiPropertyOptional } from '@nestjs/swagger';

class WebhookDataDto {
  @ApiPropertyOptional()
  id?: string;
}

export class MercadoPagoWebhookBodyDto {
  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  topic?: string;

  @ApiPropertyOptional()
  data?: WebhookDataDto;

  @ApiPropertyOptional()
  id?: string;
}
