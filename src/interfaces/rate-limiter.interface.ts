import { Request, Response, NextFunction } from "express";

export interface RateLimiterConfig {
  /** MongoDB connection URL */
  mongoUrl: string;
  /** Collection name for storing rate limiting logs (default: 'rateLimitingLogs') */
  collectionName?: string;
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in seconds */
  windowMs: number;
  /** Key generator function to identify the client (default: uses IP address) */
  keyGenerator?: (req: Request) => string;
  /** Custom error message when rate limit is exceeded */
  errorMessage?: string;
  /** Whether to include rate limit headers in response */
  includeHeaders?: boolean;
  /** Custom status code for rate limit exceeded (default: 429) */
  statusCode?: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Time window in seconds */
  windowMs: number;
  /** Time when the rate limit will reset (ISO string) */
  resetTime: string;
  /** Remaining requests allowed */
  remaining: number;
}

export interface RateLimitInfo {
  /** Unique identifier for the client */
  key: string;
  /** Current request count */
  count: number;
  /** Time when the rate limit will reset */
  resetTime: Date;
  /** Time when the record was created */
  createdAt: Date;
}

export interface ExpressRateLimiter {
  /** Check if a request is allowed based on rate limiting rules */
  checkLimit(req: Request): Promise<RateLimitResult>;
  /** Express middleware function */
  middleware(): (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  /** Reset rate limit for a specific key */
  resetLimit(key: string): Promise<void>;
  /** Get current rate limit info for a key */
  getLimitInfo(key: string): Promise<RateLimitInfo | null>;
}

export interface NestJSGuard {
  /** Check if a request is allowed (for NestJS guards) */
  canActivate(context: any): Promise<boolean>;
}

export interface NestJSInterceptor {
  /** Intercept method (for NestJS interceptors) */
  intercept(context: any, next: any): Promise<any>;
}
