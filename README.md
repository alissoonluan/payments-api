# 💳 Payments API - Production-Ready Payment Orchestration

API de pagamentos profissional com **NestJS**, **PostgreSQL**, **Mercado Pago** e **Temporal.io** para orquestração robusta de workflows de pagamento.

---

## 🏗️ Arquitetura

### Clean Architecture

- **Domain**: Entidades e enums de negócio (`PaymentEntity`, `PaymentStatus`, `PaymentMethod`)
- **Application**: Use Cases, DTOs e Ports (interfaces)
- **Infrastructure**: Implementações concretas (Prisma, Mercado Pago, Temporal)

### Stack Tecnológico

- **Backend**: NestJS 11 + TypeScript
- **Database**: PostgreSQL 15 + Prisma ORM
- **Payment Gateway**: Mercado Pago (Checkout Pro)
- **Workflow Engine**: Temporal.io
- **Containerization**: Docker + Docker Compose

---

## 🚀 Quick Start

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (opcional, para desenvolvimento local)

### 1. Configuração

```bash
cp .env.example .env
```

**Importante**: Configure seu `MERCADOPAGO_ACCESS_TOKEN` com um token de teste do [Mercado Pago Developers](https://www.mercadopago.com.br/developers).

### 2. Iniciar Infraestrutura Completa

```bash
docker-compose up -d --build
```

Este comando sobe:

- ✅ PostgreSQL (porta 5432) - Banco da aplicação
- ✅ Temporal PostgreSQL (porta 5433) - Banco do Temporal
- ✅ Temporal Server (porta 7233)
- ✅ Temporal UI (porta 8080) - Interface web
- ✅ API NestJS (porta 3000)
- ✅ Temporal Worker - Processa workflows

### 3. Verificar Saúde

```bash
curl http://localhost:3000/health
```

Acesse a documentação Swagger: **http://localhost:3000/api/docs**

---

## 📋 Fluxos de Pagamento

### PIX (Simples)

1. Cliente cria pagamento via `POST /api/payments`
2. Sistema retorna status `PENDING`
3. Cliente efetua pagamento (fora do escopo)
4. Webhook atualiza status para `PAID`

### CREDIT_CARD (Orquestrado por Temporal)

1. **Criação**: `POST /api/payments` com `paymentMethod: CREDIT_CARD`
2. **Workflow Iniciado**: Temporal cria workflow `payment-{id}`
3. **Preference MP**: Activity cria checkout no Mercado Pago
4. **Aguarda Confirmação**:
   - **Webhook** → Signal do Temporal (caminho feliz)
   - **Timeout** → Polling fallback (3 tentativas)
5. **Finalização**: Status atualizado para `PAID` ou `FAIL`

---

## 🧪 Como Testar

### Testes Automatizados

#### Testes Unitários

```bash
npm run test:unit
```

Cobre:

- ✅ CreatePaymentUseCase (PIX e CREDIT_CARD)
- ✅ ProcessMercadoPagoWebhookUseCase (idempotência, sinais)
- ✅ MercadoPagoWebhookService (parsing robusto)
- ✅ PaymentActivities (Temporal)

#### Testes E2E

```bash
npm run test:e2e:run
```

Sobe banco isolado e valida:

- ✅ POST /api/payments (PIX e CREDIT_CARD)
- ✅ POST /api/webhooks/mercadopago
- ✅ Validações (CPF, amount)

### Teste Manual Ponta-a-Ponta

#### 1. Criar Pagamento CREDIT_CARD

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.00,
    "description": "Teste Técnico Sênior",
    "payerCpf": "11144477735",
    "paymentMethod": "CREDIT_CARD"
  }'
```

**Resposta esperada**:

```json
{
  "id": "abc-123",
  "status": "PENDING",
  "mpInitPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "mpExternalReference": "abc-123"
}
```

#### 2. Verificar Workflow no Temporal UI

1. Acesse: **http://localhost:8080**
2. Busque por `payment-abc-123`
3. Status deve ser **Running**
4. Veja os logs estruturados em cada Activity

#### 3. Simular Pagamento Aprovado (Webhook)

```bash
curl -X POST "http://localhost:3000/api/webhooks/mercadopago?data.id=mp-test-123&type=payment" \
  -H "Content-Type: application/json" \
  -d '{"action": "payment.created", "data": {"id": "mp-test-123"}}'
```

**Nota**: Configure o mock do gateway para retornar:

```typescript
{
  status: 'approved',
  externalReference: 'abc-123'
}
```

#### 4. Verificar Status Final

```bash
curl http://localhost:3000/api/payments/abc-123
```

**Resposta esperada**:

```json
{
  "id": "abc-123",
  "status": "PAID",
  "mpPaymentId": "mp-test-123"
}
```

#### 5. Confirmar Workflow Completo

No Temporal UI, o workflow `payment-abc-123` deve estar **Completed** com status `PAID`.

---

## 🔥 Cenários de Erro (Workflow Robusto)

### 1. Falha ao Criar Preference no Mercado Pago

**Simular**: Remova/invalide `MERCADOPAGO_ACCESS_TOKEN`

**Resultado**:

- Activity `createMercadoPagoPreference` falha
- Workflow atualiza payment para `FAIL` com `failReason: "mp_preference_creation_failed"`
- Workflow finaliza como **Completed** (não Failed)

**Logs esperados**:

```
[WORKFLOW] code=MP_PREFERENCE_FAILED
[WORKFLOW] code=WORKFLOW_COMPLETED status=FAIL reason=mp_preference_creation_failed
```

### 2. Timeout Aguardando Confirmação

**Simular**: Reduza `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES=1` e não envie webhook

**Resultado**:

- Workflow aguarda 1 minuto
- Inicia polling fallback (3 tentativas de 1 minuto cada)
- Se nenhum status final, marca `FAIL` com `failReason: "timeout_waiting_confirmation"`

**Logs esperados**:

```
[WORKFLOW] code=SIGNAL_TIMEOUT
[WORKFLOW] code=POLLING_PENDING attempt=1
[WORKFLOW] code=POLLING_EXHAUSTED
[WORKFLOW] code=WORKFLOW_COMPLETED status=FAIL reason=timeout_waiting_confirmation
```

### 3. Pagamento Rejeitado pelo Mercado Pago

**Simular**: Configure mock para retornar `status: 'rejected'`

**Resultado**:

- Webhook mapeia para `PaymentStatus.FAIL`
- Signal enviado ao workflow com status `FAIL`
- Payment atualizado com `failReason: "mp_status_rejected"`

### 4. Webhook Duplicado (Idempotência)

**Simular**: Envie o mesmo webhook 2x

**Resultado**:

- Primeira chamada: processa normalmente
- Segunda chamada: log `WEBHOOK_DUPLICATE` e retorna `200 OK` sem processar

### 5. Webhook com Payload Inesperado

**Simular**: Envie webhook com `type: "merchant_order"` ou sem `data.id`

**Resultado**:

- Controller sempre retorna `200 OK`
- Logs: `MP_WEBHOOK_IGNORED` ou `MP_WEBHOOK_NO_ID`
- Mercado Pago não retenta

---

## 📊 Observabilidade

### Códigos de Log Estruturados

| Código                  | Descrição                          |
| ----------------------- | ---------------------------------- |
| `CREATE_PAYMENT_START`  | Início da criação de pagamento     |
| `WORKFLOW_STARTED`      | Workflow Temporal iniciado         |
| `MP_PREFERENCE_CREATED` | Preference criada no Mercado Pago  |
| `SIGNAL_RECEIVED`       | Webhook sinalizou o workflow       |
| `SIGNAL_TIMEOUT`        | Timeout aguardando webhook         |
| `POLLING_SUCCESS`       | Status obtido via polling          |
| `WORKFLOW_COMPLETED`    | Workflow finalizado (PAID ou FAIL) |
| `WEBHOOK_DUPLICATE`     | Evento duplicado ignorado          |
| `WEBHOOK_MP_FETCHED`    | Dados buscados do Mercado Pago     |

### Correlação de Logs

Todos os logs incluem:

- `paymentId`: ID interno do pagamento
- `workflowId`: ID do workflow Temporal (`payment-{id}`)
- `mpPaymentId`: ID do pagamento no Mercado Pago
- `externalReference`: Correlação entre sistemas (= `paymentId`)

---

## 🛠️ Scripts Úteis

```bash
# Desenvolvimento
npm run start:dev              # API em modo watch
npm run temporal:worker        # Worker Temporal standalone

# Testes
npm run test                   # Todos os testes
npm run test:unit              # Apenas unitários
npm run test:e2e:run           # E2E com banco isolado
npm run lint                   # Verificar padrões

# Docker
docker-compose up -d           # Subir tudo
docker-compose logs -f app     # Ver logs da API
docker-compose logs -f worker  # Ver logs do Worker
docker-compose down -v         # Parar e limpar volumes

# Prisma
npx prisma studio              # Interface visual do banco
npx prisma migrate dev         # Criar nova migração
npx prisma generate            # Regenerar cliente
```

---

## 🔐 Variáveis de Ambiente

| Variável                                | Descrição                       | Padrão           |
| --------------------------------------- | ------------------------------- | ---------------- |
| `PORT`                                  | Porta da API                    | `3000`           |
| `DATABASE_URL`                          | Connection string PostgreSQL    | -                |
| `MERCADOPAGO_ACCESS_TOKEN`              | Token de acesso MP              | -                |
| `TEMPORAL_ENABLED`                      | Habilitar Temporal              | `true`           |
| `TEMPORAL_ADDRESS`                      | Endereço do Temporal Server     | `localhost:7233` |
| `TEMPORAL_TASK_QUEUE`                   | Fila de tasks                   | `payments-queue` |
| `TEMPORAL_MOCK_MP`                      | Mockar Mercado Pago no Temporal | `false`          |
| `WORKFLOW_CONFIRMATION_TIMEOUT_MINUTES` | Timeout do signal               | `10`             |

---

## ✅ Checklist de Validação (Avaliador)

Antes de aprovar, execute:

- [ ] `docker-compose up -d --build` - Tudo sobe sem erros
- [ ] `curl http://localhost:3000/health` - Retorna `200 OK`
- [ ] `curl http://localhost:8080` - Temporal UI acessível
- [ ] `npm run test:unit` - Todos os testes passam
- [ ] `npm run test:e2e:run` - E2E passa
- [ ] Criar pagamento PIX - Status `PENDING`
- [ ] Criar pagamento CREDIT_CARD - Retorna `mpInitPoint`
- [ ] Verificar workflow no Temporal UI - Status `Running`
- [ ] Simular webhook aprovado - Payment vai para `PAID`
- [ ] Workflow no Temporal UI - Status `Completed`
- [ ] Simular erro (token inválido) - Payment vai para `FAIL` com `failReason`
- [ ] Webhook duplicado - Retorna `200` e ignora
- [ ] `npm run lint` - Sem erros

---

## 🎯 Decisões Técnicas

### Por que Temporal.io?

- **Resiliência**: Retries automáticos, timeouts configuráveis
- **Observabilidade**: UI nativa para debug de workflows
- **Determinismo**: Garantia de execução consistente
- **Escalabilidade**: Workers horizontalmente escaláveis

### Por que payment.id como externalReference?

- **Simplicidade**: Evita gerar UUIDs adicionais
- **Rastreabilidade**: Correlação direta entre sistemas
- **Idempotência**: Chave única para deduplicação

### Por que Webhook sempre retorna 200?

- **Resiliência**: Evita retentativas desnecessárias do Mercado Pago
- **Idempotência**: Sistema lida internamente com duplicatas
- **Logs**: Erros são registrados sem quebrar o contrato

---

## 📝 Assunções e Trade-offs

### Assunções

- Mercado Pago envia webhooks confiáveis (eventual consistency)
- Temporal Server está sempre disponível (ou usa fallback)
- PostgreSQL é a única fonte de verdade

### Trade-offs

- **Polling Fallback**: Adiciona latência mas garante finalização
- **Workflow Timeout**: 10 minutos padrão (ajustável por env)
- **Mock no Temporal**: Facilita testes mas requer flag explícita

---

**Desenvolvido com foco em qualidade, resiliência e experiência do avaliador.** 🚀
