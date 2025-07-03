import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { RateLimiterService } from "../../services/rate-limiter.service";
import { RateLimiterConfig } from "../../interfaces/rate-limiter.interface";

@Injectable()
export class NestJSRateLimiterGuard implements CanActivate {
  private service: RateLimiterService;

  constructor(config: RateLimiterConfig) {
    this.service = new RateLimiterService(config);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const config = this.service.getConfig();

    try {
      const result = await this.service.checkLimit(request);

      if (!result.allowed) {
        throw new HttpException(
          {
            error: config.errorMessage,
            limit: result.limit,
            remaining: result.remaining,
            resetTime: result.resetTime,
          },
          config.statusCode
        );
      }

      // Add rate limit headers to response
      if (config.includeHeaders) {
        const response = context.switchToHttp().getResponse();
        response.set({
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.resetTime,
          "X-RateLimit-Current": result.current.toString(),
        });
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error("Rate limiter guard error:", error);
      // In case of error, allow the request to prevent blocking
      return true;
    }
  }

  /**
   * Close the service connection
   */
  async close(): Promise<void> {
    return await this.service.close();
  }
}
