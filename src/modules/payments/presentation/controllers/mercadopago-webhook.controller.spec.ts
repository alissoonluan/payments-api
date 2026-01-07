import { Test, TestingModule } from '@nestjs/testing';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';
import { MercadoPagoWebhookService } from '../../application/services/mercadopago-webhook.service';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

describe('MercadoPagoWebhookController', () => {
  let controller: MercadoPagoWebhookController;
  let webhookService: jest.Mocked<MercadoPagoWebhookService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadoPagoWebhookController],
      providers: [
        {
          provide: MercadoPagoWebhookService,
          useValue: {
            handleEvent: jest.fn().mockResolvedValue({ ok: true }),
          },
        },
        {
          provide: AppLoggerService,
          useValue: {
            logInfo: jest.fn(),
            logWarn: jest.fn(),
            logError: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MercadoPagoWebhookController>(
      MercadoPagoWebhookController,
    );
    webhookService = module.get(MercadoPagoWebhookService);
  });

  it('should call webhook service with extracted paymentId', async () => {
    const query = { 'data.id': '123', type: 'payment' };
    const body = {};

    const result = await controller.handleWebhook(query, body);

    expect(result).toEqual({ ok: true });
    expect(webhookService.handleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: '123',
        type: 'payment',
      }),
    );
  });

  it('should return 200 even if service fails (resilience)', async () => {
    webhookService.handleEvent.mockRejectedValue(new Error('Boom'));

    const result = await controller.handleWebhook({}, {});

    expect(result).toEqual({ ok: true });
  });

  it('should ignore merchant_order topic without calling service', async () => {
    const query = { topic: 'merchant_order' };
    const result = await controller.handleWebhook(query, {});

    expect(result).toEqual({ ok: true });
    expect(webhookService.handleEvent).not.toHaveBeenCalled();
  });
});
