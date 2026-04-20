/**
 * MFA (Multi-Factor Authentication) Service — Full Implementation
 * 
 * Features:
 * - TOTP setup & verification (RFC 6238, crypto-native implementation)
 * - Backup codes (8 codes, hashed, one-time use)
 * - Device remember (30-day trust token)
 * - MFA pending tokens (in-memory, Redis-ready)
 * 
 * Architecture Spec §2.4: Two-Factor Authentication
 */

import pool from '../db';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { encryptPassword, decryptPassword } from '../utils/passwordEncryption';

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTP_PERIOD = 30;               // seconds per OTP window
const TOTP_DIGITS = 6;                // OTP length
const TOTP_ALGORITHM = 'sha1';        // HMAC algorithm (Google Authenticator compatible)
const TOTP_WINDOW = 1;                // Allow ±1 time step (30s drift tolerance)
const BACKUP_CODE_COUNT = 8;          // Number of backup codes per user
const BACKUP_CODE_LENGTH = 8;         // Characters per backup code
const DEVICE_TRUST_DAYS = 30;         // Days to trust a remembered device
const PENDING_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes for MFA prompt
const ISSUER = 'SLMS';                // Displayed in authenticator apps

// ─── Pending MFA Token Store (in-memory; swap to Redis in production) ────────
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

const pendingTokens = new Map<string, PendingMFAToken>();

// ─── §12 S12 — MFA Secret Encryption ────────────────────────────────────────
/**
 * Encrypt an MFA secret (base32) for secure DB storage.
 * Uses the same AES-256-CBC utility as password encryption.
 */
function encryptMfaSecret(base32Secret: string): string {
  return encryptPassword(base32Secret);
}

/**
 * Decrypt an MFA secret from its encrypted form.
 * Falls back to treating the value as plaintext (legacy migration path).
 */
function decryptMfaSecret(storedValue: string): string {
  // If it looks like iv:ciphertext (hex:hex), try decrypting
  if (storedValue.includes(':') && /^[0-9a-f]+:[0-9a-f]+$/i.test(storedValue)) {
    try {
      return decryptPassword(storedValue);
    } catch {
      // Fall through to plaintext
    }
  }
  // Legacy: plaintext base32 secret — return as-is
  return storedValue;
}

// ─── TOTP Core (RFC 6238) ────────────────────────────────────────────────────

/**
 * Generate TOTP code for a given secret and time.
 */
function generateTOTP(secret: Buffer, time?: number): string {
  const counter = Math.floor((time || Date.now() / 1000) / TOTP_PERIOD);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(0, 0);
  counterBuffer.writeUInt32BE(counter, 4);

  const hmac = crypto.createHmac(TOTP_ALGORITHM, secret);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a TOTP code against a secret, allowing ±window time steps.
 */
function verifyTOTP(secret: Buffer, code: string, window: number = TOTP_WINDOW): boolean {
  const now = Date.now() / 1000;
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, now + i * TOTP_PERIOD);
    if (timingSafeEqual(code, expected)) {
      return true;
    }
  }
  return false;
}

/**
 * Timing-safe string comparison to prevent timing attacks on OTP verification.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a random Base32-encoded secret (20 bytes = 160 bits).
 */
function generateSecret(): { raw: Buffer; base32: string } {
  const raw = crypto.randomBytes(20);
  const base32 = base32Encode(raw);
  return { raw, base32 };
}

/**
 * Base32 encode (RFC 4648) — needed for otpauth:// URIs.
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0');
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

/**
 * Base32 decode — needed to recover raw bytes from stored secret.
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of encoded.toUpperCase()) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue; // skip padding
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// ─── Helper: hash for storage ────────────────────────────────────────────────
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ─── MFA Service Class ──────────────────────────────────────────────────────

export class MFAService {

  // ═══════════════════════════════════════════════════════════════════════════
  // TOTP Setup
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a new TOTP secret for a user. Returns secret + otpauth URI.
   * Does NOT enable MFA yet — must be verified first via verifyAndEnableMFA().
   */
  static async setupTOTP(userId: number): Promise<{
    secret: string;       // Base32-encoded secret for manual entry
    otpauthUri: string;   // otpauth://totp/... URI for QR code
    qrData: string;       // Same as otpauthUri (frontend generates QR from this)
  }> {
    // Get user email for the URI label
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const email = userResult.rows[0].email;

    const { base32 } = generateSecret();

    // Store secret encrypted (§12 S12) — plaintext mfa_secret kept for backward compat
    const encryptedSecret = encryptMfaSecret(base32);
    await pool.query(
      'UPDATE users SET mfa_secret = $1, mfa_secret_encrypted = $2, mfa_method = $3 WHERE id = $4',
      [base32, encryptedSecret, 'totp', userId]
    );

    const otpauthUri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(email)}?secret=${base32}&issuer=${encodeURIComponent(ISSUER)}&algorithm=${TOTP_ALGORITHM.toUpperCase()}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

    return { secret: base32, otpauthUri, qrData: otpauthUri };
  }

  /**
   * Verify a TOTP code and enable MFA for the user.
   * This completes the MFA setup flow.
   */
  static async verifyAndEnableMFA(userId: number, code: string): Promise<{
    backupCodes: string[];  // Plaintext backup codes (shown once)
  }> {
    const userResult = await pool.query(
      'SELECT mfa_secret, mfa_secret_encrypted, mfa_enabled FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const { mfa_secret, mfa_secret_encrypted, mfa_enabled } = userResult.rows[0];

    // §12 S12: Prefer encrypted column, fall back to legacy plaintext
    const secret = mfa_secret_encrypted
      ? decryptMfaSecret(mfa_secret_encrypted)
      : mfa_secret;

    if (!secret) throw new Error('MFA_NOT_CONFIGURED');
    if (mfa_enabled) throw new Error('MFA_ALREADY_ENABLED');

    // Verify the code against the stored secret
    const secretBuffer = base32Decode(secret);
    if (!verifyTOTP(secretBuffer, code)) {
      throw new Error('INVALID_MFA_CODE');
    }

    // Enable MFA
    await pool.query(
      'UPDATE users SET mfa_enabled = TRUE, mfa_verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId);

    logger.info('MFA enabled for user', { userId });
    return { backupCodes };
  }

  /**
   * Disable MFA for a user. Requires password verification (done by caller).
   */
  static async disableMFA(userId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Disable MFA on user
      await client.query(
        'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_secret_encrypted = NULL, mfa_method = NULL, mfa_verified_at = NULL WHERE id = $1',
        [userId]
      );

      // Invalidate all backup codes
      await client.query(
        'DELETE FROM mfa_backup_codes WHERE user_id = $1',
        [userId]
      );

      // Revoke all remembered devices
      await client.query(
        'UPDATE mfa_remembered_devices SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_revoked = FALSE',
        [userId]
      );

      await client.query('COMMIT');
      logger.info('MFA disabled for user', { userId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOTP Verification (Login Flow)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if MFA is required for a user.
   * Returns true if user has MFA enabled AND system policy allows it.
   */
  static async isMFARequired(userId: number): Promise<boolean> {
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

      const userResult = await pool.query(
        'SELECT mfa_enabled FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );
      return userResult.rows[0]?.mfa_enabled === true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if user needs to set up MFA (policy enforces but not configured).
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
      if (policyResult.rows[0]?.policy_value !== 'true') return false;

      const userResult = await pool.query(
        'SELECT mfa_enabled, mfa_secret, mfa_secret_encrypted FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );
      const user = userResult.rows[0];
      if (!user) return false;
      return !user.mfa_enabled && !user.mfa_secret && !user.mfa_secret_encrypted;
    } catch (err) {
      return false;
    }
  }

  /**
   * Verify a TOTP code for an authenticated user (login MFA step).
   */
  static async verifyCode(userId: number, code: string): Promise<boolean> {
    const userResult = await pool.query(
      'SELECT mfa_secret, mfa_secret_encrypted, mfa_enabled FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rows.length === 0) return false;
    const { mfa_secret, mfa_secret_encrypted, mfa_enabled } = userResult.rows[0];
    if (!mfa_enabled) return false;

    // §12 S12: Prefer encrypted, fall back to legacy plaintext
    const secret = mfa_secret_encrypted
      ? decryptMfaSecret(mfa_secret_encrypted)
      : mfa_secret;
    if (!secret) return false;

    const secretBuffer = base32Decode(secret);
    return verifyTOTP(secretBuffer, code);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Backup Codes
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate new backup codes for a user (invalidates previous codes).
   * Returns plaintext codes — must be shown to user immediately.
   */
  static async generateBackupCodes(userId: number): Promise<string[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing backup codes
      await client.query('DELETE FROM mfa_backup_codes WHERE user_id = $1', [userId]);

      // Generate new codes
      const codes: string[] = [];
      for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        const code = crypto.randomBytes(BACKUP_CODE_LENGTH / 2)
          .toString('hex')
          .toUpperCase()
          .substring(0, BACKUP_CODE_LENGTH);
        codes.push(code);

        await client.query(
          'INSERT INTO mfa_backup_codes (user_id, code_hash) VALUES ($1, $2)',
          [userId, sha256(code)]
        );
      }

      await client.query('COMMIT');
      logger.info('Backup codes generated', { userId, count: BACKUP_CODE_COUNT });
      return codes;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify and consume a backup code. Returns true if valid.
   */
  static async verifyBackupCode(userId: number, code: string, ipAddress: string): Promise<boolean> {
    const codeHash = sha256(code.toUpperCase().replace(/[\s-]/g, ''));

    const result = await pool.query(
      'SELECT id FROM mfa_backup_codes WHERE user_id = $1 AND code_hash = $2 AND is_used = FALSE',
      [userId, codeHash]
    );

    if (result.rows.length === 0) return false;

    // Mark as used
    await pool.query(
      'UPDATE mfa_backup_codes SET is_used = TRUE, used_at = CURRENT_TIMESTAMP, used_ip = $1 WHERE id = $2',
      [ipAddress, result.rows[0].id]
    );

    logger.info('Backup code used', { userId, codeId: result.rows[0].id });
    return true;
  }

  /**
   * Get remaining backup code count for a user.
   */
  static async getRemainingBackupCodeCount(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM mfa_backup_codes WHERE user_id = $1 AND is_used = FALSE',
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Device Remember (Trust This Device)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a device trust token. Returns token to store in cookie/localStorage.
   */
  static async rememberDevice(
    userId: number,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ deviceToken: string; expiresAt: Date }> {
    const deviceToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(deviceToken);
    const expiresAt = new Date(Date.now() + DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000);

    // Parse UA for friendly device name
    const deviceName = this.parseDeviceName(userAgent);

    await pool.query(
      `INSERT INTO mfa_remembered_devices 
       (user_id, device_token_hash, device_fingerprint, device_name, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, tokenHash, deviceFingerprint, deviceName, ipAddress, userAgent, expiresAt.toISOString()]
    );

    return { deviceToken, expiresAt };
  }

  /**
   * Check if a device is trusted (MFA bypass for remembered devices).
   */
  static async isDeviceTrusted(
    userId: number,
    deviceToken: string
  ): Promise<boolean> {
    if (!deviceToken) return false;

    const tokenHash = sha256(deviceToken);
    const result = await pool.query(
      `SELECT id FROM mfa_remembered_devices
       WHERE user_id = $1
         AND device_token_hash = $2
         AND is_revoked = FALSE
         AND expires_at > CURRENT_TIMESTAMP`,
      [userId, tokenHash]
    );

    if (result.rows.length > 0) {
      // Update last_used_at
      await pool.query(
        'UPDATE mfa_remembered_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );
      return true;
    }
    return false;
  }

  /**
   * Revoke all trusted devices for a user.
   */
  static async revokeAllDevices(userId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE mfa_remembered_devices 
       SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_revoked = FALSE
       RETURNING id`,
      [userId]
    );
    return result.rowCount || 0;
  }

  /**
   * List trusted devices for a user.
   */
  static async listDevices(userId: number): Promise<Array<{
    id: number;
    deviceName: string;
    ipAddress: string;
    trustedAt: string;
    lastUsedAt: string | null;
    expiresAt: string;
  }>> {
    const result = await pool.query(
      `SELECT id, device_name, ip_address, trusted_at, last_used_at, expires_at
       FROM mfa_remembered_devices
       WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY trusted_at DESC`,
      [userId]
    );
    return result.rows.map(r => ({
      id: r.id,
      deviceName: r.device_name,
      ipAddress: r.ip_address,
      trustedAt: r.trusted_at,
      lastUsedAt: r.last_used_at,
      expiresAt: r.expires_at,
    }));
  }

  /**
   * Revoke a single device by ID.
   */
  static async revokeDevice(userId: number, deviceId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE mfa_remembered_devices 
       SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_revoked = FALSE
       RETURNING id`,
      [deviceId, userId]
    );
    return (result.rowCount || 0) > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pending MFA Tokens (login flow)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a pending MFA token after password verification succeeds.
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
    const expiresAt = new Date(now.getTime() + PENDING_TOKEN_EXPIRY_MS);

    pendingTokens.set(token, {
      token, userId, tenantId, loginContext,
      ipAddress, userAgent, createdAt: now, expiresAt,
    });

    this.cleanupExpiredTokens();
    return token;
  }

  /**
   * Verify a pending MFA token (check it exists and hasn't expired).
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MFA Status
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get MFA status for a user (for profile/settings page).
   */
  static async getMFAStatus(userId: number): Promise<{
    enabled: boolean;
    method: string | null;
    verifiedAt: string | null;
    backupCodesRemaining: number;
    trustedDeviceCount: number;
  }> {
    const userResult = await pool.query(
      'SELECT mfa_enabled, mfa_method, mfa_verified_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = userResult.rows[0];

    const backupCodesRemaining = user.mfa_enabled
      ? await this.getRemainingBackupCodeCount(userId)
      : 0;

    const deviceResult = await pool.query(
      `SELECT COUNT(*) as count FROM mfa_remembered_devices
       WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP`,
      [userId]
    );
    const trustedDeviceCount = parseInt(deviceResult.rows[0].count, 10);

    return {
      enabled: user.mfa_enabled || false,
      method: user.mfa_method,
      verifiedAt: user.mfa_verified_at,
      backupCodesRemaining,
      trustedDeviceCount,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private static cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [key, val] of pendingTokens.entries()) {
      if (now > val.expiresAt) pendingTokens.delete(key);
    }
  }

  private static parseDeviceName(userAgent: string): string {
    // Simple UA parsing for friendly device names
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  }
}
