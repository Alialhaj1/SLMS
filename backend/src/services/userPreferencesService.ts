/**
 * §13.2.2 — User Preferences Service
 *
 * Manages per-user settings:
 *  - Table column visibility/ordering per page
 *  - Pinned records
 *  - Dashboard layout
 *  - Recent items tracking
 *  - Any key-value preference pair
 */

import pool from '../db';

export class UserPreferencesService {
  /**
   * Get a single preference by key.
   */
  static async get(userId: number, key: string): Promise<unknown | null> {
    const result = await pool.query(
      `SELECT preference_value FROM user_preferences WHERE user_id = $1 AND preference_key = $2`,
      [userId, key]
    );
    return result.rows.length > 0 ? result.rows[0].preference_value : null;
  }

  /**
   * Get all preferences for a user (optionally filtered by key prefix).
   */
  static async getAll(userId: number, keyPrefix?: string): Promise<Record<string, unknown>> {
    let sql = `SELECT preference_key, preference_value FROM user_preferences WHERE user_id = $1`;
    const params: unknown[] = [userId];

    if (keyPrefix) {
      sql += ` AND preference_key LIKE $2`;
      params.push(`${keyPrefix}%`);
    }

    const result = await pool.query(sql + ` ORDER BY preference_key`, params);
    const prefs: Record<string, unknown> = {};
    for (const row of result.rows) {
      prefs[row.preference_key] = row.preference_value;
    }
    return prefs;
  }

  /**
   * Set a preference (upsert).
   */
  static async set(userId: number, key: string, value: unknown): Promise<void> {
    await pool.query(
      `INSERT INTO user_preferences (user_id, preference_key, preference_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, preference_key)
       DO UPDATE SET preference_value = $3, updated_at = NOW()`,
      [userId, key, JSON.stringify(value)]
    );
  }

  /**
   * Bulk set multiple preferences.
   */
  static async setBulk(userId: number, prefs: Record<string, unknown>): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(prefs)) {
        await client.query(
          `INSERT INTO user_preferences (user_id, preference_key, preference_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, preference_key)
           DO UPDATE SET preference_value = $3, updated_at = NOW()`,
          [userId, key, JSON.stringify(value)]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a preference.
   */
  static async delete(userId: number, key: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM user_preferences WHERE user_id = $1 AND preference_key = $2`,
      [userId, key]
    );
    return (result.rowCount || 0) > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pinned Records — stored as preference: 'pinned:<resource>' = [id1, id2]
  // ═══════════════════════════════════════════════════════════════════════════

  static async getPinnedIds(userId: number, resourceType: string): Promise<number[]> {
    const value = await this.get(userId, `pinned:${resourceType}`);
    return Array.isArray(value) ? value : [];
  }

  static async pinRecord(userId: number, resourceType: string, resourceId: number): Promise<void> {
    const current = await this.getPinnedIds(userId, resourceType);
    if (!current.includes(resourceId)) {
      current.unshift(resourceId); // Add to front
      if (current.length > 20) current.length = 20; // Max 20 pins
      await this.set(userId, `pinned:${resourceType}`, current);
    }
  }

  static async unpinRecord(userId: number, resourceType: string, resourceId: number): Promise<void> {
    const current = await this.getPinnedIds(userId, resourceType);
    const filtered = current.filter(id => id !== resourceId);
    await this.set(userId, `pinned:${resourceType}`, filtered);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Column Visibility — stored as: 'table:<tableName>:columns' = { visible: [...], order: [...] }
  // ═══════════════════════════════════════════════════════════════════════════

  static async getTableColumns(userId: number, tableName: string): Promise<{ visible: string[]; order: string[] } | null> {
    const value = await this.get(userId, `table:${tableName}:columns`);
    return value as { visible: string[]; order: string[] } | null;
  }

  static async setTableColumns(userId: number, tableName: string, config: { visible: string[]; order: string[] }): Promise<void> {
    await this.set(userId, `table:${tableName}:columns`, config);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §13.2.12 — Recent Items Service
// ═══════════════════════════════════════════════════════════════════════════════

export class RecentItemsService {
  /**
   * Record that a user accessed a resource.
   * Deduplicates: if the same resource was recently accessed, updates the timestamp.
   */
  static async track(params: {
    userId: number;
    tenantId: number | null;
    resourceType: string;
    resourceId: number;
    resourceLabel: string;
  }): Promise<void> {
    // Upsert-like: delete old entry for same resource, then insert
    await pool.query(
      `DELETE FROM user_recent_items
       WHERE user_id = $1 AND resource_type = $2 AND resource_id = $3`,
      [params.userId, params.resourceType, params.resourceId]
    );
    await pool.query(
      `INSERT INTO user_recent_items (user_id, tenant_id, resource_type, resource_id, resource_label)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.userId, params.tenantId, params.resourceType, params.resourceId, params.resourceLabel]
    );
  }

  /**
   * Get last N recent items for a user.
   */
  static async list(userId: number, limit: number = 10): Promise<Array<{
    resource_type: string;
    resource_id: number;
    resource_label: string;
    accessed_at: string;
  }>> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const result = await pool.query(
      `SELECT resource_type, resource_id, resource_label, accessed_at
       FROM user_recent_items
       WHERE user_id = $1
       ORDER BY accessed_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows;
  }

  /**
   * Clear all recent items for a user.
   */
  static async clear(userId: number): Promise<void> {
    await pool.query(`DELETE FROM user_recent_items WHERE user_id = $1`, [userId]);
  }
}
