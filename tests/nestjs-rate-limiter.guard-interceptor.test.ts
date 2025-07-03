import { NestJSRateLimiterGuard } from "../src/nestjs/guards/nestjs-rate-limiter.guard";
import { NestJSRateLimiterInterceptor } from "../src/nestjs/interceptors/nestjs-rate-limiter.interceptor";
import { ExecutionContext, CallHandler, HttpException } from "@nestjs/common";
import { Observable, of } from "rxjs";

describe("NestJSRateLimiterGuard", () => {
  let guard: NestJSRateLimiterGuard;
  let mockContext: Partial<ExecutionContext>;
  let req: any;

  beforeEach(() => {
    guard = new NestJSRateLimiterGuard({
      mongoUrl: "mongodb://localhost:27017/test-rate-limiter-nestjs",
      maxRequests: 2,
      windowMs: 60,
      collectionName: "testRateLimitingLogsNest",
    });
    req = { ip: "1.2.3.4", connection: { remoteAddress: "1.2.3.4" } };
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ set: jest.fn() }),
      }),
    } as any;
  });

  afterEach(async () => {
    await guard.close();
  });

  it("should allow requests within the limit", async () => {
    expect(await guard.canActivate(mockContext as ExecutionContext)).toBe(true);
    expect(await guard.canActivate(mockContext as ExecutionContext)).toBe(true);
  });

  it("should throw HttpException after exceeding the limit", async () => {
    await guard.canActivate(mockContext as ExecutionContext);
    await guard.canActivate(mockContext as ExecutionContext);
    await expect(
      guard.canActivate(mockContext as ExecutionContext)
    ).rejects.toBeInstanceOf(HttpException);
  });
});

describe("NestJSRateLimiterInterceptor", () => {
  let interceptor: NestJSRateLimiterInterceptor;
  let mockContext: Partial<ExecutionContext>;
  let req: any;
  let callHandler: CallHandler;

  beforeEach(() => {
    interceptor = new NestJSRateLimiterInterceptor({
      mongoUrl: "mongodb://localhost:27017/test-rate-limiter-nestjs",
      maxRequests: 2,
      windowMs: 60,
      collectionName: "testRateLimitingLogsNest",
    });
    req = { ip: "5.6.7.8", connection: { remoteAddress: "5.6.7.8" } };
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ set: jest.fn() }),
      }),
    } as any;
    callHandler = { handle: () => of("ok") };
  });

  afterEach(async () => {
    await interceptor.close();
  });

  it("should allow requests within the limit", async () => {
    const obs1 = interceptor.intercept(
      mockContext as ExecutionContext,
      callHandler
    );
    await expect(obs1.toPromise()).resolves.toBe("ok");
    const obs2 = interceptor.intercept(
      mockContext as ExecutionContext,
      callHandler
    );
    await expect(obs2.toPromise()).resolves.toBe("ok");
  });

  it("should throw HttpException after exceeding the limit", async () => {
    await interceptor
      .intercept(mockContext as ExecutionContext, callHandler)
      .toPromise();
    await interceptor
      .intercept(mockContext as ExecutionContext, callHandler)
      .toPromise();
    const obs3 = interceptor.intercept(
      mockContext as ExecutionContext,
      callHandler
    );
    await expect(obs3.toPromise()).rejects.toBeInstanceOf(HttpException);
  });
});
