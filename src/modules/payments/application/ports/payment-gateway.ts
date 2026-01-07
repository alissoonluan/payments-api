import { PaymentEntity } from '../../domain/payment.entity';

export interface CreatePreferenceResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export abstract class PaymentGateway {
  abstract createPreference(
    payment: PaymentEntity,
  ): Promise<CreatePreferenceResult>;
  abstract getPaymentById(
    mpPaymentId: string,
  ): Promise<{ externalReference: string; status: string }>;
}
