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
import { PaymentWorkflowPort } from '../src/modules/payments/application/ports/payment-workflow.port';
import { E2ETestDatabaseHelper } from './utils/e2e-database.helper';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let fakeGateway: FakePaymentGateway;
  let dbHelper: E2ETestDatabaseHelper;

  const mockWorkflowPort = {
    startCreditCardWorkflow: jest.fn().mockResolvedValue(undefined),
    signalPaymentResult: jest.fn().mockResolvedValue(undefined),
  };

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
      .overrideProvider(PaymentWorkflowPort)
      .useValue(mockWorkflowPort)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await dbHelper.disconnect();
  });

  const validCpf = '11144477735';

  it('POST /api/payments (CREDIT_CARD) should return preference', async () => {
    mockWorkflowPort.startCreditCardWorkflow.mockResolvedValue(undefined);

    const res = await request(app.getHttpServer())
      .post('/api/payments')
      .send({
        amount: 200.0,
        description: 'E2E CC',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    expect(res.body.mpInitPoint).toBeDefined();
    expect(res.body.status).toBe(PaymentStatus.PENDING);
    expect(mockWorkflowPort.startCreditCardWorkflow).toHaveBeenCalled();
  });

  it('POST /api/webhooks/mercadopago (payment) should update status to PAID', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/payments')
      .send({
        amount: 300,
        description: 'Webhook Test',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      })
      .expect(201);

    const payment = createRes.body;
    const extRef = payment.mpExternalReference;

    fakeGateway.getPaymentById = jest.fn().mockResolvedValue({
      status: 'approved',
      externalReference: extRef,
    });

    await request(app.getHttpServer())
      .post('/api/webhooks/mercadopago')
      .send({
        type: 'payment',
        data: { id: 'evt-paid-1' },
      })
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/payments/${payment.id}`)
      .expect(200);

    expect(getRes.body.status).toBe(PaymentStatus.PAID);
    expect(mockWorkflowPort.signalPaymentResult).toHaveBeenCalledWith(
      extRef,
      PaymentStatus.PAID,
      'evt-paid-1',
    );
  });

  it('POST /api/webhooks/mercadopago (merchant_order) should return 200 and ignore', async () => {
    await request(app.getHttpServer())
      .post('/api/webhooks/mercadopago')
      .send({
        type: 'merchant_order',
        id: '123',
      })
      .expect(200);
  });

  it('POST /api/payments should validate amount', async () => {
    await request(app.getHttpServer())
      .post('/api/payments')
      .send({
        amount: -10,
        description: 'Invalid',
        payerCpf: validCpf,
        paymentMethod: PaymentMethod.PIX,
      })
      .expect(400);
  });
});
