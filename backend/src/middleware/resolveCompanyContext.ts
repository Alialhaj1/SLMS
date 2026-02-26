/**
 * Resolve Company Context Middleware
 * Resolves req.companyId from JWT, X-Company-Id header, or user_companies table.
 * Never returns errors — silently skips if no company can be resolved.
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export async function resolveCompanyContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    if (!user) return next();

    // Priority 1: X-Company-Id header
    const headerCompanyId = req.headers['x-company-id'];
    if (headerCompanyId) {
      (req as any).companyId = Number(headerCompanyId);
      return next();
    }

    // Priority 2: JWT companyId / company_id
    if (user.companyId || user.company_id) {
      (req as any).companyId = user.companyId || user.company_id;
      return next();
    }

    // Priority 3: Default company from user_companies
    if (user.default_company_id) {
      (req as any).companyId = user.default_company_id;
      return next();
    }

    // Priority 4: First assigned company
    try {
      const result = await pool.query(
        'SELECT company_id FROM user_companies WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
        [user.id]
      );
      if (result.rows.length > 0) {
        (req as any).companyId = result.rows[0].company_id;
      }
    } catch {
      // Silently skip if table doesn't exist
    }

    next();
  } catch {
    next();
  }
}
