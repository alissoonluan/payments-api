import { Test, TestingModule } from '@nestjs/testing';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';
import { ProcessMercadoPagoWebhookUseCase } from '../../application/use-cases/process-mercadopago-webhook.usecase';
import { MercadoPagoWebhookQueryDto } from '../dtos/mercadopago-webhook-query.dto';
import { MercadoPagoWebhookBodyDto } from '../dtos/mercadopago-webhook-body.dto';

describe('MercadoPagoWebhookController', () => {
  let controller: MercadoPagoWebhookController;
  let processWebhookUseCase: ProcessMercadoPagoWebhookUseCase;

  const mockProcessWebhookUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadoPagoWebhookController],
      providers: [
        {
          provide: ProcessMercadoPagoWebhookUseCase,
          useValue: mockProcessWebhookUseCase,
        },
      ],
    }).compile();

    controller = module.get<MercadoPagoWebhookController>(
      MercadoPagoWebhookController,
    );
    processWebhookUseCase = module.get<ProcessMercadoPagoWebhookUseCase>(
      ProcessMercadoPagoWebhookUseCase,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    it('should process webhook when type is payment and mpPaymentId is in query data.id', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
        'data.id': 'mp-payment-123',
      };
      const body: MercadoPagoWebhookBodyDto = {};

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'mp-payment-123',
      );
      expect(result).toEqual({ ok: true });
    });

    it('should process webhook when type is payment and mpPaymentId is in body.data.id', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
      };
      const body: MercadoPagoWebhookBodyDto = {
        data: { id: 'mp-payment-456' },
      };

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'mp-payment-456',
      );
      expect(result).toEqual({ ok: true });
    });

    it('should process webhook when type is payment and mpPaymentId is in body.id', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
      };
      const body: MercadoPagoWebhookBodyDto = {
        id: 'mp-payment-789',
      };

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'mp-payment-789',
      );
      expect(result).toEqual({ ok: true });
    });

    it('should prioritize query data.id over body.data.id', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
        'data.id': 'query-id',
      };
      const body: MercadoPagoWebhookBodyDto = {
        data: { id: 'body-data-id' },
        id: 'body-id',
      };

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith('query-id');
      expect(result).toEqual({ ok: true });
    });

    it('should prioritize body.data.id over body.id', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
      };
      const body: MercadoPagoWebhookBodyDto = {
        data: { id: 'body-data-id' },
        id: 'body-id',
      };

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'body-data-id',
      );
      expect(result).toEqual({ ok: true });
    });

    it('should use type from body when not in query', async () => {
      const query: MercadoPagoWebhookQueryDto = {};
      const body: MercadoPagoWebhookBodyDto = {
        type: 'payment',
        data: { id: 'mp-payment-999' },
      };

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'mp-payment-999',
      );
      expect(result).toEqual({ ok: true });
    });

    it('should NOT process webhook when type is not payment', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'merchant_order',
        'data.id': 'mp-order-123',
      };
      const body: MercadoPagoWebhookBodyDto = {};

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should NOT process webhook when mpPaymentId is missing', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
      };
      const body: MercadoPagoWebhookBodyDto = {};

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should NOT process webhook when type is undefined', async () => {
      const query: MercadoPagoWebhookQueryDto = {};
      const body: MercadoPagoWebhookBodyDto = {
        data: { id: 'mp-payment-123' },
      };

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should return ok: true even when webhook is not processed', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'test',
      };
      const body: MercadoPagoWebhookBodyDto = {};

      const result = await controller.handleWebhook(query, body);

      expect(result).toEqual({ ok: true });
    });

    it('should handle webhook with topic field (ignored, only type matters)', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
        topic: 'payment',
        'data.id': 'mp-payment-topic',
      };
      const body: MercadoPagoWebhookBodyDto = {};

      const result = await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'mp-payment-topic',
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('extractMpPaymentId (private method behavior)', () => {
    it('should extract from query data.id first', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
        'data.id': 'from-query',
      };
      const body: MercadoPagoWebhookBodyDto = {
        data: { id: 'from-body-data' },
        id: 'from-body-id',
      };

      await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith('from-query');
    });

    it('should extract from body.data.id when query data.id is missing', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
      };
      const body: MercadoPagoWebhookBodyDto = {
        data: { id: 'from-body-data' },
        id: 'from-body-id',
      };

      await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'from-body-data',
      );
    });

    it('should extract from body.id when both query and body.data are missing', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
      };
      const body: MercadoPagoWebhookBodyDto = {
        id: 'from-body-id',
      };

      await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).toHaveBeenCalledWith(
        'from-body-id',
      );
    });

    it('should return undefined when no id is found anywhere', async () => {
      const query: MercadoPagoWebhookQueryDto = {
        type: 'payment',
      };
      const body: MercadoPagoWebhookBodyDto = {};

      await controller.handleWebhook(query, body);

      expect(processWebhookUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
