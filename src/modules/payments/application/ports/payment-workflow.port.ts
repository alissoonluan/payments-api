import { PaymentStatus } from '../../domain/payment.enums';

export abstract class PaymentWorkflowPort {
  abstract startCreditCardWorkflow(
    paymentId: string,
    externalReference: string,
  ): Promise<void>;

  abstract signalPaymentResult(
    externalReference: string,
    status: PaymentStatus,
    mpPaymentId?: string,
  ): Promise<void>;
}
