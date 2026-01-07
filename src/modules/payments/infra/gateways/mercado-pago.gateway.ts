import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreatePreferenceResult,
  PaymentGateway,
} from '../../application/ports/payment-gateway';
import { PaymentEntity } from '../../domain/payment.entity';
import { MercadoPagoClient } from '../../../../infra/clients/mercadopago/mercadopago.client';
import { CreatePreferencePayload } from '../../../../infra/clients/mercadopago/dtos/create-preference.dto';

@Injectable()
export class MercadoPagoGateway implements PaymentGateway {
  private readonly notificationUrl: string;
  private readonly successUrl: string;
  private readonly failureUrl: string;
  private readonly pendingUrl: string;

  constructor(
    private readonly mercadoPagoClient: MercadoPagoClient,
    private readonly configService: ConfigService,
  ) {
    this.notificationUrl = this.configService.getOrThrow<string>(
      'MERCADOPAGO_NOTIFICATION_URL',
    );
    this.successUrl = this.configService.getOrThrow<string>(
      'MERCADOPAGO_SUCCESS_URL',
    );
    this.failureUrl = this.configService.getOrThrow<string>(
      'MERCADOPAGO_FAILURE_URL',
    );
    this.pendingUrl = this.configService.getOrThrow<string>(
      'MERCADOPAGO_PENDING_URL',
    );
  }

  async createPreference(
    payment: PaymentEntity,
  ): Promise<CreatePreferenceResult> {
    const externalReference = payment.mpExternalReference;

    if (!externalReference) {
      throw new Error(
        'mpExternalReference is required to create Mercado Pago preference',
      );
    }

    const payload: CreatePreferencePayload = {
      items: [
        {
          title: payment.description?.trim() || 'Payment',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: payment.amount,
        },
      ],
      external_reference: externalReference,
      payer: {
        identification: {
          type: 'CPF',
          number: payment.payerCpf,
        },
      },
      notification_url: this.notificationUrl,
      auto_return: 'approved',
      back_urls: {
        success: this.successUrl,
        failure: this.failureUrl,
        pending: this.pendingUrl,
      },
    };

    const response = await this.mercadoPagoClient.createPreference(payload);

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
    };
  }

  async getPaymentById(
    mpPaymentId: string,
  ): Promise<{ externalReference: string; status: string }> {
    const response = await this.mercadoPagoClient.getPayment(mpPaymentId);

    return {
      externalReference: response.external_reference,
      status: response.status,
    };
  }
}
