import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentEntity } from '../../domain/payment.entity';

export class PaymentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 100.5, description: 'Payment amount in BRL' })
  amount: number;

  @ApiProperty({ example: 'Dinner at Beach Restaurant' })
  description: string;

  @ApiProperty({ example: '11144477735', description: 'Payer CPF (11 digits)' })
  payerCpf: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Mercado Pago external reference (UUID)',
  })
  mpExternalReference?: string;

  @ApiPropertyOptional({
    example: 'pref_123456789',
    description: 'Mercado Pago preference ID',
  })
  mpPreferenceId?: string;

  @ApiPropertyOptional({
    example:
      'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_123',
    description: 'Mercado Pago checkout URL (production)',
  })
  mpInitPoint?: string;

  @ApiPropertyOptional({
    example:
      'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_123',
    description: 'Mercado Pago checkout URL (sandbox)',
  })
  mpSandboxInitPoint?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Mercado Pago payment ID',
  })
  mpPaymentId?: string;

  @ApiPropertyOptional({
    example: 'mp_preference_creation_failed',
    description: 'Reason for payment failure (only when status is FAIL)',
  })
  failReason?: string;

  @ApiProperty({ example: '2024-01-06T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-06T12:30:00Z' })
  updatedAt: Date;

  static fromEntity(this: void, entity: PaymentEntity): PaymentResponseDto {
    return {
      id: entity.id,
      amount: entity.amount,
      description: entity.description,
      payerCpf: entity.payerCpf,
      paymentMethod: entity.paymentMethod,
      status: entity.status,
      mpExternalReference: entity.mpExternalReference,
      mpPreferenceId: entity.mpPreferenceId,
      mpPaymentId: entity.mpPaymentId,
      mpInitPoint: entity.mpInitPoint,
      mpSandboxInitPoint: entity.mpSandboxInitPoint,
      failReason: entity.failReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
