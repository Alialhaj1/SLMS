/**
 * Error Sanitization Gate
 * Prevents leaking sensitive information from unknown errors
 * 
 * Security Requirements:
 * - No stack traces in production
 * - No raw DB error messages
 * - No ORM internal errors
 * - No system paths
 * 
 * CTO Requirement: "أي Error غير معروف → يتحول إلى INTERNAL_ERROR"
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../types/errors';

/**
 * Known safe error codes (from ErrorFactory)
 */
const SAFE_ERROR_CODES = new Set([
  ErrorCode.ITEM_POLICY_LOCKED,
  ErrorCode.ITEM_HAS_MOVEMENT,
  ErrorCode.GROUP_HAS_CHILDREN,
  ErrorCode.GROUP_HAS_ITEMS,
  ErrorCode.VALIDATION_ERROR,
  ErrorCode.DUPLICATE_CODE,
  ErrorCode.ENTITY_NOT_FOUND,
  ErrorCode.UNAUTHORIZED,
  ErrorCode.FORBIDDEN,
  ErrorCode.OPERATION_NOT_ALLOWED,
  ErrorCode.CONCURRENT_MODIFICATION,
  ErrorCode.STALE_DATA,
  ErrorCode.DEPENDENCY_EXISTS,
]);

/**
 * Sensitive keywords that should trigger sanitization
 */
const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'secret',
  'key',
  'credential',
  'pgql',
  'postgres',
  'pg_',
  'sql',
  'database',
  'connection',
  'node_modules',
  '/backend/',
  'C:\\',
  'stack trace',
  'at Object.',
  'at Function.',
];

/**
 * Check if error message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
}

/**
 * Sanitize error response
 */
export function sanitizeError(error: any): any {
  // Case 1: Known safe error from ErrorFactory
  if (error.code && SAFE_ERROR_CODES.has(error.code)) {
    return {
      code: error.code,
      message: error.message,
      entity: error.entity,
      entity_id: error.entity_id,
      field: error.field,
      fields: error.fields,
      hint: error.hint,
    };
  }

  // Case 2: Contains sensitive information
  if (error.message && containsSensitiveInfo(error.message)) {
    return {
      code: ErrorCode.INTERNAL_ERROR || 'INTERNAL_ERROR',
      message: 'An internal error occurred. Please contact support.',
      entity: error.entity || null,
      entity_id: error.entity_id || null,
      hint: 'If this persists, please provide the timestamp to support.',
    };
  }

  // Case 3: Unknown error without safe structure
  if (!error.code || !SAFE_ERROR_CODES.has(error.code)) {
    return {
      code: ErrorCode.INTERNAL_ERROR || 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      hint: 'Please try again or contact support if the issue persists.',
    };
  }

  // Case 4: Safe error (shouldn't reach here, but defensive)
  return {
    code: error.code,
    message: error.message,
    entity: error.entity,
    entity_id: error.entity_id,
    field: error.field,
    fields: error.fields,
    hint: error.hint,
  };
}

/**
 * Error Sanitization Middleware
 * Apply at the END of middleware chain (after all routes)
 */
export function errorSanitizerMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log original error for debugging (server-side only)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Original error:', error);
  } else {
    // In production, log to monitoring service (future)
    // Example: Sentry.captureException(error);
    console.error('Error sanitized:', { code: error.code, entity: error.entity });
  }

  // Sanitize error
  const sanitizedError = sanitizeError(error);

  // Determine HTTP status
  const status = error.status || error.statusCode || 500;

  // Send sanitized response
  res.status(status).json({
    error: sanitizedError,
  });
}

/**
 * Usage in app.ts:
 * 
 * // At the END of middleware chain (after all routes)
 * app.use(errorSanitizerMiddleware);
 */

/**
 * Example Test Cases:
 * 
 * 1. Safe error (ITEM_POLICY_LOCKED) → Pass through
 * 2. DB error with "postgres" → Convert to INTERNAL_ERROR
 * 3. ORM error with stack trace → Convert to INTERNAL_ERROR
 * 4. Error with "password" in message → Convert to INTERNAL_ERROR
 * 5. Unknown error code → Convert to INTERNAL_ERROR
 */
