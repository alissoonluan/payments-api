import { MercadoPagoWebhookService } from './mercadopago-webhook.service';
import { ProcessMercadoPagoWebhookUseCase } from '../use-cases/process-mercadopago-webhook.usecase';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

describe('MercadoPagoWebhookService', () => {
  let service: MercadoPagoWebhookService;
  let processWebhookUseCase: jest.Mocked<ProcessMercadoPagoWebhookUseCase>;
  let idempotencyService: jest.Mocked<WebhookIdempotencyService>;
  let logger: jest.Mocked<AppLoggerService>;

  beforeEach(() => {
    processWebhookUseCase = {
      execute: jest.fn(),
    } as any;

    idempotencyService = {
      isDuplicate: jest.fn(),
      markAsProcessed: jest.fn(),
    } as any;

    logger = {
      logInfo: jest.fn(),
      logWarn: jest.fn(),
      logError: jest.fn(),
    } as any;

    service = new MercadoPagoWebhookService(
      processWebhookUseCase,
      idempotencyService,
      logger,
    );
  });

  it('should process payment event and mark as processed', async () => {
    const data = {
      paymentId: '12345',
      action: 'payment.created',
      type: 'payment',
      rawPayload: { id: 'evt_1' },
      requestId: 'req_1',
    };

    idempotencyService.isDuplicate.mockResolvedValue(false);
    processWebhookUseCase.execute.mockResolvedValue({
      ok: true,
      updated: true,
    });

    const result = await service.handleEvent(data);

    expect(result.ok).toBe(true);
    expect(idempotencyService.isDuplicate).toHaveBeenCalled();
    expect(processWebhookUseCase.execute).toHaveBeenCalledWith('12345');
    expect(idempotencyService.markAsProcessed).toHaveBeenCalled();
  });

  it('should ignore duplicate events', async () => {
    idempotencyService.isDuplicate.mockResolvedValue(true);

    const result = await service.handleEvent({
      paymentId: '12345',
      rawPayload: { id: 'evt_1' },
    });

    expect(result.ok).toBe(true);
    expect(processWebhookUseCase.execute).not.toHaveBeenCalled();
  });

  it('should return ok even if use case fails (resilience)', async () => {
    idempotencyService.isDuplicate.mockResolvedValue(false);
    processWebhookUseCase.execute.mockRejectedValue(new Error('MP API Down'));

    const result = await service.handleEvent({
      paymentId: '12345',
      rawPayload: { id: 'evt_1' },
    });

    expect(result.ok).toBe(true);
    expect(logger.logError).toHaveBeenCalled();
  });
});
