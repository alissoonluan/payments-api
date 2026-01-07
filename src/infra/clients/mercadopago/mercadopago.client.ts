import {
  BadGatewayException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreatePreferencePayload, CreatePreferenceResponse } from './dtos/create-preference.dto';
import { GetPaymentResponse } from './dtos/get-payment.dto';

@Injectable()
export class MercadoPagoClient {
  private readonly logger = new Logger(MercadoPagoClient.name);

  constructor(private readonly httpService: HttpService) {}

  async createPreference(payload: CreatePreferencePayload): Promise<CreatePreferenceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<CreatePreferenceResponse>('/checkout/preferences', payload),
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  async getPayment(id: string): Promise<GetPaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<GetPaymentResponse>(`/v1/payments/${id}`),
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any): void {
    this.logger.error(
      'Mercado Pago API Error',
      error.response?.data || error.message,
    );
    if (error.response) {
      throw new UnprocessableEntityException(
        `Mercado Pago Error: ${JSON.stringify(error.response.data)}`,
      );
    }
    throw new BadGatewayException('Failed to communicate with Mercado Pago');
  }
}
