import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Check if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

/**
 * No-op middleware that skips rate limiting entirely (used in development)
 */
const noOpLimiter = (_req: Request, _res: Response, next: NextFunction) => next();

/**
 * Rate limiter for authentication endpoints (login, register)
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 500 : 50, // 500 in dev, 50 in production — prevents brute force
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
});

/**
 * General API rate limiter (§14.1 — 1000 requests/minute per tenant)
 * Disabled in development — React StrictMode double-mounts, HMR reconnections,
 * and multiple hooks cause request storms that hit limits during normal dev usage.
 * In production: 1000 requests per minute per IP.
 */
export const apiRateLimiter = isDev ? noOpLimiter : rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 per minute per tenant (§14.1)
  message: { 
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please slow down' },
    message: 'Too many requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per tenant (not per IP) when authenticated
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) return `tenant:${tenantId}`;
    const userId = (req as any).user?.id;
    if (userId) return `user:${userId}`;
    return req.ip || 'unknown';
  },
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

// ════════════════════════════════════════════════════════════════════════════
// E-Commerce Store Rate Limiters (Public-facing — stricter)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Store browsing (products, categories, search) — generous limits
 */
export const storeBrowseRateLimiter = isDev ? noOpLimiter : rateLimit({
  windowMs: 60 * 1000,
  max: 200, // 200 req/min per IP — browsing is high frequency
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Store auth (login, register) — strict brute-force protection
 */
export const storeAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min window
  max: isDev ? 100 : 10, // 10 attempts per 15 min
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Store checkout / cart writes — moderate limits
 */
export const storeCheckoutRateLimiter = isDev ? noOpLimiter : rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 req/min — covers add-to-cart, apply coupon, checkout
  message: { error: 'Too many requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const customerId = (req as any).storeCustomer?.id;
    return customerId ? `store_customer:${customerId}` : req.ip || 'unknown';
  },
});

/**
 * Store webhooks — no rate limit (payment gateways need reliable delivery)
 * Instead, verification is handled by webhook signature checks
 */
