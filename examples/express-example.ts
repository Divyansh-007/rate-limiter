import express from "express";
import { ExpressRateLimiterMiddleware } from "../src/middleware/express-rate-limiter.middleware";

const app = express();
const PORT = process.env.PORT || 3000;

// Create rate limiter instance with MongoDB
const rateLimiterMongo = new ExpressRateLimiterMiddleware({
  cacheProvider: {
    type: "mongodb",
    mongoUrl:
      process.env.MONGO_URL || "mongodb://localhost:27017/rate-limiter-example",
    collectionName: "rateLimitingLogs",
  },
  maxRequests: 5, // Allow 5 requests
  windowMs: 60, // per 60 seconds
  includeHeaders: true,
  errorMessage: "Rate limit exceeded. Please try again later.",
  statusCode: 429,
});

// Create rate limiter instance with Redis
const rateLimiterRedis = new ExpressRateLimiterMiddleware({
  cacheProvider: {
    type: "redis",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    redisKeyPrefix: "rate_limit:",
  },
  maxRequests: 5, // Allow 5 requests
  windowMs: 60, // per 60 seconds
  includeHeaders: true,
  errorMessage: "Rate limit exceeded. Please try again later.",
  statusCode: 429,
});

// Use MongoDB rate limiter for this example
const rateLimiter = rateLimiterMongo;

// Apply rate limiting middleware
app.use(rateLimiter.middleware());

// Sample routes
app.get("/", (req, res) => {
  res.json({
    message: "Hello World!",
    timestamp: new Date().toISOString(),
    headers: {
      "X-RateLimit-Limit": req.headers["x-ratelimit-limit"],
      "X-RateLimit-Remaining": req.headers["x-ratelimit-remaining"],
      "X-RateLimit-Reset": req.headers["x-ratelimit-reset"],
    },
  });
});

app.get("/api/data", (req, res) => {
  res.json({
    data: "This is protected data",
    timestamp: new Date().toISOString(),
  });
});

// Admin route to reset rate limits
app.post("/admin/reset/:key", async (req, res) => {
  try {
    const { key } = req.params;
    await rateLimiter.resetLimit(key);
    res.json({ message: `Rate limit reset for key: ${key}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset rate limit" });
  }
});

// Admin route to get rate limit info
app.get("/admin/info/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const info = await rateLimiter.getLimitInfo(key);
    res.json({ info });
  } catch (error) {
    res.status(500).json({ error: "Failed to get rate limit info" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Rate limiting: ${rateLimiter.getConfig().maxRequests} requests per ${
      rateLimiter.getConfig().windowMs
    } seconds`
  );
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await rateLimiter.close();
  process.exit(0);
});
