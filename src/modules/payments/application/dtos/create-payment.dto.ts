import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, IsNotEmpty } from 'class-validator';
import { PaymentMethod } from '../../domain/payment.enums';
import { IsCPF } from '@shared/validators/is-cpf.validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 100.5, description: 'Payment amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    example: 'Dinner at Beach',
    description: 'Payment description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '11144477735', description: 'Payer CPF (11 digits)' })
  @IsString()
  @IsCPF({ message: 'Invalid CPF' })
  payerCpf: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
