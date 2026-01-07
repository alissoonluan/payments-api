import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  PaymentMethod,
  PaymentStatus,
} from '../src/modules/payments/domain/payment.enums';
import { PaymentGateway } from '../src/modules/payments/application/ports/payment-gateway';
import { FakePaymentGateway } from '../src/modules/payments/infra/gateways/fake-payment.gateway';
import { E2ETestDatabaseHelper } from './utils/e2e-database.helper';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let fakeGateway: FakePaymentGateway;
  let dbHelper: E2ETestDatabaseHelper;

  beforeAll(async () => {
    dbHelper = new E2ETestDatabaseHelper();
    await dbHelper.connect();

    await dbHelper.cleanDatabase();

    fakeGateway = new FakePaymentGateway();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PaymentGateway)
      .useValue(fakeGateway)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await dbHelper.disconnect();
  });

  const validCpf = '11144477735';

  it('POST /api/payment (CREDIT_CARD) should use gateway and return preference', async () => {
    const createDto = {
      amount: 200.0,
      description: 'E2E Credit Card',
      payerCpf: validCpf,
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };

    const res = await request(app.getHttpServer())
      .post('/api/payment')
      .send(createDto)
      .expect(201);

    const payment = res.body;
    expect(payment.id).toBeDefined();
    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(payment.mpPreferenceId).toBe('test_preference_id');
    expect(payment.mpInitPoint).toBe('http://test.init.point');
  });

  it('POST /api/payment (PIX) should not call gateway but create payment', async () => {
    const createDto = {
      amount: 100.5,
      description: 'E2E PIX',
      payerCpf: validCpf,
      paymentMethod: PaymentMethod.PIX,
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/payment')
      .send(createDto)
      .expect(201);

    const payment = createRes.body;
    expect(payment.id).toBeDefined();
    expect(payment.amount).toBe(100.5);
    expect(payment.mpPreferenceId).toBeFalsy();
  });

  it('GET /api/payment (list with filters)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/payment')
      .query({ cpf: validCpf, paymentMethod: PaymentMethod.CREDIT_CARD })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find(
      (p) =>
        p.payerCpf === validCpf &&
        p.paymentMethod === PaymentMethod.CREDIT_CARD,
    );
    expect(found).toBeDefined();
  });

  it('POST /api/payment should validate CPF', async () => {
    await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 100,
        description: 'Invalid CPF',
        payerCpf: '123',
        paymentMethod: PaymentMethod.PIX,
      })
      .expect(400);
  });

  it('PUT /api/payment/:id (update description and status)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 50,
        description: 'To Update',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.PIX,
      })
      .expect(201);

    const paymentId = createRes.body.id;

    await request(app.getHttpServer())
      .put(`/api/payment/${paymentId}`)
      .send({ description: 'Updated Desc' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/payment/${paymentId}`)
      .send({ status: PaymentStatus.PAID })
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/payment/${paymentId}`)
      .expect(200);

    expect(getRes.body.description).toBe('Updated Desc');
    expect(getRes.body.status).toBe(PaymentStatus.PAID);

    await request(app.getHttpServer())
      .put(`/api/payment/${paymentId}`)
      .send({ status: PaymentStatus.FAIL })
      .expect(422);
  });

  it('POST /api/mercadopago/webhook should update payment status to PAID', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 300,
        description: 'Webhook Test',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    const payment = createRes.body;
    const externalRef = payment.mpExternalReference;
    expect(externalRef).toBeDefined();

    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'approved',
      externalReference: externalRef,
    });

    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'payment',
        data: { id: 'webhook-1' },
      })
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);

    expect(getRes.body.status).toBe(PaymentStatus.PAID);
  });

  it('POST /api/mercadopago/webhook should update payment status to FAIL when rejected', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 250,
        description: 'Webhook Reject Test',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    const payment = createRes.body;
    const externalRef = payment.mpExternalReference;

    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'rejected',
      externalReference: externalRef,
    });

    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'payment',
        data: { id: 'webhook-rejected' },
      })
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);

    expect(getRes.body.status).toBe(PaymentStatus.FAIL);
  });

  it('POST /api/mercadopago/webhook should be idempotent (duplicate webhook)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 350,
        description: 'Idempotency Test',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    const payment = createRes.body;
    const externalRef = payment.mpExternalReference;

    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'approved',
      externalReference: externalRef,
    });

    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'payment',
        data: { id: 'webhook-idempotent' },
      })
      .expect(200);

    const firstCheck = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);
    expect(firstCheck.body.status).toBe(PaymentStatus.PAID);

    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'rejected',
      externalReference: externalRef,
    });

    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'payment',
        data: { id: 'webhook-idempotent-2' },
      })
      .expect(200);

    const secondCheck = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);
    expect(secondCheck.body.status).toBe(PaymentStatus.PAID);
  });

  it('GET /api/payment/:id should return 404 for non-existent payment', async () => {
    await request(app.getHttpServer())
      .get('/api/payment/non-existent-id-12345')
      .expect(404);
  });

  it('POST /api/payment should reject amount <= 0', async () => {
    await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 0,
        description: 'Zero amount',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.PIX,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: -10,
        description: 'Negative amount',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.PIX,
      })
      .expect(400);
  });

  it('GET /api/payment should filter by both cpf and paymentMethod', async () => {
    await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 100,
        description: 'Filter Test PIX',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.PIX,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/payment')
      .query({ cpf: validCpf, paymentMethod: PaymentMethod.PIX })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find(
      (p) => p.payerCpf === validCpf && p.paymentMethod === PaymentMethod.PIX,
    );
    expect(found).toBeDefined();
  });

  it('POST /api/mercadopago/webhook should process payment ID from query params', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 400,
        description: 'Webhook Query Param Test',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    const payment = createRes.body;
    const externalRef = payment.mpExternalReference;

    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'approved',
      externalReference: externalRef,
    });

    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .query({ type: 'payment', 'data.id': 'webhook-query-param' })
      .send({})
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);

    expect(getRes.body.status).toBe(PaymentStatus.PAID);
  });

  it('POST /api/mercadopago/webhook should ignore non-payment type webhooks', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 150,
        description: 'Non-payment webhook test',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    const payment = createRes.body;

    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'merchant_order',
        data: { id: 'some-merchant-order-id' },
      })
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);

    expect(getRes.body.status).toBe(PaymentStatus.PENDING);
  });

  describe('Mercado Pago Return URLs', () => {
    it('GET /api/mercadopago/success should return 200 and success message', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mercadopago/success')
        .query({
          collection_id: '123456789',
          collection_status: 'approved',
          payment_id: '123456789',
          status: 'approved',
          external_reference: '5c0e7b8c-5264-4bf8-8687-3e053a473431',
          payment_type: 'credit_card',
          merchant_order_id: '987654321',
          preference_id: '154032398-3f5f3e26-880c-4394-918c-367781a79d03',
          site_id: 'MLB',
          processing_mode: 'aggregator',
          merchant_account_id: 'null',
        })
        .expect(200);

      expect(res.body.title).toBe('Payment Successful');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.status).toBe('approved');
    });

    it('GET /api/mercadopago/failure should return 200 and failure message', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mercadopago/failure')
        .query({
          collection_id: '123456789',
          collection_status: 'rejected',
          payment_id: '123456789',
          status: 'rejected',
          external_reference: '5c0e7b8c-5264-4bf8-8687-3e053a473431',
          payment_type: 'credit_card',
          merchant_order_id: '987654321',
        })
        .expect(200);

      expect(res.body.title).toBe('Payment Failed');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.status).toBe('rejected');
    });

    it('GET /api/mercadopago/pending should return 200 and pending message', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mercadopago/pending')
        .query({
          collection_id: '123456789',
          collection_status: 'pending',
          payment_id: '123456789',
          status: 'pending',
          external_reference: '5c0e7b8c-5264-4bf8-8687-3e053a473431',
          payment_type: 'credit_card',
          merchant_order_id: '987654321',
        })
        .expect(200);

      expect(res.body.title).toBe('Payment Pending');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.status).toBe('pending');
    });
  });
});
