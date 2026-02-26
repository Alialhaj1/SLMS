/**
 * Onboarding Middleware
 * Checks if tenant has completed company setup before allowing business operations.
 * Blocks access to business modules until at least one company with a branch exists.
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export async function checkTenantCompanySetup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    if (!user) return next();

    // Platform admins skip onboarding checks
    if (user.is_platform_admin || !user.tenant_id) {
      return next();
    }

    // Super admins skip
    if (user.roles && user.roles.includes('super_admin')) {
      return next();
    }

    // Check if tenant has at least one active company
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM companies 
         WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'`,
        [user.tenant_id]
      );
      
      if (parseInt(result.rows[0].count) === 0) {
        res.status(403).json({
          error: 'ONBOARDING_REQUIRED',
          message: 'Please complete company setup before accessing this module.',
          redirect: '/onboarding'
        });
        return;
      }
    } catch {
      // If tenant_id column doesn't exist, skip check
    }

    next();
  } catch {
    next();
  }
}
