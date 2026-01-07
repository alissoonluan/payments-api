import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '../../domain/payment.enums';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentsRepository } from '../ports/payments.repository';
import { AppLoggerService } from '../../../../shared/logger/app-logger.service';

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
  ) {}

  async execute(mpPaymentId: string): Promise<ProcessMercadoPagoWebhookResult> {
    this.logger.logInfo('WEBHOOK_PROCESS_START', 'Processing webhook', {
      mpPaymentId,
    });

    const mpPayment = await this.paymentGateway.getPaymentById(mpPaymentId);

    if (!mpPayment.externalReference) {
      this.logger.logWarn(
        'WEBHOOK_NO_EXT_REF',
        'No external reference in MP payment',
        {
          mpPaymentId,
          mpStatus: mpPayment.status,
        },
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
        {
          externalReference: mpPayment.externalReference,
        },
      );
      throw new NotFoundException(
        `Payment with external reference ${mpPayment.externalReference} not found`,
      );
    }

    this.logger.logInfo('WEBHOOK_PAYMENT_FOUND', 'Found associated payment', {
      paymentId: payment.id,
      currentStatus: payment.status,
      mpStatus: mpPayment.status,
    });

    if (payment.status !== PaymentStatus.PENDING) {
      this.logger.logInfo(
        'WEBHOOK_ALREADY_PROCESSED',
        'Payment already processed',
        {
          paymentId: payment.id,
          status: payment.status,
        },
      );
      return {
        ok: true,
        updated: false,
        status: payment.status,
      };
    }

    const newStatus = this.mapStatus(mpPayment.status);

    if (newStatus === PaymentStatus.PENDING) {
      return {
        ok: true,
        updated: false,
        status: PaymentStatus.PENDING,
      };
    }

    await this.paymentsRepository.updateStatus(payment.id, newStatus);

    this.logger.logInfo('WEBHOOK_STATUS_UPDATED', 'Payment status updated', {
      paymentId: payment.id,
      oldStatus: payment.status,
      newStatus,
    });

    return {
      ok: true,
      updated: true,
      status: newStatus,
    };
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
    };

    return statusMap[mpStatus] || PaymentStatus.PENDING;
  }
}
