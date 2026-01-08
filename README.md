# Payments API

A production‑ready payment orchestration service built with **NestJS**, **PostgreSQL**, **Mercado Pago**, and **Temporal.io**. The API handles PIX and credit‑card payments, while Temporal guarantees reliable, state‑ful workflows for the credit‑card flow.

---

## Table of Contents

1. [Execution Modes](#execution-modes)
2. [Temporal Lifecycle Overview](#temporal-lifecycle-overview)
3. [Manual End‑to‑End Flow (With Worker)](#manual-end-to-end-flow-with-worker)
4. [Common Pitfalls & Troubleshooting](#common-pitfalls--troubleshooting)
5. [Scripts Reference](#scripts-reference)
6. [Environment Variables](#environment-variables)
7. [Quick Start (Docker)](#quick-start-docker)

---

## Execution Modes

The project can be run in three distinct ways. Choose the one that best fits your workflow.

### A) Full Docker Mode **(Recommended)**

```bash
docker compose up -d --build
```

**What starts:**

- **API** (`app` service) – NestJS server on port **3000**.
- **Temporal Server** (`temporal` service) – orchestrates workflow state on port **7233**.
- **Temporal UI** (`temporal‑ui` service) – web UI on port **8080** for visual debugging.
- **Temporal Worker** (`worker` service) – executes activities and drives the workflow.
- **PostgreSQL** databases for the API and Temporal.

**Why use it:** All required components are launched automatically, guaranteeing that credit‑card workflows run correctly. Ideal for testing, CI pipelines, and production‑like environments.

### B) Local Development Mode (Manual Worker)

```bash
npm run start:dev          # Starts the NestJS API (watch mode)
npm run temporal:worker    # Starts the Temporal worker in a separate terminal
```

**Important warning:** The API **alone** cannot process credit‑card workflows. If the worker is not running, the workflow will never be created and no signals will be processed. Use this mode only for rapid iteration on HTTP endpoints or when you deliberately want to bypass Temporal (e.g., debugging a controller).

### C) Temporal Demo / Scripts Mode

A set of helper scripts that interact directly with Temporal. Useful for demos, manual signalling, or reproducing specific scenarios.

| Script                               | Description                                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `npm run temporal:start:credit-card` | Starts a single credit‑card workflow for a newly created payment (quick demo).                                   |
| `npm run temporal:demo`              | Spins up a minimal environment (Temporal Server + Worker) and runs a demo payment flow end‑to‑end.               |
| `npm run temporal:signal`            | Sends a manual signal to a running workflow (e.g., to simulate a webhook without calling the HTTP endpoint).     |
| `npm run start:docker`               | Alias for `docker compose up -d --build`.                                                                        |
| `npm run test:e2e:run`               | Executes the full E2E suite; automatically brings up the test Docker stack, runs migrations, and runs the tests. |

---

## Temporal Lifecycle Overview

1. **API initiates the workflow** – When a client creates a **CREDIT_CARD** payment (`POST /api/payments`), the API calls `PaymentWorkflowPort` which starts a Temporal workflow identified by `payment-{id}`.
2. **Temporal Server orchestrates state** – The server tracks the workflow’s state, timers, and signals. It does **not** execute business logic itself.
3. **Worker executes activities** – The **Temporal Worker** runs the activities defined in `src/modules/payments/infra/temporal/activities`. These activities interact with external services (Mercado Pago, Prisma) and update the database.
4. **Webhook sends a signal** – Mercado Pago posts a webhook to `/api/webhooks/mercadopago`. The webhook service fetches the payment details, updates the DB, and **signals** the running workflow with the final status (`PAID`, `FAIL`, etc.).
5. **Workflow completes** – Upon receiving the signal (or after a timeout + polling fallback), the workflow finalises, setting the payment status to **PAID** or **FAIL** and terminating gracefully.

**Key point:** The workflow never fails; all error paths are modelled as business outcomes (`FAIL` with a `failReason`).

---

## Manual End‑to‑End Flow (With Worker)

Follow these steps to see the full credit‑card orchestration in action.

1. **Start the full Docker stack**

   ```bash
   docker compose up -d --build
   ```

2. **Confirm the Temporal worker is running**

   ```bash
   docker logs -f payments_temporal_worker   # should show “Worker started” and activity logs
   ```

3. **Create a credit‑card payment**

   ```bash
   curl -X POST http://localhost:3000/api/payments \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 150.00,
       "description": "Demo payment",
       "payerCpf": "11144477735",
       "paymentMethod": "CREDIT_CARD"
     }'
   ```

   The response contains:
   - `id` (internal payment ID) – also used as `mpExternalReference`.
   - `mpInitPoint` – URL to redirect the user to Mercado Pago checkout.

4. **Open the `mpInitPoint` URL** (in a browser or with `curl`). This simulates the buyer completing the checkout.

5. **Simulate (or wait for) the webhook**
   - **Simulated webhook (quick test):**

     ```bash
     curl -X POST http://localhost:3000/api/webhooks/mercadopago \
       -H "Content-Type: application/json" \
       -d '{
         "type": "payment",
         "data": { "id": "mp-test-123" }
       }'
     ```

   - **Real webhook:** After the checkout, Mercado Pago automatically POSTs to the URL defined by `MERCADOPAGO_NOTIFICATION_URL`.

6. **Observe workflow completion**
   - Open **Temporal UI** at `http://localhost:8080`.
   - Search for the workflow ID `payment-<paymentId>` (e.g., `payment-abc-123`).
   - The workflow should be in **Completed** state with a result of `PAID` (or `FAIL` if an error occurred).

7. **Verify final payment status**

   ```bash
   curl http://localhost:3000/api/payments/<paymentId>
   ```

   Expected JSON includes:

   ```json
   {
     "id": "<paymentId>",
     "status": "PAID",
     "mpPaymentId": "mp-test-123",
     ...
   }
   ```

---

## Common Pitfalls & Troubleshooting

| Symptom                                                     | Likely Cause                                                               | Fix                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow not starting**                                   | Temporal worker process is not running                                     | Ensure the `payments_temporal_worker` container is up (`docker ps`) or run `npm run temporal:worker` in local dev mode.           |
| **Temporal UI shows no workflows**                          | Wrong task queue or worker down                                            | Verify `TEMPORAL_TASK_QUEUE` matches the queue used by the worker (`payments-queue` by default). Restart the worker if necessary. |
| **Webhook received but payment not updated**                | Signal not delivered to workflow                                           | Check worker logs for `SIGNAL_RECEIVED`. If missing, the worker may be down or the workflow ID mismatched.                        |
| **Credit‑card payment stays `PENDING`**                     | Worker not processing activities (e.g., `TEMPORAL_ENABLED` set to `false`) | Ensure `TEMPORAL_ENABLED=true` (default) and the worker container is running.                                                     |
| **Running API only (no Docker) and credit‑card flow fails** | Temporal components are not started                                        | Use Full Docker mode for production‑like behavior, or run the worker manually as described in **Local Development Mode**.         |
| **Timeout after `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES`**   | Webhook never arrived; workflow fell back to polling and then failed       | Simulate a webhook or reduce the timeout for testing (`WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES=1`).                                 |

---

## Scripts Reference

| Script                               | Purpose                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `npm run start:dev`                  | Starts the NestJS API in watch mode (development).                                                               |
| `npm run temporal:worker`            | Starts the Temporal worker (must be running for credit‑card workflows).                                          |
| `npm run temporal:start:credit-card` | Starts a single credit‑card workflow for a newly created payment (demo).                                         |
| `npm run temporal:demo`              | Spins up a minimal Temporal environment and runs a demo end‑to‑end payment flow.                                 |
| `npm run temporal:signal`            | Sends a manual signal to a running workflow (useful for testing webhook handling).                               |
| `npm run start:docker`               | Alias for `docker compose up -d --build`.                                                                        |
| `npm run test:e2e:run`               | Executes the full E2E suite; automatically brings up the test Docker stack, runs migrations, and runs the tests. |
| `npm run build`                      | Compiles the NestJS project.                                                                                     |
| `npm run lint`                       | Runs ESLint checks.                                                                                              |
| `npm run test:unit`                  | Runs only unit tests.                                                                                            |

---

## Environment Variables

| Variable                                | Description                                                                   | Default                                          |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| `PORT`                                  | API port                                                                      | `3000`                                           |
| `DATABASE_URL`                          | PostgreSQL connection string                                                  | –                                                |
| `MERCADOPAGO_ACCESS_TOKEN`              | Mercado Pago access token                                                     | –                                                |
| `MERCADOPAGO_NOTIFICATION_URL`          | URL where Mercado Pago will POST webhooks                                     | `http://localhost:3000/api/webhooks/mercadopago` |
| `MERCADOPAGO_SUCCESS_URL`               | Redirect URL after successful checkout                                        | `http://localhost:3000/api/mercadopago/success`  |
| `MERCADOPAGO_FAILURE_URL`               | Redirect URL after failed checkout                                            | `http://localhost:3000/api/mercadopago/failure`  |
| `MERCADOPAGO_PENDING_URL`               | Redirect URL for pending status                                               | `http://localhost:3000/api/mercadopago/pending`  |
| `TEMPORAL_ENABLED`                      | Enable Temporal integration (set to `false` to run API without worker)        | `true`                                           |
| `TEMPORAL_ADDRESS`                      | Temporal Server address                                                       | `localhost:7233`                                 |
| `TEMPORAL_TASK_QUEUE`                   | Task queue name used by the worker                                            | `payments-queue`                                 |
| `TEMPORAL_MOCK_MP`                      | Use mock Mercado Pago inside Temporal activities                              | `false`                                          |
| `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES` | Timeout (in minutes) for waiting for a webhook signal before polling fallback | `10`                                             |

**Note:** The system **does** support running without Temporal by setting `TEMPORAL_ENABLED=false`. In that mode:

- CREDIT_CARD payments will **not** be orchestrated; no workflow is created.
- The API will still accept the request and return a `PENDING` status, but no further processing occurs.
- This mode is intended only for quick local debugging of HTTP endpoints and is **not** production‑ready.

---

## Quick Start (Docker)

```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-org/payments-api.git
cd payments-api

# 2️⃣ Copy environment template and fill required values
cp .env.example .env
# Edit .env – set MERCADOPAGO_ACCESS_TOKEN and any other secrets

# 3️⃣ Start the full stack (recommended)
docker compose up -d --build

# 4️⃣ Verify everything is healthy
docker ps   # all services should be "healthy"
# Watch the worker logs to ensure it started correctly
docker logs -f payments_temporal_worker

# 5️⃣ Run a quick credit‑card payment (see Manual End‑to‑End Flow)
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"amount":150,"description":"Demo","payerCpf":"11144477735","paymentMethod":"CREDIT_CARD"}'
```

You can now open **Temporal UI** at `http://localhost:8080` to inspect the workflow, or use the provided scripts for demos and signalling.

---

**Enjoy building resilient payment flows with Temporal!** 🚀
