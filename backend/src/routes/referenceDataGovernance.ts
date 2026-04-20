/**
 * Reference Data Governance API
 * ==============================
 * Provides monitoring and management of reference data quality:
 *   - Coverage analysis: how complete is each table?
 *   - Duplicate detection: find potential duplicates in reference data
 *   - Suggestions: recommend missing standard data
 *   - Import pipeline: bulk import reference data
 *
 * Part of §7 Master Data Strategy.
 *
 * Routes:
 *   GET  /coverage               — Coverage report across all reference tables
 *   GET  /duplicates/:tableName  — Detect duplicates in a specific table
 *   GET  /suggestions            — Missing data suggestions
 *   POST /import/:tableName      — Bulk import records into a reference table
 *   GET  /audit-trail            — Reference data change audit trail
 */
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import { auditLog } from '../middleware/auditLog';
import { logger } from '../utils/logger';

const router = Router();

/** Tables the governance API can inspect */
const GOVERNED_TABLES = [
  'countries', 'time_zones', 'system_languages', 'currencies', 'ui_themes',
  'contact_methods', 'record_statuses', 'request_statuses',
  'supplier_types', 'address_types', 'contact_types',
  'customer_types', 'supply_terms', 'delivery_terms',
  'contract_types', 'unit_types', 'warehouse_types',
  'tracking_policies', 'shipment_types', 'container_types',
  'incoterms', 'bill_of_lading_types', 'insurance_types',
  'shipment_categories',
];

/**
 * GET /coverage
 * Coverage report: expected vs actual record counts for each reference table
 */
router.get('/coverage', authenticate, requireAnyPermission(['master_data:catalog:view', 'master_data:health']), async (req: Request, res: Response) => {
  try {
    const coverage = [];
    let totalExpected = 0;
    let totalActual = 0;

    for (const table of GOVERNED_TABLES) {
      // Get expected from catalog
      let expected = 0;
      try {
        const catResult = await pool.query(
          `SELECT expected_minimum_records FROM master_data_catalog
           WHERE table_name = $1 AND deleted_at IS NULL`,
          [table]
        );
        if (catResult.rows.length > 0) {
          expected = parseInt(catResult.rows[0].expected_minimum_records, 10) || 0;
        }
      } catch { /* catalog might not exist yet */ }

      // Get actual count
      let actual = 0;
      let tableExists = true;
      try {
        const countResult = await pool.query(
          `SELECT COUNT(*) as cnt FROM "${table}" WHERE deleted_at IS NULL`
        );
        actual = parseInt(countResult.rows[0].cnt, 10);
      } catch {
        tableExists = false;
      }

      const coveragePct = expected > 0 ? Math.round((actual / expected) * 100) : (actual > 0 ? 100 : 0);

      totalExpected += expected;
      totalActual += actual;

      coverage.push({
        table,
        table_exists: tableExists,
        expected_records: expected,
        actual_records: actual,
        coverage_percent: coveragePct,
        status: !tableExists ? 'MISSING'
              : actual === 0 ? 'EMPTY'
              : actual < expected ? 'INCOMPLETE'
              : 'COMPLETE',
      });
    }

    sendSuccess(res, {
      summary: {
        total_tables: GOVERNED_TABLES.length,
        tables_complete: coverage.filter(c => c.status === 'COMPLETE').length,
        tables_incomplete: coverage.filter(c => c.status === 'INCOMPLETE').length,
        tables_empty: coverage.filter(c => c.status === 'EMPTY').length,
        tables_missing: coverage.filter(c => c.status === 'MISSING').length,
        overall_coverage: totalExpected > 0
          ? Math.round((totalActual / totalExpected) * 100)
          : 0,
      },
      tables: coverage,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to generate coverage report', error);
    sendError(res, 'COVERAGE_FAILED', 'Failed to generate coverage report', 500);
  }
});

/**
 * GET /duplicates/:tableName
 * Detect potential duplicates in a reference table (by name_en similarity)
 */
router.get('/duplicates/:tableName', authenticate, requirePermission('master_data:catalog:view'), async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;

    // Validate table name against allowed list
    if (!GOVERNED_TABLES.includes(tableName)) {
      return sendError(res, 'INVALID_TABLE', `Table '${tableName}' is not a governed reference table`, 400);
    }

    // Check if table has name_en column
    const colCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       AND column_name IN ('name_en', 'code')
       ORDER BY column_name`,
      [tableName]
    );

    const columns = colCheck.rows.map((r: any) => r.column_name);

    if (!columns.includes('name_en') && !columns.includes('code')) {
      return sendSuccess(res, {
        table: tableName,
        duplicates: [],
        message: 'Table does not have name_en or code columns for duplicate detection',
      });
    }

    const duplicates: any[] = [];

    // Check for exact code duplicates (within active records)
    if (columns.includes('code')) {
      const codeDups = await pool.query(
        `SELECT code, COUNT(*) as count
         FROM "${tableName}"
         WHERE deleted_at IS NULL
         GROUP BY code
         HAVING COUNT(*) > 1
         ORDER BY count DESC`
      );
      for (const dup of codeDups.rows) {
        duplicates.push({
          type: 'EXACT_CODE',
          value: dup.code,
          count: parseInt(dup.count, 10),
        });
      }
    }

    // Check for exact name_en duplicates
    if (columns.includes('name_en')) {
      const nameDups = await pool.query(
        `SELECT name_en, COUNT(*) as count
         FROM "${tableName}"
         WHERE deleted_at IS NULL
         GROUP BY name_en
         HAVING COUNT(*) > 1
         ORDER BY count DESC`
      );
      for (const dup of nameDups.rows) {
        duplicates.push({
          type: 'EXACT_NAME',
          value: dup.name_en,
          count: parseInt(dup.count, 10),
        });
      }

      // Check for near-duplicates (case-insensitive)
      const nearDups = await pool.query(
        `SELECT LOWER(TRIM(name_en)) as normalized, COUNT(*) as count,
                ARRAY_AGG(name_en) as variants
         FROM "${tableName}"
         WHERE deleted_at IS NULL
         GROUP BY LOWER(TRIM(name_en))
         HAVING COUNT(*) > 1
         ORDER BY count DESC`
      );
      for (const dup of nearDups.rows) {
        duplicates.push({
          type: 'NEAR_DUPLICATE',
          normalized: dup.normalized,
          variants: dup.variants,
          count: parseInt(dup.count, 10),
        });
      }
    }

    sendSuccess(res, {
      table: tableName,
      total_duplicates: duplicates.length,
      duplicates,
    });
  } catch (error: any) {
    logger.error(`Failed to detect duplicates in ${req.params.tableName}`, error);
    sendError(res, 'DUPLICATE_DETECTION_FAILED', 'Failed to detect duplicates', 500);
  }
});

/**
 * GET /suggestions
 * Recommend missing data based on catalog expectations vs reality
 */
router.get('/suggestions', authenticate, requirePermission('master_data:catalog:view'), async (req: Request, res: Response) => {
  try {
    const suggestions: any[] = [];

    for (const table of GOVERNED_TABLES) {
      let catalogEntry: any = null;
      try {
        const catResult = await pool.query(
          `SELECT * FROM master_data_catalog WHERE table_name = $1 AND deleted_at IS NULL`,
          [table]
        );
        catalogEntry = catResult.rows[0] || null;
      } catch { /* catalog might not be populated */ }

      if (!catalogEntry) {
        suggestions.push({
          table,
          severity: 'WARNING',
          suggestion: 'Table not registered in master_data_catalog. Add catalog entry.',
          type: 'MISSING_CATALOG_ENTRY',
        });
        continue;
      }

      // Check actual record count
      let actualCount = 0;
      try {
        const countResult = await pool.query(
          `SELECT COUNT(*) as cnt FROM "${table}" WHERE deleted_at IS NULL`
        );
        actualCount = parseInt(countResult.rows[0].cnt, 10);
      } catch {
        suggestions.push({
          table,
          severity: 'CRITICAL',
          suggestion: 'Table does not exist in database. Create it via migration.',
          type: 'TABLE_MISSING',
        });
        continue;
      }

      if (actualCount === 0) {
        suggestions.push({
          table,
          severity: 'HIGH',
          suggestion: `Table is empty. Expected at least ${catalogEntry.expected_minimum_records} records. Seed initial data.`,
          type: 'EMPTY_TABLE',
          expected: catalogEntry.expected_minimum_records,
        });
      } else if (actualCount < catalogEntry.expected_minimum_records) {
        suggestions.push({
          table,
          severity: 'MEDIUM',
          suggestion: `Table has ${actualCount} records but ${catalogEntry.expected_minimum_records} expected. Add missing records.`,
          type: 'BELOW_EXPECTED',
          actual: actualCount,
          expected: catalogEntry.expected_minimum_records,
        });
      }

      // Check for inactive records ratio
      try {
        const inactiveResult = await pool.query(
          `SELECT COUNT(*) as cnt FROM "${table}" WHERE deleted_at IS NULL AND is_active = FALSE`
        );
        const inactiveCount = parseInt(inactiveResult.rows[0].cnt, 10);
        if (actualCount > 0 && inactiveCount / actualCount > 0.5) {
          suggestions.push({
            table,
            severity: 'LOW',
            suggestion: `${Math.round((inactiveCount / actualCount) * 100)}% of records are inactive. Review and clean up.`,
            type: 'HIGH_INACTIVE_RATIO',
            active: actualCount - inactiveCount,
            inactive: inactiveCount,
          });
        }
      } catch { /* is_active column might not exist */ }
    }

    // Sort by severity
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, WARNING: 3, LOW: 4 };
    suggestions.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

    sendSuccess(res, {
      total_suggestions: suggestions.length,
      by_severity: {
        critical: suggestions.filter(s => s.severity === 'CRITICAL').length,
        high: suggestions.filter(s => s.severity === 'HIGH').length,
        medium: suggestions.filter(s => s.severity === 'MEDIUM').length,
        warning: suggestions.filter(s => s.severity === 'WARNING').length,
        low: suggestions.filter(s => s.severity === 'LOW').length,
      },
      suggestions,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to generate suggestions', error);
    sendError(res, 'SUGGESTIONS_FAILED', 'Failed to generate suggestions', 500);
  }
});

/**
 * POST /import/:tableName
 * Bulk import records into a governed reference table.
 * Accepts JSON array of { code, name_en, name_ar, ... }
 */
router.post('/import/:tableName', authenticate, requirePermission('master_data:catalog:edit'), auditLog, async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { records } = req.body;

    if (!GOVERNED_TABLES.includes(tableName)) {
      return sendError(res, 'INVALID_TABLE', `Table '${tableName}' is not a governed reference table`, 400);
    }

    if (!Array.isArray(records) || records.length === 0) {
      return sendError(res, 'INVALID_RECORDS', 'Request body must contain a non-empty "records" array', 400);
    }

    if (records.length > 100) {
      return sendError(res, 'TOO_MANY_RECORDS', 'Maximum 100 records per import batch', 400);
    }

    // Get table columns to validate input
    const colResult = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       AND column_name NOT IN ('id', 'created_at', 'updated_at', 'deleted_at')
       ORDER BY ordinal_position`,
      [tableName]
    );
    const validColumns = colResult.rows.map((r: any) => r.column_name);

    const client = await pool.connect();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      await client.query('BEGIN');

      for (const record of records) {
        // Filter to valid columns only
        const cols: string[] = [];
        const vals: any[] = [];
        let paramIdx = 1;

        for (const col of validColumns) {
          if (record[col] !== undefined) {
            cols.push(col);
            vals.push(record[col]);
            paramIdx++;
          }
        }

        if (cols.length === 0) {
          skipped++;
          errors.push(`Record skipped: no valid columns found`);
          continue;
        }

        // Check for code uniqueness if code column is present
        if (record.code && validColumns.includes('code')) {
          const existing = await client.query(
            `SELECT id FROM "${tableName}" WHERE code = $1 AND deleted_at IS NULL`,
            [record.code]
          );
          if (existing.rows.length > 0) {
            skipped++;
            errors.push(`Record with code '${record.code}' already exists`);
            continue;
          }
        }

        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.map(c => `"${c}"`).join(', ');

        await client.query(
          `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`,
          vals
        );
        imported++;
      }

      await client.query('COMMIT');

      // Update catalog record count
      try {
        await pool.query(
          `UPDATE master_data_catalog
           SET record_count_global = (SELECT COUNT(*) FROM "${tableName}" WHERE deleted_at IS NULL),
               updated_at = NOW()
           WHERE table_name = $1`,
          [tableName]
        );
      } catch { /* catalog update failure is non-critical */ }

      sendSuccess(res, {
        table: tableName,
        total_submitted: records.length,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }, 200, undefined, `Imported ${imported} records`);

    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error(`Failed to import records into ${req.params.tableName}`, error);
    sendError(res, 'IMPORT_FAILED', 'Failed to import records', 500);
  }
});

/**
 * GET /audit-trail
 * Reference data change audit trail from audit_logs table
 */
router.get('/audit-trail', authenticate, requirePermission('master_data:catalog:view'), async (req: Request, res: Response) => {
  try {
    const { table_name, limit: rawLimit, offset: rawOffset } = req.query;
    const limit = Math.min(parseInt(rawLimit as string, 10) || 25, 100);
    const offset = parseInt(rawOffset as string, 10) || 0;

    let query = `
      SELECT al.id, al.entity_type, al.action, al.entity_id,
             al.changes, al.user_id, al.created_at,
             u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.entity_type = ANY($1)
    `;
    const params: any[] = [GOVERNED_TABLES];
    let paramIdx = 2;

    if (table_name && typeof table_name === 'string') {
      query += ` AND al.entity_type = $${paramIdx}`;
      params.push(table_name);
      paramIdx++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    sendSuccess(res, {
      total: result.rows.length,
      limit,
      offset,
      audit_trail: result.rows,
    });
  } catch (error: any) {
    logger.error('Failed to fetch reference data audit trail', error);
    sendError(res, 'AUDIT_TRAIL_FAILED', 'Failed to fetch audit trail', 500);
  }
});

export default router;
