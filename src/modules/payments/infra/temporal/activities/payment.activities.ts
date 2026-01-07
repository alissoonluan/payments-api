import { Injectable, NotFoundException } from '@nestjs/common';
import { Context } from '@temporalio/activity';
import { ConfigService } from '@nestjs/config';
import { PaymentsRepository } from '@modules/payments/application/ports/payments.repository';
import { PaymentGateway } from '@modules/payments/application/ports/payment-gateway';
import { PaymentStatus } from '@modules/payments/domain/payment.enums';
import { AppLoggerService } from '@shared/logger/app-logger.service';

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
      this.logActivity(`Payment not found: ${paymentId}`);
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    if (payment.status !== PaymentStatus.PENDING) {
      this.logActivity(
        `Payment is not in PENDING status (current: ${payment.status})`,
        { paymentId, currentStatus: payment.status },
      );
      throw new Error(
        `Payment ${paymentId} is not in PENDING status (current: ${payment.status})`,
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
      this.logActivity(
        'Using MOCK Mercado Pago preference (TEMPORAL_MOCK_MP=true)',
        {
          paymentId,
        },
      );
      return {
        preferenceId: `mock-pref-${paymentId}`,
        initPoint: 'https://www.mercadopago.com.br/checkout/mock',
        sandboxInitPoint: 'https://sandbox.mercadopago.com.br/checkout/mock',
      };
    }

    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) {
      this.logActivity(
        `Payment not found during preference creation: ${paymentId}`,
      );
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    try {
      const result = await this.paymentGateway.createPreference(payment);
      this.logActivity('Mercado Pago preference created successfully', {
        paymentId,
        preferenceId: result.preferenceId,
      });
      return result;
    } catch (error) {
      this.logActivity('Failed to create Mercado Pago preference', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async saveMercadoPagoCorrelationData(
    paymentId: string,
    data: { preferenceId: string; initPoint: string; sandboxInitPoint: string },
  ): Promise<void> {
    await this.paymentsRepository.update(paymentId, {
      mpPreferenceId: data.preferenceId,
      mpInitPoint: data.initPoint,
      mpSandboxInitPoint: data.sandboxInitPoint,
    });
    this.logActivity('Correlation data saved to database', {
      paymentId,
      preferenceId: data.preferenceId,
    });
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    failReason?: string,
  ): Promise<void> {
    await this.paymentsRepository.update(paymentId, {
      status,
      failReason,
    });
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
}
