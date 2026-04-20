/**
 * ============================================================================
 * Unified API Response Wrapper — Architecture §11.2
 * ============================================================================
 * Standard response format (§11.2):
 *   {
 *     success: boolean,
 *     code: "SHIPMENT_CREATED",         // machine-readable code
 *     message: "تم إنشاء الشحنة بنجاح",  // human-readable
 *     data: { ... },                    // payload
 *     meta: { page, per_page, total, total_pages },
 *     errors: null | [{ field, message }]
 *   }
 *
 * Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * Default pagination: page=1, limit=20 (max 100)
 * ============================================================================
 */

import { Response } from 'express';

// ===========================
// Response Types (§11.2)
// ===========================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** §11.2 alias for `limit` */
  per_page: number;
  /** §11.2 alias for `totalPages` */
  total_pages: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  /** §11.2 — machine-readable status code */
  code: string;
  data: T;
  message?: string;
  meta?: Partial<PaginationMeta> | null;
  errors: null;
  /** @deprecated Use `meta` — kept for backward compatibility */
  pagination?: Partial<PaginationMeta>;
}

export interface ErrorResponse {
  success: false;
  /** §11.2 — machine-readable error code */
  code: string;
  message: string;
  data: null;
  meta: null;
  /** §11.2 — validation errors array */
  errors: ValidationError[] | null;
  /** @deprecated Kept for backward compatibility with existing frontend */
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
}

// ===========================
// Response Helper Functions
// ===========================

/**
 * Send successful response (§11.2 format)
 *
 * @param res        Express response
 * @param data       Response payload
 * @param statusCode HTTP status (default 200)
 * @param meta       Pagination metadata
 * @param message    Optional human-readable message
 * @param code       Machine-readable code (default 'SUCCESS')
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Partial<PaginationMeta>,
  message?: string,
  code?: string
): Response {
  const response: any = {
    success: true,
    code: code || (statusCode === 201 ? 'CREATED' : 'SUCCESS'),
    data,
    meta: meta || null,
    errors: null,
  };

  if (message) {
    response.message = message;
  }

  // Backward compatibility: pagination alias
  if (meta) {
    response.pagination = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send error response (§11.2 format)
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: any
): Response {
  // Build §11.2 errors array from details
  let errors: ValidationError[] | null = null;
  if (Array.isArray(details)) {
    errors = details.map((d: any) => ({
      field: d.field || d.path?.join?.('.') || d.path || '',
      message: d.message || String(d),
    }));
  } else if (details && typeof details === 'object' && details.field) {
    errors = [{ field: details.field, message: details.message || '' }];
  }

  const response: any = {
    success: false,
    code,
    message,
    data: null,
    meta: null,
    errors,
    // Backward compatibility: nested error object for existing frontend
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Send 204 No Content response (§11.3 — DELETE success)
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
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

  // Unprocessable Entity (422) — §11.3
  unprocessable: (res: Response, message = 'Unprocessable entity', details?: any) =>
    sendError(res, 'UNPROCESSABLE_ENTITY', message, 422, details),

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
// Pagination Helper (§14.1)
// ===========================
// Default: page=1, limit=20, max=100

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function getPaginationParams(query: any): { limit: number; offset: number; page: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    // §11.2 aliases
    per_page: limit,
    total_pages: totalPages,
  };
}

/**
 * Send paginated response (§14.1 format)
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  statusCode = 200,
  message?: string
): Response {
  return sendSuccess(
    res,
    data,
    statusCode,
    createPaginationMeta(page, limit, total),
    message
  );
}
