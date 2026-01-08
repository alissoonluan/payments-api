import { Injectable } from '@nestjs/common';
import { Context } from '@temporalio/activity';
import { ApplicationFailure } from '@temporalio/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsRepository } from '@modules/payments/application/ports/payments.repository';
import { PaymentGateway } from '@modules/payments/application/ports/payment-gateway';
import { PaymentStatus } from '@modules/payments/domain/payment.enums';
import { AppLoggerService } from '@shared/logger/app-logger.service';

const FAILURE_TYPES = {
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_NOT_PENDING: 'PAYMENT_NOT_PENDING',
  PAYMENT_UPDATE_NOT_FOUND: 'PAYMENT_UPDATE_NOT_FOUND',
  MP_PREFERENCE_FAILED: 'MP_PREFERENCE_FAILED',
} as const;

@Injectable()
export class PaymentActivities {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {}

  private logActivity(message: string, data?: any) {
    const info = Context.current().info;
    const logPrefix = `[TEMPORAL_ACTIVITY] [workflowId=${info.workflowExecution.workflowId}] [activity=${info.activityType}]`;
    this.logger.logInfo('TEMPORAL_ACTIVITY', `${logPrefix} ${message}`, data);
  }

  async ensurePaymentIsPending(paymentId: string): Promise<void> {
    const payment = await this.paymentsRepository.findById(paymentId);

    if (!payment) {
      this.logActivity(`Payment not found: ${paymentId}`, { paymentId });
      throw ApplicationFailure.nonRetryable(
        `Payment ${paymentId} not found`,
        FAILURE_TYPES.PAYMENT_NOT_FOUND,
        { paymentId },
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
      this.logActivity(`Payment not pending (current: ${payment.status})`, {
        paymentId,
        currentStatus: payment.status,
      });

      throw ApplicationFailure.nonRetryable(
        `Payment ${paymentId} is not PENDING (current: ${payment.status})`,
        FAILURE_TYPES.PAYMENT_NOT_PENDING,
        { paymentId, currentStatus: payment.status },
      );
    }

    this.logActivity('Payment validated as PENDING', { paymentId });
  }

  async createMercadoPagoPreference(paymentId: string): Promise<{
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint: string;
  }> {
    const isMock =
      this.configService.get<string>('TEMPORAL_MOCK_MP') === 'true';

    if (isMock) {
      this.logActivity('Using MOCK Mercado Pago preference', { paymentId });
      return {
        preferenceId: `mock-pref-${paymentId}`,
        initPoint: 'https://www.mercadopago.com.br/checkout/mock',
        sandboxInitPoint: 'https://sandbox.mercadopago.com.br/checkout/mock',
      };
    }

    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) {
      this.logActivity(`Payment not found during preference creation`, {
        paymentId,
      });
      throw ApplicationFailure.nonRetryable(
        `Payment ${paymentId} not found`,
        FAILURE_TYPES.PAYMENT_NOT_FOUND,
        { paymentId },
      );
    }

    try {
      const result = await this.paymentGateway.createPreference(payment);
      this.logActivity('Mercado Pago preference created', {
        paymentId,
        preferenceId: result.preferenceId,
      });
      return result;
    } catch (error) {
      this.logActivity('Failed to create Mercado Pago preference', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw ApplicationFailure.nonRetryable(
        `Failed to create Mercado Pago preference`,
        FAILURE_TYPES.MP_PREFERENCE_FAILED,
        { paymentId },
      );
    }
  }

  async saveMercadoPagoCorrelationData(
    paymentId: string,
    data: { preferenceId: string; initPoint: string; sandboxInitPoint: string },
  ): Promise<void> {
    await this.safeUpdate(paymentId, {
      mpPreferenceId: data.preferenceId,
      mpInitPoint: data.initPoint,
      mpSandboxInitPoint: data.sandboxInitPoint,
    });

    this.logActivity('Correlation data saved', {
      paymentId,
      preferenceId: data.preferenceId,
    });
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    failReason?: string,
  ): Promise<void> {
    await this.safeUpdate(paymentId, { status, failReason });

    this.logActivity(`Payment status updated to ${status}`, {
      paymentId,
      status,
      failReason: failReason || 'N/A',
    });
  }

  async getMercadoPagoStatus(paymentId: string): Promise<PaymentStatus | null> {
    const isMock =
      this.configService.get<string>('TEMPORAL_MOCK_MP') === 'true';
    if (isMock) {
      this.logActivity('Polling MOCK status (returning PAID)', { paymentId });
      return PaymentStatus.PAID;
    }

    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment || !payment.mpPreferenceId) {
      this.logActivity('Cannot poll status: payment or preferenceId missing', {
        paymentId,
      });
      return null;
    }

    this.logActivity('Polling payment status from database', { paymentId });
    return payment.status;
  }

  private async safeUpdate(paymentId: string, data: any): Promise<void> {
    try {
      await this.paymentsRepository.update(paymentId, data);
    } catch (error: any) {
      const msg = String(error?.message || '');
      const code = String(error?.code || '');

      if (
        code === 'P2025' ||
        msg.toLowerCase().includes('record to update not found')
      ) {
        this.logActivity('Update ignored: payment not found', { paymentId });
        return;
      }

      throw error;
    }
  }
}
