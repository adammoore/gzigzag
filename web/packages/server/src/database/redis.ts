import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
    await redisClient.ping();
    logger.info('✅ Redis connected successfully');
  } catch (error) {
    logger.warn('❌ Redis connection failed - caching disabled:', error);
    redisClient = null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

export const sessions = {
  async get(sessionId: string): Promise<any> {
    if (!redisClient) return null;
    try {
      const value = await redisClient.get(`session:${sessionId}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Session get error:', error);
      return null;
    }
  },
  
  async store(sessionId: string, userId: string, ttl: number = 86400): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.setEx(
        `session:${sessionId}`,
        ttl,
        JSON.stringify({ userId, createdAt: Date.now() })
      );
    } catch (error) {
      logger.error('Session store error:', error);
    }
  },
  
  async extend(sessionId: string, ttl: number = 86400): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.expire(`session:${sessionId}`, ttl);
    } catch (error) {
      logger.error('Session extend error:', error);
    }
  },
};

export const spaceCache = {
  async invalidate(spaceId: string): Promise<void> {
    if (!redisClient) return;
    try {
      const keys = await redisClient.keys(`space:${spaceId}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  },
};
