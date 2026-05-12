import { Server } from 'socket.io';
import { redisSub } from '../lib/redis';

const DELIVERY_CHANNEL = 'flow:delivery-events';

export function subscribeToDeliveryEvents(io: Server): void {
  redisSub.subscribe(DELIVERY_CHANNEL, (err) => {
    if (err) {
      console.error('[REALTIME] Failed to subscribe to delivery events:', err.message);
      return;
    }
    console.log('[REALTIME] Subscribed to delivery events');
  });

  redisSub.on('message', (channel, message) => {
    if (channel !== DELIVERY_CHANNEL) return;

    try {
      const delivery = JSON.parse(message);

      if (delivery.type === 'socket:emit') {
        const { rooms, event, payload } = delivery;
        rooms.forEach((room: string) => {
          io.to(room).emit(event, payload);
        });
        console.log(`[REALTIME] emitted ${event} to ${rooms.length} rooms`);
      }
    } catch (err) {
      console.error('[REALTIME] Failed to parse delivery event:', err);
    }
  });
}
