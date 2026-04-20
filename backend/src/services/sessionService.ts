/**
 * Session Tracking Service
 * 
 * Manages tenant_sessions for active session tracking.
 * Architecture Spec §2.2 Step 6: "Create record in tenant_sessions"
 * 
 * Features:
 * - Track active sessions per user/tenant
 * - Session listing & revocation
 * - Concurrent session limiting
 * - Auto-cleanup of expired sessions
 */

import pool from '../db';
import { logger } from '../utils/logger';

const MAX_CONCURRENT_SESSIONS = 5; // Default max sessions per user

export interface SessionRecord {
  id: number;
  sessionId: string;
  userId: number;
  tenantId: number | null;
  loginContext: string;
  ipAddress: string | null;
  deviceInfo: Record<string, unknown> | null;
  isActive: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

export class SessionService {

  /**
   * Create a new session record. Called after successful login.
   * Returns the session ID (UUID).
   */
  static async createSession(params: {
    userId: number;
    tenantId: number | null;
    jti: string;
    loginContext: 'platform' | 'tenant' | 'api';
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
    deviceFingerprint?: string;
  }): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Enforce concurrent session limit
      const activeResult = await client.query(
        `SELECT id, session_id, created_at FROM tenant_sessions
         WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at ASC`,
        [params.userId]
      );

      const activeSessions = activeResult.rows;
      if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
        // Revoke oldest sessions to make room
        const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - MAX_CONCURRENT_SESSIONS + 1);
        for (const s of sessionsToRevoke) {
          await client.query(
            `UPDATE tenant_sessions SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'session_limit'
             WHERE id = $1`,
            [s.id]
          );
        }
        logger.info('Revoked oldest sessions due to limit', {
          userId: params.userId,
          revokedCount: sessionsToRevoke.length,
        });
      }

      // Parse user agent for device info
      const deviceInfo = parseDeviceInfo(params.userAgent);

      // Insert new session
      const result = await client.query(
        `INSERT INTO tenant_sessions (user_id, tenant_id, jti, login_context, ip_address, user_agent, device_fingerprint, device_info, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING session_id`,
        [
          params.userId,
          params.tenantId,
          params.jti,
          params.loginContext,
          params.ipAddress,
          params.userAgent,
          params.deviceFingerprint || null,
          JSON.stringify(deviceInfo),
          params.expiresAt.toISOString(),
        ]
      );

      await client.query('COMMIT');
      return result.rows[0].session_id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke a session by JTI (called on logout or token refresh).
   */
  static async revokeByJti(jti: string, reason: string = 'logout'): Promise<boolean> {
    const result = await pool.query(
      `UPDATE tenant_sessions 
       SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_reason = $1
       WHERE jti = $2 AND is_active = TRUE
       RETURNING id`,
      [reason, jti]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Revoke a specific session by session_id (user/admin action).
   */
  static async revokeSession(sessionId: string, userId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE tenant_sessions 
       SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'admin_revoke'
       WHERE session_id = $1 AND user_id = $2 AND is_active = TRUE
       RETURNING id`,
      [sessionId, userId]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Revoke ALL sessions for a user (password change, MFA change, security lock).
   */
  static async revokeAllUserSessions(userId: number, reason: string = 'security'): Promise<number> {
    const result = await pool.query(
      `UPDATE tenant_sessions 
       SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_reason = $1
       WHERE user_id = $2 AND is_active = TRUE
       RETURNING id`,
      [reason, userId]
    );
    return result.rowCount || 0;
  }

  /**
   * List active sessions for a user.
   */
  static async listActiveSessions(userId: number): Promise<SessionRecord[]> {
    const result = await pool.query(
      `SELECT id, session_id, user_id, tenant_id, login_context, ip_address, device_info,
              is_active, last_activity_at, expires_at, created_at
       FROM tenant_sessions
       WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY last_activity_at DESC`,
      [userId]
    );
    return result.rows.map(mapRow);
  }

  /**
   * Update last_activity_at for a session (called on each authenticated request).
   * This is non-blocking and should not fail the request.
   */
  static async touchSession(jti: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE tenant_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE jti = $1 AND is_active = TRUE',
        [jti]
      );
    } catch (error) {
      // Don't fail the request
      logger.error('Failed to touch session', error as Error);
    }
  }

  /**
   * Check if a JTI has an active session (for token blacklist/validation).
   */
  static async isSessionActive(jti: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM tenant_sessions
       WHERE jti = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP`,
      [jti]
    );
    return result.rows.length > 0;
  }

  /**
   * Get session stats for a user (for security dashboard).
   */
  static async getSessionStats(userId: number): Promise<{
    activeCount: number;
    totalHistoric: number;
    uniqueIps: number;
    lastSessionAt: string | null;
  }> {
    const activeResult = await pool.query(
      `SELECT COUNT(*) as count, MAX(created_at) as last_session_at,
              COUNT(DISTINCT ip_address) as unique_ips
       FROM tenant_sessions
       WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP`,
      [userId]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) as count FROM tenant_sessions WHERE user_id = $1',
      [userId]
    );

    return {
      activeCount: parseInt(activeResult.rows[0].count, 10),
      totalHistoric: parseInt(totalResult.rows[0].count, 10),
      uniqueIps: parseInt(activeResult.rows[0].unique_ips, 10),
      lastSessionAt: activeResult.rows[0].last_session_at,
    };
  }

  /**
   * Cleanup expired sessions (can be called via cron).
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const result = await pool.query('SELECT cleanup_expired_sessions() as count');
      return result.rows[0].count;
    } catch (error) {
      // If function doesn't exist, do manual cleanup
      const result = await pool.query(
        `UPDATE tenant_sessions 
         SET is_active = FALSE, revoked_reason = 'expired'
         WHERE is_active = TRUE AND expires_at < CURRENT_TIMESTAMP
         RETURNING id`
      );
      return result.rowCount || 0;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRow(row: any): SessionRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    loginContext: row.login_context,
    ipAddress: row.ip_address,
    deviceInfo: row.device_info,
    isActive: row.is_active,
    lastActivityAt: row.last_activity_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function parseDeviceInfo(userAgent: string): Record<string, string> {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edg')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) { os = 'Android'; device = 'Mobile'; }
  else if (userAgent.includes('iPhone')) { os = 'iOS'; device = 'Mobile'; }
  else if (userAgent.includes('iPad')) { os = 'iPadOS'; device = 'Tablet'; }

  return { browser, os, device };
}
