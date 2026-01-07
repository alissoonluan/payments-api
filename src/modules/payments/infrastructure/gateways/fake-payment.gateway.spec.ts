import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { FakePaymentGateway } from './fake-payment.gateway';

describe('FakePaymentGateway', () => {
  let gateway: FakePaymentGateway;

  beforeEach(() => {
    gateway = new FakePaymentGateway();
  });

  it('should create a preference with deterministic values', async () => {
    const payment = new PaymentEntity({
      amount: 100,
      description: 'Test',
      payerCpf: '12345678909',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
    });

    const result = await gateway.createPreference(payment);

    expect(result).toEqual({
      preferenceId: 'test_preference_id',
      initPoint: 'http://test.init.point',
      sandboxInitPoint: 'http://test.sandbox.init.point',
    });
  });

  it('should return approved status for mp-approved', async () => {
    const result = await gateway.getPaymentById('mp-approved');
    expect(result).toEqual({
      status: 'approved',
      externalReference: 'ext-ref-approved',
    });
  });

  it('should return rejected status for mp-rejected', async () => {
    const result = await gateway.getPaymentById('mp-rejected');
    expect(result).toEqual({
      status: 'rejected',
      externalReference: 'ext-ref-rejected',
    });
  });

  it('should return pending status for unknown ids', async () => {
    const result = await gateway.getPaymentById('unknown');
    expect(result).toEqual({
      status: 'pending',
      externalReference: 'ext-ref-pending',
    });
  });
});
