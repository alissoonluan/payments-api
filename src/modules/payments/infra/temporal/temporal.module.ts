import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemporalClientService } from './temporal-client.service';
import { TemporalPaymentWorkflowAdapter } from './adapters/temporal-payment-workflow.adapter';
import { PaymentWorkflowPort } from '../../application/ports/payment-workflow.port';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [
    TemporalClientService,
    {
      provide: PaymentWorkflowPort,
      useClass: TemporalPaymentWorkflowAdapter,
    },
  ],
  exports: [TemporalClientService, PaymentWorkflowPort],
})
export class TemporalModule {}
