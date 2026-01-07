import {
  Controller,
  Post,
  Param,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TemporalClientService } from './temporal-client.service';
import { PaymentsRepository } from '../../application/ports/payments.repository';

@ApiTags('Temporal')
@Controller('api/temporal/payments')
export class TemporalController {
  private readonly logger = new Logger(TemporalController.name);

  constructor(
    private readonly temporalClientService: TemporalClientService,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  @Post(':paymentId/start')
  @ApiOperation({ summary: 'Start a Credit Card Payment Workflow manually' })
  @ApiResponse({ status: 201, description: 'Workflow started successfully' })
  async startWorkflow(@Param('paymentId') paymentId: string) {
    if (!paymentId) throw new BadRequestException('Payment ID is required');

    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    if (!payment.mpExternalReference) {
      throw new BadRequestException('Payment has no external reference');
    }

    try {
      const result =
        await this.temporalClientService.startCreditCardPaymentWorkflow({
          paymentId: payment.id,
          externalReference: payment.mpExternalReference,
        });

      return {
        message: 'Workflow started successfully',
        ...result,
        uiUrl: `http://localhost:8080/namespaces/default/workflows/${result.workflowId}/${result.runId}`,
      };
    } catch (error) {
      this.logger.error(
        `Error starting workflow for payment ${paymentId}`,
        error,
      );
      throw error;
    }
  }
}
