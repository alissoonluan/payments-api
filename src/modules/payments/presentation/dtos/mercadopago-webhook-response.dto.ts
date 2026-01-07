import { ApiProperty } from '@nestjs/swagger';

export class MercadoPagoWebhookResponseDto {
  @ApiProperty()
  ok: boolean;
}
