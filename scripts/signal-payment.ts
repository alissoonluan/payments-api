import { Connection, WorkflowClient } from '@temporalio/client';

async function run() {
  const paymentId = process.argv[2];

  if (!paymentId) {
    console.error(
      '❌ Forneça o paymentId. Ex: npm run temporal:signal 203d75e5-756a-4db1-837f-dc7afe34dfb6',
    );
    process.exit(1);
  }

  const connection = await Connection.connect({ address: 'localhost:7233' });
  const client = new WorkflowClient({ connection });

  const workflowId = paymentId.startsWith('payment-')
    ? paymentId
    : `payment-${paymentId}`;

  console.log(`📡 Enviando sinal de aprovação para: ${workflowId}`);

  try {
    const handle = client.getHandle(workflowId);

    await handle.describe();

    await handle.signal('paymentApproved', {
      status: 'PAID',
      mpPaymentId: 'MP-SIMULADO-123',
    });

    console.log('✅ Sinal enviado com sucesso!');
    console.log(
      `🏆 O Workflow ${workflowId} deve mudar para 'Completed' na UI.`,
    );
  } catch (err: any) {
    if (err.name === 'WorkflowNotFoundError') {
      console.error('❌ Erro: Workflow não encontrado!');
      console.error(`👉 Você tentou: ${workflowId}`);
      console.error(
        '💡 Dica: Verifique se você não está usando o RUN ID em vez do WORKFLOW ID.',
      );
      console.error(
        '   Abra a UI e copie o campo "Workflow ID" (o primeiro da lista).',
      );
    } else {
      console.error('❌ Falha ao enviar sinal:', err.message);
    }
    process.exit(1);
  }

  await connection.close();
}

run().catch(console.error);
