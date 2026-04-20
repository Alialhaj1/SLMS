/**
 * §13.3.11 — Usage Analytics Service
 *
 * Tracks per-tenant usage metrics:
 *  - API calls count
 *  - Active users count
 *  - Storage used (bytes)
 *  - Custom metric key-value pairs
 *
 * Replaces the stub `subscriptionUsage.ts` route.
 * Data stored in `tenant_usage_analytics` table (migration 413).
 */

import pool from '../db';
import { logger } from '../utils/logger';

export class UsageAnalyticsService {
  /**
   * Record a metric value for a tenant on a given date.
   * Uses upsert to accumulate within the same day.
   */
  static async recordMetric(
    tenantId: number,
    metricName: string,
    metricValue: number,
    date?: string // YYYY-MM-DD, defaults to today
  ): Promise<void> {
    const dateStr = date || new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO tenant_usage_analytics (tenant_id, metric_name, metric_value, metric_date)
       VALUES ($1, $2, $3, $4::date)
       ON CONFLICT (tenant_id, metric_name, metric_date)
       DO UPDATE SET metric_value = tenant_usage_analytics.metric_value + $3`,
      [tenantId, metricName, metricValue, dateStr]
    );
  }

  /**
   * Set a metric to an absolute value (not additive).
   */
  static async setMetric(
    tenantId: number,
    metricName: string,
    metricValue: number,
    date?: string
  ): Promise<void> {
    const dateStr = date || new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO tenant_usage_analytics (tenant_id, metric_name, metric_value, metric_date)
       VALUES ($1, $2, $3, $4::date)
       ON CONFLICT (tenant_id, metric_name, metric_date)
       DO UPDATE SET metric_value = $3`,
      [tenantId, metricName, metricValue, dateStr]
    );
  }

  /**
   * Get usage summary for a tenant (latest values of each metric).
   */
  static async getCurrentUsage(tenantId: number): Promise<Record<string, number>> {
    const result = await pool.query(
      `SELECT DISTINCT ON (metric_name) metric_name, metric_value
       FROM tenant_usage_analytics
       WHERE tenant_id = $1
       ORDER BY metric_name, metric_date DESC`,
      [tenantId]
    );

    const usage: Record<string, number> = {};
    for (const row of result.rows) {
      usage[row.metric_name] = Number(row.metric_value);
    }
    return usage;
  }

  /**
   * Get usage time series for a specific metric over a date range.
   */
  static async getTimeSeries(
    tenantId: number,
    metricName: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ date: string; value: number }>> {
    const result = await pool.query(
      `SELECT metric_date::text AS date, metric_value AS value
       FROM tenant_usage_analytics
       WHERE tenant_id = $1 AND metric_name = $2
         AND metric_date >= $3::date AND metric_date <= $4::date
       ORDER BY metric_date`,
      [tenantId, metricName, startDate, endDate]
    );
    return result.rows.map(r => ({ date: r.date, value: Number(r.value) }));
  }

  /**
   * Get aggregated usage across date range (sum, avg, max).
   */
  static async getAggregatedUsage(
    tenantId: number,
    metricName: string,
    startDate: string,
    endDate: string
  ): Promise<{ sum: number; avg: number; max: number; min: number; count: number }> {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(metric_value), 0)::numeric AS sum,
         COALESCE(AVG(metric_value), 0)::numeric AS avg,
         COALESCE(MAX(metric_value), 0)::numeric AS max,
         COALESCE(MIN(metric_value), 0)::numeric AS min,
         COUNT(*)::int AS count
       FROM tenant_usage_analytics
       WHERE tenant_id = $1 AND metric_name = $2
         AND metric_date >= $3::date AND metric_date <= $4::date`,
      [tenantId, metricName, startDate, endDate]
    );
    const row = result.rows[0];
    return {
      sum: Number(row.sum),
      avg: Number(row.avg),
      max: Number(row.max),
      min: Number(row.min),
      count: row.count,
    };
  }

  /**
   * Get all tenants' usage for a metric (platform admin view).
   */
  static async getAllTenantsUsage(metricName: string, date?: string): Promise<Array<{ tenant_id: number; value: number }>> {
    const dateStr = date || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT tenant_id, metric_value AS value
       FROM tenant_usage_analytics
       WHERE metric_name = $1 AND metric_date = $2::date
       ORDER BY metric_value DESC`,
      [metricName, dateStr]
    );
    return result.rows.map(r => ({ tenant_id: r.tenant_id, value: Number(r.value) }));
  }

  /**
   * Clean up old usage data (retain last N days).
   */
  static async purgeOldData(retainDays: number = 365): Promise<number> {
    const result = await pool.query(
      `DELETE FROM tenant_usage_analytics WHERE metric_date < NOW() - INTERVAL '1 day' * $1`,
      [retainDays]
    );
    const deleted = result.rowCount ?? 0;
    if (deleted > 0) {
      logger.info('Purged old usage analytics', { deleted, retainDays });
    }
    return deleted;
  }

  /**
   * Increment API call counter for a tenant (call from middleware).
   */
  static async incrementApiCalls(tenantId: number): Promise<void> {
    try {
      await this.recordMetric(tenantId, 'api_calls', 1);
    } catch {
      // Non-critical — don't let analytics break the request
    }
  }

  /**
   * Update active users count for a tenant (call periodically).
   */
  static async updateActiveUsersCount(tenantId: number): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS count
         FROM tenant_sessions
         WHERE tenant_id = $1 AND is_active = true AND expires_at > NOW()`,
        [tenantId]
      );
      const count = result.rows[0]?.count || 0;
      await this.setMetric(tenantId, 'active_users', count);
    } catch (err) {
      logger.debug('Failed to update active users count', { tenantId, error: err });
    }
  }
}
