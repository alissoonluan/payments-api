import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentEntity } from '../../domain/payment.entity';

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  payerCpf: string;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiPropertyOptional()
  mpExternalReference?: string;

  @ApiPropertyOptional()
  mpPreferenceId?: string;

  @ApiPropertyOptional()
  mpInitPoint?: string;

  @ApiPropertyOptional()
  mpSandboxInitPoint?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
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
      mpInitPoint: entity.mpInitPoint,
      mpSandboxInitPoint: entity.mpSandboxInitPoint,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
