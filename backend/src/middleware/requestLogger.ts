import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { trackPerformance } from '../routes/healthDetailed';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    roles: string[];
    companyId?: number;
  };
  requestId?: string;
}

/**
 * Middleware to add X-Request-ID for end-to-end request tracing
 * If client sends X-Request-ID header, use it; otherwise generate new UUID
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use client-provided request ID or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  // Attach to request object for use in other middleware/routes
  req.requestId = requestId;
  
  // Include in response headers for client-side correlation
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

/**
 * Middleware to log all incoming HTTP requests
 * Captures: method, endpoint, user, company, response time, status code, requestId
 */
export const requestLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Capture request details including requestId
  const requestInfo = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent') || 'unknown',
  };

  // Log request received
  logger.http('Incoming request', requestInfo);

  // Capture response details when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRoles: req.user?.roles,
      companyId: req.user?.companyId,
    };

    // Track performance for health check
    trackPerformance(req.originalUrl, duration);

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed with server error', responseInfo);
    } else if (res.statusCode >= 400) {
      logger.warn('Request failed with client error', responseInfo);
    } else {
      logger.info('Request completed successfully', responseInfo);
    }
  });

  next();
};

/**
 * Middleware to log API usage for dead API detection
 * Creates detailed metrics for each endpoint
 */
export const apiUsageLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log API usage with full context for analysis (including requestId)
    logger.http('API_USAGE', {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      endpoint: req.originalUrl,
      route: req.route?.path || 'unknown',
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'anonymous',
      userRoles: req.user?.roles || [],
      companyId: req.user?.companyId || null,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      success: res.statusCode < 400,
    });
  });

  next();
};
