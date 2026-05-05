import { getRedisClient } from './redis';

const FEED_TTL_SECONDS = 300; // 5 minutes

export async function getCachedFeed(userId: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  return redis.get(`feed:${userId}`);
}

export async function setCachedFeed(userId: string, data: unknown): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.setex(`feed:${userId}`, FEED_TTL_SECONDS, JSON.stringify(data));
}

export async function invalidateFeedCache(userId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.del(`feed:${userId}`);
}

export async function invalidateFeedCacheForSwipe(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  await Promise.all([
    invalidateFeedCache(fromUserId),
    invalidateFeedCache(toUserId),
  ]);
}
