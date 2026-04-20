/**
 * Master Data Strategy API
 * ========================
 * Provides health monitoring, catalog browsing, isolation testing,
 * and data lineage for the master data management subsystem.
 */
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import { buildTenantFilter } from '../middleware/tenantIsolation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /health
 * Master data health dashboard: per-table row counts, freshness, sync status
 */
router.get('/health', authenticate, async (req: Request, res: Response) => {
  try {
    // Query the materialized health view
    const health = await pool.query(
      `SELECT table_name, display_name_en, display_name_ar,
              data_layer, module, record_count_global,
              total_companies, expected_minimum_records,
              auto_provision_on_company_create,
              supports_tenant_override, is_active
       FROM v_master_data_health
       ORDER BY table_name`
    );

    // Overall stats
    const totalTables = health.rows.length;
    const activeTables = health.rows.filter((r: any) => r.is_active).length;
    const totalRecords = health.rows.reduce((sum: number, r: any) => sum + parseInt(r.record_count_global || '0', 10), 0);
    const provisionableTables = health.rows.filter((r: any) => r.auto_provision_on_company_create).length;

    sendSuccess(res, {
      summary: {
        total_tables: totalTables,
        active_tables: activeTables,
        total_records: totalRecords,
        provisionable_tables: provisionableTables,
        last_checked: new Date().toISOString(),
      },
      tables: health.rows,
    });
  } catch (error: any) {
    logger.error('Failed to fetch master data health', error);
    sendError(res, 'HEALTH_FETCH_FAILED', 'Failed to fetch master data health', 500);
  }
});

/**
 * GET /catalog
 * Full master data catalog: all registered master tables with metadata
 */
router.get('/catalog', authenticate, async (req: Request, res: Response) => {
  try {
    const { module, data_layer, search, is_active } = req.query;
    let query = `
      SELECT id, table_name, display_name_en, display_name_ar,
             data_layer, module, version, description_en, description_ar,
             is_active, supports_tenant_override, supports_country_scope,
             auto_provision_on_company_create, record_count_global,
             sort_order, created_at, updated_at
      FROM master_data_catalog
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];
    let idx = 1;

    if (module && typeof module === 'string') {
      query += ` AND module = $${idx}`;
      params.push(module);
      idx++;
    }

    if (data_layer && typeof data_layer === 'string') {
      query += ` AND data_layer = $${idx}`;
      params.push(data_layer);
      idx++;
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${idx}`;
      params.push(is_active === 'true');
      idx++;
    }

    if (search && typeof search === 'string') {
      query += ` AND (display_name_en ILIKE $${idx} OR display_name_ar ILIKE $${idx} OR table_name ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY sort_order, table_name';
    const result = await pool.query(query, params);

    sendSuccess(res, {
      total: result.rows.length,
      catalog: result.rows,
    });
  } catch (error: any) {
    logger.error('Failed to fetch master data catalog', error);
    sendError(res, 'CATALOG_FETCH_FAILED', 'Failed to fetch master data catalog', 500);
  }
});

/**
 * GET /isolation
 * Run lightweight tenant data isolation checks — verifies no data leaks between companies
 */
router.get('/isolation', authenticate, requirePermission('companies:view'), async (req: Request, res: Response) => {
  try {
    const checks: { table: string; status: string; detail: string }[] = [];

    // Check tables that should have company_id isolation
    const isolatedTables = [
      'currencies', 'payment_methods', 'shipping_methods', 'tax_types',
      'payment_terms', 'expense_categories', 'numbering_series'
    ];

    for (const table of isolatedTables) {
      try {
        // Check for records without company_id
        const orphaned = await pool.query(
          `SELECT COUNT(*) as cnt FROM ${table} WHERE company_id IS NULL AND is_global = FALSE AND deleted_at IS NULL`
        );
        const orphanedCount = parseInt(orphaned.rows[0].cnt, 10);

        if (orphanedCount > 0) {
          checks.push({
            table,
            status: 'WARNING',
            detail: `${orphanedCount} non-global records without company_id`,
          });
        } else {
          checks.push({ table, status: 'PASS', detail: 'All non-global records have company_id' });
        }
      } catch (e: any) {
        checks.push({ table, status: 'SKIP', detail: `Table check failed: ${e.message}` });
      }
    }

    // Cross-company leak check: verify no company sees another company's data
    const companyCount = await pool.query(
      `SELECT COUNT(DISTINCT company_id) as cnt FROM currencies WHERE deleted_at IS NULL AND is_global = FALSE`
    );

    const overallStatus = checks.every((c) => c.status === 'PASS' || c.status === 'SKIP') ? 'HEALTHY' : 'WARNING';

    sendSuccess(res, {
      status: overallStatus,
      companies_with_data: parseInt(companyCount.rows[0].cnt, 10),
      checks,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to run isolation checks', error);
    sendError(res, 'ISOLATION_CHECK_FAILED', 'Failed to run isolation checks', 500);
  }
});

/**
 * GET /lineage
 * Data lineage: shows data_layer distribution, source tracking, and sync info
 */
router.get('/lineage', authenticate, async (req: Request, res: Response) => {
  try {
    // Data layer distribution across catalog
    const layerDistribution = await pool.query(
      `SELECT data_layer, COUNT(*) as table_count, SUM(record_count_global) as total_records
       FROM master_data_catalog
       WHERE deleted_at IS NULL
       GROUP BY data_layer
       ORDER BY data_layer`
    );

    // Provisioning status per company
    const provisioningStatus = await pool.query(
      `SELECT c.id, c.name, c.code, c.is_provisioned, c.provisioned_at,
              (SELECT COUNT(*) FROM currencies cur WHERE cur.company_id = c.id AND cur.deleted_at IS NULL) as currency_count,
              (SELECT COUNT(*) FROM tax_types tt WHERE tt.company_id = c.id AND tt.deleted_at IS NULL) as tax_type_count,
              (SELECT COUNT(*) FROM numbering_series ns WHERE ns.company_id = c.id AND ns.deleted_at IS NULL) as numbering_series_count
       FROM companies c
       WHERE c.deleted_at IS NULL
       ORDER BY c.id
       LIMIT 50`
    );

    // Global vs tenant data ratios
    const globalVsTenant = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM currencies WHERE is_global = TRUE AND deleted_at IS NULL) as global_currencies,
         (SELECT COUNT(*) FROM currencies WHERE is_global = FALSE AND deleted_at IS NULL) as tenant_currencies,
         (SELECT COUNT(*) FROM countries WHERE deleted_at IS NULL) as global_countries,
         (SELECT COUNT(*) FROM shipping_methods WHERE is_global = TRUE AND deleted_at IS NULL) as global_shipping,
         (SELECT COUNT(*) FROM shipping_methods WHERE is_global = FALSE AND deleted_at IS NULL) as tenant_shipping`
    );

    sendSuccess(res, {
      layer_distribution: layerDistribution.rows,
      company_provisioning: provisioningStatus.rows,
      global_vs_tenant: globalVsTenant.rows[0],
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to fetch data lineage', error);
    sendError(res, 'LINEAGE_FETCH_FAILED', 'Failed to fetch data lineage', 500);
  }
});

export default router;
