import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.usecase';
import { UpdatePaymentUseCase } from './application/use-cases/update-payment.usecase';
import { GetPaymentUseCase } from './application/use-cases/get-payment.usecase';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.usecase';
import { PaymentsRepository } from './application/ports/payments.repository';
import { PaymentsPrismaRepository } from './infra/repositories/payments.prisma-repository';
import { PaymentGateway } from './application/ports/payment-gateway';
import { MercadoPagoGateway } from './infra/gateways/mercado-pago.gateway';
import { MercadoPagoWebhookController } from './presentation/controllers/mercadopago-webhook.controller';
import { ProcessMercadoPagoWebhookUseCase } from './application/use-cases/process-mercadopago-webhook.usecase';
import { WebhookIdempotencyService } from './application/services/webhook-idempotency.service';
import { MercadoPagoWebhookService } from './application/services/mercadopago-webhook.service';
import { PaymentActivities } from './infra/temporal/activities/payment.activities';
import { TemporalModule } from './infra/temporal/temporal.module';

import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infra/database/prisma/prisma.module';
import { MercadoPagoClientModule } from '../../infra/clients/mercadopago/mercadopago-client.module';

import { MercadoPagoReturnController } from './presentation/controllers/mercadopago-return.controller';
import { TemporalController } from './infra/temporal/temporal.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HttpModule,
    MercadoPagoClientModule,
    TemporalModule,
  ],
  controllers: [
    PaymentsController,
    MercadoPagoWebhookController,
    MercadoPagoReturnController,
    TemporalController,
  ],
  providers: [
    CreatePaymentUseCase,
    UpdatePaymentUseCase,
    GetPaymentUseCase,
    ListPaymentsUseCase,
    ProcessMercadoPagoWebhookUseCase,
    PaymentActivities,
    {
      provide: PaymentsRepository,
      useClass: PaymentsPrismaRepository,
    },
    {
      provide: PaymentGateway,
      useClass: MercadoPagoGateway,
    },
    WebhookIdempotencyService,
    MercadoPagoWebhookService,
  ],
})
export class PaymentsModule {}
