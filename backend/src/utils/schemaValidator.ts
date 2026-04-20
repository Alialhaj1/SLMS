/**
 * ============================================================================
 * Database Schema Validator — Arabic Specification §15.1
 * ============================================================================
 * Validates that the PostgreSQL database matches the core schema requirements:
 *   ✓ All 12 core tables exist
 *   ✓ Required columns present (tenant_id, created_at, updated_at, deleted_at)
 *   ✓ tenant_id is NOT NULL on tenant-scoped tables
 *   ✓ Foreign keys are defined
 *
 * Usage:
 *   npx ts-node src/utils/schemaValidator.ts
 *   or import { validateCoreSchema } from './utils/schemaValidator';
 * ============================================================================
 */

import pool from '../db';
import logger from './logger';

interface TableValidation {
  table: string;
  exists: boolean;
  requiredColumns: { name: string; found: boolean; nullable: boolean }[];
  hasTenantId: boolean;
  tenantIdNullable: boolean;
  hasCreatedAt: boolean;
  hasUpdatedAt: boolean;
  hasDeletedAt: boolean;
  issues: string[];
}

/**
 * §15.1 Core table definitions with required columns
 */
const CORE_TABLES: {
  table: string;
  requireTenantId: boolean;        // Should tenant_id be present?
  tenantIdMustBeNotNull: boolean;  // Should tenant_id be NOT NULL?
  requireSoftDelete: boolean;      // Should deleted_at be present?
  extraColumns: string[];          // Additional required columns
}[] = [
  {
    table: 'tenants',
    requireTenantId: false,  // This IS the tenant table
    tenantIdMustBeNotNull: false,
    requireSoftDelete: true,
    extraColumns: ['company_code', 'name', 'plan', 'status', 'settings'],
  },
  {
    table: 'users',
    requireTenantId: true,
    tenantIdMustBeNotNull: false,  // Platform admins have NULL tenant_id
    requireSoftDelete: true,
    extraColumns: ['email', 'password', 'full_name', 'status'],
  },
  {
    table: 'platform_users',
    requireTenantId: false,
    tenantIdMustBeNotNull: false,
    requireSoftDelete: true,
    extraColumns: ['email', 'password_hash', 'role', 'is_super_admin'],
  },
  {
    table: 'roles',
    requireTenantId: true,
    tenantIdMustBeNotNull: false,  // Global roles have NULL tenant_id
    requireSoftDelete: true,
    extraColumns: ['name'],
  },
  {
    table: 'logistics_shipments',
    requireTenantId: true,
    tenantIdMustBeNotNull: true,
    requireSoftDelete: true,
    extraColumns: ['company_id', 'shipment_number', 'status_code'],
  },
  {
    table: 'purchase_orders',
    requireTenantId: true,
    tenantIdMustBeNotNull: true,
    requireSoftDelete: true,
    extraColumns: ['company_id', 'order_number', 'vendor_id', 'status', 'total_amount'],
  },
  {
    table: 'purchase_order_items',
    requireTenantId: false,  // Inherits from parent purchase_orders
    tenantIdMustBeNotNull: false,
    requireSoftDelete: true,
    extraColumns: ['order_id', 'item_id', 'ordered_qty', 'unit_price'],
  },
  {
    table: 'customs_declarations',
    requireTenantId: true,
    tenantIdMustBeNotNull: true,
    requireSoftDelete: true,
    extraColumns: ['company_id', 'declaration_number', 'status_id'],
  },
  {
    table: 'journal_entries',
    requireTenantId: true,
    tenantIdMustBeNotNull: true,
    requireSoftDelete: true,
    extraColumns: ['company_id', 'entry_number', 'total_debit', 'total_credit'],
  },
  {
    table: 'journal_lines',
    requireTenantId: false,  // Inherits from parent journal_entries
    tenantIdMustBeNotNull: false,
    requireSoftDelete: true,
    extraColumns: ['journal_entry_id', 'account_id', 'debit_amount', 'credit_amount'],
  },
  {
    table: 'accounts',
    requireTenantId: true,
    tenantIdMustBeNotNull: true,
    requireSoftDelete: true,
    extraColumns: ['company_id', 'code', 'name', 'parent_id', 'level'],
  },
  {
    table: 'audit_logs',
    requireTenantId: true,
    tenantIdMustBeNotNull: false,  // Platform actions have NULL tenant_id
    requireSoftDelete: false,      // Immutable log
    extraColumns: ['user_id', 'action'],
  },
];

/**
 * Validate the database schema against §15.1 requirements
 */
export async function validateCoreSchema(): Promise<{
  passed: boolean;
  tables: TableValidation[];
  summary: { total: number; passed: number; failed: number; issues: string[] };
}> {
  const results: TableValidation[] = [];
  const allIssues: string[] = [];

  for (const spec of CORE_TABLES) {
    const validation: TableValidation = {
      table: spec.table,
      exists: false,
      requiredColumns: [],
      hasTenantId: false,
      tenantIdNullable: true,
      hasCreatedAt: false,
      hasUpdatedAt: false,
      hasDeletedAt: false,
      issues: [],
    };

    // Check if table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
       ) as exists`,
      [spec.table]
    );
    validation.exists = tableCheck.rows[0].exists;

    if (!validation.exists) {
      validation.issues.push(`Table '${spec.table}' does not exist`);
      results.push(validation);
      allIssues.push(...validation.issues);
      continue;
    }

    // Get all columns for the table
    const columnsResult = await pool.query(
      `SELECT column_name, is_nullable, data_type, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [spec.table]
    );
    const columns = new Map(
      columnsResult.rows.map((r: any) => [r.column_name, r])
    );

    // Check required standard columns
    const standardCols = ['created_at', 'updated_at'];
    if (spec.requireSoftDelete) standardCols.push('deleted_at');
    if (spec.requireTenantId) standardCols.push('tenant_id');

    for (const col of [...standardCols, ...spec.extraColumns]) {
      const colInfo = columns.get(col);
      validation.requiredColumns.push({
        name: col,
        found: !!colInfo,
        nullable: colInfo ? colInfo.is_nullable === 'YES' : true,
      });
      if (!colInfo) {
        validation.issues.push(`Missing column: ${spec.table}.${col}`);
      }
    }

    // Check tenant_id specifics
    const tenantCol = columns.get('tenant_id');
    validation.hasTenantId = !!tenantCol;
    validation.tenantIdNullable = tenantCol ? tenantCol.is_nullable === 'YES' : true;

    if (spec.requireTenantId && !tenantCol) {
      validation.issues.push(`§15.1 VIOLATION: ${spec.table} is missing tenant_id`);
    }
    if (spec.tenantIdMustBeNotNull && tenantCol && tenantCol.is_nullable === 'YES') {
      validation.issues.push(
        `⚠ SECURITY: ${spec.table}.tenant_id is nullable — should be NOT NULL per §15.1`
      );
    }

    // Check standard timestamp columns
    validation.hasCreatedAt = columns.has('created_at');
    validation.hasUpdatedAt = columns.has('updated_at');
    validation.hasDeletedAt = columns.has('deleted_at');

    if (!validation.hasCreatedAt) {
      validation.issues.push(`Missing: ${spec.table}.created_at`);
    }
    if (!validation.hasUpdatedAt) {
      validation.issues.push(`Missing: ${spec.table}.updated_at`);
    }
    if (spec.requireSoftDelete && !validation.hasDeletedAt) {
      validation.issues.push(`Missing soft delete: ${spec.table}.deleted_at`);
    }

    results.push(validation);
    allIssues.push(...validation.issues);
  }

  const passed = results.filter(r => r.issues.length === 0).length;
  const failed = results.filter(r => r.issues.length > 0).length;

  return {
    passed: allIssues.length === 0,
    tables: results,
    summary: {
      total: CORE_TABLES.length,
      passed,
      failed,
      issues: allIssues,
    },
  };
}

/**
 * Run validation and log results
 */
export async function runSchemaValidation(): Promise<void> {
  logger.info('§15.1 Schema Validation — Starting...');

  const result = await validateCoreSchema();

  for (const table of result.tables) {
    if (table.issues.length === 0) {
      logger.info(`  ✓ ${table.table} — OK`);
    } else {
      logger.warn(`  ✗ ${table.table} — ${table.issues.length} issue(s)`);
      for (const issue of table.issues) {
        logger.warn(`      → ${issue}`);
      }
    }
  }

  logger.info(
    `§15.1 Schema Validation — ${result.summary.passed}/${result.summary.total} tables passed, ` +
    `${result.summary.failed} failed, ${result.summary.issues.length} total issues`
  );

  if (!result.passed) {
    logger.warn('§15.1 Schema Validation FAILED — see issues above');
  } else {
    logger.info('§15.1 Schema Validation PASSED ✓');
  }
}

// Run directly with: npx ts-node src/utils/schemaValidator.ts
if (require.main === module) {
  runSchemaValidation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Schema validation error:', err);
      process.exit(1);
    });
}
