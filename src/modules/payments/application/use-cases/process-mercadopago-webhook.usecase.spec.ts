import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentsRepository } from '../ports/payments.repository';
import { ProcessMercadoPagoWebhookUseCase } from './process-mercadopago-webhook.usecase';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';
import { PaymentWorkflowPort } from '../ports/payment-workflow.port';

describe('ProcessMercadoPagoWebhookUseCase', () => {
  let useCase: ProcessMercadoPagoWebhookUseCase;
  let repository: jest.Mocked<PaymentsRepository>;
  let gateway: jest.Mocked<PaymentGateway>;
  let logger: jest.Mocked<AppLoggerService>;
  let paymentWorkflowPort: jest.Mocked<PaymentWorkflowPort>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    repository = {
      findByExternalReference: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;

    gateway = {
      getPaymentById: jest.fn(),
    } as unknown as jest.Mocked<PaymentGateway>;

    logger = {
      logInfo: jest.fn(),
      logWarn: jest.fn(),
      logError: jest.fn(),
    } as any;

    paymentWorkflowPort = {
      startCreditCardWorkflow: jest.fn().mockResolvedValue(undefined),
      signalPaymentResult: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'TEMPORAL_ENABLED') return true;
        return undefined;
      }),
    } as any;

    useCase = new ProcessMercadoPagoWebhookUseCase(
      repository,
      gateway,
      logger,
      paymentWorkflowPort,
      configService,
    );
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
    expect(repository.update).toHaveBeenCalledWith('1', {
      status: PaymentStatus.PAID,
      mpPaymentId: 'mp-123',
      failReason: undefined,
    });
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

    expect(repository.update).toHaveBeenCalledWith('1', {
      status: PaymentStatus.FAIL,
      mpPaymentId: 'mp-123',
      failReason: 'mp_status_rejected',
    });
    expect(result.status).toBe(PaymentStatus.FAIL);
    expect(result.updated).toBe(true);
  });

  it('should signal workflow for CREDIT_CARD payments', async () => {
    const ccPayment = new PaymentEntity({
      ...mockPayment,
      id: 'cc-1',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      mpExternalReference: 'ext-ref-cc',
    });

    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'ext-ref-cc',
      status: 'approved',
    });
    repository.findByExternalReference.mockResolvedValue(ccPayment);

    await useCase.execute('mp-999');

    expect(paymentWorkflowPort.signalPaymentResult).toHaveBeenCalledWith(
      'ext-ref-cc',
      PaymentStatus.PAID,
      'mp-999',
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if payment is not found', async () => {
    gateway.getPaymentById.mockResolvedValue({
      externalReference: 'unknown',
      status: 'approved',
    });
    repository.findByExternalReference.mockResolvedValue(null);

    await expect(useCase.execute('mp-123')).rejects.toThrow(NotFoundException);
  });
});
