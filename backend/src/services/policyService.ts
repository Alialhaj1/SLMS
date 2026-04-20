/**
 * Policy Service
 * Reads system-wide and company-scoped policies from the system_policies table.
 * Provides helper methods for common policy lookups (session timeout, password rules, etc.)
 * Includes an in-memory cache to avoid repeated DB queries.
 */

import pool from '../db';

// =============================================
// In-memory cache (key → value)
// =============================================
const policyCache = new Map<string, { value: string; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// =============================================
// Policy Service
// =============================================
export class PolicyService {

  // ------------------------------------------
  // Low-level getters
  // ------------------------------------------

  /**
   * Get a policy value by key (system-wide, company_id IS NULL).
   * Returns the default_value from DB or the provided fallback.
   */
  static async get(key: string, fallback: string = ''): Promise<string> {
    // Check cache
    const cached = policyCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.value;
    }

    try {
      const result = await pool.query(
        `SELECT policy_value, default_value
         FROM system_policies
         WHERE policy_key = $1
           AND company_id IS NULL
           AND is_active = TRUE
           AND deleted_at IS NULL
         LIMIT 1`,
        [key]
      );

      const row = result.rows[0];
      const value = row ? (row.policy_value ?? row.default_value ?? fallback) : fallback;

      // Update cache
      policyCache.set(key, { value, fetchedAt: Date.now() });

      return value;
    } catch (err) {
      // If the table doesn't exist yet (migrations not run), return fallback silently
      console.warn(`PolicyService.get('${key}') failed, returning fallback '${fallback}'`, (err as Error).message);
      return fallback;
    }
  }

  /**
   * Get a boolean policy value.
   */
  static async getBool(key: string, fallback: boolean = false): Promise<boolean> {
    const val = await PolicyService.get(key, String(fallback));
    return val === 'true' || val === '1' || val === 'yes';
  }

  /**
   * Get an integer policy value.
   */
  static async getInt(key: string, fallback: number = 0): Promise<number> {
    const val = await PolicyService.get(key, String(fallback));
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  }

  // ------------------------------------------
  // Cache management
  // ------------------------------------------

  /**
   * Invalidate the entire policy cache.
   * Called after policy updates so that new values take effect immediately.
   */
  static async invalidateCache(): Promise<void> {
    policyCache.clear();
  }

  // ------------------------------------------
  // Convenience helpers
  // ------------------------------------------

  /** Session timeout in minutes (default: 15) */
  static async sessionTimeoutMinutes(): Promise<number> {
    return PolicyService.getInt('session_timeout_minutes', 15);
  }

  /** Maximum login attempts before lockout (default: 5) */
  static async maxLoginAttempts(): Promise<number> {
    return PolicyService.getInt('max_login_attempts', 5);
  }

  /** Account lockout duration in minutes (default: 30) */
  static async lockoutDurationMinutes(): Promise<number> {
    return PolicyService.getInt('lockout_duration_minutes', 30);
  }

  /** Refresh token expiry in days (default: 30) */
  static async refreshTokenExpiryDays(): Promise<number> {
    return PolicyService.getInt('refresh_token_expiry_days', 7);
  }

  // ------------------------------------------
  // Password validation
  // ------------------------------------------

  /**
   * Validate a password against the current policies.
   * Returns an array of human-readable error strings (empty = valid).
   */
  static async validatePassword(password: string): Promise<string[]> {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return errors;
    }

    const minLength = await PolicyService.getInt('password_min_length', 8);
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters`);
    }

    const requireUpper = await PolicyService.getBool('password_require_uppercase', true);
    if (requireUpper && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    const requireLower = await PolicyService.getBool('password_require_lowercase', true);
    if (requireLower && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    const requireNumber = await PolicyService.getBool('password_require_number', true);
    if (requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    const requireSpecial = await PolicyService.getBool('password_require_special_char', false);
    if (requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  }
}
