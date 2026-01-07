import { ConfigService } from '@nestjs/config';
import { MercadoPagoGateway } from './mercado-pago.gateway';
import { MercadoPagoClient } from '../../../../infra/clients/mercadopago/mercadopago.client';
import { PaymentEntity } from '../../domain/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../domain/payment.enums';

describe('MercadoPagoGateway', () => {
  let gateway: MercadoPagoGateway;
  let client: jest.Mocked<MercadoPagoClient>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    client = {
      createPreference: jest.fn(),
      getPayment: jest.fn(),
    } as unknown as jest.Mocked<MercadoPagoClient>;

    configService = {
      getOrThrow: jest.fn((key: string): string => {
        const config: Record<string, string> = {
          MERCADOPAGO_NOTIFICATION_URL: 'http://notify',
          MERCADOPAGO_SUCCESS_URL: 'http://success',
          MERCADOPAGO_FAILURE_URL: 'http://failure',
          MERCADOPAGO_PENDING_URL: 'http://pending',
        };
        return config[key] || '';
      }),
    } as unknown as jest.Mocked<ConfigService>;

    gateway = new MercadoPagoGateway(client, configService);
  });

  const mockPayment = new PaymentEntity({
    id: '1',
    amount: 100,
    description: 'Test',
    payerCpf: '11122233344',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    status: PaymentStatus.PENDING,
    mpExternalReference: 'ref-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('should create preference correctly mapping entity to payload', async () => {
    client.createPreference.mockResolvedValue({
      id: 'pref_123',
      init_point: 'http://init',
      sandbox_init_point: 'http://sandbox',
    });

    const result = await gateway.createPreference(mockPayment);

    expect(client.createPreference).toHaveBeenCalledWith({
      items: [
        {
          title: 'Test',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: 100,
        },
      ],
      external_reference: 'ref-123',
      payer: {
        identification: {
          type: 'CPF',
          number: '11122233344',
        },
      },
      notification_url: 'http://notify',
      auto_return: 'approved',
      back_urls: {
        success: 'http://success',
        failure: 'http://failure',
        pending: 'http://pending',
      },
    });

    expect(result).toEqual({
      preferenceId: 'pref_123',
      initPoint: 'http://init',
      sandboxInitPoint: 'http://sandbox',
    });
  });

  it('should get payment status correctly', async () => {
    client.getPayment.mockResolvedValue({
      id: 12345,
      status: 'approved',
      external_reference: 'ref-123',
    });

    const result = await gateway.getPaymentById('12345');

    expect(result).toEqual({
      externalReference: 'ref-123',
      status: 'approved',
    });
  });

  it('should throw error when mpExternalReference is missing', async () => {
    const paymentWithoutRef = new PaymentEntity({
      id: '2',
      amount: 200,
      description: 'Test without ref',
      payerCpf: '11122233344',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
      mpExternalReference: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(gateway.createPreference(paymentWithoutRef)).rejects.toThrow(
      'mpExternalReference is required to create Mercado Pago preference',
    );
  });

  it('should use default title when description is missing', async () => {
    const paymentWithoutDesc = new PaymentEntity({
      id: '3',
      amount: 150,
      description: undefined,
      payerCpf: '11122233344',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
      mpExternalReference: 'ref-456',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    client.createPreference.mockResolvedValue({
      id: 'pref_456',
      init_point: 'http://init',
      sandbox_init_point: 'http://sandbox',
    });

    await gateway.createPreference(paymentWithoutDesc);

    expect(client.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            title: 'Payment',
          }),
        ],
      }),
    );
  });

  it('should trim description whitespace', async () => {
    const paymentWithSpaces = new PaymentEntity({
      id: '4',
      amount: 200,
      description: '  Test with spaces  ',
      payerCpf: '11122233344',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
      mpExternalReference: 'ref-789',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    client.createPreference.mockResolvedValue({
      id: 'pref_789',
      init_point: 'http://init',
      sandbox_init_point: 'http://sandbox',
    });

    await gateway.createPreference(paymentWithSpaces);

    expect(client.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            title: 'Test with spaces',
          }),
        ],
      }),
    );
  });
});
