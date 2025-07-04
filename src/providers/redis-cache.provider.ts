import { createClient, RedisClientType } from "redis";
import {
  CacheProvider,
  CacheProviderConfig,
} from "../interfaces/cache-provider.interface";
import {
  RateLimitResult,
  RateLimitInfo,
} from "../interfaces/rate-limiter.interface";

export class RedisCacheProvider implements CacheProvider {
  private config: Required<CacheProviderConfig>;
  private client: RedisClientType;
  private isConnected = false;

  constructor(config: CacheProviderConfig) {
    if (config.type !== "redis") {
      throw new Error('RedisCacheProvider requires type to be "redis"');
    }
    if (!config.redisUrl) {
      throw new Error("Redis connection URL is required");
    }

    this.config = {
      type: "redis",
      redisUrl: config.redisUrl,
      collectionName: "rateLimitingLogs",
      redisKeyPrefix: config.redisKeyPrefix || "rate_limit:",
      mongoUrl: "",
    };

    this.client = createClient({
      url: this.config.redisUrl,
    });

    this.client.on("error", (err: Error) => {
      console.error("Redis Client Error:", err);
    });
  }

  async initialize(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.connect();
      this.isConnected = true;
      console.log("Redis cache provider initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Redis cache provider:", error);
      throw error;
    }
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    await this.ensureConnection();

    const redisKey = `${this.config.redisKeyPrefix}${key}`;
    const now = Date.now();
    const resetTime = new Date(now + windowMs * 1000);

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.client.multi();

      // Get current count and reset time
      pipeline.hGet(redisKey, "count");
      pipeline.hGet(redisKey, "resetTime");
      pipeline.hGet(redisKey, "createdAt");

      const results = await pipeline.exec();
      const [countResult, resetTimeResult, createdAtResult] = results || [];

      let currentCount = 0;
      let storedResetTime = 0;
      let storedCreatedAt = 0;

      if (countResult && resetTimeResult && createdAtResult) {
        currentCount = parseInt(countResult as string) || 0;
        storedResetTime = parseInt(resetTimeResult as string) || 0;
        storedCreatedAt = parseInt(createdAtResult as string) || 0;
      }

      // Check if window has expired
      if (storedResetTime <= now) {
        // Reset for new window
        currentCount = 1;
        storedResetTime = now + windowMs * 1000;
        storedCreatedAt = now;
      } else {
        // Increment count
        currentCount += 1;
      }

      // Update Redis with new values
      const updatePipeline = this.client.multi();
      updatePipeline.hSet(redisKey, {
        count: currentCount.toString(),
        resetTime: storedResetTime.toString(),
        createdAt: storedCreatedAt.toString(),
      });
      updatePipeline.expire(redisKey, windowMs + 60); // Add 60 seconds buffer
      await updatePipeline.exec();

      const allowed = currentCount <= maxRequests;
      const remaining = Math.max(0, maxRequests - currentCount);

      return {
        allowed,
        current: currentCount,
        limit: maxRequests,
        windowMs,
        resetTime: new Date(storedResetTime).toISOString(),
        remaining,
      };
    } catch (error) {
      console.error("Error checking rate limit in Redis:", error);
      // In case of error, allow the request to prevent blocking
      return {
        allowed: true,
        current: 0,
        limit: maxRequests,
        windowMs,
        resetTime: resetTime.toISOString(),
        remaining: maxRequests,
      };
    }
  }

  async resetLimit(key: string): Promise<void> {
    await this.ensureConnection();
    const redisKey = `${this.config.redisKeyPrefix}${key}`;
    await this.client.del(redisKey);
  }

  async getLimitInfo(key: string): Promise<RateLimitInfo | null> {
    await this.ensureConnection();

    const redisKey = `${this.config.redisKeyPrefix}${key}`;

    try {
      const [count, resetTime, createdAt] = await Promise.all([
        this.client.hGet(redisKey, "count"),
        this.client.hGet(redisKey, "resetTime"),
        this.client.hGet(redisKey, "createdAt"),
      ]);

      if (!count || !resetTime || !createdAt) {
        return null;
      }

      return {
        key,
        count: parseInt(count),
        resetTime: new Date(parseInt(resetTime)),
        createdAt: new Date(parseInt(createdAt)),
      };
    } catch (error) {
      console.error("Error getting rate limit info from Redis:", error);
      return null;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.initialize();
    }
  }

  async close(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}
