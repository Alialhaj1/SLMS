/**
 * Users Management API Routes
 * Phase 4B Feature 3: User Status Management (Disable/Enable/Unlock)
 */

import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { companyScopeGuard, getRequestCompanyScope } from '../middleware/companyScopeGuard';
import { getPaginationParams, sendPaginated } from '../utils/response';
import { UserService } from '../services/userService';
import { auditLog } from '../middleware/auditLog';
import { PolicyService } from '../services/policyService';

import { UploadService } from '../services/uploadService';

const router = Router();

const SUPER_ADMIN_ROLE_NAMES = ['super_admin', 'Super Admin'];

function isSuperAdminRequest(req: any): boolean {
  return Array.isArray(req.user?.roles) && req.user.roles.includes('super_admin');
}

/** Extract tenant_id from isolation middleware (secure). */
function getRequestTenantId(req: any): number | null {
  return getIsolatedTenantId(req);
}

/**
 * Middleware: ensures tenant users can only operate on users from their own tenant.
 * Reads :id from URL params. Platform users (tenant_id=null) skip this check.
 */
function requireSameTenant(req: Request, res: Response, next: NextFunction) {
  const tenantId = getRequestTenantId(req);
  if (!tenantId) return next(); // platform user → no restriction

  const userId = parseInt(req.params.id, 10);
  if (!Number.isFinite(userId)) return next(); // will fail validation later

  pool.query('SELECT tenant_id FROM users WHERE id = $1', [userId])
    .then(result => {
      if (result.rows.length > 0 && result.rows[0].tenant_id !== tenantId) {
        return res.status(403).json({ success: false, error: 'Not allowed' });
      }
      next();
    })
    .catch(() => next());
}

async function isTargetSuperAdminUser(userId: number): Promise<boolean> {
  return UserService.hasAnyRole(userId, SUPER_ADMIN_ROLE_NAMES);
}

async function containsSuperAdminRoleIds(roleIds: any): Promise<boolean> {
  if (!Array.isArray(roleIds) || roleIds.length === 0) return false;
  const parsed = roleIds
    .map((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .filter((v) => Number.isFinite(v));
  if (parsed.length === 0) return false;

  const result = await pool.query(
    'SELECT COUNT(*)::int as cnt FROM roles WHERE id = ANY($1::int[]) AND name = ANY($2::text[])',
    [parsed, SUPER_ADMIN_ROLE_NAMES]
  );

  return (result.rows?.[0]?.cnt || 0) > 0;
}

// =============================================
// PATCH /api/users/:id/disable - Manually disable user
// =============================================
router.patch(
  '/:id/disable',
  authenticate,
  requireAnyPermission(['users:manage_status', 'tenant_users:edit']),
  requireSameTenant,
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Reason is required for disabling a user'
        });
      }

      await client.query('BEGIN');

      // Check if user exists
      const userCheck = await client.query(
        'SELECT id, email, full_name, status FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userCheck.rows[0];

      // Block disabling system accounts
      const systemCheck = await client.query(
        'SELECT is_system_account FROM users WHERE id = $1',
        [id]
      );
      if (systemCheck.rows.length > 0 && systemCheck.rows[0].is_system_account) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'System accounts cannot be disabled'
        });
      }

      // Non-super_admin cannot manage the super_admin account
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(parseInt(id)))) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Prevent disabling yourself
      if (parseInt(id) === req.user!.id) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'You cannot disable your own account'
        });
      }

      // Already disabled
      if (user.status === 'disabled') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'User is already disabled'
        });
      }

      // Disable user
      await client.query(
        `UPDATE users 
         SET status = 'disabled',
             disabled_at = CURRENT_TIMESTAMP,
             disabled_by = $1,
             disable_reason = $2,
             status_updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [req.user!.id, reason.trim(), id]
      );

      // Log detailed audit trail
      await client.query(
        `INSERT INTO audit_logs (
          user_id, 
          action, 
          resource, 
          resource_id, 
          after_data
        ) 
        VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user!.id,
          'DISABLE_USER',
          'user',
          id,
          JSON.stringify({
            target_user_id: id,
            target_email: user.email,
            target_name: user.full_name,
            reason: reason.trim(),
            previous_status: user.status,
            timestamp: new Date().toISOString()
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User disabled successfully',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          status: 'disabled'
        }
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error disabling user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disable user',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// PATCH /api/users/:id/enable - Re-enable disabled user
// =============================================
router.patch(
  '/:id/enable',
  authenticate,
  requireAnyPermission(['users:manage_status', 'tenant_users:edit']),
  requireSameTenant,
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Check if user exists
      const userCheck = await client.query(
        'SELECT id, email, full_name, status, disable_reason FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userCheck.rows[0];

      // Block enabling system accounts (they should never be disabled)
      const systemCheck = await client.query(
        'SELECT is_system_account FROM users WHERE id = $1',
        [id]
      );
      if (systemCheck.rows.length > 0 && systemCheck.rows[0].is_system_account) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'System accounts cannot be modified'
        });
      }

      // Non-super_admin cannot manage the super_admin account
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(parseInt(id)))) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Not disabled
      if (user.status !== 'disabled') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'User is not disabled',
          current_status: user.status
        });
      }

      // Enable user
      await client.query(
        `UPDATE users 
         SET status = 'active',
             disabled_at = NULL,
             disabled_by = NULL,
             disable_reason = NULL,
             failed_login_count = 0,
             locked_until = NULL,
             status_updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (
          user_id, 
          action, 
          resource, 
          resource_id, 
          after_data
        ) 
        VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user!.id,
          'ENABLE_USER',
          'user',
          id,
          JSON.stringify({
            target_user_id: id,
            target_email: user.email,
            target_name: user.full_name,
            previous_status: user.status,
            previous_reason: user.disable_reason,
            timestamp: new Date().toISOString()
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User enabled successfully',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          status: 'active'
        }
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error enabling user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enable user',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// PATCH /api/users/:id/unlock - Unlock auto-locked user
// =============================================
router.patch(
  '/:id/unlock',
  authenticate,
  requireAnyPermission(['users:manage_status', 'tenant_users:edit']),
  requireSameTenant,
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Check if user exists
      const userCheck = await client.query(
        'SELECT id, email, full_name, status, locked_until, failed_login_count FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userCheck.rows[0];

      // Non-super_admin cannot manage the super_admin account
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(parseInt(id)))) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Not locked
      if (user.status !== 'locked') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'User is not locked',
          current_status: user.status
        });
      }

      // Unlock user
      await client.query(
        `UPDATE users 
         SET status = 'active',
             locked_until = NULL,
             failed_login_count = 0,
             last_failed_login_at = NULL,
             status_updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (
          user_id, 
          action, 
          resource, 
          resource_id, 
          after_data
        ) 
        VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user!.id,
          'UNLOCK_USER',
          'user',
          id,
          JSON.stringify({
            target_user_id: id,
            target_email: user.email,
            target_name: user.full_name,
            previous_status: user.status,
            previous_failed_count: user.failed_login_count,
            previous_locked_until: user.locked_until,
            timestamp: new Date().toISOString()
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User unlocked successfully',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          status: 'active'
        }
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error unlocking user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unlock user',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// PATCH /api/users/:id/reset-password - Admin reset user password
// =============================================
router.patch(
  '/:id/reset-password',
  authenticate,
  requireAnyPermission(['users:edit', 'tenant_users:edit']),
  requireSameTenant,
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      const { password, must_change_password } = req.body || {};

      if (!Number.isFinite(userId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user id'
        });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Password is required'
        });
      }

      // Policy-driven password validation
      const pwErrors = await PolicyService.validatePassword(password);
      if (pwErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: pwErrors.join('. ')
        });
      }

      // Ensure user exists and isn't soft-deleted
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Non-super_admin cannot reset the super_admin password
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(userId))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      await UserService.updatePassword(userId, password, req.user!.id, {
        mustChangePassword: typeof must_change_password === 'boolean' ? must_change_password : true,
      });

      return res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error: any) {
      console.error('Error resetting user password:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset password',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/users - List all users (with pagination, excludes deleted by default)
// =============================================
router.get(
  '/',
  authenticate,
  requireAnyPermission(['users:view', 'tenant_users:view']),
  companyScopeGuard,
  async (req: Request, res: Response) => {
    try {
      const { status, search, includeDeleted } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      const excludeRoleNames = isSuperAdminRequest(req) ? undefined : SUPER_ADMIN_ROLE_NAMES;
      const tenantId = getRequestTenantId(req);
      const companyIds = getRequestCompanyScope(req);

      // Use UserService to get users with pagination
      // Tenant users only see users from their assigned companies
      const [users, total] = await Promise.all([
        UserService.getAll({
          status: status as string,
          search: search as string,
          includeDeleted: includeDeleted === 'true',
          excludeRoleNames,
          tenantId,
          companyIds,
          limit,
          offset
        }),
        UserService.count({
          status: status as string,
          search: search as string,
          includeDeleted: includeDeleted === 'true',
          excludeRoleNames,
          tenantId,
          companyIds
        })
      ]);

      return sendPaginated(res, users, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/users/me/login-history - Get current user's login history
// =============================================
router.get(
  '/me/login-history',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      const { activity_type } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      let whereClause = 'WHERE user_id = $1';
      const params: any[] = [userId];

      if (activity_type) {
        whereClause += ` AND activity_type = $${params.length + 1}`;
        params.push(activity_type);
      }

      // Count total
      const countResult = await pool.query(
        `SELECT COUNT(*)::int as total FROM login_history ${whereClause}`,
        params
      );
      const total = countResult.rows[0]?.total || 0;

      // Fetch login history
      const result = await pool.query(
        `SELECT 
          id, user_id, activity_type, ip_address, user_agent, 
          failed_reason, security_flags, created_at
         FROM login_history
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error('Error fetching current user login history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch login history',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/users/me/login-stats - Get current user's login statistics
// =============================================
router.get(
  '/me/login-stats',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      // Get statistics
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE activity_type = 'login_success')::int as total_logins,
          COUNT(*) FILTER (WHERE activity_type = 'login_failed')::int as failed_attempts,
          COUNT(*) FILTER (WHERE security_flags IS NOT NULL AND security_flags != '{}'::jsonb)::int as suspicious_logins,
          MAX(CASE WHEN activity_type = 'login_success' THEN created_at END) as last_login
         FROM login_history
         WHERE user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0] || {
        total_logins: 0,
        failed_attempts: 0,
        suspicious_logins: 0,
        last_login: null
      };

      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error fetching current user login stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch login statistics',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/users/:id - Get single user details
// =============================================
router.get(
  '/:id',
  authenticate,
  requireAnyPermission(['users:view', 'tenant_users:view']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const requestedId = parseInt(id, 10);
      if (!Number.isFinite(requestedId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user id'
        });
      }

      // Non-super_admin cannot view super_admin user
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(requestedId))) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Never return password hash in API
      const user = await UserService.getById(requestedId, false);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Tenant isolation: tenant users cannot view users from other tenants
      const tenantId = getRequestTenantId(req);
      if (tenantId && user.tenant_id !== tenantId) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user: user
      });
    } catch (error: any) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
        message: error.message
      });
    }
  }
);

// =============================================
// POST /api/users - Create new user
// =============================================
router.post(
  '/',
  authenticate,
  requireAnyPermission(['users:create', 'tenant_users:create']),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { email, full_name, password, role_ids } = req.body;
      const tenantId = getRequestTenantId(req);

      // Non-super_admin cannot create users with super_admin role
      if (!isSuperAdminRequest(req) && (await containsSuperAdminRoleIds(role_ids))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Tenant user limit enforcement
      if (tenantId) {
        const limitCheck = await pool.query(
          `SELECT t.max_users, 
                  (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id AND u.deleted_at IS NULL) as current_count
           FROM tenants t WHERE t.id = $1`,
          [tenantId]
        );
        if (limitCheck.rows.length > 0) {
          const { max_users, current_count } = limitCheck.rows[0];
          if (max_users && current_count >= max_users) {
            return res.status(403).json({
              success: false,
              error: 'USER_LIMIT_REACHED',
              message: `تم الوصول للحد الأقصى من المستخدمين (${max_users}). يرجى التواصل مع مشرف الحساب لزيادة الحد.`,
              details: { max_users, current_count }
            });
          }
        }
      }

      // Validation
      if (!email || !full_name || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email, full name, and password are required'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      // Password policy validation
      const pwErrors = await PolicyService.validatePassword(password);
      if (pwErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: pwErrors.join('. ')
        });
      }

      // Use UserService to create user (with tenant_id for tenant users)
      const newUser = await UserService.create(
        {
          email,
          full_name,
          password,
          role_ids: role_ids || [],
          tenant_id: tenantId
        },
        req.user!.id
      );

      // ✅ CRITICAL: Link user to company (user_companies)
      // Always validate company_id belongs to user's tenant before linking
      const { company_id: bodyCompanyId, company_role_id, access_scope } = req.body;
      
      // Determine safe company_id: validate body value against tenant, or use middleware context
      let safeCompanyId: number | null = null;
      
      if (bodyCompanyId) {
        // Validate the requested company_id belongs to the same tenant
        if (tenantId) {
          const companyCheck = await pool.query(
            'SELECT id FROM companies WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
            [bodyCompanyId, tenantId]
          );
          if (companyCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              error: 'Invalid company_id: company not found or belongs to another tenant'
            });
          }
        }
        safeCompanyId = bodyCompanyId;
      } else if ((req as any).companyId) {
        safeCompanyId = (req as any).companyId;
      }

      if (safeCompanyId) {
        await pool.query(
          `INSERT INTO user_companies (
            user_id, company_id, is_default, access_level, created_by
          ) VALUES ($1, $2, true, $3, $4)
          ON CONFLICT (user_id, company_id) DO UPDATE SET
            access_level = EXCLUDED.access_level`,
          [newUser.id, safeCompanyId, access_scope || 'standard', req.user!.id]
        );

        console.log(`User ${newUser.id} linked to company ${safeCompanyId} (tenant-verified)`);
      }

      res.status(201).json({
        success: true,
        user: newUser,
        message: 'User created successfully'
      });
    } catch (error: any) {
      console.error('Error creating user:', error);

      // Handle specific errors from service
      if (error.message === 'EMAIL_EXISTS') {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        message: error.message
      });
    }
  }
);

// =============================================
// PUT /api/users/:id - Update user
// =============================================
router.put(
  '/:id',
  authenticate,
  requireAnyPermission(['users:edit', 'tenant_users:edit']),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email, full_name, password, role_ids, profile_image, preferred_language } = req.body;

      const targetUserId = parseInt(id, 10);
      if (!Number.isFinite(targetUserId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user id'
        });
      }

      // Non-super_admin cannot edit super_admin user
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(targetUserId))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Block editing system accounts entirely
      const systemCheck = await pool.query(
        'SELECT is_system_account FROM users WHERE id = $1',
        [targetUserId]
      );
      if (systemCheck.rows.length > 0 && systemCheck.rows[0].is_system_account) {
        return res.status(403).json({
          success: false,
          error: 'System accounts cannot be modified'
        });
      }

      // Tenant isolation: tenant users can only edit their own tenant's users
      const tenantId = getRequestTenantId(req);
      if (tenantId) {
        const targetUser = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [targetUserId]);
        if (targetUser.rows.length > 0 && targetUser.rows[0].tenant_id !== tenantId) {
          return res.status(403).json({
            success: false,
            error: 'Not allowed'
          });
        }
      }

      // Non-super_admin cannot assign super_admin role
      if (!isSuperAdminRequest(req) && (await containsSuperAdminRoleIds(role_ids))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Validation
      if (!email || !full_name) {
        return res.status(400).json({
          success: false,
          error: 'Email and full name are required'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      // Password validation if provided
      if (password) {
        const pwErrors = await PolicyService.validatePassword(password);
        if (pwErrors.length > 0) {
          return res.status(400).json({
            success: false,
            error: pwErrors.join('. ')
          });
        }
      }

      // Check if email is already used by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }

      // Use UserService to update user
      const updatedUser = await UserService.update(
        targetUserId,
        {
          email,
          full_name,
          role_ids,
          profile_image,
          preferred_language
        },
        req.user!.id
      );

      // If password is provided, update it separately
      if (password) {
        await UserService.updatePassword(targetUserId, password, req.user!.id);
      }

      res.json({
        success: true,
        user: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating user:', error);

      // Handle specific errors from service
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        message: error.message
      });
    }
  }
);

// =============================================
// DELETE /api/users/:id - Soft delete user
// =============================================
router.delete(
  '/:id',
  authenticate,
  requireAnyPermission(['users:delete', 'tenant_users:delete']),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Prevent deleting yourself
      if (parseInt(id) === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot delete your own account'
        });
      }

      // Check if user exists and not already deleted
      const userCheck = await pool.query(
        'SELECT id, email, full_name, deleted_at FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userCheck.rows[0];

      // Block deleting system accounts entirely
      const systemCheck = await pool.query(
        'SELECT is_system_account FROM users WHERE id = $1',
        [id]
      );
      if (systemCheck.rows.length > 0 && systemCheck.rows[0].is_system_account) {
        return res.status(403).json({
          success: false,
          error: 'System accounts cannot be deleted'
        });
      }

      // Non-super_admin cannot delete super_admin user
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(parseInt(id)))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Tenant isolation: tenant users can only delete their own tenant's users
      const tenantId = getRequestTenantId(req);
      if (tenantId) {
        const targetTenant = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [id]);
        if (targetTenant.rows.length > 0 && targetTenant.rows[0].tenant_id !== tenantId) {
          return res.status(403).json({
            success: false,
            error: 'Not allowed'
          });
        }
      }

      if (user.deleted_at) {
        return res.status(400).json({
          success: false,
          error: 'User is already deleted'
        });
      }

      // Use UserService to soft delete
      await UserService.softDelete(parseInt(id), req.user!.id, reason);

      res.json({
        success: true,
        message: 'User deleted successfully (soft delete)'
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        message: error.message
      });
    }
  }
);

// =============================================
// POST /api/users/:id/restore - Restore soft deleted user
// =============================================
router.post(
  '/:id/restore',
  authenticate,
  requirePermission('users:restore'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Non-super_admin cannot restore super_admin user
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(parseInt(id)))) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Check if user exists and is deleted
      const userCheck = await pool.query(
        'SELECT id, email, full_name, deleted_at, tenant_id FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userCheck.rows[0];

      // Tenant isolation: tenant users can only restore their own tenant's users
      const tenantId = getRequestTenantId(req);
      if (tenantId && user.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      if (!user.deleted_at) {
        return res.status(400).json({
          success: false,
          error: 'User is not deleted'
        });
      }

      // Use UserService to restore
      await UserService.restore(parseInt(id), req.user!.id);

      res.json({
        success: true,
        message: 'User restored successfully'
      });
    } catch (error: any) {
      console.error('Error restoring user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore user',
        message: error.message
      });
    }
  }
);

// =============================================
// DELETE /api/users/:id/permanent - Permanently delete user (requires special permission)
// =============================================
router.delete(
  '/:id/permanent',
  authenticate,
  requirePermission('users:permanent_delete'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const { confirm } = req.body;

      // Require explicit confirmation
      if (confirm !== 'PERMANENTLY_DELETE') {
        return res.status(400).json({
          success: false,
          error: 'Confirmation required. Set confirm: "PERMANENTLY_DELETE"'
        });
      }

      // Prevent deleting yourself
      if (parseInt(id) === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot permanently delete your own account'
        });
      }

      await client.query('BEGIN');

      // Check if user exists
      const userCheck = await client.query(
        'SELECT id, email, full_name FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userCheck.rows[0];

      // Non-super_admin cannot permanently delete super_admin user
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(parseInt(id)))) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'Not allowed'
        });
      }

      // Tenant isolation: tenant users can only permanently delete their own tenant's users
      const tenantId = getRequestTenantId(req);
      if (tenantId) {
        const targetTenant = await client.query('SELECT tenant_id FROM users WHERE id = $1', [id]);
        if (targetTenant.rows.length > 0 && targetTenant.rows[0].tenant_id !== tenantId) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            error: 'Not allowed'
          });
        }
      }

      // Delete user roles first
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

      // Permanently delete user
      await client.query('DELETE FROM users WHERE id = $1', [id]);

      // Log audit trail (CRITICAL - permanent delete)
      await client.query(
        `INSERT INTO audit_logs (
          user_id, 
          action, 
          resource, 
          resource_id, 
          after_data
        ) 
        VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user!.id,
          'PERMANENT_DELETE_USER',
          'user',
          id,
          JSON.stringify({
            deleted_user_id: id,
            deleted_email: user.email,
            deleted_name: user.full_name,
            warning: 'PERMANENT DELETE - DATA UNRECOVERABLE'
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User permanently deleted',
        warning: 'This action cannot be undone'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error permanently deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to permanently delete user',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

// =============================================
// GET /api/users/all/login-history - Get recent login activity with pagination (Admin)
// IMPORTANT: Must be before /:id routes to avoid matching "all" as an ID
// =============================================
router.get(
  '/all/login-history',
  authenticate,
  requireAnyPermission(['users:view', 'tenant_users:view']),
  async (req: Request, res: Response) => {
    try {
      const { activity_type } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      const hideSuperAdmin = !isSuperAdminRequest(req);
      const tenantId = getRequestTenantId(req);

      let query = `
        SELECT 
          lh.id,
          lh.user_id,
          u.email,
          u.full_name,
          lh.activity_type,
          lh.ip_address,
          lh.user_agent,
          lh.failed_reason,
          lh.security_flags,
          lh.created_at
        FROM login_history lh
        LEFT JOIN users u ON lh.user_id = u.id
      `;
      
      const params: any[] = [];
      
      const whereParts: string[] = [];

      // Tenant isolation: only show login history for tenant's own users
      if (tenantId) {
        whereParts.push(`u.tenant_id = $${params.length + 1}`);
        params.push(tenantId);
      }

      if (activity_type && typeof activity_type === 'string') {
        whereParts.push(`lh.activity_type = $${params.length + 1}`);
        params.push(activity_type);
      }

      if (hideSuperAdmin) {
        whereParts.push(
          `NOT EXISTS (
             SELECT 1
             FROM user_roles urx
             JOIN roles rx ON rx.id = urx.role_id
             WHERE urx.user_id = lh.user_id
               AND rx.name = ANY($${params.length + 1}::text[])
           )`
        );
        params.push(SUPER_ADMIN_ROLE_NAMES);
      }

      if (whereParts.length > 0) {
        query += ` WHERE ${whereParts.join(' AND ')}`;
      }
      
      query += ` ORDER BY lh.created_at DESC`;

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM login_history lh LEFT JOIN users u ON lh.user_id = u.id';
      const countParams: any[] = [];

      const countWhere: string[] = [];

      // Tenant isolation for count
      if (tenantId) {
        countWhere.push(`u.tenant_id = $${countParams.length + 1}`);
        countParams.push(tenantId);
      }

      if (activity_type && typeof activity_type === 'string') {
        countWhere.push(`lh.activity_type = $${countParams.length + 1}`);
        countParams.push(activity_type);
      }
      if (hideSuperAdmin) {
        countWhere.push(
          `NOT EXISTS (
             SELECT 1
             FROM user_roles urx
             JOIN roles rx ON rx.id = urx.role_id
             WHERE urx.user_id = lh.user_id
               AND rx.name = ANY($${countParams.length + 1}::text[])
           )`
        );
        countParams.push(SUPER_ADMIN_ROLE_NAMES);
      }
      if (countWhere.length > 0) {
        countQuery += ' WHERE ' + countWhere.join(' AND ');
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      // Add pagination
      const paramIndex = params.length + 1;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching recent login history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch login history',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/users/:id/login-history - Get user login history
// =============================================
router.get(
  '/:id/login-history',
  authenticate,
  requireAnyPermission(['users:view', 'tenant_users:view']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { activity_type } = req.query;
      const { page, limit, offset } = getPaginationParams(req.query);

      const requestedId = parseInt(id, 10);
      if (!Number.isFinite(requestedId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user id'
        });
      }

      // Non-super_admin cannot view super_admin login history
      if (!isSuperAdminRequest(req) && (await isTargetSuperAdminUser(requestedId))) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Tenant isolation: tenant users can only view login history of their own tenant's users
      const tenantId = getRequestTenantId(req);
      if (tenantId) {
        const targetUser = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [requestedId]);
        if (targetUser.rows.length === 0 || targetUser.rows[0].tenant_id !== tenantId) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
      }

      // Build query with optional activity_type filter
      let query = `
        SELECT 
          id,
          activity_type,
          ip_address,
          user_agent,
          failed_reason,
          security_flags,
          created_at
        FROM login_history
        WHERE user_id = $1
      `;
      
      const params: any[] = [requestedId];
      
      if (activity_type && typeof activity_type === 'string') {
        query += ` AND activity_type = $${params.length + 1}`;
        params.push(activity_type);
      }

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM login_history WHERE user_id = $1';
      const countParams: any[] = [requestedId];
      
      if (activity_type && typeof activity_type === 'string') {
        countQuery += ' AND activity_type = $2';
        countParams.push(activity_type);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      return sendPaginated(res, result.rows, page, limit, total);
    } catch (error: any) {
      console.error('Error fetching login history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch login history',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/users/:id/login-stats - Get user login statistics
// =============================================
router.get(
  '/:id/login-stats',
  authenticate,
  requireAnyPermission(['users:view', 'tenant_users:view']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { days = '30' } = req.query;

      // Tenant isolation: tenant users can only view stats of their own tenant's users
      const tenantId = getRequestTenantId(req);
      if (tenantId) {
        const targetUser = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [id]);
        if (targetUser.rows.length === 0 || targetUser.rows[0].tenant_id !== tenantId) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
      }

      const result = await pool.query(
        'SELECT * FROM get_user_login_stats($1, $2)',
        [id, parseInt(days as string)]
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          stats: {
            total_logins: 0,
            successful_logins: 0,
            failed_logins: 0,
            unique_ips: 0,
            last_login_at: null,
            last_login_ip: null
          }
        });
      }

      res.json({
        success: true,
        stats: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error fetching login stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch login statistics',
        message: error.message
      });
    }
  }
);

// =============================================
// GET /api/users/deleted - List deleted users
// =============================================
router.get(
  '/deleted',
  authenticate,
  requireAnyPermission(['users:view_deleted', 'tenant_users:view']),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getRequestTenantId(req);

      let query = `
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.status,
          u.deleted_at,
          dr.deleted_by,
          dr.reason,
          deleter.full_name as deleted_by_name,
          deleter.email as deleted_by_email
        FROM users u
        INNER JOIN deleted_records dr ON dr.record_id = u.id AND dr.table_name = 'users'
        LEFT JOIN users deleter ON dr.deleted_by = deleter.id
        WHERE u.deleted_at IS NOT NULL AND dr.restored_at IS NULL
      `;
      const params: any[] = [];

      // Tenant isolation: only show tenant's own deleted users
      if (tenantId) {
        query += ` AND u.tenant_id = $1`;
        params.push(tenantId);
      }

      query += ` ORDER BY u.deleted_at DESC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        users: result.rows,
        count: result.rows.length
      });
    } catch (error: any) {
      console.error('Error fetching deleted users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deleted users',
        message: error.message
      });
    }
  }
);

// =============================================
// Signature Management
// =============================================

// GET /users/:id/signature — Get user signature info
router.get(
  '/:id/signature',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT u.id, u.full_name, u.signature_image_url, u.signature_title_en, u.signature_title_ar,
                ds.id as digital_signature_id, ds.signature_name_en, ds.signature_name_ar,
                ds.signature_image_url as ds_image_url, ds.signature_type, ds.is_default
         FROM users u
         LEFT JOIN digital_signatures ds ON ds.user_id = u.id AND ds.is_active = true AND ds.deleted_at IS NULL
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = result.rows[0];
      res.json({
        success: true,
        data: {
          user_id: user.id,
          full_name: user.full_name,
          signature_image_url: user.signature_image_url,
          signature_title_en: user.signature_title_en,
          signature_title_ar: user.signature_title_ar,
          digital_signatures: result.rows
            .filter((r: any) => r.digital_signature_id)
            .map((r: any) => ({
              id: r.digital_signature_id,
              name_en: r.signature_name_en,
              name_ar: r.signature_name_ar,
              image_url: r.ds_image_url,
              type: r.signature_type,
              is_default: r.is_default,
            })),
        }
      });
    } catch (error: any) {
      console.error('Error fetching user signature:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch signature' });
    }
  }
);

// PUT /users/:id/signature — Upload/update user signature image
router.put(
  '/:id/signature',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      const currentUserId = req.user!.id;

      // Users can only update their own signature, admins can update any
      const isAdmin = req.user!.roles?.includes('super_admin') || req.user!.roles?.includes('tenant_admin') || req.user!.roles?.includes('Admin');
      if (userId !== currentUserId && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Not allowed' });
      }

      const { signature_image, signature_title_en, signature_title_ar } = req.body;

      if (!signature_image && !signature_title_en && !signature_title_ar) {
        return res.status(400).json({ success: false, error: 'No data provided' });
      }

      let imageUrl: string | undefined;

      if (signature_image) {
        // Save base64 signature image
        const tenantId = (req as any).tenantId || null;
        const result = await UploadService.saveBase64Image(signature_image, 'signatures', undefined, tenantId);
        if (!result.success) {
          return res.status(400).json({ success: false, error: result.error || 'Failed to save signature' });
        }
        imageUrl = result.url;
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let pi = 1;

      if (imageUrl) {
        updates.push(`signature_image_url = $${pi++}`);
        values.push(imageUrl);
      }
      if (signature_title_en !== undefined) {
        updates.push(`signature_title_en = $${pi++}`);
        values.push(signature_title_en);
      }
      if (signature_title_ar !== undefined) {
        updates.push(`signature_title_ar = $${pi++}`);
        values.push(signature_title_ar);
      }

      if (updates.length > 0) {
        values.push(userId);
        await pool.query(
          `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${pi}`,
          values
        );
      }

      // Also update digital_signatures table if user has one
      if (imageUrl) {
        const tenantCheck = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [userId]);
        const tenantId = tenantCheck.rows[0]?.tenant_id;
        if (tenantId) {
          const existing = await pool.query(
            'SELECT id FROM digital_signatures WHERE user_id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1',
            [userId, tenantId]
          );
          if (existing.rows.length > 0) {
            await pool.query(
              'UPDATE digital_signatures SET signature_image_url = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
              [imageUrl, currentUserId, existing.rows[0].id]
            );
          } else {
            const userName = (await pool.query('SELECT full_name FROM users WHERE id=$1', [userId])).rows[0]?.full_name || '';
            await pool.query(
              `INSERT INTO digital_signatures (company_id, user_id, signature_name_en, signature_name_ar, signature_image_url, signature_type, is_active, is_default, created_by)
               VALUES ($1, $2, $3, $4, $5, 'manual', true, true, $6)`,
              [tenantId, userId, `${userName} Signature`, `توقيع ${userName}`, imageUrl, currentUserId]
            );
          }
        }
      }

      const updated = await pool.query(
        'SELECT id, full_name, signature_image_url, signature_title_en, signature_title_ar FROM users WHERE id = $1',
        [userId]
      );

      res.json({ success: true, data: updated.rows[0], message: 'Signature updated successfully' });
    } catch (error: any) {
      console.error('Error updating user signature:', error);
      res.status(500).json({ success: false, error: 'Failed to update signature' });
    }
  }
);

// DELETE /users/:id/signature — Remove user signature
router.delete(
  '/:id/signature',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      const currentUserId = req.user!.id;

      const isAdmin = req.user!.roles?.includes('super_admin') || req.user!.roles?.includes('tenant_admin') || req.user!.roles?.includes('Admin');
      if (userId !== currentUserId && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Not allowed' });
      }

      await pool.query(
        'UPDATE users SET signature_image_url = NULL, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      res.json({ success: true, message: 'Signature removed' });
    } catch (error: any) {
      console.error('Error removing signature:', error);
      res.status(500).json({ success: false, error: 'Failed to remove signature' });
    }
  }
);

// GET /users/notifications/approval — Get approval notifications for current user
router.get(
  '/notifications/approval',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { unread_only, limit = '20' } = req.query;

      let where = 'an.user_id = $1';
      if (unread_only === 'true') where += ' AND an.is_read = false';

      const result = await pool.query(
        `SELECT an.*, u.full_name as actor_name
         FROM approval_notifications an
         LEFT JOIN users u ON u.id = (
           SELECT performed_by FROM request_approval_history 
           WHERE request_type = an.request_type AND request_id = an.request_id
           ORDER BY performed_at DESC LIMIT 1
         )
         WHERE ${where}
         ORDER BY an.created_at DESC
         LIMIT $2`,
        [userId, parseInt(limit as string)]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) as unread_count FROM approval_notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      );

      res.json({
        success: true,
        data: result.rows,
        unread_count: parseInt(countResult.rows[0].unread_count)
      });
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  }
);

// POST /users/notifications/mark-read — Mark notifications as read
router.post(
  '/notifications/mark-read',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { notification_ids } = req.body;

      if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
        await pool.query(
          'UPDATE approval_notifications SET is_read = true, read_at = NOW() WHERE id = ANY($1) AND user_id = $2',
          [notification_ids, userId]
        );
      } else {
        await pool.query(
          'UPDATE approval_notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
          [userId]
        );
      }

      res.json({ success: true, message: 'Notifications marked as read' });
    } catch (error: any) {
      console.error('Error marking notifications:', error);
      res.status(500).json({ success: false, error: 'Failed to mark notifications' });
    }
  }
);

export default router;
