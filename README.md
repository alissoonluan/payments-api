# Payments API 💳 - Teste Técnico

Este repositório contém a implementação de uma API REST escalável para gerenciamento de pagamentos, desenvolvida como **Teste Técnico**.

O objetivo principal deste projeto foi demonstrar proficiência em:

- **Clean Architecture** e princípios **SOLID**.
- **NestJS** com injeção de dependência avançada.
- **Testes Automatizados** (Unitários e E2E) com estratégias de isolamento.
- **Integração Externa** robusta e desacoplada (Mercado Pago).
- **Dockerização** e prontidão para ambientes de produção.

## 🚀 Tecnologias

- **Framework:** [NestJS](https://nestjs.com/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **ORM:** [Prisma](https://www.prisma.io/) (v7)
- **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/)
- **Documentação:** [Swagger/OpenAPI](https://swagger.io/)
- **Containerização:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Testes:** [Jest](https://jestjs.io/) & [SuperTest](https://github.com/visionmedia/supertest)

---

## 🏗️ Arquitetura

O projeto segue rigorosamente a **Clean Architecture**, dividindo responsabilidades em camadas concêntricas:

1. **Domain**: Entidades puras, Enums e Value Objects. Sem dependências externas.
2. **Application**: Casos de uso (Use Cases) e Portas (Interfaces de Gateway/Repository). A lógica de negócio reside aqui.
3. **Infrastructure**: Implementação concreta das portas.
   - `PrismaRepository`: Persistência.
   - `MercadoPagoGateway`: Adaptador para o gateway de pagamento.
   - `MercadoPagoClient`: Cliente HTTP encapsulado para chamadas externas.
4. **Presentation**: Controladores REST e DTOs.

---

## 🛠️ Como rodar o projeto

### 1. Com Docker (Recomendado)

A aplicação sobe "pronta para uso" com banco de dados configurado e variáveis de ambiente injetadas pelo Compose.

```bash
docker-compose up --build
```

- **API:** `http://localhost:3000`
- **Swagger Docs:** `http://localhost:3000/api/docs`
- **Health Check:** `http://localhost:3000/health`
- **Banco de Dados:** Porta `5433` (externa) mapping para `5432` (interna).

### 2. Rodando Localmente

Pré-requisitos: Node.js >= 20, npm, Docker (apenas para o DB).

1. Instale dependências: `npm install`
2. Configure `.env`: Copie `.env.example` para `.env`.
3. Suba o banco: `docker-compose up postgres -d`
4. Gere o Prisma Client: `npm run db:generate`
5. Rode migrations: `npm run db:migrate`
6. Inicie: `npm run start:dev`

---

## 🧪 Estratégia de Testes

A qualidade e a confiabilidade foram prioridades máximas. A suíte de testes foi desenhada para ser **determinística** e rodar sem dependências de rede.

### � Testes Unitários (`npm run test`)

Cobrem 100% da lógica de negócio e adaptadores de infraestrutura.

- **Mocking Extensivo**: Repositórios e Gateways são mockados.
- **MercadoPagoClient**: Testado isoladamente simulando respostas HTTP (Axios) de sucesso e erro. Nenhum tráfego de rede real ocorre.

### 🟡 Testes E2E (`npm run test:e2e`)

Garantem que os controladores, DTOs e injeção de dependência funcionam integrados.

- **FakePaymentGateway**: O `PaymentGateway` real é substituído (via `overrideProvider`) por um `FakePaymentGateway` durante os testes E2E.
- **Segurança**: Isso garante que **nenhuma chamada ao Mercado Pago** seja feita durante a execução da pipeline de CI ou testes locais, evitando cobranças indevidas ou "flakiness" por falha de rede.

---

## 💳 Integração Mercado Pago

A integração foi arquitetada para ser modular. O sistema suporta pagamentos via **PIX** (simulado internamente) e **Cartão de Crédito** (via Mercado Pago).

### Arquitetura de Integração

- **MercadoPagoClient Module**: Módulo dedicado que encapsula a comunicação HTTP, autenticação e tratamento de erros específicos (400, 401, 422).
- **Gateway Pattern**: O Use Case desconhece o Mercado Pago; ele interage apenas com a interface `PaymentGateway`.

### Variáveis de Ambiente Necessárias

Para testar a integração REAL (manual/sandbox), configure no `.env`:

- `MERCADOPAGO_ACCESS_TOKEN`: Token de teste (Sandbox).
- `MERCADOPAGO_NOTIFICATION_URL`: URL pública (ex: ngrok) para receber Webhooks.
- `MERCADOPAGO_BACK_URL_*`: URLs de redirecionamento.

### Webhooks

O endpoint `POST /api/mercadopago/webhook` processa notificações de status. O fluxo é resiliente e idempotente, garantindo que o status do pagamento seja atualizado corretamente (PENDING -> PAID/FAIL).

---

## 📚 Documentação (Swagger)

A API está 100% documentada via OpenAPI/Swagger.

Acesse: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

A documentação inclui:

- **Schemas**: Contratos de entrada e saída (DTOs).
- **Respostas HTTP**: Exemplos reais de 200, 201, 400, 404 e 422.
- **Exemplos de Payload**: JSONs prontos para teste.

---

## 🤖 CI / Qualidade

O projeto inclui configuração de CI (GitHub Actions) que executa a cada push:

1. **Linting**: Garante padrão de código (ESLint/Prettier).
2. **Build**: Verifica integridade de compilação.
3. **Tests**: Executa toda a suíte de testes (que, reforçando, não depende de serviços externos).

---

## ✅ Checklist de Entrega

- [x] Aplicação rodando via Docker.
- [x] Arquitetura desacoplada (Clean Architecture).
- [x] Swagger completo e funcional.
- [x] Testes Unitários passando (Cobertura Sênior).
- [x] Testes E2E passando (Com isolamento de Gateway).
- [x] Integração Mercado Pago modularizada.
- [x] Tratamento de erros consistente.
- [x] Documentação técnica (README) revisada.

---

**Autor:** [Seu Nome/Candidato]
