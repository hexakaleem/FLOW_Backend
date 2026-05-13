import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis';
import type { LoadPostedEvent, DomainEvent } from '../events/events.types';
import { MatchingService } from '../modules/loads/matching.service';
import { LoadModel } from '../modules/loads/models/load.model';

const MATCHING_QUEUE_NAME = 'flow-matching';

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
  const { loadId } = event.payload;

  try {
    const load = await LoadModel.findById(loadId).lean();
    if (!load) {
      console.warn(`[MATCHER] load ${loadId} not found for matching`);
      return;
    }

    await MatchingService.matchTrucksForLoad(load as any);
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
