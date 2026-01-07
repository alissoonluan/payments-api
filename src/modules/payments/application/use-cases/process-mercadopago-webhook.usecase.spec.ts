/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentsRepository } from '../ports/payments.repository';
import { ProcessMercadoPagoWebhookUseCase } from './process-mercadopago-webhook.usecase';

describe('ProcessMercadoPagoWebhookUseCase', () => {
  let useCase: ProcessMercadoPagoWebhookUseCase;
  let repository: jest.Mocked<PaymentsRepository>;
  let gateway: jest.Mocked<PaymentGateway>;

  beforeEach(() => {
    repository = {
      findByExternalReference: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;

    gateway = {
      getPaymentById: jest.fn(),
    } as unknown as jest.Mocked<PaymentGateway>;

    useCase = new ProcessMercadoPagoWebhookUseCase(repository, gateway);
  });

  const mockPayment = new PaymentEntity({
    id: '1',
    amount: 100,
    description: 'Test',
    payerCpf: '12345678901',
    paymentMethod: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    mpExternalReference: 'ext-ref-123',
  });

  it('should update status to PAID when Mercado Pago status is approved', async () => {
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-123',
      status: 'approved',
    });
    repository.findByExternalReference.mockResolvedValue(mockPayment);

    const result = await useCase.execute('mp-123');

    expect(gateway.getPaymentById).toHaveBeenCalledWith('mp-123');
    expect(repository.findByExternalReference).toHaveBeenCalledWith(
      'ext-ref-123',
    );
    expect(repository.updateStatus).toHaveBeenCalledWith(
      '1',
      PaymentStatus.PAID,
    );
    expect(result).toEqual({
      ok: true,
      updated: true,
      status: PaymentStatus.PAID,
    });
  });

  it('should update status to FAIL when Mercado Pago status is rejected', async () => {
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-123',
      status: 'rejected',
    });
    repository.findByExternalReference.mockResolvedValue(mockPayment);

    const result = await useCase.execute('mp-123');

    expect(repository.updateStatus).toHaveBeenCalledWith(
      '1',
      PaymentStatus.FAIL,
    );
    expect(result.status).toBe(PaymentStatus.FAIL);
    expect(result.updated).toBe(true);
  });

  it('should update status to FAIL when Mercado Pago status is cancelled', async () => {
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-123',
      status: 'cancelled',
    });
    repository.findByExternalReference.mockResolvedValue(mockPayment);

    await useCase.execute('mp-123');

    expect(repository.updateStatus).toHaveBeenCalledWith(
      '1',
      PaymentStatus.FAIL,
    );
  });

  it('should not update and return updated: false if status is pending in MP', async () => {
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-123',
      status: 'in_process',
    });
    repository.findByExternalReference.mockResolvedValue(mockPayment);

    const result = await useCase.execute('mp-123');

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(result.updated).toBe(false);
    expect(result.status).toBe(PaymentStatus.PENDING);
  });

  it('should be idempotent and not update if payment is already PAID', async () => {
    const paidPayment = new PaymentEntity({
      ...mockPayment,
      status: PaymentStatus.PAID,
    });
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-123',
      status: 'approved',
    });
    repository.findByExternalReference.mockResolvedValue(paidPayment);

    const result = await useCase.execute('mp-123');

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(result.updated).toBe(false);
    expect(result.status).toBe(PaymentStatus.PAID);
  });

  it('should be idempotent and not update if payment is already FAIL', async () => {
    const failedPayment = new PaymentEntity({
      ...mockPayment,
      status: PaymentStatus.FAIL,
    });
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-123',
      status: 'rejected',
    });
    repository.findByExternalReference.mockResolvedValue(failedPayment);

    const result = await useCase.execute('mp-123');

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(result.updated).toBe(false);
    expect(result.status).toBe(PaymentStatus.FAIL);
  });

  it('should throw NotFoundException if payment is not found in repository', async () => {
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-unknown',
      status: 'approved',
    });
    repository.findByExternalReference.mockResolvedValue(null);

    await expect(useCase.execute('mp-123')).rejects.toThrow(NotFoundException);
  });

  it('should return updated: false if externalReference is missing in gateway response', async () => {
    gateway.getPaymentById.mockResolvedValue({
      externalReference: undefined as unknown as string,
      status: 'approved',
    });

    const result = await useCase.execute('mp-123');

    expect(result).toEqual({ ok: true, updated: false });
    expect(repository.findByExternalReference).not.toHaveBeenCalled();
  });
});
