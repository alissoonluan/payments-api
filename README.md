# Payments API

A production-ready payment orchestration API built with **NestJS**, **PostgreSQL**, **Mercado Pago**, and **Temporal.io** for robust workflow management.

---

## Architecture

### Clean Architecture Principles

This project follows Clean Architecture to ensure maintainability, testability, and independence from frameworks:

- **Domain Layer**: Framework-agnostic business entities and enums (`PaymentEntity`, `PaymentStatus`, `PaymentMethod`)
- **Application Layer**: Use cases, DTOs, and port interfaces (repository and gateway contracts)
- **Infrastructure Layer**: Concrete implementations (Prisma ORM, Mercado Pago client, Temporal.io integration)
- **Presentation Layer**: HTTP controllers and API contracts (REST endpoints, Swagger documentation)

### Technology Stack

- **Backend Framework**: NestJS 11 + TypeScript
- **Database**: PostgreSQL 15 + Prisma ORM
- **Payment Gateway**: Mercado Pago (Checkout Pro)
- **Workflow Orchestration**: Temporal.io
- **Containerization**: Docker + Docker Compose

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (optional, for local development)

### 1. Configuration

```bash
cp .env.example .env
```

**Important**: Configure your `MERCADOPAGO_ACCESS_TOKEN` with a test token from [Mercado Pago Developers](https://www.mercadopago.com.br/developers).

### 2. Start Complete Infrastructure

```bash
docker-compose up -d --build
```

This command starts:

- ✅ PostgreSQL (port 5432) - Application database
- ✅ Temporal PostgreSQL (port 5433) - Temporal database
- ✅ Temporal Server (port 7233)
- ✅ Temporal UI (port 8080) - Web interface
- ✅ NestJS API (port 3000)
- ✅ Temporal Worker - Processes workflows

### 3. Health Check

```bash
curl http://localhost:3000/health
```

Access Swagger documentation: **http://localhost:3000/api/docs**

---

## Payment Flows

### PIX (Simple Flow)

1. Client creates payment via `POST /api/payments`
2. System returns status `PENDING`
3. Client completes payment (external to this system)
4. Webhook updates status to `PAID`

### CREDIT_CARD (Temporal Orchestrated)

1. **Creation**: `POST /api/payments` with `paymentMethod: CREDIT_CARD`
2. **Workflow Started**: Temporal creates workflow `payment-{id}`
3. **Mercado Pago Preference**: Activity creates checkout preference
4. **Awaiting Confirmation**:
   - **Webhook** → Temporal signal (happy path)
   - **Timeout** → Polling fallback (3 attempts)
5. **Completion**: Status updated to `PAID` or `FAIL`

---

## Testing

### Automated Tests

#### Unit Tests

```bash
npm run test:unit
```

Coverage:

- ✅ CreatePaymentUseCase (PIX and CREDIT_CARD)
- ✅ ProcessMercadoPagoWebhookUseCase (idempotency, signals)
- ✅ MercadoPagoWebhookService (robust parsing)
- ✅ PaymentActivities (Temporal)

#### E2E Tests

```bash
npm run test:e2e:run
```

Validates:

- ✅ POST /api/payments (PIX and CREDIT_CARD)
- ✅ POST /api/webhooks/mercadopago
- ✅ Input validations (CPF, amount)

### Manual End-to-End Testing

#### 1. Create CREDIT_CARD Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.00,
    "description": "Production Test",
    "payerCpf": "11144477735",
    "paymentMethod": "CREDIT_CARD"
  }'
```

**Expected Response**:

```json
{
  "id": "abc-123",
  "status": "PENDING",
  "mpInitPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "mpExternalReference": "abc-123"
}
```

#### 2. Verify Workflow in Temporal UI

1. Access: **http://localhost:8080**
2. Search for `payment-abc-123`
3. Status should be **Running**
4. View structured logs in each Activity

#### 3. Simulate Approved Payment (Webhook)

```bash
curl -X POST "http://localhost:3000/api/webhooks/mercadopago?data.id=mp-test-123&type=payment" \
  -H "Content-Type: application/json" \
  -d '{"action": "payment.created", "data": {"id": "mp-test-123"}}'
```

**Note**: Configure gateway mock to return:

```typescript
{
  status: 'approved',
  externalReference: 'abc-123'
}
```

#### 4. Verify Final Status

```bash
curl http://localhost:3000/api/payments/abc-123
```

**Expected Response**:

```json
{
  "id": "abc-123",
  "status": "PAID",
  "mpPaymentId": "mp-test-123"
}
```

#### 5. Confirm Workflow Completion

In Temporal UI, workflow `payment-abc-123` should be **Completed** with status `PAID`.

---

## Error Scenarios (Robust Workflow)

### 1. Mercado Pago Preference Creation Failure

**Simulate**: Remove/invalidate `MERCADOPAGO_ACCESS_TOKEN`

**Result**:

- Activity `createMercadoPagoPreference` fails
- Workflow updates payment to `FAIL` with `failReason: "mp_preference_creation_failed"`
- Workflow completes as **Completed** (not Failed)

**Expected Logs**:

```
[WORKFLOW] code=MP_PREFERENCE_FAILED
[WORKFLOW] code=WORKFLOW_COMPLETED status=FAIL reason=mp_preference_creation_failed
```

### 2. Timeout Awaiting Confirmation

**Simulate**: Set `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES=1` and don't send webhook

**Result**:

- Workflow waits 1 minute
- Starts polling fallback (3 attempts of 1 minute each)
- If no final status, marks `FAIL` with `failReason: "timeout_waiting_confirmation"`

**Expected Logs**:

```
[WORKFLOW] code=SIGNAL_TIMEOUT
[WORKFLOW] code=POLLING_PENDING attempt=1
[WORKFLOW] code=POLLING_EXHAUSTED
[WORKFLOW] code=WORKFLOW_COMPLETED status=FAIL reason=timeout_waiting_confirmation
```

### 3. Payment Rejected by Mercado Pago

**Simulate**: Configure mock to return `status: 'rejected'`

**Result**:

- Webhook maps to `PaymentStatus.FAIL`
- Signal sent to workflow with status `FAIL`
- Payment updated with `failReason: "mp_status_rejected"`

### 4. Duplicate Webhook (Idempotency)

**Simulate**: Send same webhook twice

**Result**:

- First call: processes normally
- Second call: log `WEBHOOK_DUPLICATE` and returns `200 OK` without processing

### 5. Webhook with Unexpected Payload

**Simulate**: Send webhook with `type: "merchant_order"` or without `data.id`

**Result**:

- Controller always returns `200 OK`
- Logs: `MP_WEBHOOK_IGNORED` or `MP_WEBHOOK_NO_ID`
- Mercado Pago doesn't retry

---

## Observability

### Structured Log Codes

| Code                    | Description                       |
| ----------------------- | --------------------------------- |
| `CREATE_PAYMENT_START`  | Payment creation initiated        |
| `WORKFLOW_STARTED`      | Temporal workflow started         |
| `MP_PREFERENCE_CREATED` | Mercado Pago preference created   |
| `SIGNAL_RECEIVED`       | Webhook signaled the workflow     |
| `SIGNAL_TIMEOUT`        | Timeout waiting for webhook       |
| `POLLING_SUCCESS`       | Status obtained via polling       |
| `WORKFLOW_COMPLETED`    | Workflow completed (PAID or FAIL) |
| `WEBHOOK_DUPLICATE`     | Duplicate event ignored           |
| `WEBHOOK_MP_FETCHED`    | Data fetched from Mercado Pago    |

### Log Correlation

All logs include:

- `paymentId`: Internal payment ID
- `workflowId`: Temporal workflow ID (`payment-{id}`)
- `mpPaymentId`: Mercado Pago payment ID
- `externalReference`: Cross-system correlation (= `paymentId`)

---

## Useful Scripts

```bash
# Development
npm run start:dev              # API in watch mode
npm run temporal:worker        # Standalone Temporal worker

# Testing
npm run test                   # All tests
npm run test:unit              # Unit tests only
npm run test:e2e:run           # E2E with isolated database
npm run lint                   # Check code standards

# Docker
docker-compose up -d           # Start all services
docker-compose logs -f app     # View API logs
docker-compose logs -f worker  # View Worker logs
docker-compose down -v         # Stop and clean volumes

# Prisma
npx prisma studio              # Visual database interface
npx prisma migrate dev         # Create new migration
npx prisma generate            # Regenerate client
```

---

## Full End‑to‑End Flow

1. **Create Payment** – Client calls `POST /api/payments` with `paymentMethod` set to `CREDIT_CARD` (or `PIX`). The API returns a `mpInitPoint` URL (Mercado Pago checkout) and the internal `payment.id` as `mpExternalReference`.
2. **Redirect to Mercado Pago** – The client opens the `mpInitPoint` URL. After the buyer completes the checkout, Mercado Pago redirects the user to one of the URLs configured in the environment:
   - `MERCADOPAGO_SUCCESS_URL` – payment approved.
   - `MERCADOPAGO_FAILURE_URL` – payment rejected.
   - `MERCADOPAGO_PENDING_URL` – payment pending (e.g., awaiting bank confirmation).
3. **Webhook Notification** – Regardless of the UI outcome, Mercado Pago sends a webhook (`type: "payment"`) to the URL defined by `MERCADOPAGO_NOTIFICATION_URL`. The payload contains the Mercado Pago payment ID.
4. **Webhook Processing** – The API receives the webhook, checks idempotency, fetches the payment details from Mercado Pago, maps the status to our domain (`PAID`, `FAIL`, etc.) and updates the `Payment` record. If the payment is a credit‑card flow, the webhook also **signals** the running Temporal workflow with the result.
5. **Temporal Workflow** – The workflow, started at step 1, waits for the signal. If the signal arrives, it completes the workflow with the final status. If the signal does not arrive within `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES`, the workflow falls back to polling Mercado Pago (up to 3 attempts) and finally marks the payment as `FAIL` with `failReason: "timeout_waiting_confirmation"`.
6. **Final Status** – The client can query `GET /api/payments/{id}` to see the final status (`PAID`, `FAIL`, etc.) and the `mpPaymentId` assigned by Mercado Pago.

---

## Environment Variables

| Variable                                | Description                               | Default                                          |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| `PORT`                                  | API port                                  | `3000`                                           |
| `DATABASE_URL`                          | PostgreSQL connection string              | -                                                |
| `MERCADOPAGO_ACCESS_TOKEN`              | Mercado Pago access token                 | -                                                |
| `MERCADOPAGO_NOTIFICATION_URL`          | URL where Mercado Pago will POST webhooks | `http://localhost:3000/api/webhooks/mercadopago` |
| `MERCADOPAGO_SUCCESS_URL`               | URL for successful checkout redirects     | `http://localhost:3000/api/mercadopago/success`  |
| `MERCADOPAGO_FAILURE_URL`               | URL for failed checkout redirects         | `http://localhost:3000/api/mercadopago/failure`  |
| `MERCADOPAGO_PENDING_URL`               | URL for pending checkout redirects        | `http://localhost:3000/api/mercadopago/pending`  |
| `TEMPORAL_ENABLED`                      | Enable Temporal integration               | `true`                                           |
| `TEMPORAL_ADDRESS`                      | Temporal Server address                   | `localhost:7233`                                 |
| `TEMPORAL_TASK_QUEUE`                   | Task queue name                           | `payments-queue`                                 |
| `TEMPORAL_MOCK_MP`                      | Mock Mercado Pago in Temporal             | `false`                                          |
| `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES` | Signal timeout (minutes)                  | `10`                                             |

---

## Technical Decisions

### Why Temporal.io?

- **Resilience**: Automatic retries, configurable timeouts
- **Observability**: Native UI for workflow debugging
- **Determinism**: Guaranteed consistent execution
- **Scalability**: Horizontally scalable workers

### Why payment.id as externalReference?

- **Simplicity**: Avoids generating additional UUIDs
- **Traceability**: Direct correlation between systems
- **Idempotency**: Unique key for deduplication

### Why Webhook Always Returns 200?

- **Resilience**: Avoids unnecessary retries from Mercado Pago
- **Idempotency**: System handles duplicates internally
- **Logging**: Errors are logged without breaking the contract

---

## Assumptions and Trade-offs

### Assumptions

- Mercado Pago sends reliable webhooks (eventual consistency)
- Temporal Server is always available (or uses fallback)
- PostgreSQL is the single source of truth

### Trade-offs

- **Polling Fallback**: Adds latency but ensures completion
- **Workflow Timeout**: 10 minutes default (configurable via env)
- **Mock in Temporal**: Facilitates testing but requires explicit flag

---

**Built with focus on quality, resilience, and production readiness.** 🚀
