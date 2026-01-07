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
import { MercadoPagoGateway } from './infra/external/mercado-pago.gateway';
import { MercadoPagoWebhookController } from './presentation/controllers/mercadopago-webhook.controller';
import { ProcessMercadoPagoWebhookUseCase } from './application/use-cases/process-mercadopago-webhook.usecase';

import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infra/database/prisma/prisma.module';
import { MercadoPagoClientModule } from '../../infra/clients/mercadopago/mercadopago-client.module';

@Module({
  imports: [ConfigModule, PrismaModule, HttpModule, MercadoPagoClientModule],
  controllers: [PaymentsController, MercadoPagoWebhookController],
  providers: [
    CreatePaymentUseCase,
    UpdatePaymentUseCase,
    GetPaymentUseCase,
    ListPaymentsUseCase,
    ProcessMercadoPagoWebhookUseCase,
    {
      provide: PaymentsRepository,
      useClass: PaymentsPrismaRepository,
    },
    {
      provide: PaymentGateway,
      useClass: MercadoPagoGateway,
    },
  ],
})
export class PaymentsModule {}
