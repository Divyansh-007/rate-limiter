import { Request } from "express";
import { RateLimitInfo, RateLimitResult } from "./rate-limiter.interface";

export interface CacheProvider {
  /**
   * Initialize the cache provider
   */
  initialize(): Promise<void>;

  /**
   * Check and update rate limit for a key
   */
  checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult>;

  /**
   * Reset rate limit for a specific key
   */
  resetLimit(key: string): Promise<void>;

  /**
   * Get current rate limit info for a key
   */
  getLimitInfo(key: string): Promise<RateLimitInfo | null>;

  /**
   * Close the cache provider connection
   */
  close(): Promise<void>;
}

export interface CacheProviderConfig {
  /** Type of cache provider to use */
  type: "mongodb" | "redis";
  /** MongoDB connection URL (required when type is 'mongodb') */
  mongoUrl?: string;
  /** Redis connection URL (required when type is 'redis') */
  redisUrl?: string;
  /** Collection name for MongoDB (default: 'rateLimitingLogs') */
  collectionName?: string;
  /** Redis key prefix (default: 'rate_limit:') */
  redisKeyPrefix?: string;
}
