import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';

export interface ListPaymentsFilter {
  cpf?: string;
  paymentMethod?: PaymentMethod;
}

export abstract class PaymentsRepository {
  abstract create(payment: Partial<PaymentEntity>): Promise<PaymentEntity>;
  abstract update(
    id: string,
    payment: Partial<PaymentEntity>,
  ): Promise<PaymentEntity>;
  abstract findById(id: string): Promise<PaymentEntity | null>;
  abstract findByExternalReference(
    externalReference: string,
  ): Promise<PaymentEntity | null>;
  abstract list(filter: ListPaymentsFilter): Promise<PaymentEntity[]>;
  abstract updateStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<PaymentEntity>;
}
