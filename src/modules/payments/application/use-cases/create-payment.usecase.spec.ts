import { UnprocessableEntityException } from '@nestjs/common';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentsRepository } from '../ports/payments.repository';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentEntity } from '../../domain/payment.entity';
import { validateCPF } from '@shared/validators/is-cpf.validator';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';
import { PaymentWorkflowPort } from '../ports/payment-workflow.port';

jest.mock('@shared/validators/is-cpf.validator');

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let repository: jest.Mocked<PaymentsRepository>;
  let gateway: jest.Mocked<PaymentGateway>;
  let logger: jest.Mocked<AppLoggerService>;
  let paymentWorkflowPort: jest.Mocked<PaymentWorkflowPort>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;

    gateway = {
      createPreference: jest.fn(),
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

    useCase = new CreatePaymentUseCase(
      repository,
      gateway,
      logger,
      paymentWorkflowPort,
    );
  });

  it('should throw error for invalid CPF', async () => {
    (validateCPF as jest.Mock).mockReturnValue(false);

    await expect(
      useCase.execute({
        amount: 100,
        description: 'Test',
        payerCpf: '123',
        paymentMethod: PaymentMethod.PIX,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('should create a PIX payment without calling workflow', async () => {
    (validateCPF as jest.Mock).mockReturnValue(true);

    const dto = {
      amount: 100,
      description: 'Test PIX',
      payerCpf: '11144477735',
      paymentMethod: PaymentMethod.PIX,
    };

    repository.create.mockResolvedValue(
      new PaymentEntity({
        ...dto,
        id: '1',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await useCase.execute(dto);

    expect(result.paymentMethod).toBe(PaymentMethod.PIX);
    expect(paymentWorkflowPort.startCreditCardWorkflow).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalled();
  });

  it('should create a CREDIT_CARD payment and start Temporal workflow', async () => {
    (validateCPF as jest.Mock).mockReturnValue(true);

    const dto = {
      amount: 200,
      description: 'Test CC',
      payerCpf: '11144477735',
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };

    const payment = new PaymentEntity({
      ...dto,
      id: 'payment-123',
      status: PaymentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updatedPayment = new PaymentEntity({
      ...payment,
      mpExternalReference: 'payment-123',
      mpPreferenceId: 'pref_123',
      mpInitPoint: 'http://init.point',
    });

    repository.create.mockResolvedValue(payment);
    repository.update.mockResolvedValue(updatedPayment);
    repository.findById.mockResolvedValue(updatedPayment);

    const result = await useCase.execute(dto);

    expect(result.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
    expect(repository.update).toHaveBeenCalledWith('payment-123', {
      mpExternalReference: 'payment-123',
    });
    expect(paymentWorkflowPort.startCreditCardWorkflow).toHaveBeenCalledWith(
      'payment-123',
      'payment-123',
    );
    expect(result.mpInitPoint).toBe('http://init.point');
  });
});
