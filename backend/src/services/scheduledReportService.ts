/**
 * §13.3.9 — Scheduled Reports Service
 *
 * Manages scheduled report definitions stored in `scheduled_reports` table.
 * Each report has a cron expression defining when it runs.
 * The actual cron runner calls `processScheduledReports()` periodically.
 *
 * Report delivery: placeholder — in production, renders report data
 * and sends via email or stores as downloadable file.
 */

import pool from '../db';
import { logger } from '../utils/logger';

export interface ScheduledReportInput {
  name: string;
  report_type: string;
  schedule_cron: string;
  parameters?: Record<string, unknown>;
  delivery_method: 'email' | 'download' | 'webhook';
  delivery_target: string;
  format?: 'pdf' | 'excel' | 'csv';
  tenant_id: number | null;
  created_by: number;
}

export class ScheduledReportService {
  /**
   * List all scheduled reports for a tenant.
   */
  static async list(tenantId: number | null, page: number = 1, limit: number = 20): Promise<{ rows: unknown[]; total: number }> {
    const offset = (page - 1) * limit;
    const tenantFilter = tenantId ? `WHERE tenant_id = $3` : `WHERE tenant_id IS NULL`;
    const params: unknown[] = [limit, offset];
    if (tenantId) params.push(tenantId);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM scheduled_reports ${tenantFilter} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM scheduled_reports ${tenantFilter}`,
        tenantId ? [tenantId] : []
      ),
    ]);

    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  /**
   * Get a single scheduled report by ID.
   */
  static async getById(id: number, tenantId: number | null): Promise<unknown | null> {
    const params: unknown[] = [id];
    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const result = await pool.query(
      `SELECT * FROM scheduled_reports WHERE id = $1${tenantFilter}`,
      params
    );
    return result.rows[0] || null;
  }

  /**
   * Create a scheduled report.
   */
  static async create(data: ScheduledReportInput): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO scheduled_reports (name, report_type, schedule_cron, parameters, delivery_method, delivery_target, format, tenant_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.name,
        data.report_type,
        data.schedule_cron,
        JSON.stringify(data.parameters || {}),
        data.delivery_method,
        data.delivery_target,
        data.format || 'pdf',
        data.tenant_id,
        data.created_by,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update a scheduled report.
   */
  static async update(id: number, data: Partial<ScheduledReportInput>, tenantId: number | null): Promise<unknown | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const updatable = ['name', 'report_type', 'schedule_cron', 'delivery_method', 'delivery_target', 'format', 'is_active'] as const;
    for (const key of updatable) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }
    if (data.parameters !== undefined) {
      fields.push(`parameters = $${idx++}`);
      params.push(JSON.stringify(data.parameters));
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    params.push(id);
    const idIdx = idx;
    let tenantFilter = '';
    if (tenantId) {
      params.push(tenantId);
      tenantFilter = ` AND tenant_id = $${idx + 1}`;
    }

    const result = await pool.query(
      `UPDATE scheduled_reports SET ${fields.join(', ')} WHERE id = $${idIdx}${tenantFilter} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a scheduled report.
   */
  static async delete(id: number, tenantId: number | null): Promise<boolean> {
    const params: unknown[] = [id];
    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const result = await pool.query(
      `DELETE FROM scheduled_reports WHERE id = $1${tenantFilter}`,
      params
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Toggle active status.
   */
  static async toggleActive(id: number, tenantId: number | null): Promise<unknown | null> {
    const params: unknown[] = [id];
    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const result = await pool.query(
      `UPDATE scheduled_reports SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1${tenantFilter} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  }

  /**
   * Get reports that are due to run (based on schedule_cron and last_run_at).
   * Called by the cron processor.
   *
   * Simple approach: gets all active reports where last_run_at is older than
   * the expected interval. For a real cron parser, use `cron-parser` package.
   */
  static async getDueReports(): Promise<unknown[]> {
    // Simplified: get active reports that haven't run in the last hour
    // In production, parse cron expressions to determine exact due time
    const result = await pool.query(
      `SELECT * FROM scheduled_reports
       WHERE is_active = true
         AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '1 hour')
       ORDER BY last_run_at NULLS FIRST
       LIMIT 50`
    );
    return result.rows;
  }

  /**
   * Mark a report as having run.
   */
  static async markRun(id: number): Promise<void> {
    await pool.query(
      `UPDATE scheduled_reports SET last_run_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  /**
   * Process all due scheduled reports (called by cron job).
   */
  static async processScheduledReports(): Promise<number> {
    const dueReports = await this.getDueReports();
    let processed = 0;

    for (const report of dueReports as Array<{ id: number; name: string; report_type: string; delivery_method: string; delivery_target: string }>) {
      try {
        // Placeholder: generate report data and deliver
        logger.info('Processing scheduled report', { id: report.id, name: report.name, type: report.report_type });

        // TODO: Integrate with actual report generation
        // - Query data based on report_type and parameters
        // - Render to PDF/Excel/CSV using pdfExportService
        // - Deliver via email/webhook based on delivery_method

        await this.markRun(report.id);
        processed++;
      } catch (err) {
        logger.error('Failed to process scheduled report', { id: report.id, error: err });
      }
    }

    return processed;
  }
}
