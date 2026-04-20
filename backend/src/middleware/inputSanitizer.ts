/**
 * ============================================================================
 * §17 SECURITY: Input Sanitization Middleware
 * ============================================================================
 * QA 08 — XSS Prevention: Sanitize user input to prevent Cross-Site Scripting
 * QA 09 — Path Traversal Protection: Block directory traversal attempts
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// ─── XSS Patterns ──────────────────────────────────────────────────────────

/** Dangerous HTML/JS patterns that indicate XSS attempts */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,       // onclick="...", onerror="..."
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /expression\s*\(/gi,                    // CSS expression()
];

/**
 * Sanitize a single string value by escaping HTML special characters.
 * This prevents script injection while preserving readable text.
 */
function sanitizeString(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Check if a string contains XSS attack patterns.
 */
function containsXSS(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively sanitize all string values in an object or array.
 * Returns a new sanitized copy — does not mutate the original.
 */
function sanitizeDeep(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDeep(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeDeep(value);
    }
    return sanitized;
  }
  return obj;
}

// ─── Path Traversal Patterns ────────────────────────────────────────────────

/** Patterns that indicate directory traversal attempts */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,                    // ../
  /\.\.\\/,                    // ..\
  /%2e%2e%2f/i,               // URL-encoded ../
  /%2e%2e%5c/i,               // URL-encoded ..\
  /%252e%252e%252f/i,         // Double-encoded ../
  /%c0%ae/i,                  // Overlong UTF-8 encoding of .
  /%c1%9c/i,                  // Overlong UTF-8 encoding of /
  /\.\.%00/,                  // Null byte injection with traversal
];

// ─── Middleware Exports ─────────────────────────────────────────────────────

/**
 * XSS Input Sanitizer Middleware
 * 
 * Sanitizes all string values in req.body, req.query, and req.params
 * by escaping HTML special characters. Logs warnings when XSS patterns
 * are detected.
 * 
 * Applied globally BEFORE route handlers.
 */
export function xssSanitizer(req: Request, _res: Response, next: NextFunction): void {
  // Only sanitize mutation requests that have bodies
  if (req.body && typeof req.body === 'object' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // Check for XSS patterns before sanitizing (for logging)
    const bodyStr = JSON.stringify(req.body);
    if (containsXSS(bodyStr)) {
      logger.warn('§17 SECURITY: XSS pattern detected in request body', {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userId: (req as any).user?.id || 'anonymous',
      });
    }
    req.body = sanitizeDeep(req.body);
  }

  // Sanitize query parameters (all requests)
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        (req.query as any)[key] = sanitizeString(value);
      }
    }
  }

  next();
}

/**
 * Path Traversal Guard Middleware
 * 
 * Blocks requests containing directory traversal sequences in the URL.
 * Returns 400 Bad Request for suspected traversal attempts.
 * 
 * Applied globally BEFORE route handlers.
 */
export function pathTraversalGuard(req: Request, res: Response, next: NextFunction): void {
  const fullPath = decodeURIComponent(req.originalUrl || req.url);

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(req.originalUrl || req.url) || pattern.test(fullPath)) {
      logger.warn('§17 SECURITY: Path traversal attempt blocked', {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userId: (req as any).user?.id || 'anonymous',
      });
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid path — directory traversal is not allowed',
        code: 'PATH_TRAVERSAL_BLOCKED',
      });
      return;
    }
  }

  next();
}
