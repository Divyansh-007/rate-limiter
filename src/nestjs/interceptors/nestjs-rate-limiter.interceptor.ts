import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from "@nestjs/common";
import { Observable, Subscriber } from "rxjs";
import { RateLimiterService } from "../../services/rate-limiter.service";
import {
  RateLimiterConfig,
  RateLimitResult,
} from "../../interfaces/rate-limiter.interface";

@Injectable()
export class NestJSRateLimiterInterceptor implements NestInterceptor {
  private service: RateLimiterService;

  constructor(config: RateLimiterConfig) {
    this.service = new RateLimiterService(config);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const config = this.service.getConfig();

    return new Observable((observer: Subscriber<any>) => {
      this.service
        .checkLimit(request)
        .then((result: RateLimitResult) => {
          if (!result.allowed) {
            observer.error(
              new HttpException(
                {
                  error: config.errorMessage,
                  limit: result.limit,
                  remaining: result.remaining,
                  resetTime: result.resetTime,
                },
                config.statusCode
              )
            );
            return;
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

          // Continue with the request
          next.handle().subscribe({
            next: (value: any) => observer.next(value),
            error: (error: any) => observer.error(error),
            complete: () => observer.complete(),
          });
        })
        .catch((error: any) => {
          console.error("Rate limiter interceptor error:", error);
          // In case of error, allow the request to prevent blocking
          next.handle().subscribe({
            next: (value: any) => observer.next(value),
            error: (error: any) => observer.error(error),
            complete: () => observer.complete(),
          });
        });
    });
  }

  /**
   * Close the service connection
   */
  async close(): Promise<void> {
    return await this.service.close();
  }
}
