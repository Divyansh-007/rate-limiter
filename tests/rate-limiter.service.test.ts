import { RateLimiterService } from "../src/services/rate-limiter.service";
import { RateLimitLog } from "../src/models/rate-limit.model";

// Mock Express Request
const createMockRequest = (ip: string = "127.0.0.1") =>
  ({
    ip,
    connection: { remoteAddress: ip },
  } as any);

describe("RateLimiterService", () => {
  let rateLimiter: RateLimiterService;
  const testMongoUrl = "mongodb://localhost:27017/test-rate-limiter";

  beforeEach(() => {
    rateLimiter = new RateLimiterService({
      mongoUrl: testMongoUrl,
      maxRequests: 3,
      windowMs: 60,
      collectionName: "testRateLimitingLogs",
    });
  });

  afterEach(async () => {
    // Clean up test data
    await RateLimitLog.deleteMany({});
    await rateLimiter.close();
  });

  describe("initialization", () => {
    it("should initialize with correct configuration", () => {
      const config = rateLimiter.getConfig();
      expect(config.mongoUrl).toBe(testMongoUrl);
      expect(config.maxRequests).toBe(3);
      expect(config.windowMs).toBe(60);
      expect(config.collectionName).toBe("testRateLimitingLogs");
    });
  });

  describe("checkLimit", () => {
    it("should allow requests within limit", async () => {
      const req = createMockRequest();

      // First request
      const result1 = await rateLimiter.checkLimit(req);
      expect(result1.allowed).toBe(true);
      expect(result1.current).toBe(1);
      expect(result1.remaining).toBe(2);

      // Second request
      const result2 = await rateLimiter.checkLimit(req);
      expect(result2.allowed).toBe(true);
      expect(result2.current).toBe(2);
      expect(result2.remaining).toBe(1);

      // Third request
      const result3 = await rateLimiter.checkLimit(req);
      expect(result3.allowed).toBe(true);
      expect(result3.current).toBe(3);
      expect(result3.remaining).toBe(0);
    });

    it("should block requests exceeding limit", async () => {
      const req = createMockRequest();

      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkLimit(req);
      }

      // Fourth request should be blocked
      const result = await rateLimiter.checkLimit(req);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(4);
      expect(result.remaining).toBe(0);
    });

    it("should handle different IP addresses separately", async () => {
      const req1 = createMockRequest("192.168.1.1");
      const req2 = createMockRequest("192.168.1.2");

      // Both should be allowed
      const result1 = await rateLimiter.checkLimit(req1);
      const result2 = await rateLimiter.checkLimit(req2);

      expect(result1.allowed).toBe(true);
      expect(result1.current).toBe(1);
      expect(result2.allowed).toBe(true);
      expect(result2.current).toBe(1);
    });
  });

  describe("resetLimit", () => {
    it("should reset rate limit for a key", async () => {
      const req = createMockRequest();

      // Make some requests
      await rateLimiter.checkLimit(req);
      await rateLimiter.checkLimit(req);

      // Reset the limit
      await rateLimiter.resetLimit(req.ip);

      // Should start fresh
      const result = await rateLimiter.checkLimit(req);
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(2);
    });
  });

  describe("getLimitInfo", () => {
    it("should return null for non-existent key", async () => {
      const info = await rateLimiter.getLimitInfo("non-existent");
      expect(info).toBeNull();
    });

    it("should return limit info for existing key", async () => {
      const req = createMockRequest();

      // Make a request
      await rateLimiter.checkLimit(req);

      // Get info
      const info = await rateLimiter.getLimitInfo(req.ip);
      expect(info).not.toBeNull();
      expect(info?.key).toBe(req.ip);
      expect(info?.count).toBe(1);
    });
  });
});
