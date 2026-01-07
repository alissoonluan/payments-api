import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import { ContextModule } from '../context/context.module';

@Global()
@Module({
  imports: [ContextModule],
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
