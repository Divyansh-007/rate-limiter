import { Request, Response, NextFunction } from "express";
import { RateLimiterService } from "../services/rate-limiter.service";
import {
  RateLimiterConfig,
  ExpressRateLimiter,
  RateLimitResult,
} from "../interfaces/rate-limiter.interface";

export class ExpressRateLimiterMiddleware implements ExpressRateLimiter {
  private service: RateLimiterService;

  constructor(config: RateLimiterConfig) {
    this.service = new RateLimiterService(config);
  }

  /**
   * Check if a request is allowed based on rate limiting rules
   */
  async checkLimit(req: Request): Promise<RateLimitResult> {
    return await this.service.checkLimit(req);
  }

  /**
   * Express middleware function
   */
  middleware(): (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.service.checkLimit(req);
        const config = this.service.getConfig();

        if (config.includeHeaders) {
          res.set({
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetTime,
            "X-RateLimit-Current": result.current.toString(),
          });
        }

        if (!result.allowed) {
          res.status(config.statusCode).json({
            error: config.errorMessage,
            limit: result.limit,
            remaining: result.remaining,
            resetTime: result.resetTime,
          });
          return;
        }

        next();
      } catch (error) {
        console.error("Rate limiter middleware error:", error);
        // In case of error, allow the request to prevent blocking
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(key: string): Promise<void> {
    return await this.service.resetLimit(key);
  }

  /**
   * Get current rate limit info for a key
   */
  async getLimitInfo(key: string) {
    return await this.service.getLimitInfo(key);
  }

  /**
   * Close the service connection
   */
  async close(): Promise<void> {
    return await this.service.close();
  }

  /**
   * Get the current configuration
   */
  getConfig() {
    return this.service.getConfig();
  }
}
