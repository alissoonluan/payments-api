import { Test, TestingModule } from '@nestjs/testing';
import { MercadoPagoReturnController } from './mercadopago-return.controller';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

describe('MercadoPagoReturnController', () => {
  let controller: MercadoPagoReturnController;
  let logger: AppLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadoPagoReturnController],
      providers: [
        {
          provide: AppLoggerService,
          useValue: {
            logInfo: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MercadoPagoReturnController>(
      MercadoPagoReturnController,
    );
    logger = module.get<AppLoggerService>(AppLoggerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleSuccess', () => {
    it('should return success message and log event', () => {
      const query = { payment_id: '123', status: 'approved' };
      const result = controller.handleSuccess(query);

      expect(logger.logInfo).toHaveBeenCalledWith(
        'MP_RETURN_SUCCESS',
        'User redirected to success page',
        { query },
      );
      expect(result).toEqual({
        title: 'Payment Successful',
        message: 'Your payment was processed successfully.',
        details: query,
      });
    });
  });

  describe('handleFailure', () => {
    it('should return failure message and log event', () => {
      const query = { payment_id: '123', status: 'rejected' };
      const result = controller.handleFailure(query);

      expect(logger.logInfo).toHaveBeenCalledWith(
        'MP_RETURN_FAILURE',
        'User redirected to failure page',
        { query },
      );
      expect(result).toEqual({
        title: 'Payment Failed',
        message: 'Your payment could not be processed.',
        details: query,
      });
    });
  });

  describe('handlePending', () => {
    it('should return pending message and log event', () => {
      const query = { payment_id: '123', status: 'pending' };
      const result = controller.handlePending(query);

      expect(logger.logInfo).toHaveBeenCalledWith(
        'MP_RETURN_PENDING',
        'User redirected to pending page',
        { query },
      );
      expect(result).toEqual({
        title: 'Payment Pending',
        message: 'Your payment is being processed.',
        details: query,
      });
    });
  });
});
