import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MercadoPagoClient } from './mercadopago.client';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: 'https://api.mercadopago.com',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${configService.getOrThrow<string>('MERCADOPAGO_ACCESS_TOKEN')}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MercadoPagoClient],
  exports: [MercadoPagoClient],
})
export class MercadoPagoClientModule {}
