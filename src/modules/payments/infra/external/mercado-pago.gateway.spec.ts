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
          MERCADOPAGO_BACK_URL_SUCCESS: 'http://success',
          MERCADOPAGO_BACK_URL_FAILURE: 'http://failure',
          MERCADOPAGO_BACK_URL_PENDING: 'http://pending',
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
      back_urls: {
        success: 'http://success',
        failure: 'http://failure',
        pending: 'http://pending',
      },
      auto_return: 'approved',
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
});
