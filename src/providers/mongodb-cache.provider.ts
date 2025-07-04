import mongoose from "mongoose";
import { RateLimitLog, IRateLimitLog } from "../models/rate-limit.model";
import {
  CacheProvider,
  CacheProviderConfig,
} from "../interfaces/cache-provider.interface";
import {
  RateLimitResult,
  RateLimitInfo,
} from "../interfaces/rate-limiter.interface";

export class MongoDBCacheProvider implements CacheProvider {
  private config: Required<CacheProviderConfig>;
  private isConnected = false;

  constructor(config: CacheProviderConfig) {
    if (config.type !== "mongodb") {
      throw new Error('MongoDBCacheProvider requires type to be "mongodb"');
    }
    if (!config.mongoUrl) {
      throw new Error("MongoDB connection URL is required");
    }

    this.config = {
      type: "mongodb",
      mongoUrl: config.mongoUrl,
      collectionName: config.collectionName || "rateLimitingLogs",
      redisUrl: "",
      redisKeyPrefix: "rate_limit:",
    };
  }

  async initialize(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(this.config.mongoUrl);
      this.isConnected = true;

      // Set up TTL index for automatic cleanup
      const collection = mongoose.connection.collection(
        this.config.collectionName
      );
      await collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 86400 } // 24 hours default TTL
      );

      console.log("MongoDB cache provider initialized successfully");
    } catch (error) {
      console.error("Failed to initialize MongoDB cache provider:", error);
      throw error;
    }
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    await this.ensureConnection();

    const now = new Date();
    const resetTime = new Date(now.getTime() + windowMs * 1000);

    try {
      // Find existing rate limit record
      let rateLimitLog = await RateLimitLog.findOne({ key });

      if (!rateLimitLog) {
        // Create new rate limit record
        rateLimitLog = new RateLimitLog({
          key,
          count: 1,
          resetTime,
          createdAt: now,
        });
        await rateLimitLog.save();
      } else {
        // Check if the window has expired
        if (rateLimitLog.resetTime <= now) {
          // Reset the counter for new window
          rateLimitLog.count = 1;
          rateLimitLog.resetTime = resetTime;
          rateLimitLog.createdAt = now;
        } else {
          // Increment the counter
          rateLimitLog.count += 1;
        }
        await rateLimitLog.save();
      }

      const allowed = rateLimitLog.count <= maxRequests;
      const remaining = Math.max(0, maxRequests - rateLimitLog.count);

      return {
        allowed,
        current: rateLimitLog.count,
        limit: maxRequests,
        windowMs,
        resetTime: rateLimitLog.resetTime.toISOString(),
        remaining,
      };
    } catch (error) {
      console.error("Error checking rate limit in MongoDB:", error);
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
    await RateLimitLog.deleteOne({ key });
  }

  async getLimitInfo(key: string): Promise<RateLimitInfo | null> {
    await this.ensureConnection();

    const rateLimitLog = await RateLimitLog.findOne({ key });

    if (!rateLimitLog) {
      return null;
    }

    return {
      key: rateLimitLog.key,
      count: rateLimitLog.count,
      resetTime: rateLimitLog.resetTime,
      createdAt: rateLimitLog.createdAt,
    };
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.initialize();
    }
  }

  async close(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
    }
  }
}
