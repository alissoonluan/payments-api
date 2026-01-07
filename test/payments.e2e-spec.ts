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

  it('POST /api/mercadopago/webhook should update payment status', async () => {
    // 1. Create a payment that has an external reference (simulating CC or PIX w/ integration)
    // For this test, we can manually create one via POST and assert expecting it has an ID,
    // BUT the webhook logic relies on `gateway.getPaymentById` returning the external reference
    // containing the payment ID (or some logic to link them).
    //
    // The `ProcessMercadoPagoWebhookUseCase` calls `gateway.getPaymentById(mpPaymentId)`.
    // The gateway returns `{ externalReference, status }`.
    // Then repo finds by externalReference.
    //
    // Our fake gateway returns 'ext-ref-approved' for 'mp-approved'.
    // So we need to ensure a payment exists in DB with `mpExternalReference = 'ext-ref-approved'`.

    // We can't directly inject into Repo easily in E2E without avoiding the controller.
    // So we create a payment normally, but we can't easily set `mpExternalReference` via API (it's internal).
    //
    // However, `CreatePaymentUseCase` for CREDIT_CARD sets `mpExternalReference` to `uuid()`.
    // We don't know that UUID.
    //
    // Strategy:
    // 1. Use `createPayment` (Credit Card). It generates an external reference.
    // 2. We can't force the external reference to be 'ext-ref-approved' unless we mock the UUID generator or the Gateway returns it.
    //    Actually, `CreatePaymentUseCase` sets `mpExternalReference` BEFORE calling gateway?
    //    Let's check `CreatePaymentUseCase`.

    // Checked UseCase:
    // const mpExternalReference = uuidv4();
    // await this.paymentGateway.createPreference(...)

    // The only way to match them is if `FakePaymentGateway.getPaymentById` returns the SAME external reference
    // that was stored in the DB. But `getPaymentById` takes `mpPaymentId` as input (from webhook).
    // The real gateway would look up the payment on MP and return the `external_reference` we sent it.

    // Valid Testing Strategy with Fakes:
    // Since we cannot easily know the UUID generated inside the use-case (unless we query the DB or the API returns it).
    // The API DOES return `mpExternalReference` in `PaymentResponseDto` (if we allowed it).
    // Let's check `PaymentResponseDto`. Yes, it has `@ApiPropertyOptional() mpExternalReference`.

    // So:
    // 1. Create Payment (CC).
    // 2. Get `mid` (mpExternalReference) from response.
    // 3. Configure `FakeGateway` to return THIS `mid` when queried with a specific `mpPaymentId`.
    //    We need `Reflect` or `jest.spy` on the `fakeGateway` instance we have reference to!

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

    // Mock the gateway response for a specific ID 'webhook-1' to return this externalRef and 'approved'
    // We can monkey-patch the fakeGateway instance since it's a singleton in the app module scope we created.
    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'approved',
      externalReference: externalRef,
    });

    // Send Webhook
    await request(app.getHttpServer())
      .post('/api/mercadopago/webhook')
      .send({
        type: 'payment',
        data: { id: 'webhook-1' },
      })
      .expect(200); // Controller returns { ok: true } (200)

    // Check if status changed to PAID
    const getRes = await request(app.getHttpServer())
      .get(`/api/payment/${payment.id}`)
      .expect(200);

    expect(getRes.body.status).toBe(PaymentStatus.PAID);
  });
});
