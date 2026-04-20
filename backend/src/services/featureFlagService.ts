/**
 * §13.4.2 — Feature Flags Service
 *
 * Full implementation replacing the stub `featureFlags.ts` route.
 * Supports boolean, percentage, and user_list flag types.
 * Evaluates flags with tenant/user overrides.
 * Data stored in `feature_flags` + `feature_flag_overrides` (migration 413).
 */

import pool from '../db';
import { logger } from '../utils/logger';

// ─── In-memory cache for hot-path flag checks ───────────────────────────────
interface CachedFlag {
  key: string;
  flag_type: 'boolean' | 'percentage' | 'user_list';
  is_enabled: boolean;
  percentage: number | null;
  user_list: number[] | null;
  fetchedAt: number;
}

const flagCache = new Map<string, CachedFlag>();
const CACHE_TTL = 60_000; // 1 minute

export class FeatureFlagService {
  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * List all flags.
   */
  static async list(): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT * FROM feature_flags ORDER BY flag_key`
    );
    return result.rows;
  }

  /**
   * Get a flag by key.
   */
  static async getByKey(flagKey: string): Promise<unknown | null> {
    const result = await pool.query(
      `SELECT * FROM feature_flags WHERE flag_key = $1`,
      [flagKey]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new flag.
   */
  static async create(data: {
    flag_key: string;
    description?: string;
    flag_type?: 'boolean' | 'percentage' | 'user_list';
    is_enabled?: boolean;
    percentage?: number;
    user_list?: number[];
  }): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO feature_flags (flag_key, description, flag_type, is_enabled, percentage, user_list)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.flag_key,
        data.description || null,
        data.flag_type || 'boolean',
        data.is_enabled ?? false,
        data.percentage ?? null,
        data.user_list ? JSON.stringify(data.user_list) : null,
      ]
    );
    this.invalidateCache(data.flag_key);
    return result.rows[0];
  }

  /**
   * Update a flag.
   */
  static async update(flagKey: string, data: Partial<{
    description: string;
    flag_type: 'boolean' | 'percentage' | 'user_list';
    is_enabled: boolean;
    percentage: number;
    user_list: number[];
  }>): Promise<unknown | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.description !== undefined) { fields.push(`description = $${idx++}`); params.push(data.description); }
    if (data.flag_type !== undefined) { fields.push(`flag_type = $${idx++}`); params.push(data.flag_type); }
    if (data.is_enabled !== undefined) { fields.push(`is_enabled = $${idx++}`); params.push(data.is_enabled); }
    if (data.percentage !== undefined) { fields.push(`percentage = $${idx++}`); params.push(data.percentage); }
    if (data.user_list !== undefined) { fields.push(`user_list = $${idx++}`); params.push(JSON.stringify(data.user_list)); }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    params.push(flagKey);

    const result = await pool.query(
      `UPDATE feature_flags SET ${fields.join(', ')} WHERE flag_key = $${idx} RETURNING *`,
      params
    );
    this.invalidateCache(flagKey);
    return result.rows[0] || null;
  }

  /**
   * Delete a flag and its overrides.
   */
  static async delete(flagKey: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM feature_flag_overrides WHERE flag_key = $1`, [flagKey]);
      const result = await client.query(`DELETE FROM feature_flags WHERE flag_key = $1`, [flagKey]);
      await client.query('COMMIT');
      this.invalidateCache(flagKey);
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Overrides ─────────────────────────────────────────────────────────────

  /**
   * List overrides for a flag.
   */
  static async listOverrides(flagKey: string): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT * FROM feature_flag_overrides WHERE flag_key = $1 ORDER BY tenant_id, user_id`,
      [flagKey]
    );
    return result.rows;
  }

  /**
   * Set an override for a tenant or user.
   */
  static async setOverride(flagKey: string, tenantId: number | null, userId: number | null, isEnabled: boolean): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO feature_flag_overrides (flag_key, tenant_id, user_id, is_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (flag_key, COALESCE(tenant_id, 0), COALESCE(user_id, 0))
       DO UPDATE SET is_enabled = $4, updated_at = NOW()
       RETURNING *`,
      [flagKey, tenantId, userId, isEnabled]
    );
    this.invalidateCache(flagKey);
    return result.rows[0];
  }

  /**
   * Remove a specific override.
   */
  static async removeOverride(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM feature_flag_overrides WHERE id = $1 RETURNING flag_key`,
      [id]
    );
    if (result.rows[0]) this.invalidateCache(result.rows[0].flag_key);
    return (result.rowCount ?? 0) > 0;
  }

  // ─── Evaluation ────────────────────────────────────────────────────────────

  /**
   * Evaluate whether a flag is enabled for a given context.
   *
   * Resolution order (first match wins):
   * 1. User-specific override (flag_key + user_id)
   * 2. Tenant-specific override (flag_key + tenant_id)
   * 3. Global flag definition
   */
  static async isEnabled(
    flagKey: string,
    context: { tenantId?: number | null; userId?: number | null } = {}
  ): Promise<boolean> {
    const { tenantId, userId } = context;

    // Check user-level override
    if (userId) {
      const userOverride = await pool.query(
        `SELECT is_enabled FROM feature_flag_overrides WHERE flag_key = $1 AND user_id = $2`,
        [flagKey, userId]
      );
      if (userOverride.rows.length > 0) return userOverride.rows[0].is_enabled;
    }

    // Check tenant-level override
    if (tenantId) {
      const tenantOverride = await pool.query(
        `SELECT is_enabled FROM feature_flag_overrides WHERE flag_key = $1 AND tenant_id = $2 AND user_id IS NULL`,
        [flagKey, tenantId]
      );
      if (tenantOverride.rows.length > 0) return tenantOverride.rows[0].is_enabled;
    }

    // Check global flag
    const flag = await this.getCachedFlag(flagKey);
    if (!flag) return false;

    switch (flag.flag_type) {
      case 'boolean':
        return flag.is_enabled;

      case 'percentage':
        if (!flag.is_enabled) return false;
        // Deterministic hash based on userId for consistent bucketing
        const hash = userId ? (userId % 100) : Math.floor(Math.random() * 100);
        return hash < (flag.percentage || 0);

      case 'user_list':
        if (!flag.is_enabled) return false;
        return userId != null && (flag.user_list || []).includes(userId);

      default:
        return flag.is_enabled;
    }
  }

  /**
   * Evaluate multiple flags at once (for frontend SDK).
   */
  static async evaluateAll(
    context: { tenantId?: number | null; userId?: number | null } = {}
  ): Promise<Record<string, boolean>> {
    const flags = await pool.query(`SELECT flag_key FROM feature_flags`);
    const results: Record<string, boolean> = {};

    for (const row of flags.rows) {
      results[row.flag_key] = await this.isEnabled(row.flag_key, context);
    }

    return results;
  }

  // ─── Cache helpers ─────────────────────────────────────────────────────────

  private static async getCachedFlag(flagKey: string): Promise<CachedFlag | null> {
    const cached = flagCache.get(flagKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached;
    }

    const result = await pool.query(
      `SELECT flag_key, flag_type, is_enabled, percentage, user_list FROM feature_flags WHERE flag_key = $1`,
      [flagKey]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const flag: CachedFlag = {
      key: row.flag_key,
      flag_type: row.flag_type,
      is_enabled: row.is_enabled,
      percentage: row.percentage,
      user_list: row.user_list,
      fetchedAt: Date.now(),
    };
    flagCache.set(flagKey, flag);
    return flag;
  }

  private static invalidateCache(flagKey: string): void {
    flagCache.delete(flagKey);
  }

  /**
   * Clear entire cache (useful after bulk updates).
   */
  static clearCache(): void {
    flagCache.clear();
    logger.debug('Feature flag cache cleared');
  }
}
