import { PaymentEntity } from '../../domain/payment.entity';
import {
  CreatePreferenceResult,
  PaymentGateway,
} from '../../application/ports/payment-gateway';

export class FakePaymentGateway implements PaymentGateway {
  createPreference(_payment: PaymentEntity): Promise<CreatePreferenceResult> {
    return Promise.resolve({
      preferenceId: 'test_preference_id',
      initPoint: 'http://test.init.point',
      sandboxInitPoint: 'http://test.sandbox.init.point',
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
