import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { ListPaymentsQueryDto } from '../dtos/list-payments-query.dto';
import { PaymentsRepository } from '../ports/payments.repository';
import { ListPaymentsUseCase } from './list-payments.usecase';

describe('ListPaymentsUseCase', () => {
  let useCase: ListPaymentsUseCase;
  let repository: jest.Mocked<PaymentsRepository>;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;

    useCase = new ListPaymentsUseCase(repository);
  });

  const mockPayment = new PaymentEntity({
    id: '1',
    amount: 100,
    description: 'Test payment',
    payerCpf: '11144477735',
    paymentMethod: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('should list all payments when no filter is provided', async () => {
    const query: ListPaymentsQueryDto = {};
    repository.list.mockResolvedValue([mockPayment]);

    const result = await useCase.execute(query);

    expect(repository.list).toHaveBeenCalledWith({});
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(mockPayment.id);
  });

  it('should filter payments by CPF', async () => {
    const query: ListPaymentsQueryDto = { cpf: '11144477735' };
    repository.list.mockResolvedValue([mockPayment]);

    const result = await useCase.execute(query);

    expect(repository.list).toHaveBeenCalledWith({ cpf: '11144477735' });
    expect(result).toHaveLength(1);
    expect(result[0].payerCpf).toBe('11144477735');
  });

  it('should filter payments by payment method', async () => {
    const query: ListPaymentsQueryDto = {
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };
    repository.list.mockResolvedValue([]);

    const result = await useCase.execute(query);

    expect(repository.list).toHaveBeenCalledWith({
      paymentMethod: PaymentMethod.CREDIT_CARD,
    });
    expect(result).toHaveLength(0);
  });

  it('should return an empty list if no payments are found', async () => {
    repository.list.mockResolvedValue([]);

    const result = await useCase.execute({});

    expect(result).toEqual([]);
  });

  it('should filter payments by both cpf and paymentMethod', async () => {
    const query: ListPaymentsQueryDto = {
      cpf: '11144477735',
      paymentMethod: PaymentMethod.PIX,
    };
    repository.list.mockResolvedValue([mockPayment]);

    const result = await useCase.execute(query);

    expect(repository.list).toHaveBeenCalledWith({
      cpf: '11144477735',
      paymentMethod: PaymentMethod.PIX,
    });
    expect(result).toHaveLength(1);
    expect(result[0].payerCpf).toBe('11144477735');
    expect(result[0].paymentMethod).toBe(PaymentMethod.PIX);
  });
});
