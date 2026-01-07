# 💳 Payments API - Senior Technical Challenge

Esta é uma solução de backend de alta performance para processamento de pagamentos, construída com **NestJS** e seguindo rigorosamente os princípios de **Clean Architecture**, **SOLID** e **Enterprise Patterns**.

---

## 🏗️ Diferenciais da Implementação (Senior Mindset)

Esta API foi desenvolvida focando em cenários reais de produção:

- **Clean Architecture & Boundary Separation**: Desacoplamento total entre lógica de negócio (Domain/Application) e provedores externos (Prisma, Mercado Pago).
- **Idempotência no Webhook**: O processamento de notificações do Mercado Pago garante consistência de dados mesmo em casos de retentativas automáticas do gateway.
- **Validação de Dados Defensiva**:
  - Implementação de algoritmos de _checksum_ para validadores customizados (CPF).
  - Uso de `ClassValidator` com `Pipes` globais.
- **Observabilidade Avançada (Terminus)**: Endpoint de `/health` completo que monitora Banco de Dados, Disco e Memória para garantir a saúde da infraestrutura.
- **Estratégia de Testes Pragmática**:
  - **Unitários**: Foco em Regras de Negócio, Casos de Uso e Lógica de Controladores (>90% coverage).
  - **E2E**: Fluxo real com Banco de Dados isolado (Docker) e Mocks apenas em IO externo.

---

## 🛠️ Stack Tecnológica

- **Framework**: [NestJS](https://nestjs.com/) (v11+)
- **ORM**: [Prisma](https://www.prisma.io/) com [PostgreSQL](https://www.postgresql.org/)
- **Monitoramento**: [@nestjs/terminus](https://github.com/nestjs/terminus)
- **Documentação**: [Swagger/OpenAPI](https://swagger.io/)
- **Containerização**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Qualidade/Testes**: [Jest](https://jestjs.io/), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)

---

## 📂 Estrutura de Pastas (Organizada por Domínio)

```text
src/
├── infra/            # Infraestrutura Global (Database, Config, Filters)
├── modules/          # Divisões de Negócio
│   ├── payments/     # Módulo Core
│   │   ├── application/   # Use Cases e Ports (Interfaces)
│   │   ├── domain/        # Entidades e Value Objects
│   │   ├── infra/         # Repositories e Gateways (Concreto)
│   │   └── presentation/  # Controllers e DTOs
│   └── health/       # Módulo de Diagnóstico
└── shared/           # Código compartilhado transversal
```

---

## 🚀 Como Executar

### 🐳 Via Docker (Recomendado)

```bash
docker-compose up --build
```

- **API**: `http://localhost:3000`
- **Swagger**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/health`

### 💻 Manualmente

1. `npm install`
2. `docker-compose up postgres -d` (Apenas o DB)
3. `npm run db:migrate`
4. `npm run db:generate`
5. `npm run start:dev`

---

## 🧪 Estratégia de Testes & QA

### Testes Unitários

```bash
npm run test
```

### Testes E2E (Determinísticos)

Executam contra um container PostgreSQL exclusivo na porta `5433` para isolamento total.

```bash
npm run test:e2e:run
```

### Cobertura de Código

```bash
npm run test:cov
# Report: coverage/lcov-report/index.html
```

---

## 📖 Guia de Uso Rápido (Exemplos)

### Criar Pagamento (CREDIT_CARD)

```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "description": "Compra via API",
    "payerCpf": "11144477735",
    "paymentMethod": "CREDIT_CARD"
  }'
```

_Retorna o `mpInitPoint` para redirecionamento do checkout._

### Listar Pagamentos com Filtros

```bash
curl "http://localhost:3000/api/payment?cpf=11144477735&paymentMethod=PIX"
```

### Simular Webhook (Aprovação)

```bash
curl -X POST http://localhost:3000/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": { "id": "TEST-123" }
  }'
```

---

## 📡 Observabilidade e Logs

A aplicação possui um sistema de logs estruturados (JSON) configurado para produção.

### Rastreabilidade (Tracing)

Todo request recebe um `x-correlation-id`. Este ID é propagado para:

1. Logs da aplicação.
2. Chamadas HTTP externas (ex: Mercado Pago API).
3. Resposta ao cliente (Header `x-correlation-id`).

### Integração Mercado Pago: Webhooks vs Return URLs

Para garantir o funcionamento correto localmente (com Ngrok) e em produção, separe as responsabilidades:

1. **Notification URL (Webhook)**:
   - Endpoint: `POST /api/mercadopago/webhook`
   - Função: Receber notificações assíncronas do Mercado Pago e **atualizar o status** da compra no banco de dados.
   - Configuração: Deve ser uma URL pública (ex: `https://seu-ngrok.ngrok-free.app/api/mercadopago/webhook`).

2. **Return URLs (Back URLs)**:
   - Endpoints:
     - `GET /api/mercadopago/success`
     - `GET /api/mercadopago/failure`
     - `GET /api/mercadopago/pending`
   - Função: Receber o usuário de volta após o pagamento no checkout. Apenas **exibe uma mensagem** ao usuário. Não confiar neste retorno para atualizar status críticos.

**Configuração Recomendada (.env):**

```bash
# Webhook (Server-to-Server)
MERCADOPAGO_NOTIFICATION_URL=https://seu-ngrok.ngrok-free.app/api/mercadopago/webhook

# Retorno do Usuário (Browser redirect)
MERCADOPAGO_SUCCESS_URL=https://seu-ngrok.ngrok-free.app/api/mercadopago/success
MERCADOPAGO_FAILURE_URL=https://seu-ngrok.ngrok-free.app/api/mercadopago/failure
MERCADOPAGO_PENDING_URL=https://seu-ngrok.ngrok-free.app/api/mercadopago/pending
```

---

## ✅ Checklist de Qualidade

- [x] **Arquitetura Desacoplada**: Implementação baseada em interfaces (Ports).
- [x] **Resiliência**: Tratamento de exceções via Exception Filters.
- [x] **Documentação**: API 100% documentada com Swagger/OpenAPI.
- [x] **Segurança**: Validação de schema e sanitização de inputs.
- [x] **Testabilidade**: Infra para testes automatizados CI-ready.
