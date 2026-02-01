/**
 * Super Admin Middleware
 * ===========================
 * 
 * Middleware to enforce Super Admin-only operations:
 * - Soft delete recovery
 * - System administration
 * - Audit log viewing
 * 
 * Usage: router.delete('/resource/:id/restore', requireSuperAdmin, handler);
 */

import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
}

/**
 * Enforce Super Admin role
 * Only users with 'super_admin' role can access
 */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check for super_admin role
    if (!user.roles || !user.roles.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Super Admin access required',
        message: 'Only Super Administrators can perform this action',
        code: 'SUPER_ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Super Admin check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SUPER_ADMIN_CHECK_ERROR'
    });
  }
};

export default requireSuperAdmin;
