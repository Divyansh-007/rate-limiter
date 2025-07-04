import { Request } from "express";
import { MongoDBCacheProvider } from "../providers/mongodb-cache.provider";
import { RedisCacheProvider } from "../providers/redis-cache.provider";
import { CacheProvider } from "../interfaces/cache-provider.interface";
import {
  RateLimiterConfig,
  RateLimitResult,
  RateLimitInfo,
} from "../interfaces/rate-limiter.interface";

export class RateLimiterService {
  private config: Required<RateLimiterConfig>;
  private cacheProvider: CacheProvider;
  private isInitialized = false;

  constructor(config: RateLimiterConfig) {
    this.config = {
      cacheProvider: {
        type: config.cacheProvider.type,
        collectionName:
          config.cacheProvider.collectionName || "rateLimitingLogs",
        redisKeyPrefix: config.cacheProvider.redisKeyPrefix || "rate_limit:",
        mongoUrl: config.cacheProvider.mongoUrl,
        redisUrl: config.cacheProvider.redisUrl,
      },
      keyGenerator:
        config.keyGenerator ||
        ((req: Request) => req.ip || req.connection.remoteAddress || "unknown"),
      errorMessage:
        config.errorMessage || "Too many requests, please try again later.",
      includeHeaders:
        config.includeHeaders !== undefined ? config.includeHeaders : true,
      statusCode: config.statusCode || 429,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
    };

    // Initialize the appropriate cache provider
    if (this.config.cacheProvider.type === "mongodb") {
      if (!this.config.cacheProvider.mongoUrl) {
        throw new Error(
          "MongoDB URL is required when using MongoDB cache provider"
        );
      }
      this.cacheProvider = new MongoDBCacheProvider(this.config.cacheProvider);
    } else if (this.config.cacheProvider.type === "redis") {
      if (!this.config.cacheProvider.redisUrl) {
        throw new Error(
          "Redis URL is required when using Redis cache provider"
        );
      }
      this.cacheProvider = new RedisCacheProvider(this.config.cacheProvider);
    } else {
      throw new Error(
        `Unsupported cache provider type: ${this.config.cacheProvider.type}`
      );
    }
  }

  /**
   * Initialize the cache provider
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.cacheProvider.initialize();
      this.isInitialized = true;
      console.log("Rate limiter service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize rate limiter service:", error);
      throw error;
    }
  }

  /**
   * Check if a request is allowed based on rate limiting rules
   */
  async checkLimit(req: Request): Promise<RateLimitResult> {
    await this.ensureInitialized();

    const key = this.config.keyGenerator(req);
    return await this.cacheProvider.checkLimit(
      key,
      this.config.maxRequests,
      this.config.windowMs
    );
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(key: string): Promise<void> {
    await this.ensureInitialized();
    await this.cacheProvider.resetLimit(key);
  }

  /**
   * Get current rate limit info for a key
   */
  async getLimitInfo(key: string): Promise<RateLimitInfo | null> {
    await this.ensureInitialized();
    return await this.cacheProvider.getLimitInfo(key);
  }

  /**
   * Ensure cache provider is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Close the cache provider connection
   */
  async close(): Promise<void> {
    if (this.isInitialized) {
      await this.cacheProvider.close();
      this.isInitialized = false;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<RateLimiterConfig> {
    return { ...this.config };
  }
}
