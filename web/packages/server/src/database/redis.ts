import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;
let isReady = false;

export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Too many reconnection attempts');
            return new Error('Too many reconnection attempts');
          }
          const delay = Math.min(retries * 100, 3000);
          logger.info(`Redis: Reconnecting in ${delay}ms...`);
          return delay;
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      isReady = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis connected and ready');
      isReady = true;
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis: Reconnecting...');
      isReady = false;
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    // Don't throw - Redis is optional for caching
    logger.warn('Running without Redis cache');
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

export function getRedis(): RedisClientType | null {
  if (!isReady) {
    return null;
  }
  return redisClient;
}

// Cache utilities
export const cache = {
  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    if (!isReady) return null;

    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  // Set cached value with TTL
  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    if (!isReady) return;

    try {
      await redisClient.setEx(
        key,
        ttlSeconds,
        JSON.stringify(value)
      );
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  },

  // Delete cached value
  async del(key: string): Promise<void> {
    if (!isReady) return;

    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  },

  // Clear cache by pattern
  async clearPattern(pattern: string): Promise<void> {
    if (!isReady) return;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error(`Cache clear pattern error for ${pattern}:`, error);
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!isReady) return false;

    try {
      const count = await redisClient.exists(key);
      return count > 0;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  // Increment counter
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!isReady) return 0;

    try {
      const value = await redisClient.incr(key);
      if (ttlSeconds) {
        await redisClient.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  },

  // Add to set
  async sAdd(key: string, members: string[]): Promise<void> {
    if (!isReady) return;

    try {
      await redisClient.sAdd(key, members);
    } catch (error) {
      logger.error(`Cache sAdd error for key ${key}:`, error);
    }
  },

  // Get set members
  async sMembers(key: string): Promise<string[]> {
    if (!isReady) return [];

    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      logger.error(`Cache sMembers error for key ${key}:`, error);
      return [];
    }
  },
};

// Session management
export const sessions = {
  // Store session
  async store(sessionId: string, userId: string, ttlSeconds: number = 86400): Promise<void> {
    await cache.set(`session:${sessionId}`, { userId, createdAt: Date.now() }, ttlSeconds);
  },

  // Get session
  async get(sessionId: string): Promise<{ userId: string; createdAt: number } | null> {
    return await cache.get(`session:${sessionId}`);
  },

  // Delete session
  async delete(sessionId: string): Promise<void> {
    await cache.del(`session:${sessionId}`);
  },

  // Extend session TTL
  async extend(sessionId: string, ttlSeconds: number = 86400): Promise<void> {
    if (!isReady) return;

    try {
      await redisClient.expire(`session:${sessionId}`, ttlSeconds);
    } catch (error) {
      logger.error(`Session extend error for ${sessionId}:`, error);
    }
  },
};

// Rate limiting
export const rateLimiter = {
  // Check rate limit
  async check(identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (!isReady) return true; // Allow if Redis is not available

    const key = `rate:${identifier}`;
    const count = await cache.incr(key, windowSeconds);
    return count <= limit;
  },

  // Get remaining requests
  async getRemaining(identifier: string, limit: number): Promise<number> {
    if (!isReady) return limit;

    const key = `rate:${identifier}`;
    const value = await redisClient.get(key);
    const count = value ? parseInt(value) : 0;
    return Math.max(0, limit - count);
  },
};

// Space-specific caching
export const spaceCache = {
  // Cache space data
  async setSpace(spaceId: string, data: any): Promise<void> {
    await cache.set(`space:${spaceId}`, data, 300); // 5 minutes
  },

  // Get cached space data
  async getSpace(spaceId: string): Promise<any> {
    return await cache.get(`space:${spaceId}`);
  },

  // Invalidate space cache
  async invalidate(spaceId: string): Promise<void> {
    await cache.clearPattern(`space:${spaceId}*`);
    await cache.clearPattern(`cells:${spaceId}*`);
  },

  // Cache cells for a space
  async setCells(spaceId: string, cells: any[]): Promise<void> {
    await cache.set(`cells:${spaceId}`, cells, 300);
  },

  // Get cached cells
  async getCells(spaceId: string): Promise<any[] | null> {
    return await cache.get(`cells:${spaceId}`);
  },
};

// User-specific caching
export const userCache = {
  // Cache user data
  async setUser(userId: string, data: any): Promise<void> {
    await cache.set(`user:${userId}`, data, 600); // 10 minutes
  },

  // Get cached user data
  async getUser(userId: string): Promise<any> {
    return await cache.get(`user:${userId}`);
  },

  // Cache user's spaces
  async setUserSpaces(userId: string, spaces: any[]): Promise<void> {
    await cache.set(`user:${userId}:spaces`, spaces, 300);
  },

  // Get cached user's spaces
  async getUserSpaces(userId: string): Promise<any[] | null> {
    return await cache.get(`user:${userId}:spaces`);
  },

  // Invalidate user cache
  async invalidate(userId: string): Promise<void> {
    await cache.clearPattern(`user:${userId}*`);
  },
};

// Real-time collaboration support
export const collaboration = {
  // Track active users in a space
  async addUserToSpace(spaceId: string, userId: string): Promise<void> {
    await cache.sAdd(`space:${spaceId}:users`, [userId]);
    await cache.set(`space:${spaceId}:user:${userId}`, { joinedAt: Date.now() }, 3600);
  },

  // Remove user from space
  async removeUserFromSpace(spaceId: string, userId: string): Promise<void> {
    if (!isReady) return;

    try {
      await redisClient.sRem(`space:${spaceId}:users`, userId);
      await cache.del(`space:${spaceId}:user:${userId}`);
    } catch (error) {
      logger.error(`Remove user from space error:`, error);
    }
  },

  // Get active users in space
  async getActiveUsers(spaceId: string): Promise<string[]> {
    return await cache.sMembers(`space:${spaceId}:users`);
  },

  // Store cursor position
  async setCursorPosition(spaceId: string, userId: string, position: any): Promise<void> {
    await cache.set(
      `space:${spaceId}:cursor:${userId}`,
      position,
      60 // 1 minute TTL for cursor positions
    );
  },

  // Get all cursor positions
  async getCursorPositions(spaceId: string): Promise<Map<string, any>> {
    if (!isReady) return new Map();

    const positions = new Map<string, any>();
    try {
      const users = await this.getActiveUsers(spaceId);
      for (const userId of users) {
        const position = await cache.get(`space:${spaceId}:cursor:${userId}`);
        if (position) {
          positions.set(userId, position);
        }
      }
    } catch (error) {
      logger.error('Get cursor positions error:', error);
    }
    return positions;
  },
};