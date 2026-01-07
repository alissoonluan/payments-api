import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  PaymentMethod,
  PaymentStatus,
} from '../src/modules/payments/domain/payment.enums';
import { PaymentGateway } from '../src/modules/payments/application/ports/payment-gateway';
import { FakePaymentGateway } from '../src/modules/payments/infrastructure/gateways/fake-payment.gateway';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let fakeGateway: FakePaymentGateway;

  beforeAll(async () => {
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
    // Values from FakePaymentGateway
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
    expect(payment.mpPreferenceId).toBeFalsy(); // Should be null/undefined for PIX in this architecture if not set
  });

  it('GET /api/payment (list with filters)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/payment')
      .query({ cpf: validCpf, paymentMethod: PaymentMethod.CREDIT_CARD })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // We created one in the first test
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
    // 1. Create a PIX payment (starts PENDING)
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

    // 2. Update description
    await request(app.getHttpServer())
      .put(`/api/payment/${paymentId}`)
      .send({ description: 'Updated Desc' })
      .expect(200);

    // 3. Update status to PAID
    await request(app.getHttpServer())
      .put(`/api/payment/${paymentId}`)
      .send({ status: PaymentStatus.PAID })
      .expect(200);

    // 4. Verify updates
    const getRes = await request(app.getHttpServer())
      .get(`/api/payment/${paymentId}`)
      .expect(200);

    expect(getRes.body.description).toBe('Updated Desc');
    expect(getRes.body.status).toBe(PaymentStatus.PAID);

    // 5. Try to fail it (not allowed from PAID)
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

    // First webhook
    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'payment',
        data: { id: 'webhook-idempotent' },
      })
      .expect(200);

    // Verify PAID
    const firstCheck = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);
    expect(firstCheck.body.status).toBe(PaymentStatus.PAID);

    // Second webhook (duplicate) - should not change to FAIL
    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'rejected', // Try to change to rejected
      externalReference: externalRef,
    });

    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'payment',
        data: { id: 'webhook-idempotent-2' },
      })
      .expect(200);

    // Should still be PAID (idempotent)
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
    // Create PIX payment
    await request(app.getHttpServer())
      .post('/api/payment')
      .send({
        amount: 100,
        description: 'Filter Test PIX',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.PIX,
      })
      .expect(201);

    // Query with both filters
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
});
