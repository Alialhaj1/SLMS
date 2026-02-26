/**
 * Company Scope Guard Middleware
 * Preloads user's assigned company IDs for multi-company access control.
 * Populates req.userCompanyIds for downstream use in query filters.
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';

// Simple in-memory cache (userId → companyIds)
const scopeCache = new Map<number, { ids: number[]; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export async function preloadCompanyScope(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    if (!user) return next();

    // Platform admins or super_admins have access to all companies
    if (user.is_platform_admin || (user.roles && user.roles.includes('super_admin'))) {
      (req as any).userCompanyIds = null; // null = unrestricted
      return next();
    }

    // Check cache
    const cached = scopeCache.get(user.id);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      (req as any).userCompanyIds = cached.ids;
      return next();
    }

    try {
      const result = await pool.query(
        'SELECT company_id FROM user_companies WHERE user_id = $1 AND deleted_at IS NULL',
        [user.id]
      );
      const ids = result.rows.map((r: any) => r.company_id);
      scopeCache.set(user.id, { ids, fetchedAt: Date.now() });
      (req as any).userCompanyIds = ids;
    } catch {
      (req as any).userCompanyIds = [];
    }

    next();
  } catch {
    next();
  }
}

/**
 * Build a WHERE clause fragment for company scope filtering.
 * Usage: const filter = buildCompanyScopeFilter(req, 'c.id');
 */
export function buildCompanyScopeFilter(req: Request, columnName: string = 'company_id'): { clause: string; params: any[] } {
  const ids = (req as any).userCompanyIds;
  if (ids === null || ids === undefined) {
    return { clause: '1=1', params: [] }; // unrestricted
  }
  if (ids.length === 0) {
    return { clause: '1=0', params: [] }; // no access
  }
  return { clause: `${columnName} = ANY($1)`, params: [ids] };
}

/**
 * Alias for preloadCompanyScope — used as route-level middleware.
 * Usage: router.get('/companies', authenticate, companyScopeGuard, handler)
 */
export const companyScopeGuard = preloadCompanyScope;

/**
 * Returns the array of company IDs the current user has access to.
 * Returns null if user is unrestricted (platform admin / super_admin).
 */
export function getRequestCompanyScope(req: Request): number[] | null {
  return (req as any).userCompanyIds ?? null;
}
