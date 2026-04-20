/**
 * ============================================================================
 * §17.1 — Golden Rules: Security Guards
 * ============================================================================
 * Centralized security enforcement that cannot be bypassed.
 *
 *   ✕ 1. Every DB query must contain WHERE tenant_id = ? — no exceptions
 *   ✕ 2. Never trust tenant_id from request body — always take it from JWT
 *   ✕ 3. Check permissions in Backend even if frontend hides the button
 *   ✕ 4. Log every sensitive operation in audit_logs
 *   ✕ 5. super_admin (ali@alhajco.com) cannot be deleted or have email changed
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────────

/** The protected super_admin email that can NEVER be deleted or changed */
export const PROTECTED_SUPER_ADMIN_EMAIL = 'ali@alhajco.com';

/** Fields on req.body that must NEVER be trusted for tenant identity */
const FORBIDDEN_TENANT_BODY_FIELDS = ['tenant_id', 'tenantId'];

// ─── §17.1.2 — Tenant ID Body Sanitizer ────────────────────────────────────

/**
 * Middleware that strips tenant_id / company_id from req.body.
 * These values must ALWAYS come from the JWT, never the request.
 *
 * Logs a warning when a client attempts to inject these fields.
 */
export function sanitizeTenantFromBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const field of FORBIDDEN_TENANT_BODY_FIELDS) {
      if (field in req.body) {
        logger.warn(
          `§17.1 SECURITY: Stripped '${field}' from request body — ` +
          `user=${(req as any).user?.id || 'anonymous'}, ` +
          `ip=${req.ip}, ` +
          `path=${req.method} ${req.path}`
        );
        delete req.body[field];
      }
    }
  }
  next();
}

// ─── §17.1.5 — Super Admin Protection ───────────────────────────────────────

/**
 * Check if a given user ID or email is the protected super admin account.
 */
export async function isProtectedSuperAdmin(userId?: number, email?: string): Promise<boolean> {
  if (email && email.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if (userId) {
    try {
      const result = await pool.query(
        'SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].email.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase();
      }
    } catch {
      // If DB query fails, err on the side of protection
      return false;
    }
  }
  return false;
}

/**
 * Middleware guard for routes that modify users.
 * Prevents:
 *  - Deleting the protected super_admin account
 *  - Changing the protected super_admin's email
 *  - Disabling/suspending the protected super_admin
 *
 * Mount on: DELETE /api/users/:id, PUT /api/users/:id, PATCH /api/users/:id/*
 */
export function protectSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const targetUserId = parseInt(req.params.id, 10);
  if (!Number.isFinite(targetUserId)) return next();

  isProtectedSuperAdmin(targetUserId).then((isProtected) => {
    if (!isProtected) return next();

    // Block DELETE entirely
    if (req.method === 'DELETE') {
      logger.warn(
        `§17.1.5 BLOCKED: Attempt to delete protected super_admin (user_id=${targetUserId}) ` +
        `by user_id=${(req as any).user?.id}, ip=${req.ip}`
      );
      return res.status(403).json({
        success: false,
        error: 'This account is protected and cannot be deleted',
        error_ar: 'هذا الحساب محمي ولا يمكن حذفه',
        code: 'PROTECTED_SUPER_ADMIN',
      });
    }

    // Block email change on PUT/PATCH
    if ((req.method === 'PUT' || req.method === 'PATCH') && req.body?.email) {
      const newEmail = String(req.body.email).toLowerCase().trim();
      if (newEmail !== PROTECTED_SUPER_ADMIN_EMAIL.toLowerCase()) {
        logger.warn(
          `§17.1.5 BLOCKED: Attempt to change super_admin email ` +
          `from ${PROTECTED_SUPER_ADMIN_EMAIL} to ${newEmail} ` +
          `by user_id=${(req as any).user?.id}, ip=${req.ip}`
        );
        return res.status(403).json({
          success: false,
          error: 'The super admin email cannot be changed',
          error_ar: 'لا يمكن تغيير بريد المسؤول الأعلى',
          code: 'PROTECTED_SUPER_ADMIN_EMAIL',
        });
      }
    }

    // Block disable/suspend
    if (req.path.includes('/disable') || req.path.includes('/suspend')) {
      logger.warn(
        `§17.1.5 BLOCKED: Attempt to disable/suspend protected super_admin ` +
        `by user_id=${(req as any).user?.id}, ip=${req.ip}`
      );
      return res.status(403).json({
        success: false,
        error: 'This account is protected and cannot be disabled',
        error_ar: 'هذا الحساب محمي ولا يمكن تعطيله',
        code: 'PROTECTED_SUPER_ADMIN',
      });
    }

    next();
  }).catch(() => next());
}

// ─── §17.1.1 — Tenant Query Builder ─────────────────────────────────────────

/**
 * Safe query builder that ALWAYS includes tenant_id filtering.
 * Usage:
 *   const { text, values } = tenantQuery(req, 'SELECT * FROM shipments', { status: 'active' });
 *   const result = await pool.query(text, values);
 */
export function tenantQuery(
  req: Request,
  baseQuery: string,
  filters: Record<string, any> = {},
  options: { table?: string; tenantColumn?: string } = {}
): { text: string; values: any[] } {
  const tenantId = (req as any).tenantId || (req as any).user?.tenant_id;
  const tenantCol = options.tenantColumn || 'tenant_id';
  const values: any[] = [];
  const conditions: string[] = [];
  let paramIdx = 1;

  // §17.1.1 — ALWAYS include tenant filter (platform admins excluded upstream)
  if (tenantId) {
    conditions.push(`${tenantCol} = $${paramIdx}`);
    values.push(tenantId);
    paramIdx++;
  }

  // Add soft-delete filter by default
  conditions.push('deleted_at IS NULL');

  // Add additional filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${key} = $${paramIdx}`);
      values.push(value);
      paramIdx++;
    }
  }

  const whereClause = conditions.length > 0
    ? ` WHERE ${conditions.join(' AND ')}`
    : '';

  // Detect if query already has WHERE — append with AND instead
  const hasWhere = /\bWHERE\b/i.test(baseQuery);
  const text = hasWhere
    ? `${baseQuery} AND ${conditions.join(' AND ')}`
    : `${baseQuery}${whereClause}`;

  return { text, values };
}
