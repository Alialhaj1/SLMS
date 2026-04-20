/**
 * Authorization Service
 * Resolves complete user context including roles, permissions, companies, and tenant.
 */
import pool from '../db';
import { logger } from '../utils/logger';

class AuthorizationService {
  /**
   * Get complete user context for /api/me and authorization decisions.
   */
  static async getUserContext(userId: number): Promise<any | null> {
    try {
      // Get base user info
      const userResult = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.phone,
                u.tenant_id, u.is_tenant_admin, u.is_system_account, u.status,
                u.preferred_language, u.must_change_password,
                u.last_login_at, u.profile_image, u.cover_image,
                u.created_at
         FROM users u
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [userId]
      );

      if (userResult.rows.length === 0) return null;
      const user = userResult.rows[0];

      // Get user roles
      const rolesResult = await pool.query(
        `SELECT r.id, r.name, r.description, r.is_system_role, ur.company_id
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.deleted_at IS NULL`,
        [userId]
      );

      const roles = rolesResult.rows.map(r => r.name);
      const roleDetails = rolesResult.rows;

      // Get permissions from all roles
      const permissionsResult = await pool.query(
        `SELECT DISTINCT p.permission_code, p.resource, p.action, p.description
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = $1`,
        [userId]
      );

      const permissions = permissionsResult.rows.map(p => p.permission_code);

      // Get user companies
      const companiesResult = await pool.query(
        `SELECT c.id, c.name, c.name_ar, c.code, uc.is_default, uc.is_active
         FROM user_companies uc
         JOIN companies c ON c.id = uc.company_id
         WHERE uc.user_id = $1 AND c.deleted_at IS NULL`,
        [userId]
      );

      const companies = companiesResult.rows;
      const defaultCompany = companies.find((c: any) => c.is_default) || companies[0] || null;

      // Get tenant info if applicable
      let tenant = null;
      if (user.tenant_id) {
        const tenantResult = await pool.query(
          `SELECT id, name, slug, status FROM tenants WHERE id = $1`,
          [user.tenant_id]
        );
        tenant = tenantResult.rows[0] || null;
      }

      // Get enabled modules
      let enabledModules: string[] = [];
      if (user.tenant_id) {
        const modResult = await pool.query(
          `SELECT DISTINCT m.module_code FROM modules m
           LEFT JOIN tenant_modules tm ON m.module_code = tm.module_code AND tm.tenant_id = $1
           WHERE m.is_active = true AND (m.is_core = true OR tm.is_enabled = true)`,
          [user.tenant_id]
        );
        enabledModules = modResult.rows.map((m: any) => m.module_code);
      } else {
        const modResult = await pool.query(`SELECT module_code FROM modules WHERE is_active = true`);
        enabledModules = modResult.rows.map((m: any) => m.module_code);
      }

      const isPlatformUser = user.tenant_id === null;

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        tenant_id: user.tenant_id,
        is_tenant_admin: user.is_tenant_admin,
        is_system_account: user.is_system_account,
        is_platform_admin: isPlatformUser,
        is_platform_user: isPlatformUser,
        enabled_modules: enabledModules,
        status: user.status,
        preferred_language: user.preferred_language,
        must_change_password: user.must_change_password,
        last_login_at: user.last_login_at,
        profile_image: user.profile_image,
        cover_image: user.cover_image,
        roles,
        role_details: roleDetails,
        permissions,
        companies,
        default_company: defaultCompany,
        tenant,
        created_at: user.created_at,
      };
    } catch (error) {
      logger.error('AuthorizationService.getUserContext error:', error);
      return null;
    }
  }
}

export default AuthorizationService;
