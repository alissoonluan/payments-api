import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.usecase';
import { UpdatePaymentUseCase } from '../../application/use-cases/update-payment.usecase';
import { GetPaymentUseCase } from '../../application/use-cases/get-payment.usecase';
import { ListPaymentsUseCase } from '../../application/use-cases/list-payments.usecase';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { ListPaymentsQueryDto } from '../../application/dtos/list-payments-query.dto';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let createUseCase: CreatePaymentUseCase;
  let updateUseCase: UpdatePaymentUseCase;
  let getUseCase: GetPaymentUseCase;
  let listUseCase: ListPaymentsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: CreatePaymentUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdatePaymentUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPaymentUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListPaymentsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    createUseCase = module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
    updateUseCase = module.get<UpdatePaymentUseCase>(UpdatePaymentUseCase);
    getUseCase = module.get<GetPaymentUseCase>(GetPaymentUseCase);
    listUseCase = module.get<ListPaymentsUseCase>(ListPaymentsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call createPaymentUseCase', async () => {
      const dto = {
        amount: 100,
        description: 'Test',
        payerCpf: '11144477735',
        paymentMethod: PaymentMethod.PIX,
      };
      await controller.create(dto);
      expect(createUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should call updatePaymentUseCase', async () => {
      const id = 'any-id';
      const dto = { status: PaymentStatus.PAID };
      await controller.update(id, dto);
      expect(updateUseCase.execute).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('getById', () => {
    it('should call getPaymentUseCase', async () => {
      const id = 'any-id';
      await controller.getById(id);
      expect(getUseCase.execute).toHaveBeenCalledWith(id);
    });
  });

  describe('list', () => {
    it('should call listPaymentsUseCase', async () => {
      const query: ListPaymentsQueryDto = { payerCpf: '11144477735' };
      await controller.list(query);
      expect(listUseCase.execute).toHaveBeenCalledWith(query);
    });
  });
});
