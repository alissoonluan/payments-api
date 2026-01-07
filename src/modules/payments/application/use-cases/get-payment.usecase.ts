import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

@Injectable()
export class GetPaymentUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(id: string): Promise<PaymentResponseDto> {
    this.logger.logInfo('GET_PAYMENT_START', 'Fetching payment details', {
      paymentId: id,
    });

    const payment = await this.paymentsRepository.findById(id);

    if (!payment) {
      this.logger.logWarn('GET_PAYMENT_NOT_FOUND', 'Payment not found', {
        paymentId: id,
      });
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return PaymentResponseDto.fromEntity(payment);
  }
}
