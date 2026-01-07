import { Injectable } from '@nestjs/common';
import { ListPaymentsQueryDto } from '../dtos/list-payments-query.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

@Injectable()
export class ListPaymentsUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(query: ListPaymentsQueryDto): Promise<PaymentResponseDto[]> {
    this.logger.logInfo('LIST_PAYMENTS_START', 'Listing payments', {
      filters: query,
    });

    const payments = await this.paymentsRepository.list({
      payerCpf: query.payerCpf,
      paymentMethod: query.paymentMethod,
    });

    this.logger.logInfo(
      'LIST_PAYMENTS_SUCCESS',
      'Payments listed successfully',
      {
        count: payments.length,
      },
    );

    return payments.map(PaymentResponseDto.fromEntity);
  }
}
