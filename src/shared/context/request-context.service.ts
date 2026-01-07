import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  url?: string;
  method?: string;
  userId?: string;
  [key: string]: any;
}

@Injectable()
export class RequestContextService implements OnModuleDestroy {
  private static readonly asyncLocalStorage =
    new AsyncLocalStorage<RequestContext>();

  onModuleDestroy() {}

  static getContext(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  static getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }

  static getCorrelationId(): string | undefined {
    return this.getContext()?.correlationId;
  }

  static runWithContext(context: RequestContext, callback: () => void) {
    return this.asyncLocalStorage.run(context, callback);
  }
}
