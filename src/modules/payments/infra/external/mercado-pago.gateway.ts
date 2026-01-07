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
  private readonly backUrlSuccess: string;
  private readonly backUrlFailure: string;
  private readonly backUrlPending: string;

  constructor(
    private readonly mercadoPagoService: MercadoPagoClient,
    private readonly configService: ConfigService,
  ) {
    this.notificationUrl = this.configService.getOrThrow<string>(
      'MERCADOPAGO_NOTIFICATION_URL',
    );
    this.backUrlSuccess = this.configService.getOrThrow<string>(
      'MERCADOPAGO_BACK_URL_SUCCESS',
    );
    this.backUrlFailure = this.configService.getOrThrow<string>(
      'MERCADOPAGO_BACK_URL_FAILURE',
    );
    this.backUrlPending = this.configService.getOrThrow<string>(
      'MERCADOPAGO_BACK_URL_PENDING',
    );
  }

  async createPreference(
    payment: PaymentEntity,
  ): Promise<CreatePreferenceResult> {
    const payload: CreatePreferencePayload = {
      items: [
        {
          title: payment.description,
          quantity: 1,
          unit_price: payment.amount,
        },
      ],
      external_reference: payment.mpExternalReference as string,
      payer: {
        identification: {
          type: 'CPF',
          number: payment.payerCpf,
        },
      },
      notification_url: this.notificationUrl,
      back_urls: {
        success: this.backUrlSuccess,
        failure: this.backUrlFailure,
        pending: this.backUrlPending,
      },
      auto_return: 'approved',
    };

    const response = await this.mercadoPagoService.createPreference(payload);

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
    };
  }

  async getPaymentById(
    mpPaymentId: string,
  ): Promise<{ externalReference: string; status: string }> {
    const response = await this.mercadoPagoService.getPayment(mpPaymentId);

    return {
      externalReference: response.external_reference,
      status: response.status,
    };
  }
}
