import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { envSchema } from './infra/config/env.schema';
import { PrismaModule } from './infra/database/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ContextModule } from './shared/context/context.module';
import { LoggerModule } from './shared/logger/logger.module';
import { RequestContextMiddleware } from './shared/middleware/request-context.middleware';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { RequestLoggingInterceptor } from './shared/interceptors/request-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
    }),
    ContextModule,
    LoggerModule,
    PrismaModule,
    HealthModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
