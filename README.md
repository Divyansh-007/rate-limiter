# Rate Limiter Library

A flexible TypeScript rate limiting library with MongoDB backend, supporting Express middleware and NestJS guards/interceptors.

## Features

- 🚀 **TypeScript Support**: Full TypeScript support with type definitions
- 🔄 **Express Middleware**: Easy integration with Express applications
- 🦅 **NestJS Support**: Guards and interceptors for NestJS applications (see [NestJS Usage](#nestjs-usage))
- 🗄️ **MongoDB Backend**: Uses MongoDB with TTL indexes for automatic cleanup
- ⚙️ **Configurable**: Customizable rate limiting rules and behavior
- 📊 **Headers Support**: Optional rate limit headers in responses
- 🔧 **Flexible Key Generation**: Custom key generation for different use cases

## Installation

```bash
npm install @developers-joyride/rate-limiter
```

## Quick Start

### Basic Usage

```typescript
import { RateLimiterService } from "@developers-joyride/rate-limiter";

const rateLimiter = new RateLimiterService({
  mongoUrl: "mongodb://localhost:27017/myapp",
  maxRequests: 100,
  windowMs: 60, // 60 seconds
});

// Check if a request is allowed
const result = await rateLimiter.checkLimit(req);
if (!result.allowed) {
  // Handle rate limit exceeded
  console.log(`Rate limit exceeded. Try again after ${result.resetTime}`);
}
```

### Express Middleware

```typescript
import express from "express";
import { ExpressRateLimiterMiddleware } from "@developers-joyride/rate-limiter";

const app = express();

const rateLimiter = new ExpressRateLimiterMiddleware({
  mongoUrl: "mongodb://localhost:27017/myapp",
  maxRequests: 100,
  windowMs: 60,
  includeHeaders: true,
  errorMessage: "Too many requests, please try again later.",
});

// Apply to all routes
app.use(rateLimiter.middleware());

// Or apply to specific routes
app.use("/api/", rateLimiter.middleware());

app.listen(3000);
```

### NestJS Guard

```typescript
import { Injectable, UseGuards } from "@nestjs/common";
import { NestJSRateLimiterGuard } from "@developers-joyride/rate-limiter";

@Injectable()
export class RateLimitGuard extends NestJSRateLimiterGuard {
  constructor() {
    super({
      mongoUrl: "mongodb://localhost:27017/myapp",
      maxRequests: 100,
      windowMs: 60,
    });
  }
}

// Use in controller
@Controller("api")
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get()
  getData() {
    return { message: "Hello World" };
  }
}
```

### NestJS Interceptor

```typescript
import { Injectable, UseInterceptors } from "@nestjs/common";
import { NestJSRateLimiterInterceptor } from "@developers-joyride/rate-limiter";

@Injectable()
export class RateLimitInterceptor extends NestJSRateLimiterInterceptor {
  constructor() {
    super({
      mongoUrl: "mongodb://localhost:27017/myapp",
      maxRequests: 100,
      windowMs: 60,
    });
  }
}

// Use in controller
@Controller("api")
@UseInterceptors(RateLimitInterceptor)
export class ApiController {
  @Get()
  getData() {
    return { message: "Hello World" };
  }
}
```

## Configuration Options

| Option           | Type     | Default                                        | Description                                        |
| ---------------- | -------- | ---------------------------------------------- | -------------------------------------------------- |
| `mongoUrl`       | string   | -                                              | MongoDB connection URL (required)                  |
| `collectionName` | string   | `'rateLimitingLogs'`                           | Collection name for storing logs                   |
| `maxRequests`    | number   | -                                              | Maximum requests allowed in time window (required) |
| `windowMs`       | number   | -                                              | Time window in seconds (required)                  |
| `keyGenerator`   | function | `req.ip`                                       | Function to generate unique keys for clients       |
| `errorMessage`   | string   | `'Too many requests, please try again later.'` | Custom error message                               |
| `includeHeaders` | boolean  | `true`                                         | Whether to include rate limit headers              |
| `statusCode`     | number   | `429`                                          | HTTP status code for rate limit exceeded           |

## Custom Key Generation

```typescript
const rateLimiter = new RateLimiterService({
  mongoUrl: "mongodb://localhost:27017/myapp",
  maxRequests: 100,
  windowMs: 60,
  keyGenerator: (req) => {
    // Use user ID if authenticated
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    // Fallback to IP address
    return req.ip || "unknown";
  },
});
```

## Rate Limit Headers

When `includeHeaders` is enabled, the following headers are added to responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests allowed
- `X-RateLimit-Reset`: Time when the rate limit resets (ISO string)
- `X-RateLimit-Current`: Current request count

## API Reference

### RateLimiterService

#### Methods

- `checkLimit(req: Request): Promise<RateLimitResult>` - Check if request is allowed
- `resetLimit(key: string): Promise<void>` - Reset rate limit for a key
- `getLimitInfo(key: string): Promise<RateLimitInfo | null>` - Get current limit info
- `close(): Promise<void>` - Close MongoDB connection

### ExpressRateLimiterMiddleware

#### Methods

- `middleware()` - Returns Express middleware function
- `checkLimit(req: Request): Promise<RateLimitResult>` - Check rate limit
- `resetLimit(key: string): Promise<void>` - Reset rate limit
- `getLimitInfo(key: string): Promise<RateLimitInfo | null>` - Get limit info

### NestJS Components

#### NestJSRateLimiterGuard

- `canActivate(context: ExecutionContext): Promise<boolean>` - Guard method

#### NestJSRateLimiterInterceptor

- `intercept(context: ExecutionContext, next: CallHandler): Observable<any>` - Interceptor method

## Error Handling

The library gracefully handles errors and allows requests to proceed in case of database issues to prevent blocking legitimate traffic.

## MongoDB Setup

The library automatically creates a TTL index on the `createdAt` field to automatically clean up expired rate limit records. The TTL is set to the configured `windowMs` value.

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## License

MIT

## NestJS Usage

The library provides a guard and an interceptor for use in NestJS applications. These are available via the subpath export:

```typescript
import {
  NestJSRateLimiterGuard,
  NestJSRateLimiterInterceptor,
} from "@developers-joyride/rate-limiter/nestjs";
```

### Guard Example

```typescript
import { Controller, Get, UseGuards, Injectable } from "@nestjs/common";
import { NestJSRateLimiterGuard } from "@developers-joyride/rate-limiter/nestjs";

@Injectable()
export class RateLimitGuard extends NestJSRateLimiterGuard {
  constructor() {
    super({
      mongoUrl: "mongodb://localhost:27017/myapp",
      maxRequests: 100,
      windowMs: 60,
    });
  }
}

@Controller("api")
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get()
  getData() {
    return { message: "Hello World" };
  }
}
```

### Interceptor Example

```typescript
import { Controller, Get, UseInterceptors, Injectable } from "@nestjs/common";
import { NestJSRateLimiterInterceptor } from "@developers-joyride/rate-limiter/nestjs";

@Injectable()
export class RateLimitInterceptor extends NestJSRateLimiterInterceptor {
  constructor() {
    super({
      mongoUrl: "mongodb://localhost:27017/myapp",
      maxRequests: 100,
      windowMs: 60,
    });
  }
}

@Controller("api")
@UseInterceptors(RateLimitInterceptor)
export class ApiController {
  @Get()
  getData() {
    return { message: "Hello World" };
  }
}
```

> **Note:** You must install `@nestjs/common` and `rxjs` in your NestJS project to use these features.
