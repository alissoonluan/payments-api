import { PrismaClient } from '@prisma/client';
import { Connection, WorkflowClient } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';

async function run() {
  const prisma = new PrismaClient();
  const paymentId = uuidv4();
  const extRef = uuidv4();

  console.log('🌱 1. Creating payment in Database...');
  await prisma.payment.create({
    data: {
      id: paymentId,
      amount: 499.9,
      description: 'Senior Test Payment',
      payerCpf: '12345678909',
      paymentMethod: 'CREDIT_CARD',
      status: 'PENDING',
      mpExternalReference: extRef,
    },
  });
  console.log(`✅ Payment created with ID: ${paymentId} (extRef: ${extRef})`);

  console.log('🚀 2. Starting Temporal Workflow...');
  const connection = await Connection.connect({ address: 'localhost:7233' });
  const client = new WorkflowClient({ connection });

  const workflowId = `payment-${extRef}`;
  const handle = await client.start('creditCardPaymentWorkflow', {
    args: [{ paymentId, externalReference: extRef }],
    taskQueue: 'payments-queue',
    workflowId,
  });

  console.log('✨ 3. Workflow started successfully!');
  console.log(`🆔 Workflow ID: ${workflowId}`);
  console.log(
    `🔗 UI: http://localhost:8080/namespaces/default/workflows/${workflowId}/${handle.firstExecutionRunId}`,
  );

  await prisma.$disconnect();
  await connection.close();
}

run().catch(console.error);
