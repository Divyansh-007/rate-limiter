import {
  Module,
  Controller,
  Get,
  Injectable,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  NestJSRateLimiterGuard,
  NestJSRateLimiterInterceptor,
} from "@developers-joyride/rate-limiter/nestjs";

@Injectable()
export class RateLimitGuard extends NestJSRateLimiterGuard {
  constructor() {
    super({
      cacheProvider: {
        type: "mongodb",
        mongoUrl: "mongodb://localhost:27017/rate-limiter-nestjs",
        collectionName: "rateLimitingLogs",
      },
      maxRequests: 2,
      windowMs: 60,
    });
  }
}

@Injectable()
export class RateLimitInterceptor extends NestJSRateLimiterInterceptor {
  constructor() {
    super({
      cacheProvider: {
        type: "redis",
        redisUrl: "redis://localhost:6379",
        redisKeyPrefix: "rate_limit:",
      },
      maxRequests: 2,
      windowMs: 60,
    });
  }
}

@Controller("guard")
@UseGuards(RateLimitGuard)
export class GuardedController {
  @Get()
  getGuarded() {
    return { message: "Guarded route" };
  }
}

@Controller("interceptor")
@UseInterceptors(RateLimitInterceptor)
export class InterceptedController {
  @Get()
  getIntercepted() {
    return { message: "Intercepted route" };
  }
}

@Module({
  controllers: [GuardedController, InterceptedController],
  providers: [RateLimitGuard, RateLimitInterceptor],
})
export class AppModule {}
