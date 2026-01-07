import { Connection, WorkflowClient } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const paymentId = process.argv[2] || 'demo-' + uuidv4().slice(0, 8);
  const extRef = 'ext-' + uuidv4().slice(0, 8);

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'payments-queue';

  const connection = await Connection.connect({ address });
  const client = new WorkflowClient({ connection, namespace });

  const workflowId = `payment-${extRef}`;

  console.log(`🎬 Starting workflow: ${workflowId}`);

  try {
    const handle = await client.start('creditCardPaymentWorkflow', {
      args: [{ paymentId, externalReference: extRef }],
      taskQueue,
      workflowId,
    });

    console.log('✅ Workflow started successfully!');
    console.log(
      `🔗 UI: http://localhost:8080/namespaces/${namespace}/workflows/${workflowId}/${handle.firstExecutionRunId}`,
    );

    await connection.close();
  } catch (err) {
    console.error('❌ Failed to start workflow:', err);
    process.exit(1);
  }
}

run().catch(console.error);
