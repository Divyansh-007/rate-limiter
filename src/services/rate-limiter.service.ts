import mongoose from "mongoose";
import { Request } from "express";
import { RateLimitLog, IRateLimitLog } from "../models/rate-limit.model";
import {
  RateLimiterConfig,
  RateLimitResult,
  RateLimitInfo,
} from "../interfaces/rate-limiter.interface";

export class RateLimiterService {
  private config: Required<RateLimiterConfig>;
  private isConnected = false;

  constructor(config: RateLimiterConfig) {
    this.config = {
      collectionName: "rateLimitingLogs",
      keyGenerator: (req: Request) =>
        req.ip || req.connection.remoteAddress || "unknown",
      errorMessage: "Too many requests, please try again later.",
      includeHeaders: true,
      statusCode: 429,
      ...config,
    };
  }

  /**
   * Initialize the MongoDB connection and set up TTL index
   */
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
        { expireAfterSeconds: this.config.windowMs }
      );

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
    await this.ensureConnection();

    const key = this.config.keyGenerator(req);
    const now = new Date();
    const resetTime = new Date(now.getTime() + this.config.windowMs * 1000);

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

      const allowed = rateLimitLog.count <= this.config.maxRequests;
      const remaining = Math.max(
        0,
        this.config.maxRequests - rateLimitLog.count
      );

      return {
        allowed,
        current: rateLimitLog.count,
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs,
        resetTime: rateLimitLog.resetTime.toISOString(),
        remaining,
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      // In case of error, allow the request to prevent blocking
      return {
        allowed: true,
        current: 0,
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs,
        resetTime: resetTime.toISOString(),
        remaining: this.config.maxRequests,
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(key: string): Promise<void> {
    await this.ensureConnection();
    await RateLimitLog.deleteOne({ key });
  }

  /**
   * Get current rate limit info for a key
   */
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

  /**
   * Ensure MongoDB connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.initialize();
    }
  }

  /**
   * Close the MongoDB connection
   */
  async close(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<RateLimiterConfig> {
    return { ...this.config };
  }
}
