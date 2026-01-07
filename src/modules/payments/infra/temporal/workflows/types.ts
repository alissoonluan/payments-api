import { PaymentStatus } from './payment.enums';

export interface PaymentWorkflowInput {
  paymentId: string;
  externalReference: string;
}

export interface MercadoPagoResultSignal {
  status: PaymentStatus;
  mpPaymentId?: string;
  externalReference?: string;
}

export const MERCADO_PAGO_RESULT_SIGNAL = 'paymentApproved';
