# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-03

### Added

- Initial release of rate limiter library
- TypeScript rate limiter service with MongoDB backend
- Express middleware for easy integration
- NestJS guard and interceptor support (subpath export)
- TTL index for automatic cleanup of expired records
- Configurable MongoDB URL and collection name
- Custom key generation support
- Rate limit headers support
- Comprehensive test suite
- Full TypeScript support with type definitions
- Examples for Express and NestJS usage

### Features

- **RateLimiterService**: Core rate limiting logic with MongoDB integration
- **ExpressRateLimiterMiddleware**: Express middleware with headers and error handling
- **NestJSRateLimiterGuard**: NestJS guard for protecting routes
- **NestJSRateLimiterInterceptor**: NestJS interceptor for request interception
- **MongoDB Integration**: Uses TTL indexes for automatic cleanup
- **Flexible Configuration**: Customizable limits, windows, and behavior

### Technical Details

- Built with TypeScript for type safety
- MongoDB with TTL indexes (mimics Redis behavior)
- Jest testing framework
- Support for both CommonJS and ES modules
- Subpath exports for NestJS components

[1.0.0]: https://github.com/Divyansh-007/rate-limiter/releases/tag/v1.0.0
