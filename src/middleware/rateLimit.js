import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../config/redis.js';
import logger from '../config/logger.js';

// Create rate limiters for different types of requests
const loginLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login',
  points: 5, // 5 attempts
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 60, // Block for 1 hour after 5 attempts
});

const apiLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api',
  points: 100, // 100 requests
  duration: 60, // 1 minute
});

const emailLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'email',
  points: 3, // 3 emails
  duration: 60 * 60, // 1 hour
});

export const loginRateLimit = async (req, res, next) => {
  try {
    const key = req.ip;
    await loginLimiter.consume(key);
    next();
  } catch (error) {
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: error.msBeforeNext / 1000
    });
  }
};

export const apiRateLimit = async (req, res, next) => {
  try {
    const key = req.ip;
    await apiLimiter.consume(key);
    next();
  } catch (error) {
    logger.warn(`API rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: error.msBeforeNext / 1000
    });
  }
};

export const emailRateLimit = async (req, res, next) => {
  try {
    const key = req.body.email;
    await emailLimiter.consume(key);
    next();
  } catch (error) {
    logger.warn(`Email rate limit exceeded for email: ${req.body.email}`);
    res.status(429).json({
      error: 'Too many email requests. Please try again later.',
      retryAfter: error.msBeforeNext / 1000
    });
  }
}; 