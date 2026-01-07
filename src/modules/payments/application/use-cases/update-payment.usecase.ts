import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentStatus } from '../../domain/payment.enums';
import { UpdatePaymentDto } from '../dtos/update-payment.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

@Injectable()
export class UpdatePaymentUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(
    id: string,
    dto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    if (!dto.amount && !dto.description && !dto.status) {
      throw new UnprocessableEntityException('No fields to update provided');
    }

    this.logger.logInfo('UPDATE_PAYMENT_START', 'Starting payment update', {
      paymentId: id,
      updates: dto,
    });

    const existing = await this.paymentsRepository.findById(id);
    if (!existing) {
      this.logger.logWarn('UPDATE_PAYMENT_NOT_FOUND', 'Payment not found', {
        paymentId: id,
      });
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (dto.status) {
      this.validateStatusTransition(existing.status);
    }

    const updated = await this.paymentsRepository.update(id, {
      amount: dto.amount,
      description: dto.description,
      status: dto.status,
    });

    this.logger.logInfo(
      'UPDATE_PAYMENT_SUCCESS',
      'Payment updated successfully',
      {
        paymentId: id,
        oldStatus: existing.status,
        newStatus: updated.status,
      },
    );

    return PaymentResponseDto.fromEntity(updated);
  }

  private validateStatusTransition(currentStatus: PaymentStatus): void {
    if (currentStatus === PaymentStatus.PAID) {
      throw new UnprocessableEntityException(
        'Cannot update status of a PAID payment',
      );
    }

    if (currentStatus === PaymentStatus.FAIL) {
      throw new UnprocessableEntityException(
        'Cannot update status of a FAIL payment',
      );
    }
  }
}
