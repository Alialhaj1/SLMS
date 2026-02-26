/**
 * MFA (Multi-Factor Authentication) Service
 * Handles TOTP-based two-factor authentication.
 * Currently a stub — MFA is disabled by default via system_policies (enable_2fa = false).
 */

import pool from '../db';
import crypto from 'crypto';

/**
 * MFA pending token record stored in DB / memory.
 */
interface PendingMFAToken {
  token: string;
  userId: number;
  tenantId: number | null;
  loginContext: 'platform' | 'tenant';
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory pending tokens (for development; use Redis in production)
const pendingTokens = new Map<string, PendingMFAToken>();
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export class MFAService {

  /**
   * Check if MFA is required for a user.
   * Returns true if the user has MFA enabled AND the system policy allows it.
   */
  static async isMFARequired(userId: number): Promise<boolean> {
    try {
      // Check system-wide MFA policy first
      const policyResult = await pool.query(
        `SELECT policy_value FROM system_policies
         WHERE policy_key = 'enable_2fa'
           AND company_id IS NULL
           AND is_active = TRUE
           AND deleted_at IS NULL
         LIMIT 1`
      );

      const policyEnabled = policyResult.rows[0]?.policy_value === 'true';
      if (!policyEnabled) return false;

      // Check if user has MFA set up
      const userResult = await pool.query(
        `SELECT mfa_enabled FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [userId]
      );

      return userResult.rows[0]?.mfa_enabled === true;
    } catch (err) {
      // If mfa_enabled column doesn't exist, MFA is not available
      return false;
    }
  }

  /**
   * Check if user needs to set up MFA (policy enforces it but user hasn't configured).
   */
  static async needsMFASetup(userId: number): Promise<boolean> {
    try {
      const policyResult = await pool.query(
        `SELECT policy_value FROM system_policies
         WHERE policy_key = 'enable_2fa'
           AND company_id IS NULL
           AND is_active = TRUE
           AND deleted_at IS NULL
         LIMIT 1`
      );

      const policyEnabled = policyResult.rows[0]?.policy_value === 'true';
      if (!policyEnabled) return false;

      // If policy enforces MFA but user hasn't set it up
      const userResult = await pool.query(
        `SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [userId]
      );

      const user = userResult.rows[0];
      if (!user) return false;

      // MFA policy is on, user hasn't set up MFA yet
      return !user.mfa_enabled && !user.mfa_secret;
    } catch (err) {
      return false;
    }
  }

  /**
   * Create a pending MFA token.
   * After password verification succeeds, before MFA code is provided.
   */
  static async createPendingToken(
    userId: number,
    tenantId: number | null,
    loginContext: 'platform' | 'tenant',
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS);

    pendingTokens.set(token, {
      token,
      userId,
      tenantId,
      loginContext,
      ipAddress,
      userAgent,
      createdAt: now,
      expiresAt,
    });

    // Clean up expired tokens
    MFAService.cleanupExpiredTokens();

    return token;
  }

  /**
   * Verify a pending MFA token and return the associated data.
   */
  static async verifyPendingToken(token: string): Promise<PendingMFAToken | null> {
    const record = pendingTokens.get(token);
    if (!record) return null;
    if (new Date() > record.expiresAt) {
      pendingTokens.delete(token);
      return null;
    }
    return record;
  }

  /**
   * Consume (delete) a pending token after successful MFA verification.
   */
  static async consumePendingToken(token: string): Promise<void> {
    pendingTokens.delete(token);
  }

  /**
   * Clean up expired pending tokens.
   */
  private static cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [key, val] of pendingTokens.entries()) {
      if (now > val.expiresAt) {
        pendingTokens.delete(key);
      }
    }
  }
}
