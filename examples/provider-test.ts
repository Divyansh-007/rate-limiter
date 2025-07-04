import { RateLimiterService } from "../src/services/rate-limiter.service";
import { MongoDBCacheProvider } from "../src/providers/mongodb-cache.provider";
import { RedisCacheProvider } from "../src/providers/redis-cache.provider";

// Mock Express Request
const createMockRequest = (ip: string = "127.0.0.1") =>
  ({
    ip,
    connection: { remoteAddress: ip },
  } as any);

async function testMongoDBProvider() {
  console.log("Testing MongoDB Provider...");

  const rateLimiter = new RateLimiterService({
    cacheProvider: {
      type: "mongodb",
      mongoUrl:
        process.env.MONGO_URL || "mongodb://localhost:27017/test-rate-limiter",
      collectionName: "testRateLimitingLogs",
    },
    maxRequests: 3,
    windowMs: 60,
  });

  try {
    await rateLimiter.initialize();
    console.log("✅ MongoDB provider initialized successfully");

    const req = createMockRequest("192.168.1.1");
    const result = await rateLimiter.checkLimit(req);
    console.log("✅ MongoDB rate limit check:", result);

    await rateLimiter.close();
    console.log("✅ MongoDB provider closed successfully");
  } catch (error) {
    console.error("❌ MongoDB provider test failed:", error);
  }
}

async function testRedisProvider() {
  console.log("Testing Redis Provider...");

  const rateLimiter = new RateLimiterService({
    cacheProvider: {
      type: "redis",
      redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
      redisKeyPrefix: "test_rate_limit:",
    },
    maxRequests: 3,
    windowMs: 60,
  });

  try {
    await rateLimiter.initialize();
    console.log("✅ Redis provider initialized successfully");

    const req = createMockRequest("192.168.1.2");
    const result = await rateLimiter.checkLimit(req);
    console.log("✅ Redis rate limit check:", result);

    await rateLimiter.close();
    console.log("✅ Redis provider closed successfully");
  } catch (error) {
    console.error("❌ Redis provider test failed:", error);
  }
}

async function runTests() {
  console.log("🚀 Starting Provider Tests...\n");

  await testMongoDBProvider();
  console.log();
  await testRedisProvider();

  console.log("\n✨ Provider tests completed!");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { testMongoDBProvider, testRedisProvider };
