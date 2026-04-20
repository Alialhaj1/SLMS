/**
 * Master Data Provisioning API
 * =============================
 * Provisions SEEDED-layer reference data to tenant schemas.
 * Part of §7 Master Data Strategy — handles the lifecycle of
 * copying reference data from public schema to tenant schemas.
 *
 * Routes:
 *   GET  /                  — List provisioning status per company
 *   POST /seed/:tenantCode  — Seed reference data for a specific tenant
 *   GET  /preview/:tenantCode — Preview what would be seeded
 *   POST /refresh/:tenantCode — Re-seed missing reference data
 *   GET  /catalog-summary    — Catalog summary grouped by data_layer
 */
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import { auditLog } from '../middleware/auditLog';
import { logger } from '../utils/logger';

const router = Router();

/** All SEEDED-layer tables from §7.2 */
const SEEDED_TABLES = [
  'contact_methods', 'record_statuses', 'request_statuses',
  'supplier_types', 'address_types', 'contact_types',
  'customer_types', 'supply_terms', 'delivery_terms',
  'contract_types', 'unit_types', 'warehouse_types',
  'tracking_policies', 'shipment_types', 'shipment_categories',
];

/**
 * GET /
 * List provisioning status for all active companies
 */
router.get('/', authenticate, requireAnyPermission(['master_data:provision', 'master_data:catalog:view']), async (req: Request, res: Response) => {
  try {
    const companies = await pool.query(
      `SELECT c.id, c.name, c.code, c.is_provisioned, c.provisioned_at,
              c.tenant_code, c.created_at
       FROM companies c
       WHERE c.deleted_at IS NULL
       ORDER BY c.id`
    );

    const results = [];
    for (const company of companies.rows) {
      const schemaName = company.tenant_code ? `tenant_${company.tenant_code.toLowerCase()}` : null;
      let seededTables = 0;
      let totalSeededRows = 0;

      if (schemaName) {
        try {
          const schemaCheck = await pool.query(
            `SELECT COUNT(*) as cnt FROM information_schema.schemata WHERE schema_name = $1`,
            [schemaName]
          );
          if (parseInt(schemaCheck.rows[0].cnt, 10) > 0) {
            for (const table of SEEDED_TABLES) {
              try {
                const tableCheck = await pool.query(
                  `SELECT COUNT(*) as cnt FROM information_schema.tables
                   WHERE table_schema = $1 AND table_name = $2`,
                  [schemaName, table]
                );
                if (parseInt(tableCheck.rows[0].cnt, 10) > 0) {
                  const rowCount = await pool.query(
                    `SELECT COUNT(*) as cnt FROM "${schemaName}"."${table}" WHERE deleted_at IS NULL`
                  );
                  const rows = parseInt(rowCount.rows[0].cnt, 10);
                  if (rows > 0) {
                    seededTables++;
                    totalSeededRows += rows;
                  }
                }
              } catch { /* table doesn't exist in schema */ }
            }
          }
        } catch { /* schema doesn't exist */ }
      }

      results.push({
        company_id: company.id,
        company_name: company.name,
        company_code: company.code,
        tenant_code: company.tenant_code,
        schema_name: schemaName,
        is_provisioned: company.is_provisioned,
        provisioned_at: company.provisioned_at,
        seeded_tables: seededTables,
        total_seeded_tables: SEEDED_TABLES.length,
        total_seeded_rows: totalSeededRows,
        provisioning_coverage: SEEDED_TABLES.length > 0
          ? Math.round((seededTables / SEEDED_TABLES.length) * 100)
          : 0,
      });
    }

    sendSuccess(res, {
      total: results.length,
      seeded_table_names: SEEDED_TABLES,
      companies: results,
    });
  } catch (error: any) {
    logger.error('Failed to fetch provisioning status', error);
    sendError(res, 'PROVISIONING_STATUS_FAILED', 'Failed to fetch provisioning status', 500);
  }
});

/**
 * POST /seed/:tenantCode
 * Seed reference data for a specific tenant by calling seed_tenant_reference_data()
 */
router.post('/seed/:tenantCode', authenticate, requirePermission('master_data:seed'), auditLog, async (req: Request, res: Response) => {
  try {
    const { tenantCode } = req.params;

    if (!tenantCode || !/^[a-zA-Z0-9_-]+$/.test(tenantCode)) {
      return sendError(res, 'INVALID_TENANT_CODE', 'Invalid tenant code format', 400);
    }

    // Verify tenant schema exists
    const schemaName = `tenant_${tenantCode.toLowerCase()}`;
    const schemaCheck = await pool.query(
      `SELECT COUNT(*) as cnt FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName]
    );

    if (parseInt(schemaCheck.rows[0].cnt, 10) === 0) {
      return sendError(res, 'SCHEMA_NOT_FOUND', `Tenant schema ${schemaName} does not exist`, 404);
    }

    // Call the seeding function created in migration 408
    const result = await pool.query(
      `SELECT seed_tenant_reference_data($1) as result`,
      [tenantCode.toLowerCase()]
    );

    const seedResult = result.rows[0]?.result || {};

    logger.info(`Seeded reference data for tenant ${tenantCode}`, seedResult);

    sendSuccess(res, {
      tenant_code: tenantCode,
      schema: schemaName,
      seed_result: seedResult,
    }, 200, undefined, 'Reference data seeded successfully');
  } catch (error: any) {
    logger.error(`Failed to seed reference data for tenant ${req.params.tenantCode}`, error);
    sendError(res, 'SEED_FAILED', 'Failed to seed reference data', 500);
  }
});

/**
 * GET /preview/:tenantCode
 * Preview what would be seeded (dry-run) — shows public counts vs tenant counts
 */
router.get('/preview/:tenantCode', authenticate, requirePermission('master_data:provision'), async (req: Request, res: Response) => {
  try {
    const { tenantCode } = req.params;
    const schemaName = `tenant_${tenantCode.toLowerCase()}`;

    const preview = [];
    for (const table of SEEDED_TABLES) {
      let publicCount = 0;
      let tenantCount = 0;
      let tenantHasTable = false;

      try {
        const pubResult = await pool.query(
          `SELECT COUNT(*) as cnt FROM public."${table}" WHERE deleted_at IS NULL`
        );
        publicCount = parseInt(pubResult.rows[0].cnt, 10);
      } catch { /* table might not exist */ }

      try {
        const tenCheck = await pool.query(
          `SELECT COUNT(*) as cnt FROM information_schema.tables
           WHERE table_schema = $1 AND table_name = $2`,
          [schemaName, table]
        );
        tenantHasTable = parseInt(tenCheck.rows[0].cnt, 10) > 0;

        if (tenantHasTable) {
          const tenResult = await pool.query(
            `SELECT COUNT(*) as cnt FROM "${schemaName}"."${table}" WHERE deleted_at IS NULL`
          );
          tenantCount = parseInt(tenResult.rows[0].cnt, 10);
        }
      } catch { /* schema/table might not exist */ }

      preview.push({
        table,
        public_records: publicCount,
        tenant_records: tenantCount,
        tenant_has_table: tenantHasTable,
        would_seed: tenantHasTable && tenantCount === 0 ? publicCount : 0,
        status: !tenantHasTable ? 'TABLE_MISSING' :
                tenantCount > 0 ? 'ALREADY_SEEDED' : 'READY_TO_SEED',
      });
    }

    sendSuccess(res, {
      tenant_code: tenantCode,
      schema: schemaName,
      total_tables: SEEDED_TABLES.length,
      ready_to_seed: preview.filter(p => p.status === 'READY_TO_SEED').length,
      already_seeded: preview.filter(p => p.status === 'ALREADY_SEEDED').length,
      tables_missing: preview.filter(p => p.status === 'TABLE_MISSING').length,
      tables: preview,
    });
  } catch (error: any) {
    logger.error(`Failed to preview seed for tenant ${req.params.tenantCode}`, error);
    sendError(res, 'PREVIEW_FAILED', 'Failed to generate seed preview', 500);
  }
});

/**
 * POST /refresh/:tenantCode
 * Re-seed only empty tables (safe re-run — will not overwrite existing data)
 */
router.post('/refresh/:tenantCode', authenticate, requirePermission('master_data:seed'), auditLog, async (req: Request, res: Response) => {
  try {
    const { tenantCode } = req.params;

    // Uses same function — it skips non-empty tables
    const result = await pool.query(
      `SELECT seed_tenant_reference_data($1) as result`,
      [tenantCode.toLowerCase()]
    );

    const seedResult = result.rows[0]?.result || {};

    sendSuccess(res, {
      tenant_code: tenantCode,
      refresh_result: seedResult,
    }, 200, undefined, 'Reference data refreshed');
  } catch (error: any) {
    logger.error(`Failed to refresh reference data for tenant ${req.params.tenantCode}`, error);
    sendError(res, 'REFRESH_FAILED', 'Failed to refresh reference data', 500);
  }
});

/**
 * GET /catalog-summary
 * Grouped summary of all reference tables by data_layer
 */
router.get('/catalog-summary', authenticate, requirePermission('master_data:catalog:view'), async (req: Request, res: Response) => {
  try {
    const catalog = await pool.query(
      `SELECT data_layer, COUNT(*) as table_count,
              SUM(record_count_global) as total_records,
              ARRAY_AGG(table_name ORDER BY sort_order) as tables
       FROM master_data_catalog
       WHERE deleted_at IS NULL AND is_active = TRUE
       GROUP BY data_layer
       ORDER BY data_layer`
    );

    sendSuccess(res, {
      layers: catalog.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to fetch catalog summary', error);
    sendError(res, 'CATALOG_SUMMARY_FAILED', 'Failed to fetch catalog summary', 500);
  }
});

export default router;
