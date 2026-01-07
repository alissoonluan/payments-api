import { PaymentMethod, PaymentStatus } from './payment.enums';

export class PaymentEntity {
  id: string;
  amount: number;
  description: string;
  payerCpf: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  mpExternalReference?: string;
  mpPreferenceId?: string;
  mpInitPoint?: string;
  mpSandboxInitPoint?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<PaymentEntity>) {
    Object.assign(this, partial);
  }
}
