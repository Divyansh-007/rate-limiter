# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-03

### Added

- **Redis Support**: Added Redis as an alternative cache provider alongside MongoDB
- **Cache Provider Interface**: Abstract cache provider interface for extensible storage backends
- **MongoDBCacheProvider**: MongoDB-specific cache provider implementation
- **RedisCacheProvider**: Redis-specific cache provider implementation
- **Flexible Configuration**: Users can now choose between MongoDB and Redis for rate limiting storage
- **Redis Dependencies**: Added Redis client dependency for Redis support

### Changed

- **Breaking Change**: Updated configuration interface to use `cacheProvider` object instead of direct MongoDB configuration
- **Configuration Structure**: Rate limiter now requires `cacheProvider.type` to specify backend ('mongodb' or 'redis')
- **MongoDB Configuration**: MongoDB URL is now specified in `cacheProvider.mongoUrl`
- **Redis Configuration**: Redis URL is specified in `cacheProvider.redisUrl`
- **Examples Updated**: All examples now demonstrate both MongoDB and Redis usage

### Features

- **Dual Backend Support**: Choose between MongoDB and Redis based on your needs
- **High Performance**: Redis provides sub-millisecond response times for high-traffic applications
- **Distributed Rate Limiting**: Redis enables distributed rate limiting across multiple application instances
- **Automatic Cleanup**: Both backends support automatic cleanup of expired rate limit records
- **Backward Compatibility**: Existing MongoDB functionality preserved with new configuration structure

### Technical Details

- Redis uses hash structures with automatic key expiration
- MongoDB continues to use TTL indexes for cleanup
- Cache providers are pluggable and follow a common interface
- Both backends provide the same API and behavior

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
