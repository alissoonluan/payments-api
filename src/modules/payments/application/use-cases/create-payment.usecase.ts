import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { validateCPF } from '@shared/validators/is-cpf.validator';
import { PaymentEntity } from '../../domain/payment.entity';

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    if (!validateCPF(dto.payerCpf)) {
      throw new UnprocessableEntityException('Invalid CPF');
    }

    const paymentData: Partial<PaymentEntity> = {
      amount: dto.amount,
      description: dto.description,
      payerCpf: dto.payerCpf,
      paymentMethod: dto.paymentMethod,
      status: PaymentStatus.PENDING,
    };

    if (dto.paymentMethod === PaymentMethod.CREDIT_CARD) {
      paymentData.mpExternalReference = randomUUID();

      const gatewayResult = await this.paymentGateway.createPreference({
        ...paymentData,
      } as PaymentEntity);

      paymentData.mpPreferenceId = gatewayResult.preferenceId;
      paymentData.mpInitPoint = gatewayResult.initPoint;
      paymentData.mpSandboxInitPoint = gatewayResult.sandboxInitPoint;
    }

    const payment = await this.paymentsRepository.create(paymentData);

    return PaymentResponseDto.fromEntity(payment);
  }
}
