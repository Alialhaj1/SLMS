/**
 * §13.4.5 — Prometheus-compatible Metrics Endpoint
 *
 * Exposes /api/metrics in Prometheus text format for scraping.
 * Collects Node.js runtime metrics + custom application counters.
 * Data stored in `performance_metrics` table for historical analysis.
 */

import { Request, Response, Router } from 'express';
import pool from '../db';
import { logger } from '../utils/logger';
import { getAllCircuitBreakerStatuses } from '../utils/circuitBreaker';
import { getSSEClientCount } from './sseNotificationService';

const router = Router();

// ─── In-memory counters (reset per process lifecycle) ────────────────────────
const counters: Record<string, number> = {
  http_requests_total: 0,
  http_errors_total: 0,
  db_queries_total: 0,
  active_connections: 0,
};

/**
 * Increment a counter (call from middleware).
 */
export function incrementCounter(name: string, amount: number = 1): void {
  counters[name] = (counters[name] || 0) + amount;
}

/**
 * Set a gauge value.
 */
export function setGauge(name: string, value: number): void {
  counters[name] = value;
}

/**
 * Format metrics in Prometheus text exposition format.
 */
function formatPrometheusMetrics(metrics: Record<string, number>): string {
  return Object.entries(metrics)
    .map(([key, value]) => `# TYPE ${key} gauge\n${key} ${value}`)
    .join('\n\n');
}

/**
 * Collect all metrics.
 */
async function collectMetrics(): Promise<Record<string, number>> {
  const metrics: Record<string, number> = { ...counters };

  // Node.js runtime
  const mem = process.memoryUsage();
  metrics['nodejs_heap_used_bytes'] = mem.heapUsed;
  metrics['nodejs_heap_total_bytes'] = mem.heapTotal;
  metrics['nodejs_rss_bytes'] = mem.rss;
  metrics['nodejs_external_bytes'] = mem.external;
  metrics['nodejs_uptime_seconds'] = Math.floor(process.uptime());

  // Event loop lag (rough estimate)
  const start = Date.now();
  await new Promise(resolve => setImmediate(resolve));
  metrics['nodejs_event_loop_lag_ms'] = Date.now() - start;

  // SSE connections
  const sseStats = getSSEClientCount();
  metrics['sse_connections_total'] = sseStats.total;

  // Circuit breakers
  const breakers = getAllCircuitBreakerStatuses();
  for (const b of breakers) {
    metrics[`circuit_breaker_${b.name}_failures`] = b.failureCount;
    metrics[`circuit_breaker_${b.name}_state`] = b.state === 'CLOSED' ? 0 : b.state === 'HALF_OPEN' ? 1 : 2;
  }

  // DB pool stats (if available)
  try {
    const poolStats = (pool as any);
    if (poolStats.totalCount !== undefined) {
      metrics['db_pool_total'] = poolStats.totalCount;
      metrics['db_pool_idle'] = poolStats.idleCount;
      metrics['db_pool_waiting'] = poolStats.waitingCount;
    }
  } catch {
    // Pool stats not available
  }

  // Background jobs stats
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM background_jobs GROUP BY status`
    );
    for (const row of result.rows) {
      metrics[`background_jobs_${row.status}`] = row.count;
    }
  } catch {
    // background_jobs table might not exist yet
  }

  return metrics;
}

/**
 * GET /api/metrics — Prometheus scrape endpoint
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const metrics = await collectMetrics();
    const output = formatPrometheusMetrics(metrics);
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(output);
  } catch (err) {
    logger.error('Failed to collect metrics', { error: err });
    res.status(500).send('# Error collecting metrics\n');
  }
});

/**
 * GET /api/metrics/json — JSON format for internal consumption
 */
router.get('/json', async (_req: Request, res: Response) => {
  try {
    const metrics = await collectMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    logger.error('Failed to collect metrics', { error: err });
    res.status(500).json({ success: false, error: 'Failed to collect metrics' });
  }
});

/**
 * Middleware to count requests (add to express app).
 */
export function metricsCounterMiddleware(req: Request, _res: Response, next: () => void): void {
  incrementCounter('http_requests_total');
  next();
}

/**
 * Save current metrics snapshot to DB (called periodically).
 */
export async function saveMetricsSnapshot(): Promise<void> {
  try {
    const metrics = await collectMetrics();
    await pool.query(
      `INSERT INTO performance_metrics (metric_name, metric_value, labels)
       VALUES ('snapshot', $1, $2)`,
      [0, JSON.stringify(metrics)]
    );
  } catch (err) {
    logger.debug('Failed to save metrics snapshot', { error: err });
  }
}

export default router;
