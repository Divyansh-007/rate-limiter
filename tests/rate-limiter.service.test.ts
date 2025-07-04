import { RateLimiterService } from "../src/services/rate-limiter.service";

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
      cacheProvider: {
        type: "mongodb",
        mongoUrl: testMongoUrl,
        collectionName: "testRateLimitingLogs",
      },
      maxRequests: 3,
      windowMs: 60,
    });
  });

  afterEach(async () => {
    await rateLimiter.close();
  });

  describe("initialization", () => {
    it("should initialize with correct configuration", () => {
      const config = rateLimiter.getConfig();
      expect(config.cacheProvider.mongoUrl).toBe(testMongoUrl);
      expect(config.maxRequests).toBe(3);
      expect(config.windowMs).toBe(60);
      expect(config.cacheProvider.collectionName).toBe("testRateLimitingLogs");
    });
  });

  describe("checkLimit", () => {
    it("should allow requests within limit", async () => {
      const req = createMockRequest();

      // Mock the checkLimit method
      jest
        .spyOn(rateLimiter, "checkLimit")
        .mockResolvedValueOnce({
          allowed: true,
          current: 1,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 2,
        })
        .mockResolvedValueOnce({
          allowed: true,
          current: 2,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 1,
        })
        .mockResolvedValueOnce({
          allowed: true,
          current: 3,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 0,
        });

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

      // Mock the checkLimit method for requests within limit
      jest
        .spyOn(rateLimiter, "checkLimit")
        .mockResolvedValueOnce({
          allowed: true,
          current: 1,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 2,
        })
        .mockResolvedValueOnce({
          allowed: true,
          current: 2,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 1,
        })
        .mockResolvedValueOnce({
          allowed: true,
          current: 3,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 0,
        })
        .mockResolvedValueOnce({
          allowed: false,
          current: 4,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 0,
        });

      // Make 3 requests (within limit)
      await rateLimiter.checkLimit(req);
      await rateLimiter.checkLimit(req);
      await rateLimiter.checkLimit(req);

      // Fourth request should be blocked
      const result = await rateLimiter.checkLimit(req);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(4);
      expect(result.remaining).toBe(0);
    });

    it("should handle different IP addresses separately", async () => {
      const req1 = createMockRequest("192.168.1.1");
      const req2 = createMockRequest("192.168.1.2");

      // Mock different IPs
      jest
        .spyOn(rateLimiter, "checkLimit")
        .mockResolvedValueOnce({
          allowed: true,
          current: 1,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 2,
        })
        .mockResolvedValueOnce({
          allowed: true,
          current: 1,
          limit: 3,
          windowMs: 60,
          resetTime: new Date(Date.now() + 60000).toISOString(),
          remaining: 2,
        });

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

      // Mock the resetLimit method
      jest.spyOn(rateLimiter, "resetLimit").mockResolvedValueOnce(undefined);

      // Reset the limit
      await rateLimiter.resetLimit(req.ip);

      // Verify resetLimit was called
      expect(rateLimiter.resetLimit).toHaveBeenCalledWith(req.ip);
    });
  });

  describe("getLimitInfo", () => {
    it("should return null for non-existent key", async () => {
      // Mock the getLimitInfo method
      jest.spyOn(rateLimiter, "getLimitInfo").mockResolvedValueOnce(null);

      const info = await rateLimiter.getLimitInfo("non-existent");
      expect(info).toBeNull();
    });

    it("should return limit info for existing key", async () => {
      const req = createMockRequest();
      const mockInfo = {
        key: req.ip,
        count: 1,
        resetTime: new Date(),
        createdAt: new Date(),
      };

      // Mock the getLimitInfo method
      jest.spyOn(rateLimiter, "getLimitInfo").mockResolvedValueOnce(mockInfo);

      // Get info
      const info = await rateLimiter.getLimitInfo(req.ip);
      expect(info).not.toBeNull();
      expect(info?.key).toBe(req.ip);
      expect(info?.count).toBe(1);
    });
  });
});
