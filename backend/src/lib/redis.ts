/**
 * Redis Client
 * Connects to the Redis instance in Docker Compose.
 * Falls back gracefully if Redis is unavailable (cache misses only, no crashes).
 */

import { config } from '../config/env';

// Dynamic import — ioredis may not be installed yet
let Redis: any;
let redisClient: any = null;
let isReady = false;

export async function getRedisClient(): Promise<any> {
  if (redisClient && isReady) return redisClient;

  try {
    if (!Redis) {
      Redis = (await import('ioredis')).default;
    }

    const url = config.REDIS_URL || 'redis://redis:6379';
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      isReady = true;
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err: Error) => {
      console.warn('⚠️ Redis error (cache degraded):', err.message);
      isReady = false;
    });

    redisClient.on('close', () => {
      isReady = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn('⚠️ Redis unavailable — running without cache');
    return null;
  }
}

/**
 * Cache-aside pattern: get from cache or compute
 */
export async function cacheGet<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  try {
    const client = await getRedisClient();
    if (client) {
      const cached = await client.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    }
  } catch {
    // Cache miss — compute fresh
  }

  const result = await computeFn();

  // Write-behind (non-blocking)
  try {
    const client = await getRedisClient();
    if (client) {
      await client.setex(key, ttlSeconds, JSON.stringify(result));
    }
  } catch {
    // Silently fail cache write
  }

  return result;
}

/**
 * Invalidate cache key(s)
 */
export async function cacheInvalidate(...keys: string[]): Promise<void> {
  try {
    const client = await getRedisClient();
    if (client && keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Invalidate by pattern (e.g., 'store:5:products:*')
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;
    
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Silently fail
  }
}

export default { getRedisClient, cacheGet, cacheInvalidate, cacheInvalidatePattern };
