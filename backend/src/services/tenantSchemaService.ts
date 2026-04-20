/**
 * ============================================================
 * Tenant Schema Service
 * ============================================================
 * Architecture Document §3: عزل البيانات — Multi-Tenancy
 *
 * Manages the lifecycle of per-tenant PostgreSQL schemas:
 *   - Provisioning (CREATE SCHEMA + table cloning + seeding)
 *   - Validation (integrity checks)
 *   - Suspension / archival / deletion
 *   - Schema-name resolution for routing
 *
 * Works with:
 *   - Migration 404 SQL functions (provision_tenant_schema, etc.)
 *   - SchemaRouter middleware (sets search_path per request)
 *   - TenantPool (connection-level schema routing)
 * ============================================================
 */

import pool from '../db';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
export interface SchemaProvisionResult {
  schema: string;
  tables_created: number;
  fks_created: number;
  sequences_reset: number;
  errors: string[];
}

export interface SchemaSeedResult {
  [key: string]: number | string; // e.g. { currencies: 5, payment_terms: 6 }
}

export interface TenantSchemaRecord {
  id: number;
  tenant_id: number;
  tenant_code: string;
  schema_name: string;
  status: string;
  table_count: number;
  provisioned_at: string | null;
  last_migrated_at: string | null;
  schema_version: number;
  metadata: Record<string, unknown>;
}

export interface SchemaTableStatus {
  table_name: string;
  status: 'ok' | 'missing';
}

export interface SchemaTableRow {
  table_name: string;
  row_count: number;
}

// ────────────────────────────────────────────
// In-memory cache for schema name lookups
// tenant_id → schema_name
// TTL: 5 minutes (schemas rarely change)
// ────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;
const schemaCache = new Map<number, { schemaName: string; expiresAt: number }>();

function getCached(tenantId: number): string | null {
  const entry = schemaCache.get(tenantId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    schemaCache.delete(tenantId);
    return null;
  }
  return entry.schemaName;
}

function setCache(tenantId: number, schemaName: string): void {
  schemaCache.set(tenantId, {
    schemaName,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export class TenantSchemaService {
  // ──────────────────────────────────────────
  // Schema Resolution
  // ──────────────────────────────────────────

  /**
   * Resolve the active schema name for a tenant.
   * Uses an in-memory cache (5 min TTL) to avoid DB hits on every request.
   *
   * @returns Schema name (e.g. "tenant_haj") or null if not provisioned
   */
  static async resolveSchemaName(tenantId: number): Promise<string | null> {
    // Check cache first
    const cached = getCached(tenantId);
    if (cached) return cached;

    const result = await pool.query(
      `SELECT schema_name FROM public.tenant_schemas
       WHERE tenant_id = $1 AND status = 'active'
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) return null;

    const schemaName = result.rows[0].schema_name;
    setCache(tenantId, schemaName);
    return schemaName;
  }

  /**
   * Resolve schema by tenant code (company_code).
   */
  static async resolveByCode(tenantCode: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT schema_name, tenant_id FROM public.tenant_schemas
       WHERE tenant_code = $1 AND status = 'active'
       LIMIT 1`,
      [tenantCode.toLowerCase()]
    );

    if (result.rows.length === 0) return null;

    const { schema_name, tenant_id } = result.rows[0];
    setCache(tenant_id, schema_name);
    return schema_name;
  }

  /**
   * Invalidate cached schema name for a tenant.
   */
  static invalidateCache(tenantId: number): void {
    schemaCache.delete(tenantId);
  }

  /**
   * Clear entire schema cache (for admin / testing).
   */
  static clearCache(): void {
    schemaCache.clear();
  }

  // ──────────────────────────────────────────
  // Schema Provisioning
  // ──────────────────────────────────────────

  /**
   * Provision a new tenant schema.
   * Creates the schema, clones all tenant tables, recreates FKs,
   * resets sequences, and records in tracking table.
   *
   * @param tenantCode  Company code (e.g. "HAJ")
   * @param tenantId    tenants.id
   * @returns Provisioning result with table/FK counts and any errors
   */
  static async provisionSchema(
    tenantCode: string,
    tenantId: number
  ): Promise<SchemaProvisionResult> {
    const result = await pool.query(
      `SELECT public.provision_tenant_schema($1, $2) AS result`,
      [tenantCode, tenantId]
    );

    const provisionResult: SchemaProvisionResult = result.rows[0].result;

    // Log to audit
    try {
      await pool.query(
        `INSERT INTO audit.platform_logs (action, resource, resource_id, tenant_id, after_data)
         VALUES ('schema_provisioned', 'tenant_schema', $1, $2, $3)`,
        [provisionResult.schema, tenantId, JSON.stringify(provisionResult)]
      );
    } catch (auditErr) {
      console.error('[TenantSchemaService] Audit log failed:', auditErr);
    }

    console.log(
      `[TenantSchemaService] Provisioned ${provisionResult.schema}: ` +
      `${provisionResult.tables_created} tables, ${provisionResult.fks_created} FKs, ` +
      `${provisionResult.sequences_reset} sequences reset` +
      (provisionResult.errors?.length ? `, ${provisionResult.errors.length} errors` : '')
    );

    return provisionResult;
  }

  /**
   * Seed a provisioned tenant schema with initial data.
   *
   * @param schemaName  Schema name (e.g. "tenant_haj")
   * @param tenantId    tenants.id
   * @param companyId   companies.id
   * @param countryCode ISO 3166 country code (default "SAU")
   */
  static async seedSchema(
    schemaName: string,
    tenantId: number,
    companyId: number,
    countryCode: string = 'SAU'
  ): Promise<SchemaSeedResult> {
    const result = await pool.query(
      `SELECT public.seed_tenant_schema($1, $2, $3, $4) AS result`,
      [schemaName, tenantId, companyId, countryCode]
    );

    const seedResult: SchemaSeedResult = result.rows[0].result;

    console.log(
      `[TenantSchemaService] Seeded ${schemaName}:`,
      JSON.stringify(seedResult)
    );

    return seedResult;
  }

  /**
   * Full provisioning: create schema + seed data.
   * Convenience method that combines provisionSchema + seedSchema.
   */
  static async fullProvision(
    tenantCode: string,
    tenantId: number,
    companyId: number,
    countryCode: string = 'SAU'
  ): Promise<{ provision: SchemaProvisionResult; seed: SchemaSeedResult }> {
    const provision = await TenantSchemaService.provisionSchema(tenantCode, tenantId);
    const seed = await TenantSchemaService.seedSchema(
      provision.schema,
      tenantId,
      companyId,
      countryCode
    );

    // Invalidate cache so next request picks up the new schema
    TenantSchemaService.invalidateCache(tenantId);

    return { provision, seed };
  }

  // ──────────────────────────────────────────
  // Schema Management
  // ──────────────────────────────────────────

  /**
   * Drop a tenant schema (with safety checks).
   * By default, only allows dropping archived/suspended schemas.
   * Use force=true to override (DANGER).
   */
  static async dropSchema(
    tenantCode: string,
    force: boolean = false
  ): Promise<{ schema: string; status: string; error?: string }> {
    const result = await pool.query(
      `SELECT public.drop_tenant_schema($1, $2) AS result`,
      [tenantCode, force]
    );

    const dropResult = result.rows[0].result;

    if (dropResult.error) {
      console.error(`[TenantSchemaService] Drop failed: ${dropResult.error}`);
    } else {
      console.log(`[TenantSchemaService] Dropped schema for ${tenantCode}`);
      // Clear cache
      const cached = await pool.query(
        `SELECT tenant_id FROM tenant_schemas WHERE tenant_code = $1`,
        [tenantCode.toLowerCase()]
      );
      if (cached.rows.length) {
        TenantSchemaService.invalidateCache(cached.rows[0].tenant_id);
      }
    }

    return dropResult;
  }

  /**
   * Suspend a tenant schema (sets status, does NOT drop it).
   */
  static async suspendSchema(tenantId: number): Promise<void> {
    await pool.query(
      `UPDATE public.tenant_schemas
       SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );
    TenantSchemaService.invalidateCache(tenantId);
  }

  /**
   * Reactivate a suspended tenant schema.
   */
  static async activateSchema(tenantId: number): Promise<void> {
    await pool.query(
      `UPDATE public.tenant_schemas
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND status IN ('suspended', 'provisioning')`,
      [tenantId]
    );
    TenantSchemaService.invalidateCache(tenantId);
  }

  // ──────────────────────────────────────────
  // Schema Validation & Introspection
  // ──────────────────────────────────────────

  /**
   * Validate that a tenant schema has all expected tables.
   * Compares against public schema (minus excluded tables).
   */
  static async validateSchema(schemaName: string): Promise<{
    valid: boolean;
    missing: string[];
    ok: string[];
  }> {
    const result = await pool.query(
      `SELECT * FROM public.validate_tenant_schema($1)`,
      [schemaName]
    );

    const missing: string[] = [];
    const ok: string[] = [];

    for (const row of result.rows) {
      if (row.status === 'missing') {
        missing.push(row.table_name);
      } else {
        ok.push(row.table_name);
      }
    }

    return { valid: missing.length === 0, missing, ok };
  }

  /**
   * Get row counts for all tables in a tenant schema.
   */
  static async getSchemaStats(schemaName: string): Promise<SchemaTableRow[]> {
    const result = await pool.query(
      `SELECT * FROM public.list_tenant_schema_tables($1)`,
      [schemaName]
    );
    return result.rows.map(r => ({
      table_name: r.table_name,
      row_count: Number(r.row_count),
    }));
  }

  /**
   * List all tenant schemas with their status.
   */
  static async listSchemas(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: TenantSchemaRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (options?.status) {
      conditions.push(`ts.status = $${idx++}`);
      params.push(options.status);
    }

    const where = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const countResult = await pool.query(
      `SELECT count(*) FROM public.tenant_schemas ts ${where}`,
      params
    );
    const total = Number(countResult.rows[0].count);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const dataResult = await pool.query(
      `SELECT ts.*, t.name AS tenant_name
       FROM public.tenant_schemas ts
       LEFT JOIN tenants t ON t.id = ts.tenant_id
       ${where}
       ORDER BY ts.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return { data: dataResult.rows, total };
  }

  /**
   * Get schema details for a specific tenant.
   */
  static async getSchemaByTenantId(tenantId: number): Promise<TenantSchemaRecord | null> {
    const result = await pool.query(
      `SELECT * FROM public.tenant_schemas WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    return result.rows[0] || null;
  }

  // ──────────────────────────────────────────
  // Cross-Schema Platform Queries
  // ──────────────────────────────────────────

  /**
   * Execute a query across ALL active tenant schemas.
   * Used by platform dashboards for aggregate statistics.
   *
   * @param queryTemplate SQL with {schema} placeholder (replaced per schema)
   * @param params Query parameters (applied to each schema query)
   * @returns Combined results from all schemas
   *
   * Example:
   *   crossSchemaQuery(
   *     'SELECT count(*) AS cnt FROM {schema}.users WHERE deleted_at IS NULL',
   *     []
   *   )
   */
  static async crossSchemaQuery<T = any>(
    queryTemplate: string,
    params: any[] = []
  ): Promise<Array<T & { _schema: string; _tenant_id: number }>> {
    const schemas = await pool.query(
      `SELECT schema_name, tenant_id FROM public.tenant_schemas WHERE status = 'active'`
    );

    const results: Array<T & { _schema: string; _tenant_id: number }> = [];

    for (const schema of schemas.rows) {
      try {
        const sql = queryTemplate.replace(/\{schema\}/g, schema.schema_name);
        const result = await pool.query(sql, params);
        for (const row of result.rows) {
          results.push({
            ...row,
            _schema: schema.schema_name,
            _tenant_id: schema.tenant_id,
          });
        }
      } catch (err) {
        console.error(
          `[TenantSchemaService] Cross-schema query failed for ${schema.schema_name}:`,
          err
        );
      }
    }

    return results;
  }
}

export default TenantSchemaService;
