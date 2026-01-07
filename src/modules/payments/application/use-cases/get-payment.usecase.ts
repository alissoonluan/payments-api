import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';

@Injectable()
export class GetPaymentUseCase {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async execute(id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findById(id);

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return PaymentResponseDto.fromEntity(payment);
  }
}
