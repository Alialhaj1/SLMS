import rateLimit from 'express-rate-limit';

// Check if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Rate limiter for authentication endpoints (login, register)
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 500 : 50, // Much higher in dev for testing
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
});

/**
 * General API rate limiter
 * Prevents API abuse and DoS attacks
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 2000 : 300, // 2000 in dev (React StrictMode doubles requests), 300 in production
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limit for sensitive operations (settings updates)
 */
export const settingsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 20, // Higher in dev for testing
  message: { error: 'Too many setting changes, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict rate limit for password reset/recovery
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 20 : 3, // Higher in dev for testing
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * CTO Requirement: Smart Rate Limiting (DELETE operations only)
 * فقط على DELETE وbulk updates - ليس على GET
 */
export const deleteRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 10, // 10 deletes per minute in production
  message: { error: 'Too many delete requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user (not per IP)
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : req.ip;
  },
});

/**
 * CTO Requirement: Smart Rate Limiting (Bulk Update operations)
 */
export const bulkUpdateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 20, // 20 bulk updates per minute in production
  message: { error: 'Too many bulk update requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : req.ip;
  },
});
