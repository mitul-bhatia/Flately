import Redis from 'ioredis';
import env from './env';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('error', (err: any) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
    });
  }
  return redisClient;
}

export function getRedisSubscriberClient(): Redis | null {
  const client = getRedisClient();
  if (!client) return null;
  
  const subClient = client.duplicate();
  subClient.on('error', (err: any) => {
    console.error('[Redis Sub] Connection error:', err.message);
  });
  return subClient;
}
