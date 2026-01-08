# Payments API

A production-ready payment orchestration service built with **NestJS**, **PostgreSQL**, **Mercado Pago**, and **Temporal.io**.  
The API handles PIX and credit-card payments, using Temporal to guarantee reliable, long-running workflows for the credit-card flow.

---

## 📦 Prerequisites

Before starting, make sure you have the following installed:

- **Node.js** (v18+ recommended)
- **Docker & Docker Compose**
- **npm**
- **Git**

---

## ⚙️ Project Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd payments-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment configuration

Copy the example environment file:

```bash
cp .env.example .env
```

> ⚠️ **Important – Public URLs required**  
> Mercado Pago requires **public URLs** not only for webhooks, but also for **redirect URLs** used after the checkout flow.

You **must expose your API publicly** (e.g. using `ngrok`) and configure **all URLs below**.

Example:

```bash
ngrok http 3000
```

Example `.env` configuration:

```env
# Webhook
MERCADOPAGO_NOTIFICATION_URL=https://<your-ngrok-subdomain>.ngrok.app/api/webhooks/mercadopago

# Checkout redirects
MERCADOPAGO_SUCCESS_URL=https://<your-ngrok-subdomain>.ngrok.app/payments/success
MERCADOPAGO_FAILURE_URL=https://<your-ngrok-subdomain>.ngrok.app/payments/failure
MERCADOPAGO_PENDING_URL=https://<your-ngrok-subdomain>.ngrok.app/payments/pending
```

> ℹ️ These redirect URLs are returned inside the Mercado Pago preference and are mandatory for
> **credit-card checkout flows**, even in sandbox mode.

---

## 🏗️ Architecture & Philosophy

This project follows **Clean Architecture**, keeping business logic isolated from infrastructure concerns.

- **Resilience**: Credit-card payments are orchestrated by Temporal workflows.
- **Idempotency**: Webhook handling prevents duplicate processing.
- **Observability**: Workflow states are visible via Temporal UI with structured logs.

---

## 🚀 Execution Modes

### A) Full Stack Mode (Recommended)

```bash
docker compose up -d --build
```

**Services started:**

- NestJS API (port 3000)
- Temporal Worker
- Temporal Server + UI (port 8080)
- PostgreSQL (application + Temporal)

---

### B) Local Development Mode

```bash
npm run start:dev
npm run temporal:worker
```

> ⚠️ Credit-card payments require the Temporal Worker running.

---

## 🧪 Verification Guide

### Automatic Tests

```bash
npm run test:unit
npm run test:e2e:run
```

---

### Manual End-to-End Flow

#### 1. Create a payment

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

Save the returned `id`.

---

#### 2. Observe workflow

Open Temporal UI:

```
http://localhost:8080
```

Workflow name:

```
payment-<id>
```

Status should be **Running**.

---

#### 3. Simulate webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": { "id": "mp-test-demo-123" }
  }'
```

---

#### 4. Validate final state

```bash
curl http://localhost:3000/api/payments/<id>
```

Expected response:

```json
{
  "status": "PAID"
}
```

Workflow should be **Completed** in Temporal UI.

---

## 🛠️ Scripts Reference

| Script                              | Purpose                                  |
|------------------------------------|------------------------------------------|
| `npm run build`                    | Build project                             |
| `npm run lint`                     | Lint code                                |
| `npm run temporal:worker`          | Start Temporal Worker                    |
| `npm run temporal:check-workflows` | Validate workflow determinism             |
| `npm run test:unit`                | Run unit tests                           |
| `npm run test:e2e:run`             | Run full E2E tests                       |
| `npx prisma studio`                | Visualize database                       |

---

## 🛡️ Workflow Safety

Temporal workflows **must be deterministic**.

### Rules

- No Node.js globals (`process`, `Date.now`, etc.)
- No forbidden aliases (`@modules`, `@shared`)

### Validation

```bash
npm run temporal:check-workflows
```

---

## 🌱 Environment Variables

| Variable                                | Description                         | Default |
|----------------------------------------|-------------------------------------|---------|
| `MERCADOPAGO_ACCESS_TOKEN`             | Mercado Pago token                  | –       |
| `MERCADOPAGO_NOTIFICATION_URL`         | Webhook public URL                  | –       |
| `MERCADOPAGO_SUCCESS_URL`              | Success redirect URL                | –       |
| `MERCADOPAGO_FAILURE_URL`              | Failure redirect URL                | –       |
| `MERCADOPAGO_PENDING_URL`              | Pending redirect URL                | –       |
| `TEMPORAL_ENABLED`                     | Enable Temporal                     | `true`  |
| `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES`| Webhook timeout                     | `10`    |
| `TEMPORAL_MOCK_MP`                     | Mock Mercado Pago                   | `false` |

---

## ⚠️ Troubleshooting

- Worker stuck:
```bash
docker logs -f payments_worker
```

- After Prisma changes:
```bash
npx prisma generate
```

- Temporal connection:
Ensure port `7233` is open.

---

**Payments API**  
_Built for resilience, observability, and real-world payment orchestration._
