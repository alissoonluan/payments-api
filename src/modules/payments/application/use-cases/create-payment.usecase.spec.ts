import { UnprocessableEntityException } from '@nestjs/common';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentsRepository } from '../ports/payments.repository';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentEntity } from '../../domain/payment.entity';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let repository: jest.Mocked<PaymentsRepository>;
  let gateway: jest.Mocked<PaymentGateway>;

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

    useCase = new CreatePaymentUseCase(repository, gateway);
  });


  it('should throw error for invalid CPF', async () => {
    await expect(
      useCase.execute({
        amount: 100,
        description: 'Test',
        payerCpf: '123',
        paymentMethod: PaymentMethod.PIX,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('should create a PIX payment without calling gateway', async () => {
    const dto = {
      amount: 100,
      description: 'Test PIX',
      payerCpf: '11144477735', // Valid CPF
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
    expect(gateway.createPreference).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalled();
  });

  it('should create a CREDIT_CARD payment and call gateway', async () => {
    const dto = {
      amount: 200,
      description: 'Test CC',
      payerCpf: '11144477735',
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };

    gateway.createPreference.mockResolvedValue({
      preferenceId: 'pref_123',
      initPoint: 'http://init.point',
      sandboxInitPoint: 'http://sandbox.init.point',
    });

    repository.create.mockResolvedValue(
      new PaymentEntity({
        ...dto,
        id: '2',
        status: PaymentStatus.PENDING,
        mpExternalReference: 'uuid-123',
        mpPreferenceId: 'pref_123',
        mpInitPoint: 'http://init.point',
        mpSandboxInitPoint: 'http://sandbox.init.point',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await useCase.execute(dto);

    expect(result.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
    expect(gateway.createPreference).toHaveBeenCalled();
    expect(result.mpPreferenceId).toBe('pref_123');
  });

  it('should throw exception when gateway fails', async () => {
    const dto = {
      amount: 200,
      description: 'Test Fail',
      payerCpf: '11144477735',
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };

    gateway.createPreference.mockRejectedValue(new Error('Gateway error'));

    await expect(useCase.execute(dto)).rejects.toThrow('Gateway error');
  });
});
