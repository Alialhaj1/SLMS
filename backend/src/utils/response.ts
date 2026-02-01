/**
 * Unified API Response Wrapper
 * Ensures consistent response format across all endpoints
 */

import { Response } from 'express';

// ===========================
// Response Types
// ===========================

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string; // Only in development
  };
}

// ===========================
// Response Helper Functions
// ===========================

/**
 * Send successful response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: SuccessResponse['meta']
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: any
): Response {
  const isDev = process.env.NODE_ENV === 'development';
  
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
}

// ===========================
// Common Error Responses
// ===========================

export const errors = {
  // Authentication Errors (401)
  unauthorized: (res: Response, message = 'Authentication required') =>
    sendError(res, 'UNAUTHORIZED', message, 401),

  invalidToken: (res: Response) =>
    sendError(res, 'INVALID_TOKEN', 'Invalid or expired token', 401),

  invalidCredentials: (res: Response) =>
    sendError(res, 'INVALID_CREDENTIALS', 'Invalid credentials', 401),

  // Authorization Errors (403)
  forbidden: (res: Response, message = 'You do not have permission to perform this action') =>
    sendError(res, 'FORBIDDEN', message, 403),

  accountLocked: (res: Response) =>
    sendError(res, 'ACCOUNT_LOCKED', 'Account is locked due to multiple failed login attempts', 403),

  accountDisabled: (res: Response) =>
    sendError(res, 'ACCOUNT_DISABLED', 'Account has been disabled', 403),

  // Not Found Errors (404)
  notFound: (res: Response, resource = 'Resource') =>
    sendError(res, 'NOT_FOUND', `${resource} not found`, 404),

  userNotFound: (res: Response) =>
    sendError(res, 'USER_NOT_FOUND', 'User not found', 404),

  roleNotFound: (res: Response) =>
    sendError(res, 'ROLE_NOT_FOUND', 'Role not found', 404),

  // Validation Errors (400)
  validationError: (res: Response, details: string[]) =>
    sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, details),

  missingField: (res: Response, field: string) =>
    sendError(res, 'MISSING_FIELD', `Required field missing: ${field}`, 400),

  invalidInput: (res: Response, message: string) =>
    sendError(res, 'INVALID_INPUT', message, 400),

  // Conflict Errors (409)
  alreadyExists: (res: Response, resource = 'Resource') =>
    sendError(res, 'ALREADY_EXISTS', `${resource} already exists`, 409),

  emailExists: (res: Response) =>
    sendError(res, 'EMAIL_EXISTS', 'Email already registered', 409),

  inUse: (res: Response, resource = 'Resource') =>
    sendError(res, 'IN_USE', `${resource} is currently in use and cannot be deleted`, 409),

  // Rate Limiting (429)
  tooManyRequests: (res: Response) =>
    sendError(res, 'TOO_MANY_REQUESTS', 'Too many requests. Please try again later.', 429),

  // Server Errors (500)
  internal: (res: Response, message = 'Internal server error') =>
    sendError(res, 'INTERNAL_ERROR', message, 500),

  databaseError: (res: Response) =>
    sendError(res, 'DATABASE_ERROR', 'Database operation failed', 500),
};

// ===========================
// Pagination Helper
// ===========================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function getPaginationParams(query: any): { limit: number; offset: number; page: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function createPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  statusCode = 200
): Response {
  return sendSuccess(
    res,
    data,
    statusCode,
    createPaginationMeta(page, limit, total)
  );
}
