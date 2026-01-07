import { NotFoundException } from '@nestjs/common';
import { GetPaymentUseCase } from './get-payment.usecase';
import { PaymentsRepository } from '../ports/payments.repository';
import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';

describe('GetPaymentUseCase', () => {
  let useCase: GetPaymentUseCase;
  let repository: jest.Mocked<PaymentsRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;

    useCase = new GetPaymentUseCase(repository);
  });

  it('should return payment when it exists', async () => {
    const payment = new PaymentEntity({
      id: '1',
      amount: 100,
      description: 'Test',
      payerCpf: '123',
      paymentMethod: PaymentMethod.PIX,
      status: PaymentStatus.PENDING,
    });

    repository.findById.mockResolvedValue(payment);

    const result = await useCase.execute('1');

    expect(result).toEqual(payment);

    expect(repository.findById).toHaveBeenCalledWith('1');
  });

  it('should throw NotFoundException when payment does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('999')).rejects.toThrow(NotFoundException);
  });
});
