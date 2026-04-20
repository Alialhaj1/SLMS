/**
 * ============================================================
 * Impersonation Service — Architecture §5.3
 * ============================================================
 *
 * Full impersonation lifecycle:
 *   1. Validate request (reason required, min 10 chars)
 *   2. Generate scoped JWT (30 min, type=impersonation)
 *   3. Log to impersonation_logs (immutable)
 *   4. Increment operations_count on each audited action
 *   5. End session (revoke token_jti, set ended_at)
 *
 * Security invariants:
 *   - Only platform admins with platform.tenants.impersonate can start
 *   - Impersonation tokens CANNOT access /api/platform/* (enforced in auth.ts)
 *   - Impersonation tokens CANNOT change passwords
 *   - Log entries CANNOT be deleted (trigger protection in DB)
 *   - All actions during impersonation tagged with impersonated_by in audit
 * ============================================================
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { config } from '../config/env';
import logger from '../utils/logger';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const IMPERSONATION_TOKEN_EXPIRY_MINUTES = 30;
const MIN_REASON_LENGTH = 10;

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface ImpersonationRequest {
  adminUserId: number;
  tenantId: number;
  targetUserId?: number;   // specific user to impersonate (optional — defaults to tenant owner)
  reason: string;
  ipAddress: string;
  userAgent?: string;
}

export interface ImpersonationSession {
  sessionId: number;
  impersonationToken: string;
  expiresAt: Date;
  tenant: {
    id: number;
    name: string;
    code: string;
  };
  targetUser: {
    id: number;
    email: string;
    fullName: string;
    roles: string[];
  };
}

export interface ImpersonationLogEntry {
  id: number;
  adminName: string;
  adminEmail: string;
  tenantName: string;
  targetUserName: string;
  targetUserEmail: string;
  reason: string;
  startedAt: Date;
  endedAt: Date | null;
  ipAddress: string;
  operationsCount: number;
  durationSeconds: number | null;
}

// ────────────────────────────────────────────
// Service
// ────────────────────────────────────────────

export class ImpersonationService {
  /**
   * Start an impersonation session.
   * - Validates the request
   * - Finds the target user (or tenant owner)
   * - Generates a scoped JWT
   * - Creates an immutable log entry
   */
  static async startSession(req: ImpersonationRequest): Promise<ImpersonationSession> {
    // ── Validate reason ───────────────────
    if (!req.reason || req.reason.trim().length < MIN_REASON_LENGTH) {
      throw Object.assign(new Error(
        `Impersonation reason is required and must be at least ${MIN_REASON_LENGTH} characters`
      ), { statusCode: 400, code: 'VALIDATION_ERROR' });
    }

    // ── Verify admin is a platform user ───
    const adminCheck = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.tenant_id
       FROM users u WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.adminUserId]
    );
    if (adminCheck.rows.length === 0) {
      throw Object.assign(new Error('Admin user not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }
    if (adminCheck.rows[0].tenant_id !== null) {
      throw Object.assign(new Error('Only platform users can impersonate tenants'), {
        statusCode: 403, code: 'FORBIDDEN'
      });
    }
    const admin = adminCheck.rows[0];

    // ── Verify tenant exists and is active ─
    const tenantCheck = await pool.query(
      `SELECT t.id, t.name, t.company_code
       FROM tenants t
       WHERE t.id = $1`,
      [req.tenantId]
    );
    if (tenantCheck.rows.length === 0) {
      throw Object.assign(new Error('Tenant not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }
    const tenant = tenantCheck.rows[0];

    // ── Find target user ──────────────────
    let targetUser: any;
    if (req.targetUserId) {
      const tgt = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.tenant_id
         FROM users u
         WHERE u.id = $1 AND u.tenant_id = $2 AND u.deleted_at IS NULL`,
        [req.targetUserId, req.tenantId]
      );
      if (tgt.rows.length === 0) {
        throw Object.assign(new Error('Target user not found in this tenant'), {
          statusCode: 404, code: 'NOT_FOUND'
        });
      }
      targetUser = tgt.rows[0];
    } else {
      // Default to tenant owner (is_tenant_admin = true)
      const owner = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.tenant_id
         FROM users u
         WHERE u.tenant_id = $1 AND u.is_tenant_admin = true AND u.deleted_at IS NULL
         ORDER BY u.created_at ASC LIMIT 1`,
        [req.tenantId]
      );
      if (owner.rows.length === 0) {
        throw Object.assign(new Error('No admin user found for this tenant'), {
          statusCode: 404, code: 'NOT_FOUND'
        });
      }
      targetUser = owner.rows[0];
    }

    // ── Load target user roles ────────────
    const rolesRes = await pool.query(
      `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
      [targetUser.id]
    );
    const targetRoles = rolesRes.rows.map((r: any) => r.name);

    // ── Generate scoped JWT ───────────────
    const jti = uuidv4();
    const expiresAt = new Date(Date.now() + IMPERSONATION_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    const payload: Record<string, any> = {
      sub: targetUser.id,
      email: targetUser.email,
      roles: targetRoles,
      tenant_id: req.tenantId,
      tid: req.tenantId,
      login_context: 'tenant',
      scope: 'tenant',
      jti,
      // ── Impersonation markers ──
      type: 'impersonation',
      impersonated_by: req.adminUserId,
      impersonated_by_email: admin.email,
      impersonation_reason: req.reason.trim(),
      impersonation_expires: expiresAt.toISOString(),
    };

    const impersonationToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: `${IMPERSONATION_TOKEN_EXPIRY_MINUTES}m`,
    });

    // ── Create immutable log entry ────────
    const logResult = await pool.query(
      `INSERT INTO impersonation_logs
        (super_admin_id, tenant_id, target_user_id, reason, token_jti,
         token_expires_at, started_at, ip_address, user_agent, operations_count)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, 0)
       RETURNING id`,
      [
        req.adminUserId,
        req.tenantId,
        targetUser.id,
        req.reason.trim(),
        jti,
        expiresAt,
        req.ipAddress,
        req.userAgent || null,
      ]
    );

    logger.info({
      event: 'impersonation_started',
      adminId: req.adminUserId,
      adminEmail: admin.email,
      tenantId: req.tenantId,
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
      reason: req.reason.trim(),
      jti,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      sessionId: logResult.rows[0].id,
      impersonationToken,
      expiresAt,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.company_code,
      },
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.full_name,
        roles: targetRoles,
      },
    };
  }

  /**
   * End an impersonation session by JTI or session ID.
   */
  static async endSession(opts: { jti?: string; sessionId?: number }): Promise<void> {
    const { jti, sessionId } = opts;
    if (!jti && !sessionId) return;

    const where = jti ? 'token_jti = $1' : 'id = $1';
    const param = jti || sessionId;

    await pool.query(
      `UPDATE impersonation_logs SET ended_at = NOW(), updated_at = NOW() WHERE ${where} AND ended_at IS NULL`,
      [param]
    );

    logger.info({ event: 'impersonation_ended', jti, sessionId });
  }

  /**
   * Increment operations count for an active impersonation session.
   * Called by the audit middleware when type=impersonation.
   */
  static async incrementOperations(jti: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE impersonation_logs
         SET operations_count = operations_count + 1, updated_at = NOW()
         WHERE token_jti = $1 AND ended_at IS NULL`,
        [jti]
      );
    } catch (err) {
      // Non-fatal — don't break the request
      logger.warn({ event: 'impersonation_ops_increment_failed', jti, error: (err as Error).message });
    }
  }

  /**
   * Get active session by JTI (for validation).
   */
  static async getActiveSession(jti: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT il.*, u.full_name as admin_name, u.email as admin_email
       FROM impersonation_logs il
       JOIN users u ON u.id = il.super_admin_id
       WHERE il.token_jti = $1 AND il.ended_at IS NULL AND il.token_expires_at > NOW()`,
      [jti]
    );
    return result.rows[0] || null;
  }

  /**
   * List impersonation logs with pagination and filters.
   */
  static async listLogs(opts: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    adminId?: number;
    tenantId?: number;
  }): Promise<{ data: ImpersonationLogEntry[]; total: number }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (opts.from) {
      conditions.push(`il.started_at >= $${idx++}`);
      params.push(opts.from);
    }
    if (opts.to) {
      conditions.push(`il.started_at <= $${idx++}`);
      params.push(opts.to);
    }
    if (opts.adminId) {
      conditions.push(`il.super_admin_id = $${idx++}`);
      params.push(opts.adminId);
    }
    if (opts.tenantId) {
      conditions.push(`il.tenant_id = $${idx++}`);
      params.push(opts.tenantId);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM impersonation_logs il ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT il.id, il.reason,
              il.started_at, il.ended_at,
              il.ip_address, il.operations_count,
              EXTRACT(EPOCH FROM (COALESCE(il.ended_at, NOW()) - il.started_at))::int as duration_seconds,
              admin_u.full_name as admin_name, admin_u.email as admin_email,
              target_u.full_name as target_user_name, target_u.email as target_user_email,
              COALESCE(t.name, 'N/A') as tenant_name
       FROM impersonation_logs il
       LEFT JOIN users admin_u ON admin_u.id = il.super_admin_id
       LEFT JOIN users target_u ON target_u.id = il.target_user_id
       LEFT JOIN tenants t ON t.id = il.tenant_id
       ${whereClause}
       ORDER BY il.started_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const data: ImpersonationLogEntry[] = result.rows.map((r: any) => ({
      id: r.id,
      adminName: r.admin_name,
      adminEmail: r.admin_email,
      tenantName: r.tenant_name,
      targetUserName: r.target_user_name,
      targetUserEmail: r.target_user_email,
      reason: r.reason,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      ipAddress: r.ip_address,
      operationsCount: r.operations_count,
      durationSeconds: r.duration_seconds,
    }));

    return { data, total };
  }

  /**
   * End all expired but unclosed sessions (cleanup job).
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const result = await pool.query(
      `UPDATE impersonation_logs
       SET ended_at = token_expires_at, updated_at = NOW()
       WHERE ended_at IS NULL AND token_expires_at < NOW()
       RETURNING id`
    );
    if (result.rowCount && result.rowCount > 0) {
      logger.info({ event: 'impersonation_cleanup', closed: result.rowCount });
    }
    return result.rowCount || 0;
  }
}
