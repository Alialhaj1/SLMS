/**
 * §13.3.12 — Tenant Data Export Service (GDPR-style)
 *
 * Allows tenants to export all their data.
 * Produces a JSON archive of all tenant-scoped tables.
 * Supports partial or full export.
 */

import pool from '../db';
import { logger } from '../utils/logger';

// Tables that have tenant_id column and should be included in export
const TENANT_TABLES = [
  'users',
  'companies',
  'branches',
  'shipments',
  'vendors',
  'customers',
  'items',
  'purchase_orders',
  'invoices',
  'audit_logs',
  'documents',
  'email_send_log',
  'user_preferences',
  'user_recent_items',
  'scheduled_reports',
  'tenant_usage_analytics',
  'tenant_ip_whitelists',
  'login_anomaly_events',
] as const;

interface ExportResult {
  tenant_id: number;
  exported_at: string;
  tables: Record<string, { count: number; data: unknown[] }>;
  total_records: number;
}

export class TenantDataExportService {
  /**
   * Export all data for a tenant.
   * WARNING: Can be very large — use with caution.
   */
  static async exportAll(tenantId: number): Promise<ExportResult> {
    const exportData: ExportResult = {
      tenant_id: tenantId,
      exported_at: new Date().toISOString(),
      tables: {},
      total_records: 0,
    };

    for (const table of TENANT_TABLES) {
      try {
        // Check if table exists and has tenant_id column
        const checkResult = await pool.query(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = $1 AND column_name = 'tenant_id'
          ) AS has_column`,
          [table]
        );

        if (!checkResult.rows[0]?.has_column) continue;

        const result = await pool.query(
          `SELECT * FROM "${table}" WHERE tenant_id = $1 ORDER BY id LIMIT 50000`,
          [tenantId]
        );

        exportData.tables[table] = {
          count: result.rows.length,
          data: result.rows,
        };
        exportData.total_records += result.rows.length;
      } catch (err) {
        // Table might not exist yet — skip
        logger.debug('Skipping table in export', { table, error: err });
      }
    }

    logger.info('Tenant data export completed', {
      tenantId,
      tables: Object.keys(exportData.tables).length,
      totalRecords: exportData.total_records,
    });

    return exportData;
  }

  /**
   * Export specific tables for a tenant.
   */
  static async exportTables(tenantId: number, tableNames: string[]): Promise<ExportResult> {
    const exportData: ExportResult = {
      tenant_id: tenantId,
      exported_at: new Date().toISOString(),
      tables: {},
      total_records: 0,
    };

    for (const table of tableNames) {
      // Security: only allow known tables
      if (!TENANT_TABLES.includes(table as typeof TENANT_TABLES[number])) {
        logger.warn('Attempted export of non-allowed table', { tenantId, table });
        continue;
      }

      try {
        const result = await pool.query(
          `SELECT * FROM "${table}" WHERE tenant_id = $1 ORDER BY id LIMIT 50000`,
          [tenantId]
        );
        exportData.tables[table] = {
          count: result.rows.length,
          data: result.rows,
        };
        exportData.total_records += result.rows.length;
      } catch (err) {
        logger.debug('Failed to export table', { table, error: err });
      }
    }

    return exportData;
  }

  /**
   * Get an overview of what data exists for a tenant (counts only).
   */
  static async getDataOverview(tenantId: number): Promise<Record<string, number>> {
    const overview: Record<string, number> = {};

    for (const table of TENANT_TABLES) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*)::int AS count FROM "${table}" WHERE tenant_id = $1`,
          [tenantId]
        );
        const count = result.rows[0]?.count || 0;
        if (count > 0) {
          overview[table] = count;
        }
      } catch {
        // Skip tables that don't exist
      }
    }

    return overview;
  }

  /**
   * Get the list of exportable tables.
   */
  static getExportableTables(): string[] {
    return [...TENANT_TABLES];
  }
}
