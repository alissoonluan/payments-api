import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../domain/payment.enums';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsNotEmpty,
  IsEnum,
  IsIn,
} from 'class-validator';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ example: 100.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Only PAID or FAIL allowed',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  @IsIn([PaymentStatus.PAID, PaymentStatus.FAIL], {
    message: 'Status can only be updated to PAID or FAIL',
  })
  status?: PaymentStatus;
}
