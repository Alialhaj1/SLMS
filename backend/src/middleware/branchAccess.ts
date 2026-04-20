/**
 * 🏢 Branch Access Control Middleware
 * ====================================
 * Row-level security: restricts data access to branches assigned to the user.
 *
 * Architecture:
 *   tenant_admin  → bypasses all branch checks (full access to ALL branches)
 *   regular user  → restricted to branches listed in user_branches
 *
 * Usage in routes:
 *   router.get('/', authenticate, loadCompanyContext, loadBranchAccess, async (req, res) => {
 *     const { clause, params } = buildBranchWhereClause(req, 'je', 2); // param index starts at $2
 *     // SELECT * FROM journal_entries je WHERE je.company_id = $1 AND ${clause}
 *   });
 *
 *   // Or for strict single-branch enforcement:
 *   router.post('/', authenticate, loadCompanyContext, loadBranchAccess, requireBranchAccess('write'), ...);
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BranchAccessLevel = 'full' | 'write' | 'read';

export type GranularPermission = 'can_read' | 'can_create' | 'can_update' | 'can_delete' | 'can_approve' | 'can_reject' | 'can_endorse';

export interface BranchPermissions {
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_endorse: boolean;
}

export interface BranchAccessEntry {
  branchId: number;
  accessLevel: BranchAccessLevel;
  permissions: BranchPermissions;
}

declare global {
  namespace Express {
    interface Request {
      /** Populated by loadBranchAccess — null means tenant_admin (ALL access) */
      branchAccess?: {
        isTenantAdmin: boolean;
        branches: BranchAccessEntry[];
        branchIds: number[];
        /** Quick lookup: does user have access to branch X with at least level Y? */
        hasAccess: (branchId: number, minLevel?: BranchAccessLevel) => boolean;
        /** Granular permission check: does user have a specific permission on branch X? */
        hasPermission: (branchId: number, permission: GranularPermission) => boolean;
        /** Get full permissions for a branch */
        getPermissions: (branchId: number) => BranchPermissions | null;
      };
    }
  }
}

// ─── Access Level Hierarchy ─────────────────────────────────────────────────

const ACCESS_LEVELS: Record<BranchAccessLevel, number> = {
  read: 1,
  write: 2,
  full: 3,
};

function meetsAccessLevel(actual: BranchAccessLevel, required: BranchAccessLevel): boolean {
  return ACCESS_LEVELS[actual] >= ACCESS_LEVELS[required];
}

// ─── In-Memory Cache (per-process, short TTL) ──────────────────────────────

interface CacheEntry {
  branches: BranchAccessEntry[];
  isTenantAdmin: boolean;
  loadedAt: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds
const branchAccessCache = new Map<string, CacheEntry>();

function cacheKey(userId: number, tenantId: number): string {
  return `${userId}:${tenantId}`;
}

/** Clear cache for a user (call after branch assignment changes) */
export function clearBranchAccessCache(userId: number, tenantId?: number): void {
  if (tenantId !== undefined) {
    branchAccessCache.delete(cacheKey(userId, tenantId));
  } else {
    for (const key of branchAccessCache.keys()) {
      if (key.startsWith(`${userId}:`)) branchAccessCache.delete(key);
    }
  }
}

/** Clear all cache entries */
export function clearAllBranchAccessCache(): void {
  branchAccessCache.clear();
}

// ─── Core: Load Branch Access ───────────────────────────────────────────────

async function loadBranchAccessForUser(
  userId: number,
  tenantId: number
): Promise<CacheEntry> {
  const key = cacheKey(userId, tenantId);

  // Check cache
  const cached = branchAccessCache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached;
  }

  // Check if user is tenant_admin
  const userResult = await pool.query(
    `SELECT is_tenant_admin FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [userId, tenantId]
  );

  const isTenantAdmin = userResult.rows[0]?.is_tenant_admin === true;

  let branches: BranchAccessEntry[] = [];

  if (isTenantAdmin) {
    // tenant_admin gets all active branches for tenant
    const result = await pool.query(
      `SELECT b.id as branch_id, 'full' as access_level
       FROM branches b
       JOIN companies c ON b.company_id = c.id
       WHERE c.tenant_id = $1 AND b.deleted_at IS NULL AND b.is_active = true`,
      [tenantId]
    );
    branches = result.rows.map((r: any) => ({
      branchId: r.branch_id,
      accessLevel: r.access_level as BranchAccessLevel,
      permissions: { can_read: true, can_create: true, can_update: true, can_delete: true, can_approve: true, can_reject: true, can_endorse: true },
    }));
  } else {
    // Regular user: load from user_branches with granular permissions
    const result = await pool.query(
      `SELECT ub.branch_id, ub.access_level,
              ub.can_read, ub.can_create, ub.can_update, ub.can_delete,
              ub.can_approve, ub.can_reject, ub.can_endorse
       FROM user_branches ub
       JOIN branches b ON ub.branch_id = b.id
       JOIN companies c ON b.company_id = c.id
       WHERE ub.user_id = $1
         AND ub.is_active = true
         AND b.deleted_at IS NULL
         AND b.is_active = true
         AND c.tenant_id = $2`,
      [userId, tenantId]
    );
    branches = result.rows.map((r: any) => ({
      branchId: r.branch_id,
      accessLevel: r.access_level as BranchAccessLevel,
      permissions: {
        can_read: r.can_read ?? true,
        can_create: r.can_create ?? false,
        can_update: r.can_update ?? false,
        can_delete: r.can_delete ?? false,
        can_approve: r.can_approve ?? false,
        can_reject: r.can_reject ?? false,
        can_endorse: r.can_endorse ?? false,
      },
    }));
  }

  const entry: CacheEntry = { branches, isTenantAdmin, loadedAt: Date.now() };
  branchAccessCache.set(key, entry);
  return entry;
}

// ─── Middleware: loadBranchAccess ────────────────────────────────────────────

/**
 * Loads the user's accessible branches and attaches to req.branchAccess.
 * Must be called AFTER authenticate middleware.
 */
export const loadBranchAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return next(); // No user, skip (auth middleware will catch)
    }

    const tenantId = user.tenant_id;
    if (!tenantId) {
      // Platform users (no tenant) — grant full access (they're scoped by other middleware)
      req.branchAccess = {
        isTenantAdmin: true,
        branches: [],
        branchIds: [],
        hasAccess: () => true,
        hasPermission: () => true,
        getPermissions: () => ({ can_read: true, can_create: true, can_update: true, can_delete: true, can_approve: true, can_reject: true, can_endorse: true }),
      };
      return next();
    }

    const { branches, isTenantAdmin } = await loadBranchAccessForUser(user.id, tenantId);
    const branchIds = branches.map((b) => b.branchId);

    // Build lookup maps for fast checks
    const accessMap = new Map<number, BranchAccessLevel>();
    const permMap = new Map<number, BranchPermissions>();
    for (const b of branches) {
      accessMap.set(b.branchId, b.accessLevel);
      permMap.set(b.branchId, b.permissions);
    }

    req.branchAccess = {
      isTenantAdmin,
      branches,
      branchIds,
      hasAccess: (branchId: number, minLevel: BranchAccessLevel = 'read') => {
        if (isTenantAdmin) return true;
        const level = accessMap.get(branchId);
        return level !== undefined && meetsAccessLevel(level, minLevel);
      },
      hasPermission: (branchId: number, permission: GranularPermission) => {
        if (isTenantAdmin) return true;
        const perms = permMap.get(branchId);
        return perms?.[permission] === true;
      },
      getPermissions: (branchId: number) => {
        if (isTenantAdmin) return { can_read: true, can_create: true, can_update: true, can_delete: true, can_approve: true, can_reject: true, can_endorse: true };
        return permMap.get(branchId) ?? null;
      },
    };

    next();
  } catch (error) {
    console.error('Branch access middleware error:', error);
    // Fail open for backward compat — log but don't block
    req.branchAccess = {
      isTenantAdmin: false,
      branches: [],
      branchIds: [],
      hasAccess: () => false,
      hasPermission: () => false,
      getPermissions: () => null,
    };
    next();
  }
};

// ─── Middleware: requireBranchAccess ─────────────────────────────────────────

/**
 * Enforces that the current request's branch (from X-Branch-Id header or req.branchId)
 * is accessible to the user with at least the specified access level.
 * Use AFTER loadBranchAccess.
 */
export const requireBranchAccess = (minLevel: BranchAccessLevel = 'read') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ba = req.branchAccess;
    if (!ba) {
      return res.status(500).json({
        success: false,
        error: 'Branch access not loaded',
        code: 'BRANCH_ACCESS_NOT_LOADED',
      });
    }

    // tenant_admin bypasses
    if (ba.isTenantAdmin) return next();

    const branchId = req.branchId || parseInt(req.headers['x-branch-id'] as string, 10);
    if (!branchId || isNaN(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Branch context required for this operation',
        error_ar: 'يجب تحديد الفرع لتنفيذ هذه العملية',
        code: 'BRANCH_REQUIRED',
      });
    }

    if (!ba.hasAccess(branchId, minLevel)) {
      return res.status(403).json({
        success: false,
        error: `You don't have ${minLevel} access to this branch`,
        error_ar: `ليس لديك صلاحية ${minLevel === 'read' ? 'عرض' : minLevel === 'write' ? 'تعديل' : 'إدارة'} هذا الفرع`,
        code: 'BRANCH_ACCESS_DENIED',
      });
    }

    next();
  };
};

// ─── Query Helpers ──────────────────────────────────────────────────────────

/**
 * Build a WHERE clause fragment to filter by accessible branches.
 * For tenant_admin, returns a no-op condition (1=1).
 *
 * @param req - Express request with branchAccess loaded
 * @param alias - Table alias (e.g., 'je' for journal_entries)
 * @param startParamIndex - Starting $N parameter index
 * @returns { clause, params, nextIndex }
 *
 * Example:
 *   const { clause, params, nextIndex } = buildBranchFilter(req, 'je', 2);
 *   // clause = "je.branch_id = ANY($2)"
 *   // params = [[1,2,3]]
 *   // nextIndex = 3
 */
export function buildBranchFilter(
  req: Request,
  alias: string = '',
  startParamIndex: number = 1
): { clause: string; params: any[]; nextIndex: number } {
  const ba = req.branchAccess;
  const prefix = alias ? `${alias}.` : '';

  if (!ba || ba.isTenantAdmin) {
    // No restriction for tenant_admin
    return { clause: '1=1', params: [], nextIndex: startParamIndex };
  }

  if (ba.branchIds.length === 0) {
    // User has NO branch access — return impossible condition
    return { clause: '1=0', params: [], nextIndex: startParamIndex };
  }

  // Filter: branch_id IN (user's branches) OR branch_id IS NULL (legacy records)
  return {
    clause: `(${prefix}branch_id = ANY($${startParamIndex}) OR ${prefix}branch_id IS NULL)`,
    params: [ba.branchIds],
    nextIndex: startParamIndex + 1,
  };
}

/**
 * For single-branch operations (create/update): validate and return the branch_id to use.
 * - If request has X-Branch-Id header, use it (after access check)
 * - If user has exactly one branch, use that
 * - Otherwise, require explicit branch selection
 */
export function resolveBranchId(
  req: Request,
  requiredLevel: BranchAccessLevel = 'write'
): { branchId: number | null; error?: string } {
  const ba = req.branchAccess;

  // Get branch from header or body
  const headerBranch = req.branchId || parseInt(req.headers['x-branch-id'] as string, 10);
  const bodyBranch = (req.body as any)?.branch_id;
  const branchId = headerBranch || bodyBranch;

  if (!ba) {
    return { branchId: branchId || null };
  }

  if (ba.isTenantAdmin) {
    return { branchId: branchId || null };
  }

  if (branchId) {
    if (!ba.hasAccess(branchId, requiredLevel)) {
      return { branchId: null, error: 'You don\'t have write access to this branch' };
    }
    return { branchId };
  }

  // Auto-resolve if user has exactly one branch with write access
  const writeBranches = ba.branches.filter((b) => meetsAccessLevel(b.accessLevel, requiredLevel));
  if (writeBranches.length === 1) {
    return { branchId: writeBranches[0].branchId };
  }

  if (writeBranches.length === 0) {
    return { branchId: null, error: 'You have no branch with write access' };
  }

  // Multiple branches — user must select one
  return { branchId: null, error: 'Please select a branch for this operation' };
}

export default {
  loadBranchAccess,
  requireBranchAccess,
  buildBranchFilter,
  resolveBranchId,
  clearBranchAccessCache,
  clearAllBranchAccessCache,
};
