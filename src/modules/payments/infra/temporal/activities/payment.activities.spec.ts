import { PaymentActivities } from './payment.activities';
import { PaymentsRepository } from '@modules/payments/application/ports/payments.repository';
import { PaymentGateway } from '@modules/payments/application/ports/payment-gateway';
import { AppLoggerService } from '@shared/logger/app-logger.service';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@modules/payments/domain/payment.enums';
import { PaymentEntity } from '@modules/payments/domain/payment.entity';

jest.mock('@temporalio/activity', () => ({
  Context: {
    current: () => ({
      info: {
        workflowExecution: { workflowId: 'wf-1', runId: 'run-1' },
        activityType: 'activity-1',
      },
    }),
  },
}));

describe('PaymentActivities', () => {
  let activities: PaymentActivities;
  let repository: jest.Mocked<PaymentsRepository>;
  let gateway: jest.Mocked<PaymentGateway>;
  let logger: jest.Mocked<AppLoggerService>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
      update: jest.fn(),
    } as any;

    gateway = {
      createPreference: jest.fn(),
      getPaymentById: jest.fn(),
    } as any;

    logger = {
      logInfo: jest.fn(),
      logWarn: jest.fn(),
      logError: jest.fn(),
    } as any;

    config = {
      get: jest.fn(),
    } as any;

    activities = new PaymentActivities(repository, gateway, logger, config);
  });

  describe('ensurePaymentIsPending', () => {
    it('should pass if payment is pending', async () => {
      repository.findById.mockResolvedValue(
        new PaymentEntity({ status: PaymentStatus.PENDING } as any),
      );
      await expect(
        activities.ensurePaymentIsPending('1'),
      ).resolves.not.toThrow();
    });

    it('should throw if payment is not pending', async () => {
      repository.findById.mockResolvedValue(
        new PaymentEntity({ status: PaymentStatus.PAID } as any),
      );
      await expect(activities.ensurePaymentIsPending('1')).rejects.toThrow();
    });
  });

  describe('updatePaymentStatus', () => {
    it('should call repository updateStatus', async () => {
      await activities.updatePaymentStatus('1', PaymentStatus.PAID);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        '1',
        PaymentStatus.PAID,
      );
    });
  });
});
