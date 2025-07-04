// Core interfaces and types
export * from "./interfaces/rate-limiter.interface";
export * from "./interfaces/cache-provider.interface";

// Core service
export { RateLimiterService } from "./services/rate-limiter.service";

// Express middleware
export { ExpressRateLimiterMiddleware } from "./middleware/express-rate-limiter.middleware";

// Cache providers
export { MongoDBCacheProvider } from "./providers/mongodb-cache.provider";
export { RedisCacheProvider } from "./providers/redis-cache.provider";

// NestJS components (optional - only if @nestjs/common is available)
// Use: import { NestJSRateLimiterGuard, NestJSRateLimiterInterceptor } from '@developers-joyride/rate-limiter/nestjs';

// MongoDB model
export { RateLimitLog, IRateLimitLog } from "./models/rate-limit.model";
