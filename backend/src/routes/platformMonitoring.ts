/**
 * ============================================================
 * Platform Monitoring Routes — Architecture §5.1 #10
 * ============================================================
 *
 * System health, resource usage, service status.
 * CPU/RAM/DB connections, pg_stat_activity, service states.
 *
 * Access: platform.monitoring.read
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';
import os from 'os';

const router = Router();

// ────────────────────────────────────────────
// GET /health — System health overview
// ────────────────────────────────────────────
router.get('/health', authenticate, platformGate('platform.monitoring.read'), async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Database connectivity + stats
    const [dbAlive, dbStats, dbSize, activeQueries, tableStats] = await Promise.all([
      pool.query('SELECT 1 as ok, NOW() as server_time').then(() => true).catch(() => false),
      pool.query(`SELECT
        numbackends as connections,
        xact_commit as commits,
        xact_rollback as rollbacks,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as rows_returned,
        tup_fetched as rows_fetched,
        tup_inserted as rows_inserted,
        tup_updated as rows_updated,
        tup_deleted as rows_deleted,
        deadlocks
       FROM pg_stat_database WHERE datname = current_database()`).catch(() => ({ rows: [] })),
      pool.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`).catch(() => ({ rows: [{ size: 'N/A' }] })),
      pool.query(`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`
        SELECT schemaname, relname as table_name, n_live_tup as row_count,
               pg_size_pretty(pg_total_relation_size(relid)) as total_size
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC LIMIT 20
      `).catch(() => ({ rows: [] })),
    ]);

    // OS metrics
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();

    // Pool stats
    const poolStats = {
      totalCount: (pool as any).totalCount,
      idleCount: (pool as any).idleCount,
      waitingCount: (pool as any).waitingCount,
    };

    const dbResponseMs = Date.now() - startTime;

    sendSuccess(res, {
      status: dbAlive ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
      db: {
        alive: dbAlive,
        response_ms: dbResponseMs,
        size: (dbSize as any).rows[0]?.size || 'N/A',
        stats: (dbStats as any).rows[0] || {},
        active_queries: parseInt((activeQueries as any).rows[0]?.count || '0'),
        pool: poolStats,
        top_tables: (tableStats as any).rows,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: cpus.length,
        cpu_model: cpus[0]?.model || 'N/A',
        total_memory_mb: Math.round(totalMem / 1024 / 1024),
        free_memory_mb: Math.round(freeMem / 1024 / 1024),
        memory_usage_percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
        load_average: loadAvg,
        os_uptime_seconds: uptime,
      },
      node: {
        version: process.version,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid,
        memory: process.memoryUsage(),
      },
    });
  } catch (err: any) {
    logger.error('Health check failed', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Health check failed', 500);
  }
});

// ────────────────────────────────────────────
// GET /services — Service status overview
// ────────────────────────────────────────────
router.get('/services', authenticate, platformGate('platform.monitoring.read'), async (_req: Request, res: Response) => {
  try {
    const services: any[] = [];

    // PostgreSQL
    try {
      const start = Date.now();
      await pool.query('SELECT 1');
      services.push({ name: 'PostgreSQL', status: 'running', response_ms: Date.now() - start });
    } catch {
      services.push({ name: 'PostgreSQL', status: 'down', response_ms: null });
    }

    // Check tenant count
    try {
      const tenants = await pool.query(
        `SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active
         FROM tenants`
      );
      services.push({
        name: 'Tenant Registry',
        status: 'running',
        details: tenants.rows[0],
      });
    } catch {
      services.push({ name: 'Tenant Registry', status: 'unknown' });
    }

    // Check migration status
    try {
      const migs = await pool.query(
        `SELECT COUNT(*) as total,
                MAX(filename) as latest
         FROM migrations`
      );
      services.push({
        name: 'Migrations',
        status: 'running',
        details: migs.rows[0],
      });
    } catch {
      services.push({ name: 'Migrations', status: 'unknown' });
    }

    sendSuccess(res, { services, checked_at: new Date().toISOString() });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to check service status', 500);
  }
});

// ────────────────────────────────────────────
// GET /connections — Active DB connections
// ────────────────────────────────────────────
router.get('/connections', authenticate, platformGate('platform.monitoring.read'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT pid, usename, client_addr, state, query_start,
             EXTRACT(EPOCH FROM (NOW() - query_start))::int as duration_seconds,
             LEFT(query, 200) as query_preview
      FROM pg_stat_activity
      WHERE datname = current_database()
      ORDER BY query_start DESC NULLS LAST
      LIMIT 50
    `);
    sendSuccess(res, { connections: result.rows, total: result.rowCount });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch connections', 500);
  }
});

export default router;
