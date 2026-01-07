import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../domain/payment.enums';
import { IsCPF } from '@shared/validators/is-cpf.validator';

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  @IsCPF({ message: 'Invalid CPF' })
  cpf?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
