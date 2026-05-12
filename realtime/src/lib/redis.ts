import { Redis } from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.redisUrl);
export const redisSub = new Redis(config.redisUrl);

redis.on('error', (err) => console.error('[REDIS] error:', err.message));
redisSub.on('error', (err) => console.error('[REDIS-SUB] error:', err.message));
redis.on('connect', () => console.log('[REDIS] connected'));
redisSub.on('connect', () => console.log('[REDIS-SUB] connected'));
