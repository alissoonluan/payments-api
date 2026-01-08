import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, WorkflowClient } from '@temporalio/client';
import { creditCardPaymentWorkflow } from './workflows/credit-card-payment.workflow';

@Injectable()
export class TemporalClientService implements OnModuleInit, OnModuleDestroy {
  private connection?: Connection;
  private workflowClient?: WorkflowClient;
  private readonly logger = new Logger(TemporalClientService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      if (this.workflowClient) {
        return;
      }

      const address =
        this.configService.get<string>('TEMPORAL_ADDRESS') ?? 'localhost:7233';

      const namespace =
        this.configService.get<string>('TEMPORAL_NAMESPACE') ?? 'default';

      this.logger.log(
        `Connecting to Temporal at ${address} (namespace: ${namespace})`,
      );

      this.connection = await Connection.connect({
        address,
      });

      this.workflowClient = new WorkflowClient({
        connection: this.connection,
        namespace,
      });

      this.logger.log('Temporal WorkflowClient initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Temporal WorkflowClient', error);
    }
  }

  getWorkflowClient(): WorkflowClient {
    if (!this.workflowClient) {
      throw new Error(
        'Temporal WorkflowClient not initialized. Did the module start correctly?',
      );
    }

    return this.workflowClient;
  }

  async startCreditCardPaymentWorkflow(data: {
    paymentId: string;
    externalReference: string;
  }): Promise<{ workflowId: string; runId: string }> {
    const taskQueue =
      this.configService.get<string>('TEMPORAL_TASK_QUEUE') ?? 'payments-queue';

    const timeoutMinutes = parseInt(
      this.configService.get<string>('WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES') ??
        '10',
      10,
    );

    const workflowId = `payment-${data.externalReference}`;

    this.logger.log(
      `[TEMPORAL] code=TEMPORAL_WORKFLOW_STARTED workflowId=${workflowId} paymentId=${data.paymentId} message="Starting creditCardPaymentWorkflow"`,
    );

    const handle = await this.getWorkflowClient().start(
      creditCardPaymentWorkflow,
      {
        args: [
          {
            ...data,
            timeoutMinutes,
          },
        ],
        taskQueue,
        workflowId,
      },
    );

    return {
      workflowId,
      runId: handle.firstExecutionRunId,
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
      this.workflowClient = undefined;
    }
  }
}
