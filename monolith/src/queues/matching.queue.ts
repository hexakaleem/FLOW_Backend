import { Queue, Worker } from 'bullmq';
import { redis, redisPub } from '../lib/redis';
import type { LoadPostedEvent, DomainEvent } from '../events/events.types';

const MATCHING_QUEUE_NAME = 'flow:matching';

export const matchingQueue = new Queue(MATCHING_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export const nearbyMatcherWorker = new Worker(
  MATCHING_QUEUE_NAME,
  async (job) => {
    const event = job.data as DomainEvent;

    switch (event.type) {
      case 'load:posted': {
        await handleLoadPosted(event as LoadPostedEvent);
        break;
      }
      default:
        break;
    }
  },
  { connection: redis },
);

async function handleLoadPosted(event: LoadPostedEvent): Promise<void> {
  const { loadId, origin, truckType } = event.payload;

  try {
    const nearbyRaw: unknown = await redis.georadius(
      'drivers:locations',
      origin.lng,
      origin.lat,
      50,
      'mi',
      'WITHDIST',
      'ASC',
    );

    if (!Array.isArray(nearbyRaw) || nearbyRaw.length === 0) {
      return;
    }

    const driverIds: string[] = [];
    for (const item of nearbyRaw) {
      if (Array.isArray(item) && item.length > 0) {
        driverIds.push(String(item[0]));
      } else {
        driverIds.push(String(item));
      }
    }

    if (driverIds.length === 0) return;

    await redisPub.publish(
      'flow:delivery-events',
      JSON.stringify({
        type: 'socket:emit',
        rooms: driverIds.map((id) => `driver:${id}`),
        event: 'load:nearby',
        payload: {
          loadId,
          origin: {
            city: origin.city,
            state: origin.state,
            lat: origin.lat,
            lng: origin.lng,
          },
          truckType,
          rate: event.payload.rate,
          rateType: event.payload.rateType,
          pickupDate: event.payload.pickupDate,
          weight: event.payload.weight,
        },
      }),
    );

    console.log(`[MATCHER] notified ${driverIds.length} drivers about load ${loadId}`);
  } catch (err) {
    console.error(`[MATCHER] handleLoadPosted error:`, err);
  }
}

nearbyMatcherWorker.on('completed', (job) => {
  console.log(`[MATCHER] job ${job.id} completed`);
});

nearbyMatcherWorker.on('failed', (job, err) => {
  console.error(`[MATCHER] job ${job?.id} failed:`, err.message);
});
