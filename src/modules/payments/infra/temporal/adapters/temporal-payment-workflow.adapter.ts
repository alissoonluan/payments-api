import { Injectable, Logger } from '@nestjs/common';
import { PaymentWorkflowPort } from '../../../application/ports/payment-workflow.port';
import { TemporalClientService } from '../temporal-client.service';
import { PaymentStatus } from '../../../domain/payment.enums';
import { MERCADO_PAGO_RESULT_SIGNAL } from '../workflows/types';

@Injectable()
export class TemporalPaymentWorkflowAdapter implements PaymentWorkflowPort {
  private readonly logger = new Logger(TemporalPaymentWorkflowAdapter.name);

  constructor(private readonly temporalClientService: TemporalClientService) {}

  async startCreditCardWorkflow(
    paymentId: string,
    externalReference: string,
  ): Promise<void> {
    await this.temporalClientService.startCreditCardPaymentWorkflow({
      paymentId,
      externalReference,
    });
  }

  async signalPaymentResult(
    externalReference: string,
    status: PaymentStatus,
    mpPaymentId?: string,
  ): Promise<void> {
    const workflowId = `payment-${externalReference}`;

    try {
      await this.temporalClientService
        .getWorkflowClient()
        .getHandle(workflowId)
        .signal(MERCADO_PAGO_RESULT_SIGNAL, { status, mpPaymentId });

      this.logger.log(
        `[TEMPORAL] code=TEMPORAL_SIGNAL_SENT workflowId=${workflowId} status=${status} message="Signal sent successfully"`,
      );
    } catch (error) {
      this.logger.error(
        `[TEMPORAL] code=TEMPORAL_SIGNAL_FAILED workflowId=${workflowId} message="Failed to signal workflow: ${error.message}"`,
      );
      throw error;
    }
  }
}
