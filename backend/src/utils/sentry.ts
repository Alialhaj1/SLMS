/**
 * Sentry Error Tracking - Production-Grade Configuration
 * 
 * Features:
 * - Environment-aware (dev vs production)
 * - User context (userId, email, companyId)
 * - Request context (method, endpoint, IP)
 * - Performance monitoring with tracing
 * - Error filtering (ignore 401/403 auth errors)
 * - Release tracking
 */

import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * Initialize Sentry SDK
 * Call this ONCE at application startup before any routes
 */
export function initializeSentry(app: Express): void {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  // Skip Sentry in test environment
  if (environment === 'test') {
    console.log('Sentry disabled in test environment');
    return;
  }

  // Get Sentry DSN from environment (must be set in production)
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    if (isProduction) {
      console.error('⚠️  SENTRY_DSN not set in production environment!');
    } else {
      console.log('ℹ️  Sentry disabled - no SENTRY_DSN configured (dev mode OK)');
    }
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    
    // Release tracking (use git commit hash or version)
    release: process.env.RELEASE_VERSION || 'slms@dev',

    // Performance monitoring - sample rate
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Integrations
    integrations: [
      // Express integration - automatic request tracking
      new Sentry.Integrations.Http({ tracing: true }),
      // PostgreSQL tracing is built-in to @sentry/node
    ],

    // Filter out expected errors (don't pollute Sentry with these)
    beforeSend(event, hint) {
      const error = hint.originalException as any;
      
      // Ignore authentication/authorization errors (expected behavior)
      if (error?.status === 401 || error?.status === 403) {
        return null;
      }

      // Ignore rate limit errors (expected behavior)
      if (error?.status === 429) {
        return null;
      }

      // Ignore validation errors (user input errors, not bugs)
      if (error?.name === 'ValidationError') {
        return null;
      }

      return event;
    },

    // Error sampling (reduce noise in production)
    sampleRate: isProduction ? 0.5 : 1.0, // 50% in prod, 100% in dev
  });

  console.log(`✅ Sentry initialized (${environment})`);
}

/**
 * Sentry Request Handler Middleware
 * Must be the FIRST middleware (after logging)
 * Returns a function - must be called lazily after Sentry.init()
 */
export function sentryRequestHandler() {
  // Return no-op if Sentry not initialized
  if (!process.env.SENTRY_DSN) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Sentry Tracing Middleware
 * Tracks performance of each request
 * Returns a function - must be called lazily after Sentry.init()
 */
export function sentryTracingHandler() {
  // Return no-op if Sentry not initialized
  if (!process.env.SENTRY_DSN) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Sentry Error Handler Middleware
 * Must be BEFORE your own error handlers, but AFTER all routes
 * Returns a function - must be called lazily after Sentry.init()
 */
export function sentryErrorHandler() {
  // Return no-op if Sentry not initialized
  if (!process.env.SENTRY_DSN) {
    return (err: any, req: Request, res: Response, next: NextFunction) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error: any) {
      // Only send 5xx errors to Sentry (server errors, not client errors)
      return error.status >= 500 || !error.status;
    },
  });
}

/**
 * Set user context for current request
 * Call this after authentication middleware
 */
export function setSentryUser(req: Request): void {
  const user = (req as any).user;
  
  if (user) {
    Sentry.setUser({
      id: user.id?.toString(),
      email: user.email,
      username: user.email,
      // Custom fields
      roles: user.roles?.join(','),
      companyId: user.companyId?.toString(),
    });
  }
}

/**
 * Set request context (additional metadata)
 */
export function setSentryContext(req: Request): void {
  Sentry.setContext('request_details', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    companyId: (req as any).user?.companyId,
  });
}

/**
 * Middleware to automatically set user + context
 * Use this AFTER authentication middleware
 */
export function sentryContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    setSentryUser(req);
    setSentryContext(req);
  } catch (error) {
    // Don't fail request if Sentry context fails
    console.error('Failed to set Sentry context:', error);
  }
  next();
}

/**
 * Capture exception manually (for try/catch blocks)
 * 
 * Example:
 * ```typescript
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   captureException(error, { tags: { operation: 'dangerousOperation' } });
 *   throw error;
 * }
 * ```
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  // Skip if Sentry not initialized
  if (!process.env.SENTRY_DSN) {
    return;
  }
  
  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context,
  });
}

/**
 * Capture message manually (for warnings or info)
 * 
 * Example:
 * ```typescript
 * captureMessage('Suspicious activity detected', 'warning', { userId: 123 });
 * ```
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  // Skip if Sentry not initialized
  if (!process.env.SENTRY_DSN) {
    return;
  }
  
  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context,
  });
}

export default Sentry;
