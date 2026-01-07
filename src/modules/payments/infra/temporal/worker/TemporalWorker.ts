import { Worker, NativeConnection } from '@temporalio/worker';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../../app.module';
import { PaymentActivities } from '../activities/payment.activities';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentActivities = app.get(PaymentActivities);

  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'payments-queue';
  const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

  console.log(`[TEMPORAL_WORKER] Starting...`);
  console.log(`[TEMPORAL_WORKER] Address: ${temporalAddress}`);
  console.log(`[TEMPORAL_WORKER] Task Queue: ${taskQueue}`);

  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('../workflows'),
    activities: {
      ensurePaymentIsPending:
        paymentActivities.ensurePaymentIsPending.bind(paymentActivities),
      createMercadoPagoPreference:
        paymentActivities.createMercadoPagoPreference.bind(paymentActivities),
      saveMercadoPagoCorrelationData:
        paymentActivities.saveMercadoPagoCorrelationData.bind(
          paymentActivities,
        ),
      updatePaymentStatus:
        paymentActivities.updatePaymentStatus.bind(paymentActivities),
      getMercadoPagoStatus:
        paymentActivities.getMercadoPagoStatus.bind(paymentActivities),
    },
    taskQueue,
  });

  console.log(`✅ [TEMPORAL_WORKER] Ready and polling!`);
  await worker.run();
}

run().catch((err) => {
  console.error('❌ [TEMPORAL_WORKER] Fatal error during startup:', err);
  process.exit(1);
});
