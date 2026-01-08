# Payments API

A production‑ready payment orchestration service built with **NestJS**, **PostgreSQL**, **Mercado Pago**, and **Temporal.io**. The API handles PIX and credit‑card payments, using Temporal to guarantee reliable, long‑running workflows for the credit‑card flow.

---

## 🏗️ Architecture & Philosophy

This project is built following **Clean Architecture** principles, ensuring that business logic is isolated from infrastructure concerns.

- **Resilience**: Every credit‑card payment is orchestrated by a Temporal workflow, providing built‑in retries, polling fallbacks, and state persistence.
- **Idempotency**: Webhook handling is protected by an idempotency layer to prevent duplicate processing.
- **Observability**: Real-time monitoring of payment states via Temporal UI and structured logging.

---

## 🚀 Execution Modes

### A) Full Stack Mode (Production-like)

The recommended way to run and test the complete system.

```bash
docker compose up -d --build
```

**Services Started:**

- **NestJS API** (Port 3000): The entry point for all payment requests.
- **Temporal Worker**: The core component that executes workflow logic and activities.
- **Temporal Server & UI** (Port 8080): Manages state, timers, and provides the dashboard.
- **PostgreSQL**: Databases for both the Application and Temporal Server.

### B) Local Development Mode

Use this for rapid backend iteration.

```bash
npm run start:dev          # Starts API with hot-reload
npm run temporal:worker    # Starts the Worker manually in a separate terminal
```

_Note: Credit‑card payments require the Worker to be running._

---

## 🧪 Verification Guide

### 1. Automatic Testing (Reliability Suite)

Our test suite covers everything from domain logic to infrastructure integration.

```bash
# Run all unit tests (Domain & Application logic)
npm run test:unit

# Run full E2E suite (API + Repository + Webhooks)
# This command automatically sets up an isolated test database
npm run test:e2e:run
```

### 2. Manual End-to-End Verification

Follow this professional flow to verify the system's integration with Temporal and Mercado Pago.

**Step 1: Initiation**
Create a new credit‑card payment via the API.

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 199.90,
    "description": "Premium Subscription",
    "payerCpf": "11144477735",
    "paymentMethod": "CREDIT_CARD"
  }'
```

_Take note of the `id` in the response._

**Step 2: Observability**
Open the [Temporal UI](http://localhost:8080) and find the workflow `payment-<id>`. You will see it in the `Running` state, waiting for a signal or timeout.

_Note: For testing purposes, you should use the `mpSandboxInitPoint` URL found in the API response or database to simulate the checkout without involving real money._

**Step 3: External Event (Webhook)**
Simulate a successful payment confirmation from Mercado Pago.

```bash
curl -X POST http://localhost:3000/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": { "id": "mp-test-demo-123" }
  }'
```

**Step 4: Final Validation**
Check that the data has reached the final state (`PAID`) and the workflow has completed.

```bash
curl http://localhost:3000/api/payments/<id>
```

---

## 🛠️ Infrastructure Reference

| Script                             | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| `npm run build`                    | Compiles the TypeScript project.                   |
| `npm run lint`                     | Ensures code quality and pattern adherence.        |
| `npm run temporal:worker`          | Bootstraps the Temporal Worker.                    |
| `npm run temporal:check-workflows` | Validates workflows for forbidden imports/aliases. |
| `npm run test:unit`                | Executes unit tests.                               |
| `npm run test:e2e:run`             | Executes the full E2E orchestration cycle.         |
| `npx prisma studio`                | Visualise the production/local database content.   |

---

## 🛡️ Workflow Safety & Constraints

Temporal workflows must be **deterministic**. To ensure this, we have a safety check:

- **Constraint**: Workflows cannot use Node.js globals (like `process`) or forbidden aliases (`@modules`, `@shared`).
- **Validation**: Before deploying or after large changes, run:
  ```bash
  npm run temporal:check-workflows
  ```
- **Why?**: This prevents `WorkflowTaskFailed` errors in the Temporal environment.

### Environment Configuration

| Variable                                | Description                               | Default |
| --------------------------------------- | ----------------------------------------- | ------- |
| `MERCADOPAGO_ACCESS_TOKEN`              | Your MP Token (required for preferences)  | –       |
| `MERCADOPAGO_NOTIFICATION_URL`          | Public URL for webhooks (ngrok/tunnel)    | –       |
| `MERCADOPAGO_SUCCESS_URL`               | Redirect URL after successful payment     | –       |
| `MERCADOPAGO_FAILURE_URL`               | Redirect URL after failed payment         | –       |
| `MERCADOPAGO_PENDING_URL`               | Redirect URL for pending payments         | –       |
| `TEMPORAL_ENABLED`                      | Toggle for the orchestration engine       | `true`  |
| `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES` | Time to wait for a webhook before polling | `10`    |
| `TEMPORAL_MOCK_MP`                      | Use mock preference for local testing     | `false` |

---

## ⚠️ Troubleshooting

- **Worker Logs**: Check `docker logs -f payments_worker` if workflows are not progressing.
- **Prisma Schema**: Always run `npx prisma generate` after schema changes.
- **Network**: Ensure port `7233` is not blocked; it's used for Worker-Server communication.

---

**Payments API** | _Built for resilience and scalability._ 🚀
