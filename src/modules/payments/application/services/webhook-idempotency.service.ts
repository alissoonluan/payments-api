import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/database/prisma/prisma.service';

@Injectable()
export class WebhookIdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async isDuplicate(idempotencyKey: string): Promise<boolean> {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { idempotencyKey },
    });
    return !!existing;
  }

  async markAsProcessed(idempotencyKey: string, payload: any): Promise<void> {
    await this.prisma.webhookEvent.create({
      data: {
        idempotencyKey,
        payload: payload || {},
      },
    });
  }
}
