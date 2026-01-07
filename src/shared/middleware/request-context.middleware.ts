import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../context/request-context.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      uuidv4();

    const requestId = uuidv4();

    res.setHeader('x-correlation-id', correlationId);

    const context = {
      requestId,
      correlationId,
      url: req.originalUrl,
      method: req.method,
      userId: undefined,
    };

    RequestContextService.runWithContext(context, () => {
      next();
    });
  }
}
