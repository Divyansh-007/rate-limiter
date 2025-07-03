// Core interfaces and types
export * from "./interfaces/rate-limiter.interface";

// Core service
export { RateLimiterService } from "./services/rate-limiter.service";

// Express middleware
export { ExpressRateLimiterMiddleware } from "./middleware/express-rate-limiter.middleware";

// NestJS components (optional - only if @nestjs/common is available)
// Use: import { NestJSRateLimiterGuard, NestJSRateLimiterInterceptor } from '@developers-joyride/rate-limiter/nestjs';

// MongoDB model
export { RateLimitLog, IRateLimitLog } from "./models/rate-limit.model";
