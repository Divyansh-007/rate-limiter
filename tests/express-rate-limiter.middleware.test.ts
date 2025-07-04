import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { ExpressRateLimiterMiddleware } from "../src/middleware/express-rate-limiter.middleware";

const testMongoUrl = "mongodb://localhost:27017/test-rate-limiter-mw";

describe("ExpressRateLimiterMiddleware", () => {
  let app: express.Express;
  let rateLimiter: ExpressRateLimiterMiddleware;

  beforeEach(() => {
    app = express();
    rateLimiter = new ExpressRateLimiterMiddleware({
      cacheProvider: {
        type: "mongodb",
        mongoUrl: testMongoUrl,
        collectionName: "testRateLimitingLogsMW",
      },
      maxRequests: 2,
      windowMs: 60,
      includeHeaders: true,
    });
    app.use(rateLimiter.middleware());
    app.get("/test", (req: Request, res: Response) => {
      res.json({ ok: true });
    });
  });

  afterEach(async () => {
    await rateLimiter.close();
  });

  it("should allow requests within the limit", async () => {
    // Mock the service's checkLimit method
    jest
      .spyOn((rateLimiter as any).service, "checkLimit")
      .mockResolvedValueOnce({
        allowed: true,
        current: 1,
        limit: 2,
        windowMs: 60,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        remaining: 1,
      })
      .mockResolvedValueOnce({
        allowed: true,
        current: 2,
        limit: 2,
        windowMs: 60,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        remaining: 0,
      });

    const res1 = await request(app).get("/test");
    expect(res1.status).toBe(200);
    expect(res1.body.ok).toBe(true);
    expect(res1.headers["x-ratelimit-limit"]).toBe("2");
    expect(res1.headers["x-ratelimit-remaining"]).toBe("1");

    const res2 = await request(app).get("/test");
    expect(res2.status).toBe(200);
    expect(res2.body.ok).toBe(true);
    expect(res2.headers["x-ratelimit-limit"]).toBe("2");
    expect(res2.headers["x-ratelimit-remaining"]).toBe("0");
  });

  it("should block requests after the limit", async () => {
    // Mock the service's checkLimit method
    jest
      .spyOn((rateLimiter as any).service, "checkLimit")
      .mockResolvedValueOnce({
        allowed: true,
        current: 1,
        limit: 2,
        windowMs: 60,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        remaining: 1,
      })
      .mockResolvedValueOnce({
        allowed: true,
        current: 2,
        limit: 2,
        windowMs: 60,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        remaining: 0,
      })
      .mockResolvedValueOnce({
        allowed: false,
        current: 3,
        limit: 2,
        windowMs: 60,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        remaining: 0,
      });

    await request(app).get("/test");
    await request(app).get("/test");
    const res3 = await request(app).get("/test");
    expect(res3.status).toBe(429);
    expect(res3.body.error).toBeDefined();
    expect(res3.headers["x-ratelimit-limit"]).toBe("2");
    expect(res3.headers["x-ratelimit-remaining"]).toBe("0");
  });
});
