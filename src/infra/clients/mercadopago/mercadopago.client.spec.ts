import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';
import { MercadoPagoClient } from './mercadopago.client';
import {
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreatePreferencePayload } from './dtos/create-preference.dto';

describe('MercadoPagoClient', () => {
  let client: MercadoPagoClient;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoPagoClient,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    client = module.get<MercadoPagoClient>(MercadoPagoClient);
    httpService = module.get<HttpService>(HttpService);
  });

  const mockPayload: CreatePreferencePayload = {
    external_reference: 'ref-123',
    items: [],
    notification_url: 'http://notify',
    auto_return: 'approved',
    payer: { identification: { type: 'CPF', number: '123' } },
  };

  const mockAxiosConfig: InternalAxiosRequestConfig = {
    headers: new AxiosHeaders(),
  };

  it('should create preference successfully', async () => {
    const mockResponse: AxiosResponse = {
      data: { id: 'pref_123' },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: mockAxiosConfig,
    };

    jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

    const result = await client.createPreference(mockPayload);
    expect(result).toEqual({ id: 'pref_123' });
  });

  it('should throw UnprocessableEntityException on 400/422 error from MP', async () => {
    const axiosError = new AxiosError(
      'Bad Request',
      '400',
      mockAxiosConfig,
      {},
      {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Invalid data' },
        headers: {},
        config: mockAxiosConfig,
      },
    );

    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(throwError(() => axiosError));

    await expect(client.createPreference(mockPayload)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('should throw BadGatewayException on network error (no response)', async () => {
    const axiosError = new AxiosError(
      'Network Error',
      'ECONNREFUSED',
      mockAxiosConfig,
      {},
      undefined,
    );

    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(throwError(() => axiosError));

    await expect(client.createPreference(mockPayload)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('should throw BadGatewayException on 5xx error from MP', async () => {
    const axiosError = new AxiosError(
      'Internal Server Error',
      '500',
      mockAxiosConfig,
      {},
      {
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: 'Server error' },
        headers: {},
        config: mockAxiosConfig,
      },
    );

    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(throwError(() => axiosError));

    await expect(client.createPreference(mockPayload)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('should throw BadGatewayException on 503 Service Unavailable', async () => {
    const axiosError = new AxiosError(
      'Service Unavailable',
      '503',
      mockAxiosConfig,
      {},
      {
        status: 503,
        statusText: 'Service Unavailable',
        data: {},
        headers: {},
        config: mockAxiosConfig,
      },
    );

    jest
      .spyOn(httpService, 'post')
      .mockReturnValue(throwError(() => axiosError));

    await expect(client.createPreference(mockPayload)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('should get payment successfully', async () => {
    const mockResponse: AxiosResponse = {
      data: { id: 123, status: 'approved' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: mockAxiosConfig,
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await client.getPayment('123');
    expect(result).toEqual({ id: 123, status: 'approved' });
  });

  it('should throw UnprocessableEntityException when getPayment fails with 404', async () => {
    const axiosError = new AxiosError(
      'Not Found',
      '404',
      mockAxiosConfig,
      {},
      {
        status: 404,
        statusText: 'Not Found',
        data: { message: 'Payment not found' },
        headers: {},
        config: mockAxiosConfig,
      },
    );

    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(throwError(() => axiosError));

    await expect(client.getPayment('invalid-id')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('should throw BadGatewayException when getPayment fails with network error', async () => {
    const axiosError = new AxiosError(
      'Network Error',
      'ETIMEDOUT',
      mockAxiosConfig,
      {},
      undefined,
    );

    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(throwError(() => axiosError));

    await expect(client.getPayment('123')).rejects.toThrow(BadGatewayException);
  });

  it('should throw BadGatewayException when getPayment fails with 500', async () => {
    const axiosError = new AxiosError(
      'Internal Server Error',
      '500',
      mockAxiosConfig,
      {},
      {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: mockAxiosConfig,
      },
    );

    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(throwError(() => axiosError));

    await expect(client.getPayment('123')).rejects.toThrow(BadGatewayException);
  });
});
