/**
 * Global Error Handler Middleware
 * Catches all errors and sends consistent error responses
 * Integrated with Sentry for production error tracking
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './validate';
import { sendError } from '../utils/response';
import { config } from '../config/env';
import { captureException } from '../utils/sentry';
import logger from '../utils/logger';
import { trackError } from '../routes/healthDetailed';

// ===========================
// Custom Error Classes
// ===========================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

// ===========================
// Error Handler Middleware
// ===========================

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isDev = config.NODE_ENV === 'development';

  // Log error (in production, use proper logging service)
  if (isDev) {
    console.error('❌ Error:', err);
  } else {
    // In production, log only critical info (no stack traces to console)
    console.error(`❌ Error: ${err.message}`);
  }

  // ValidationError from our validation middleware
  if (err instanceof ValidationError) {
    return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, err.errors);
  }

  // Custom AppError
  if (err instanceof AppError) {
    const response: any = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err.details) {
      response.error.details = err.details;
    }

    // Include stack trace in development
    if (isDev && err.stack) {
      response.error.stack = err.stack;
    }

    return res.status(err.statusCode).json(response);
  }

  // PostgreSQL errors
  if (err.name === 'QueryFailedError' || (err as any).code) {
    const pgError = err as any;

    // Unique constraint violation
    if (pgError.code === '23505') {
      return sendError(res, 'ALREADY_EXISTS', 'A record with this value already exists', 409);
    }

    // Foreign key violation
    if (pgError.code === '23503') {
      return sendError(res, 'FOREIGN_KEY_VIOLATION', 'Referenced record does not exist', 400);
    }

    // Not null violation
    if (pgError.code === '23502') {
      return sendError(res, 'MISSING_REQUIRED_FIELD', 'Required field is missing', 400);
    }

    // Generic database error
    return sendError(
      res,
      'DATABASE_ERROR',
      isDev ? pgError.message : 'Database operation failed',
      500
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'INVALID_TOKEN', 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'TOKEN_EXPIRED', 'Token has expired', 401);
  }

  // Log error to Winston
  logger.error('Unhandled error caught by error handler', err, {
    url: req.originalUrl,
    method: req.method,
    userId: (req as any).user?.id,
    companyId: (req as any).user?.companyId,
  });

  // Track error for health metrics
  trackError(req.originalUrl);

  // Send to Sentry for 5xx errors (server errors, not client errors)
  if (!err.statusCode || err.statusCode >= 500) {
    captureException(err, {
      tags: {
        endpoint: req.originalUrl,
        method: req.method,
      },
      userId: (req as any).user?.id,
      companyId: (req as any).user?.companyId,
    });
  }

  // Default to 500 server error
  const response: any = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'An unexpected error occurred',
    },
  };

  // Include stack trace in development
  if (isDev && err.stack) {
    response.error.stack = err.stack;
  }

  return res.status(500).json(response);
}

// ===========================
// 404 Handler
// ===========================

export function notFoundHandler(req: Request, res: Response) {
  return sendError(
    res,
    'ROUTE_NOT_FOUND',
    `Route ${req.method} ${req.path} not found`,
    404
  );
}

// ===========================
// Async Route Wrapper
// ===========================

/**
 * Wraps async route handlers to catch errors automatically
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
