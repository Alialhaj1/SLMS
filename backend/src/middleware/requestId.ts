/**
 * Request ID Middleware
 * Generates unique correlation ID for each request
 * Used for: logging, debugging, audit trails, Sentry tracking
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

/**
 * Generates and attaches a unique request ID to each request
 * - Uses X-Request-ID header if provided by client/load balancer
 * - Otherwise generates a new UUID
 * - Adds to response headers for client correlation
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use existing request ID from headers or generate new one
  const requestId = (req.headers['x-request-id'] as string) || 
                    (req.headers['x-correlation-id'] as string) || 
                    randomUUID();

  // Attach to request object
  req.id = requestId;
  req.startTime = Date.now();

  // Add to response headers for correlation
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', requestId);

  next();
};

/**
 * Get request duration in milliseconds
 */
export const getRequestDuration = (req: Request): number => {
  return req.startTime ? Date.now() - req.startTime : 0;
};

export default requestIdMiddleware;
