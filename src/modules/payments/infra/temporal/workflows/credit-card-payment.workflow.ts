import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
  log,
} from '@temporalio/workflow';
import type { PaymentActivities } from '../activities/payment.activities';
import {
  MERCADO_PAGO_RESULT_SIGNAL,
  MercadoPagoResultSignal,
  PaymentWorkflowInput,
} from './types';
import { PaymentStatus } from './payment.enums';

const {
  ensurePaymentIsPending,
  createMercadoPagoPreference,
  saveMercadoPagoCorrelationData,
  updatePaymentStatus,
  getMercadoPagoStatus,
} = proxyActivities<PaymentActivities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '1m',
    maximumAttempts: 3,
  },
});

export async function creditCardPaymentWorkflow(
  input: PaymentWorkflowInput,
): Promise<void> {
  const workflowId = `payment-${input.externalReference}`;

  log.info(
    `[WORKFLOW] code=WORKFLOW_STARTED workflowId=${workflowId} paymentId=${input.paymentId} message="Starting credit card payment workflow"`,
  );

  let finalStatus: PaymentStatus | undefined;
  let failReason: string | undefined;

  setHandler(
    defineSignal<[MercadoPagoResultSignal]>(MERCADO_PAGO_RESULT_SIGNAL),
    (payload) => {
      log.info(
        `[WORKFLOW] code=SIGNAL_RECEIVED workflowId=${workflowId} status=${payload.status} mpPaymentId=${payload.mpPaymentId || 'N/A'} message="Received payment result signal"`,
      );
      finalStatus = payload.status;
    },
  );

  try {
    await ensurePaymentIsPending(input.paymentId);
    log.info(
      `[WORKFLOW] code=PAYMENT_VALIDATED workflowId=${workflowId} message="Payment is in PENDING status"`,
    );
  } catch (error) {
    log.error(
      `[WORKFLOW] code=PAYMENT_VALIDATION_FAILED workflowId=${workflowId} message="Payment validation failed: ${error}"`,
    );
    await updatePaymentStatus(
      input.paymentId,
      PaymentStatus.FAIL,
      'payment_not_pending',
    );
    log.info(
      `[WORKFLOW] code=WORKFLOW_COMPLETED workflowId=${workflowId} status=FAIL reason=payment_not_pending`,
    );
    return;
  }

  try {
    const preferenceResult = await createMercadoPagoPreference(input.paymentId);
    log.info(
      `[WORKFLOW] code=MP_PREFERENCE_CREATED workflowId=${workflowId} preferenceId=${preferenceResult.preferenceId} message="Mercado Pago preference created successfully"`,
    );

    await saveMercadoPagoCorrelationData(input.paymentId, preferenceResult);
    log.info(
      `[WORKFLOW] code=CORRELATION_SAVED workflowId=${workflowId} message="Correlation data saved"`,
    );
  } catch (error) {
    log.error(
      `[WORKFLOW] code=MP_PREFERENCE_FAILED workflowId=${workflowId} message="Failed to create Mercado Pago preference: ${error}"`,
    );
    await updatePaymentStatus(
      input.paymentId,
      PaymentStatus.FAIL,
      'mp_preference_creation_failed',
    );
    log.info(
      `[WORKFLOW] code=WORKFLOW_COMPLETED workflowId=${workflowId} status=FAIL reason=mp_preference_creation_failed`,
    );
    return;
  }

  const timeoutMinutes = parseInt(
    process.env.WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES || '10',
    10,
  );
  log.info(
    `[WORKFLOW] code=WAITING_CONFIRMATION workflowId=${workflowId} timeoutMinutes=${timeoutMinutes} message="Waiting for payment confirmation signal"`,
  );

  const signalReceived = await condition(
    () => finalStatus !== undefined,
    `${timeoutMinutes}m`,
  );

  if (!signalReceived) {
    log.warn(
      `[WORKFLOW] code=SIGNAL_TIMEOUT workflowId=${workflowId} message="Signal timeout reached. Starting polling fallback"`,
    );

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const polledStatus = (await getMercadoPagoStatus(
          input.paymentId,
        )) as PaymentStatus | null;

        if (polledStatus && polledStatus !== PaymentStatus.PENDING) {
          log.info(
            `[WORKFLOW] code=POLLING_SUCCESS workflowId=${workflowId} status=${polledStatus} attempt=${attempt} message="Payment status retrieved via polling"`,
          );
          finalStatus = polledStatus;
          break;
        }

        log.info(
          `[WORKFLOW] code=POLLING_PENDING workflowId=${workflowId} attempt=${attempt} message="Payment still pending, retrying..."`,
        );
        if (attempt < 3) {
          await sleep('1m');
        }
      } catch (error) {
        log.error(
          `[WORKFLOW] code=POLLING_ERROR workflowId=${workflowId} attempt=${attempt} message="Polling failed: ${error}"`,
        );
      }
    }

    if (!finalStatus) {
      log.warn(
        `[WORKFLOW] code=POLLING_EXHAUSTED workflowId=${workflowId} message="Polling exhausted without final status"`,
      );
      finalStatus = PaymentStatus.FAIL;
      failReason = 'timeout_waiting_confirmation';
    }
  }

  const resultStatus = finalStatus || PaymentStatus.FAIL;
  const resultReason =
    failReason ||
    (resultStatus === PaymentStatus.FAIL ? 'unknown_failure' : undefined);

  await updatePaymentStatus(input.paymentId, resultStatus, resultReason);

  log.info(
    `[WORKFLOW] code=WORKFLOW_COMPLETED workflowId=${workflowId} status=${resultStatus} reason=${resultReason || 'N/A'} message="Workflow completed successfully"`,
  );
}
