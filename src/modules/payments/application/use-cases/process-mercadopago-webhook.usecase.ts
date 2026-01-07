import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentsRepository } from '../ports/payments.repository';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';
import { PaymentWorkflowPort } from '../ports/payment-workflow.port';

export interface ProcessMercadoPagoWebhookResult {
  ok: boolean;
  updated: boolean;
  status?: PaymentStatus;
}

@Injectable()
export class ProcessMercadoPagoWebhookUseCase {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly logger: AppLoggerService,
    private readonly paymentWorkflowPort: PaymentWorkflowPort,
  ) {}

  async execute(mpPaymentId: string): Promise<ProcessMercadoPagoWebhookResult> {
    this.logger.logInfo(
      'WEBHOOK_FETCH_MP_START',
      `Fetching payment details from Mercado Pago`,
      { mpPaymentId },
    );

    const mpPayment = await this.paymentGateway.getPaymentById(mpPaymentId);

    this.logger.logInfo('WEBHOOK_MP_FETCHED', `Mercado Pago payment fetched`, {
      mpPaymentId,
      status: mpPayment.status,
      externalReference: mpPayment.externalReference,
    });

    if (!mpPayment.externalReference) {
      this.logger.logWarn(
        'WEBHOOK_NO_EXTERNAL_REF',
        'No external reference found in Mercado Pago payment',
        { mpPaymentId },
      );
      return { ok: true, updated: false };
    }

    const payment = await this.paymentsRepository.findByExternalReference(
      mpPayment.externalReference,
    );

    if (!payment) {
      this.logger.logError(
        'WEBHOOK_PAYMENT_NOT_FOUND',
        'Payment not found for external reference',
        new Error('Payment Not Found'),
        { externalReference: mpPayment.externalReference, mpPaymentId },
      );
      throw new NotFoundException(
        `Payment with external reference ${mpPayment.externalReference} not found`,
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
      this.logger.logInfo(
        'WEBHOOK_ALREADY_FINAL',
        `Payment already in final state, ignoring webhook`,
        {
          paymentId: payment.id,
          currentStatus: payment.status,
          mpStatus: mpPayment.status,
        },
      );
      return { ok: true, updated: false, status: payment.status };
    }

    const newStatus = this.mapStatus(mpPayment.status);

    if (payment.paymentMethod === PaymentMethod.CREDIT_CARD) {
      try {
        await this.paymentWorkflowPort.signalPaymentResult(
          payment.mpExternalReference!,
          newStatus,
          mpPaymentId,
        );

        this.logger.logInfo(
          'WEBHOOK_SIGNAL_SENT',
          `Signal sent to Temporal workflow`,
          {
            paymentId: payment.id,
            workflowId: `payment-${payment.mpExternalReference}`,
            status: newStatus,
            mpPaymentId,
          },
        );

        return { ok: true, updated: true, status: newStatus };
      } catch (err) {
        this.logger.logWarn(
          'WEBHOOK_SIGNAL_FAILED',
          'Failed to signal workflow, updating payment directly',
          {
            paymentId: payment.id,
            error: err instanceof Error ? err.message : String(err),
          },
        );
      }
    }

    await this.paymentsRepository.update(payment.id, {
      status: newStatus,
      mpPaymentId,
      failReason:
        newStatus === PaymentStatus.FAIL
          ? `mp_status_${mpPayment.status}`
          : undefined,
    });

    this.logger.logInfo(
      'WEBHOOK_STATUS_UPDATED',
      `Payment status updated directly`,
      {
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus,
      },
    );

    return { ok: true, updated: true, status: newStatus };
  }

  private mapStatus(mpStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      approved: PaymentStatus.PAID,
      rejected: PaymentStatus.FAIL,
      cancelled: PaymentStatus.FAIL,
      refunded: PaymentStatus.FAIL,
      charged_back: PaymentStatus.FAIL,
      in_process: PaymentStatus.PENDING,
      pending: PaymentStatus.PENDING,
      authorized: PaymentStatus.PENDING,
      in_mediation: PaymentStatus.PENDING,
    };

    return statusMap[mpStatus] || PaymentStatus.PENDING;
  }
}
