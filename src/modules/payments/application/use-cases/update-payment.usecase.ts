import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentStatus } from '../../domain/payment.enums';
import { UpdatePaymentDto } from '../dtos/update-payment.dto';
import { PaymentResponseDto } from '../dtos/payment-response.dto';
import { PaymentsRepository } from '../ports/payments.repository';

@Injectable()
export class UpdatePaymentUseCase {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async execute(
    id: string,
    dto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    if (!dto.amount && !dto.description && !dto.status) {
      throw new UnprocessableEntityException('No fields to update provided');
    }

    const existing = await this.paymentsRepository.findById(id);
    if (!existing) {
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

    // Since input DTO already validates that newStatus is PAID or FAIL,
    // we only need to ensure we are not trying to go back to PENDING (if DTO allowed it)
    // or if there are any other specific logic.
    // The requirement says "Não permitir status voltar para PENDING".
    // DTO validation handles IsIn([PAID, FAIL]), so newStatus won't be PENDING.
  }
}
