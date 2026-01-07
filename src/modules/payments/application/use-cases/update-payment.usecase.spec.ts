import { NotFoundException } from '@nestjs/common';
import { UpdatePaymentUseCase } from './update-payment.usecase';
import { PaymentsRepository } from '../ports/payments.repository';
import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';

describe('UpdatePaymentUseCase', () => {
  let useCase: UpdatePaymentUseCase;
  let repository: jest.Mocked<PaymentsRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;

    useCase = new UpdatePaymentUseCase(repository);
  });

  it('should throw NotFoundException if payment does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('none', { amount: 50 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw UnprocessableEntityException if no fields provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(
      'No fields to update provided',
    );
  });

  it('should update payment description and amount without status', async () => {
    const existing = new PaymentEntity({
      id: '1',
      amount: 100,
      description: 'Old',
      payerCpf: '12345678901',
      paymentMethod: PaymentMethod.PIX,
      status: PaymentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    repository.findById.mockResolvedValue(existing);
    repository.update.mockResolvedValue({
      ...existing,
      amount: 150,
      description: 'New',
    } as PaymentEntity);

    const result = await useCase.execute('1', {
      amount: 150,
      description: 'New',
    });

    expect(result.amount).toBe(150);
    expect(result.description).toBe('New');
    expect(repository.update).toHaveBeenCalledWith('1', {
      amount: 150,
      description: 'New',
      status: undefined,
    });
  });

  it('should update status from PENDING to PAID', async () => {
    const existing = new PaymentEntity({
      id: '1',
      amount: 100,
      description: 'Test',
      payerCpf: '12345678901',
      paymentMethod: PaymentMethod.PIX,
      status: PaymentStatus.PENDING,
    });

    repository.findById.mockResolvedValue(existing);
    repository.update.mockResolvedValue({
      ...existing,
      status: PaymentStatus.PAID,
    } as PaymentEntity);

    const result = await useCase.execute('1', {
      status: PaymentStatus.PAID,
    });

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(repository.update).toHaveBeenCalledWith('1', {
      amount: undefined,
      description: undefined,
      status: PaymentStatus.PAID,
    });
  });

  it('should throw UnprocessableEntityException when updating status of PAID payment', async () => {
    const paidPayment = new PaymentEntity({
      id: '1',
      amount: 100,
      description: 'Test',
      payerCpf: '12345678901',
      paymentMethod: PaymentMethod.PIX,
      status: PaymentStatus.PAID,
    });

    repository.findById.mockResolvedValue(paidPayment);

    await expect(
      useCase.execute('1', { status: PaymentStatus.FAIL }),
    ).rejects.toThrow('Cannot update status of a PAID payment');
  });

  it('should throw UnprocessableEntityException when updating status of FAIL payment', async () => {
    const failedPayment = new PaymentEntity({
      id: '1',
      amount: 100,
      description: 'Test',
      payerCpf: '12345678901',
      paymentMethod: PaymentMethod.PIX,
      status: PaymentStatus.FAIL,
    });

    repository.findById.mockResolvedValue(failedPayment);

    await expect(
      useCase.execute('1', { status: PaymentStatus.PAID }),
    ).rejects.toThrow('Cannot update status of a FAIL payment');
  });
});
