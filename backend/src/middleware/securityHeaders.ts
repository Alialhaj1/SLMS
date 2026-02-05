/**
 * Enhanced Security Headers Middleware
 * Enterprise-grade security headers beyond Helmet defaults
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Additional security headers not covered by Helmet
 */
export const securityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prevent clickjacking (also done by Helmet, but explicit)
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy - don't leak URLs
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy - restrict browser features
  res.setHeader('Permissions-Policy', [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()'
  ].join(', '));

  // Cache Control for API responses (no caching by default)
  if (req.path.startsWith('/api/') && !res.getHeader('Cache-Control')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  next();
};

/**
 * IP extraction middleware - handles proxies correctly
 */
export const extractRealIP = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get real IP considering proxies
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  // Store original IP for logging
  (req as any).realIP = 
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : null) ||
    (typeof realIP === 'string' ? realIP : null) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';

  next();
};

export default securityHeadersMiddleware;
