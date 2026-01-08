import { PaymentEntity } from '../../domain/payment.entity';
import {
  CreatePreferenceResult,
  PaymentGateway,
} from '../../application/ports/payment-gateway';

export class FakePaymentGateway implements PaymentGateway {
  createPreference(payment: PaymentEntity): Promise<CreatePreferenceResult> {
    const extRef = payment.mpExternalReference || payment.id;
    return Promise.resolve({
      preferenceId: `pref_${extRef}`,
      initPoint: `https://fake-mp/init-point/${extRef}`,
      sandboxInitPoint: `https://fake-mp/sandbox/${extRef}`,
    });
  }

  getPaymentById(
    paymentId: string,
  ): Promise<{ status: string; externalReference: string }> {
    if (paymentId === 'mp-approved') {
      return Promise.resolve({
        status: 'approved',
        externalReference: 'ext-ref-approved',
      });
    }
    if (paymentId === 'mp-rejected') {
      return Promise.resolve({
        status: 'rejected',
        externalReference: 'ext-ref-rejected',
      });
    }
    return Promise.resolve({
      status: 'pending',
      externalReference: 'ext-ref-pending',
    });
  }
}
