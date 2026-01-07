import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '../../domain/payment.enums';
import { PaymentGateway } from '../ports/payment-gateway';
import { PaymentsRepository } from '../ports/payments.repository';

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
  ) {}

  async execute(mpPaymentId: string): Promise<ProcessMercadoPagoWebhookResult> {
    const mpPayment = await this.paymentGateway.getPaymentById(mpPaymentId);

    if (!mpPayment.externalReference) {
      return { ok: true, updated: false };
    }

    const payment = await this.paymentsRepository.findByExternalReference(
      mpPayment.externalReference,
    );

    if (!payment) {
      throw new NotFoundException(
        `Payment with external reference ${mpPayment.externalReference} not found`,
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
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
