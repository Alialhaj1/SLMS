/**
 * ============================================================
 * Tenant-Aware Database Pool
 * ============================================================
 * 
 * Wraps the standard pg.Pool to automatically set PostgreSQL
 * search_path for schema-per-tenant isolation on each query.
 * 
 * Architecture Document §3: عزل البيانات — Multi-Tenancy
 *
 * Strategy: Shared DB + Separate Schema per tenant
 *   Tenant request  → search_path = tenant_{code}, public
 *   Platform request → search_path = public
 * 
 * How it works:
 *   1. Before each query, reads tenant context from AsyncLocalStorage
 *   2. Acquires a dedicated connection from the pool
 *   3. Sets search_path based on tenantSchema (from schemaRouter)
 *   4. Also sets RLS session vars as defense-in-depth
 *   5. Executes the query
 *   6. Resets and releases the connection
 * 
 * Usage (drop-in replacement for pool):
 *   import { tenantPool } from '../db/tenantPool';
 *   const result = await tenantPool.query('SELECT * FROM companies');
 *   // Automatically routes to tenant schema + filters by RLS
 * 
 * For transactions:
 *   const client = await tenantPool.connect();
 *   await client.query('BEGIN');
 *   // ... queries ...
 *   await client.query('COMMIT');
 *   client.release();
 * 
 * Part of P0: Complete Data Isolation Strategy
 * ============================================================
 */

import { Pool, PoolClient, QueryResult, QueryConfig } from 'pg';
import pool from './index';
import { getCurrentTenantContext, TenantContext } from '../middleware/dataScopeInjector';

// ────────────────────────────────────────────
// Context SQL Commands
// ────────────────────────────────────────────

/**
 * Build SQL commands to set the connection context.
 * Primary: search_path for schema-per-tenant routing
 * Secondary: RLS session vars as defense-in-depth
 */
function buildSetContextSQL(ctx: TenantContext): string[] {
  const commands: string[] = [];
  
  // ── Schema Routing (Primary Isolation) ──
  if (ctx.tenantSchema) {
    // Tenant request → route to tenant schema, fall back to public for shared data
    commands.push(`SET LOCAL search_path TO ${ctx.tenantSchema}, public`);
  } else if (ctx.isPlatformAdmin) {
    // Platform admin → public only
    commands.push(`SET LOCAL search_path TO public`);
  }
  // else: no schema context → default search_path (public)

  // ── RLS Session Variables (Defense-in-Depth) ──
  if (ctx.isPlatformAdmin) {
    commands.push(`SET LOCAL app.tenant_id = '0'`);
    commands.push(`SET LOCAL app.is_platform_admin = 'true'`);
  } else if (ctx.tenantId) {
    commands.push(`SET LOCAL app.tenant_id = '${ctx.tenantId}'`);
    commands.push(`SET LOCAL app.is_platform_admin = 'false'`);
  }
  
  if (ctx.companyId) {
    commands.push(`SET LOCAL app.company_id = '${ctx.companyId}'`);
  }
  
  if (ctx.userId) {
    commands.push(`SET LOCAL app.user_id = '${ctx.userId}'`);
  }
  
  return commands;
}

function buildResetContextSQL(): string[] {
  return [
    `RESET search_path`,
    `RESET app.tenant_id`,
    `RESET app.is_platform_admin`,
    `RESET app.company_id`,
    `RESET app.user_id`,
  ];
}

// ────────────────────────────────────────────
// TenantPoolClient — Wraps PoolClient with auto RLS context
// ────────────────────────────────────────────
class TenantPoolClient {
  private client: PoolClient;
  private context: TenantContext;
  private contextSet: boolean = false;
  private released: boolean = false;

  constructor(client: PoolClient, context: TenantContext) {
    this.client = client;
    this.context = context;
  }

  /**
   * Set tenant context on the connection (called once per transaction)
   */
  private async ensureContext(): Promise<void> {
    if (this.contextSet) return;
    
    const commands = buildSetContextSQL(this.context);
    for (const cmd of commands) {
      await this.client.query(cmd);
    }
    this.contextSet = true;
  }

  async query(textOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult> {
    await this.ensureContext();
    return this.client.query(textOrConfig as string, values);
  }

  async release(): Promise<void> {
    if (this.released) return;
    this.released = true;
    
    try {
      // Reset session variables before returning to pool
      const resets = buildResetContextSQL();
      for (const cmd of resets) {
        try { await this.client.query(cmd); } catch { /* ignore reset errors */ }
      }
    } finally {
      this.client.release();
    }
  }
}

// ────────────────────────────────────────────
// TenantPool — Main tenant-aware pool interface
// ────────────────────────────────────────────
class TenantPool {
  private pool: Pool;

  constructor(basePool: Pool) {
    this.pool = basePool;
  }

  /**
   * Execute a single query with automatic tenant scoping.
   * 
   * For queries outside a transaction, wraps in BEGIN/COMMIT
   * to use SET LOCAL (which is transaction-scoped in PostgreSQL).
   */
  async query(text: string, values?: any[]): Promise<QueryResult> {
    const ctx = getCurrentTenantContext();
    
    // No context (startup, health checks, etc.) — use raw pool
    if (!ctx || (!ctx.tenantId && !ctx.isPlatformAdmin)) {
      return this.pool.query(text, values);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Set RLS session variables
      const commands = buildSetContextSQL(ctx);
      for (const cmd of commands) {
        await client.query(cmd);
      }
      
      // Execute the actual query
      const result = await client.query(text, values);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a tenant-scoped connection for transactions.
   * Session variables are set automatically on first query.
   * 
   * IMPORTANT: Always call client.release() when done.
   * 
   * Usage:
   *   const client = await tenantPool.connect();
   *   await client.query('BEGIN');
   *   await client.query('INSERT INTO ...');
   *   await client.query('COMMIT');
   *   client.release();
   */
  async connect(): Promise<TenantPoolClient> {
    const ctx = getCurrentTenantContext();
    const client = await this.pool.connect();
    
    if (!ctx) {
      // Return a passthrough wrapper
      return new TenantPoolClient(client, {
        tenantId: null,
        companyId: null,
        userId: null,
        isPlatformAdmin: true, // No context = bypass RLS
      });
    }
    
    return new TenantPoolClient(client, ctx);
  }

  /**
   * Execute a callback within a transaction with tenant context.
   * Handles BEGIN/COMMIT/ROLLBACK automatically.
   */
  async transaction<T>(callback: (client: TenantPoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw error;
    } finally {
      await client.release();
    }
  }

  /**
   * Get the underlying pool (for health checks, migrations, etc.)
   */
  get rawPool(): Pool {
    return this.pool;
  }
}

// ────────────────────────────────────────────
// Singleton Export
// ────────────────────────────────────────────
export const tenantPool = new TenantPool(pool);
export default tenantPool;
