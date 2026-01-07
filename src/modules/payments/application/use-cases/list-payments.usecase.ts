import { Injectable } from '@nestjs/common';
import { ListPaymentsQueryDto } from '../dtos/list-payments-query.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';

@Injectable()
export class ListPaymentsUseCase {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async execute(query: ListPaymentsQueryDto): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentsRepository.list({
      cpf: query.cpf,
      paymentMethod: query.paymentMethod,
    });

    return payments.map(PaymentResponseDto.fromEntity);
  }
}
