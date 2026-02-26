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
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
                u.tenant_id, u.is_platform_admin, u.status,
                u.preferred_language, u.must_change_password,
                u.last_login_at, u.profile_image, u.cover_image,
                u.created_at, u.updated_at
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
         WHERE ur.user_id = $1 AND p.deleted_at IS NULL`,
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

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        tenant_id: user.tenant_id,
        is_platform_admin: user.is_platform_admin,
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
        updated_at: user.updated_at,
      };
    } catch (error) {
      logger.error('AuthorizationService.getUserContext error:', error);
      return null;
    }
  }
}

export default AuthorizationService;
