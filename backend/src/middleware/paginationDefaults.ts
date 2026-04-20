/**
 * ============================================================================
 * Pagination Middleware — Arabic Specification §14.1
 * ============================================================================
 * Ensures default pagination parameters are present on all GET requests:
 *   ?page=1&limit=20
 *
 * Also exposes parsed pagination on req.pagination for route handlers.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';

/** Default pagination values per spec §14.1 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 10000,
} as const;

export interface ParsedPagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Middleware that parses and normalizes pagination query params.
 * Attaches `req.pagination` with { page, limit, offset }.
 *
 * - page defaults to 1, minimum 1
 * - limit defaults to 20, minimum 1, maximum 100
 * - offset is computed as (page - 1) * limit
 */
export function paginationDefaults(req: Request, _res: Response, next: NextFunction) {
  const query = req.query as any;

  const page = Math.max(1, parseInt(query.page) || PAGINATION_DEFAULTS.page);
  const limit = Math.min(
    PAGINATION_DEFAULTS.maxLimit,
    Math.max(1, parseInt(query.limit) || PAGINATION_DEFAULTS.limit)
  );
  const offset = (page - 1) * limit;

  // Normalize query params so downstream handlers see consistent values
  query.page = String(page);
  query.limit = String(limit);

  // Attach parsed pagination for easy access in handlers
  (req as any).pagination = { page, limit, offset } as ParsedPagination;

  next();
}

/**
 * Helper: get parsed pagination from request (set by paginationDefaults middleware)
 */
export function getPagination(req: Request): ParsedPagination {
  return (req as any).pagination || {
    page: PAGINATION_DEFAULTS.page,
    limit: PAGINATION_DEFAULTS.limit,
    offset: 0,
  };
}
