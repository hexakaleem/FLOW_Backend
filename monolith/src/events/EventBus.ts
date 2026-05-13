import { redisPub } from '../lib/redis';
import type { DomainEvent } from './events.types';

const DOMAIN_CHANNEL = 'flow:domain-events';

export class EventBus {
  static async publish(event: DomainEvent): Promise<void> {
    const envelope = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    await redisPub.publish(DOMAIN_CHANNEL, JSON.stringify(envelope));
  }

  static async emitSocketEvent(rooms: string[], event: string, payload: any): Promise<void> {
    const envelope = {
      type: 'socket:emit',
      rooms,
      event,
      payload,
    };
    await redisPub.publish('flow:delivery-events', JSON.stringify(envelope));
  }
}
