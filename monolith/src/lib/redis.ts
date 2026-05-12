import { Redis } from 'ioredis';
import { config } from '../config';

const redisUrl = config.redisUrl || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const redisPub = new Redis(redisUrl);
export const redisSub = new Redis(redisUrl);

redis.on('error', (err) => console.error('[REDIS] error:', err.message));
redisPub.on('error', (err) => console.error('[REDIS-PUB] error:', err.message));
redisSub.on('error', (err) => console.error('[REDIS-SUB] error:', err.message));

redis.on('connect', () => console.log('[REDIS] connected'));
redisPub.on('connect', () => console.log('[REDIS-PUB] connected'));
redisSub.on('connect', () => console.log('[REDIS-SUB] connected'));

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  await redisPub.quit();
  await redisSub.quit();
}
