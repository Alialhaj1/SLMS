/**
 * ============================================================================
 * Permission Service v2 — Architecture §4.2
 * ============================================================================
 *
 * Implements:
 *   - Permission format: module.resource.action (e.g., shipments.purchase_orders.approve)
 *   - Backward-compatible with legacy resource:action format (shipments:view)
 *   - Wildcard matching: shipments.* , *.read , *
 *   - Module-level gating: filters permissions by tenant's enabled modules
 *   - Hierarchy-aware: loads permissions respecting role hierarchy levels
 *   - In-memory TTL cache per user to avoid repeated DB queries
 *
 * Permission matching rules (§4.2):
 *   1. Exact match:    user has 'shipments:view'        → check 'shipments:view' ✓
 *   2. Wildcard tail:  user has 'shipments.*'            → check 'shipments:view' ✓
 *   3. Wildcard head:  user has '*.view'                 → check 'shipments:view' ✓
 *   4. Full wildcard:  user has '*'                       → check anything ✓
 *   5. 3-part format:  user has 'shipments:po:approve'   → check 'shipments:po:approve' ✓
 *   6. Suffix compat:  user has 'logistics:shipments:view' → check 'shipments:view' ✓ (legacy)
 *
 * Export surface:
 *   - PermissionService class (singleton)
 *   - matchPermission(userPerm, required) helper
 *   - RoleHierarchy constants
 * ============================================================================
 */

import pool from '../db';
import logger from '../utils/logger';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface EffectivePermission {
  permission_code: string;
  module_code: string | null;
  domain: string;
}

export interface UserPermissionSet {
  permissions: string[];
  enabledModules: string[];
  loadedAt: number;
  hierarchyLevel: number;
}

export interface RoleInfo {
  id: number;
  name: string;
  hierarchy_level: number;
  role_type: string;
  is_system: boolean;
  max_hierarchy_target: number;
}

// ────────────────────────────────────────────
// Role Hierarchy Constants — §4.1
// ────────────────────────────────────────────

export const RoleHierarchy = {
  GOD:              6,  // super_admin — bypasses ALL checks
  PLATFORM_ADMIN:   5,  // manages tenants, modules, subscriptions
  PLATFORM_SUPPORT: 4,  // read-only platform + impersonation
  TENANT_OWNER:     3,  // full tenant control
  TENANT_ADMIN:     2,  // company-level admin
  CUSTOM:           1,  // custom per-role permissions
  VIEW_ONLY:        0,  // read-only
} as const;

export type HierarchyLevel = typeof RoleHierarchy[keyof typeof RoleHierarchy];

// Platform roles that bypass tenant permission checks
export const PLATFORM_BYPASS_ROLES = ['super_admin', 'system_admin'];

// Roles that are always considered super admin (bypass all)
export const SUPER_ADMIN_ROLE_NAMES = ['super_admin', 'super admin', 'system_admin', 'system admin'];

// ────────────────────────────────────────────
// Permission Matching — §4.2
// ────────────────────────────────────────────

/**
 * Check if a user permission matches a required permission.
 *
 * Supports:
 *   - Exact match
 *   - Wildcard tail: 'shipments.*' matches 'shipments:view', 'shipments:create', etc.
 *   - Wildcard head: '*.view' matches 'shipments:view', 'accounting:view', etc.
 *   - Full wildcard: '*' matches everything
 *   - Legacy suffix: 'logistics:shipments:view' matches 'shipments:view'
 *
 * The delimiter can be ':' or '.' — both are normalized to ':'
 */
export function matchPermission(userPerm: string, required: string): boolean {
  if (!userPerm || !required) return false;

  // Normalize delimiters: '.' → ':'
  const u = userPerm.replace(/\./g, ':').toLowerCase().trim();
  const r = required.replace(/\./g, ':').toLowerCase().trim();

  // 1. Exact match
  if (u === r) return true;

  // 2. Full wildcard
  if (u === '*') return true;

  // 3. Wildcard tail: 'shipments:*' matches 'shipments:anything'
  if (u.endsWith(':*')) {
    const prefix = u.slice(0, -2); // remove ':*'
    if (r.startsWith(prefix + ':') || r === prefix) return true;
  }

  // 4. Wildcard head: '*:view' matches 'anything:view'
  if (u.startsWith('*:')) {
    const suffix = u.slice(2); // remove '*:'
    if (r.endsWith(':' + suffix) || r === suffix) return true;
  }

  // 5. Middle wildcard: 'shipments:*:view' matches 'shipments:po:view'
  if (u.includes(':*:')) {
    const parts = u.split(':*:');
    if (parts.length === 2) {
      if (r.startsWith(parts[0] + ':') && r.endsWith(':' + parts[1])) return true;
    }
  }

  // 6. Legacy suffix compatibility: 'logistics:shipments:view' matches 'shipments:view'
  //    Only if userPerm is longer (3-part) and required is shorter (2-part)
  if (u.includes(':') && r.includes(':') && u.length > r.length) {
    if (u.endsWith(':' + r)) return true;
  }

  return false;
}

/**
 * Check if any of the user's permissions match the required permission.
 */
export function hasPermissionMatch(userPermissions: string[], required: string): boolean {
  return userPermissions.some(p => matchPermission(p, required));
}

/**
 * Check if any of the user's permissions match any of the required permissions (OR logic).
 */
export function hasAnyPermissionMatch(userPermissions: string[], required: string[]): boolean {
  return required.some(r => hasPermissionMatch(userPermissions, r));
}

// ────────────────────────────────────────────
// Permission Service — Singleton
// ────────────────────────────────────────────

const CACHE_TTL_MS = 60_000; // 1 minute cache for user permissions

class PermissionServiceImpl {
  // In-memory cache: userId → UserPermissionSet
  private cache = new Map<string, UserPermissionSet>();

  /**
   * Get a cache key scoped to user + tenant.
   */
  private cacheKey(userId: number, tenantId: number | null): string {
    return `${userId}:${tenantId || 'platform'}`;
  }

  /**
   * Clear cached permissions for a user (call after role/permission changes).
   */
  clearUserCache(userId: number, tenantId?: number | null): void {
    if (tenantId !== undefined) {
      this.cache.delete(this.cacheKey(userId, tenantId));
    } else {
      // Clear all entries for this user
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cached permissions (e.g., after role definition changes).
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Load effective permissions for a user, filtered by module gating.
   *
   * Uses the DB function get_user_effective_permissions() from migration 405,
   * with a fallback to inline SQL if the function doesn't exist yet.
   */
  async loadPermissions(
    userId: number,
    tenantId: number | null,
    forceRefresh = false
  ): Promise<UserPermissionSet> {
    const key = this.cacheKey(userId, tenantId);

    // Check cache
    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
        return cached;
      }
    }

    try {
      // Load permissions via DB function (migration 405)
      // Fallback: inline SQL if function doesn't exist yet
      let permRows: Array<{ permission_code: string; module_code: string | null; domain: string }>;

      try {
        const result = await pool.query(
          `SELECT permission_code, module_code, domain FROM get_user_effective_permissions($1, $2)`,
          [userId, tenantId]
        );
        permRows = result.rows;
      } catch (fnError: any) {
        // Fallback: inline SQL (pre-migration-405 compat)
        if (fnError.code === '42883') { // undefined_function
          logger.warn('get_user_effective_permissions not found, using fallback SQL');
          permRows = await this.loadPermissionsFallback(userId, tenantId);
        } else {
          throw fnError;
        }
      }

      // All permissions now come from role_permissions table only
      // (JSONB was migrated and cleared by migration 416)
      const allPerms = new Set<string>();
      for (const row of permRows) {
        if (row.permission_code) allPerms.add(row.permission_code);
      }

      // Load enabled modules for this tenant
      const enabledModules = await this.loadEnabledModules(tenantId);

      // Load max hierarchy level for this user
      const hierarchyLevel = await this.loadUserHierarchyLevel(userId);

      const result: UserPermissionSet = {
        permissions: Array.from(allPerms).sort(),
        enabledModules,
        loadedAt: Date.now(),
        hierarchyLevel,
      };

      this.cache.set(key, result);
      return result;
    } catch (error) {
      logger.error('PermissionService.loadPermissions failed', { userId, tenantId, error });
      // Return empty set on error (fail-closed)
      return {
        permissions: [],
        enabledModules: [],
        loadedAt: Date.now(),
        hierarchyLevel: 0,
      };
    }
  }

  /**
   * Fallback SQL for loading permissions when migration 405 hasn't run yet.
   */
  private async loadPermissionsFallback(
    userId: number,
    tenantId: number | null
  ): Promise<Array<{ permission_code: string; module_code: string | null; domain: string }>> {
    const domainFilter = tenantId ? `AND COALESCE(p.domain, 'tenant') != 'platform'` : '';

    const result = await pool.query(
      `SELECT DISTINCT p.permission_code,
              COALESCE(p.module_code, 'core') as module_code,
              COALESCE(p.domain, 'tenant') as domain
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1
         ${domainFilter}
       ORDER BY p.permission_code`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Load enabled modules for a tenant.
   * Platform users (tenantId=null) see all active modules.
   */
  async loadEnabledModules(tenantId: number | null): Promise<string[]> {
    try {
      if (tenantId) {
        const result = await pool.query(
          `SELECT DISTINCT m.module_code FROM modules m
           LEFT JOIN tenant_modules tm ON m.module_code = tm.module_code AND tm.tenant_id = $1
           WHERE m.is_active = TRUE AND (m.is_core = TRUE OR (tm.is_enabled = TRUE))
           ORDER BY m.sort_order`,
          [tenantId]
        );
        return result.rows.map((r: any) => r.module_code);
      } else {
        const result = await pool.query(
          `SELECT module_code FROM modules WHERE is_active = TRUE ORDER BY sort_order`
        );
        return result.rows.map((r: any) => r.module_code);
      }
    } catch {
      // modules table may not exist yet
      return [];
    }
  }

  /**
   * Load the highest hierarchy level among user's roles.
   */
  private async loadUserHierarchyLevel(userId: number): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT MAX(r.hierarchy_level) as max_level
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1
           AND (ur.is_active IS NULL OR ur.is_active = TRUE)`,
        [userId]
      );
      return result.rows[0]?.max_level || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Load all roles for a user.
   */
  async loadUserRoles(userId: number): Promise<RoleInfo[]> {
    try {
      const result = await pool.query(
        `SELECT r.id, r.name, r.hierarchy_level, 
                COALESCE(r.role_type, 'tenant') as role_type,
                COALESCE(r.is_system, false) as is_system,
                COALESCE(r.max_hierarchy_target, 0) as max_hierarchy_target
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1
           AND (ur.is_active IS NULL OR ur.is_active = TRUE)
           AND (r.deleted_at IS NULL)
         ORDER BY r.hierarchy_level DESC`,
        [userId]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  /**
   * Check if a user is a super admin (platform user with super_admin role).
   */
  isSuperAdmin(roles: string[], tenantId: number | null | undefined): boolean {
    if (tenantId) return false; // tenant users can never be super admin
    return (roles || []).some(role => {
      const normalized = String(role || '').trim().toLowerCase();
      return SUPER_ADMIN_ROLE_NAMES.includes(normalized);
    });
  }

  /**
   * Check if a user can assign a role at a given hierarchy level.
   * A user can only assign roles with hierarchy_level <= their max_hierarchy_target.
   */
  async canAssignRole(
    assignerUserId: number,
    targetHierarchyLevel: number
  ): Promise<boolean> {
    try {
      const roles = await this.loadUserRoles(assignerUserId);
      if (roles.length === 0) return false;

      // Max hierarchy target among all the assigner's roles
      const maxTarget = Math.max(...roles.map(r => r.max_hierarchy_target));
      return targetHierarchyLevel <= maxTarget;
    } catch {
      return false;
    }
  }

  /**
   * Check if a module code maps to an enabled module for a tenant.
   * Used by requireModule middleware.
   */
  async isModuleEnabled(tenantId: number | null, moduleCode: string): Promise<boolean> {
    if (!tenantId) return true; // platform users see everything

    const modules = await this.loadEnabledModules(tenantId);
    return modules.includes(moduleCode);
  }
}

// Singleton export
export const PermissionService = new PermissionServiceImpl();
export default PermissionService;
