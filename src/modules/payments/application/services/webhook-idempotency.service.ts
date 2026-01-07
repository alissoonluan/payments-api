import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhookIdempotencyService {
  private readonly processedEvents = new Set<string>();

  isDuplicate(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markAsProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }
}
