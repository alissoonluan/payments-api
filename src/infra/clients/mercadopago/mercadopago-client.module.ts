import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MercadoPagoClient } from './mercadopago.client';
import { LoggerModule } from '../../../shared/logger/logger.module';
import { HttpLoggingInterceptor } from '../../../shared/http/http-logging.interceptor';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.getOrThrow<string>('MERCADOPAGO_BASE_URL'),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${configService.getOrThrow<string>(
            'MERCADOPAGO_ACCESS_TOKEN',
          )}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MercadoPagoClient, HttpLoggingInterceptor],
  exports: [MercadoPagoClient],
})
export class MercadoPagoClientModule {}
