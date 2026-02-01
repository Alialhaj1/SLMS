/**
 * Detailed Health Check Endpoint
 * 
 * Production-grade health check for monitoring, load balancers, K8s readiness probes
 * 
 * Features:
 * - Database connection status + pool metrics
 * - System uptime + memory usage
 * - Error rate tracking (last 5 minutes)
 * - Slow endpoint detection
 * - Overall health status (healthy/degraded/unhealthy)
 * 
 * IMPORTANT: Public endpoint (no authentication required)
 * Used by external monitoring systems, load balancers, orchestrators
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import logger from '../utils/logger';

const router = Router();

// Track server start time
const serverStartTime = Date.now();

// In-memory error tracking (lightweight alternative to full log parsing)
interface ErrorMetric {
  timestamp: number;
  endpoint: string;
}

const recentErrors: ErrorMetric[] = [];
const MAX_ERROR_HISTORY = 1000; // Keep last 1000 errors

// Track endpoint performance (populated by middleware)
interface PerformanceMetric {
  endpoint: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
}

const endpointMetrics = new Map<string, { count: number; totalDuration: number }>();

/**
 * Helper: Track error for health metrics
 * Call this from error handler
 */
export function trackError(endpoint: string): void {
  recentErrors.push({
    timestamp: Date.now(),
    endpoint,
  });

  // Keep only recent errors
  if (recentErrors.length > MAX_ERROR_HISTORY) {
    recentErrors.shift();
  }
}

/**
 * Helper: Track endpoint performance
 * Call this from request logger
 */
export function trackPerformance(endpoint: string, duration: number): void {
  const existing = endpointMetrics.get(endpoint);
  
  if (existing) {
    existing.count++;
    existing.totalDuration += duration;
  } else {
    endpointMetrics.set(endpoint, {
      count: 1,
      totalDuration: duration,
    });
  }

  // Cleanup old metrics periodically (keep last 10 minutes of data)
  if (endpointMetrics.size > 1000) {
    // Remove oldest 20% of entries
    const entries = Array.from(endpointMetrics.entries());
    const toKeep = entries.slice(Math.floor(entries.length * 0.2));
    endpointMetrics.clear();
    toKeep.forEach(([key, value]) => endpointMetrics.set(key, value));
  }
}

/**
 * Format uptime as human-readable string
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check database connection health
 */
async function checkDatabase(): Promise<{
  status: 'ok' | 'error';
  responseTimeMs?: number;
  poolStats?: {
    total: number;
    idle: number;
    waiting: number;
  };
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple ping query
    await pool.query('SELECT 1');
    const responseTimeMs = Date.now() - startTime;

    // Get pool statistics
    const poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };

    return {
      status: 'ok',
      responseTimeMs,
      poolStats,
    };
  } catch (error: any) {
    logger.error('Database health check failed', error);
    return {
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Calculate error rate (last 5 minutes)
 */
function getErrorMetrics(): {
  last5Minutes: number;
  last1Hour: number;
  rate: string;
} {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // Filter errors from last 5 minutes
  const recentErrorsLast5Min = recentErrors.filter(e => e.timestamp >= fiveMinutesAgo);
  const recentErrorsLast1Hour = recentErrors.filter(e => e.timestamp >= oneHourAgo);

  // Calculate total requests (rough estimate from endpoint metrics)
  const totalRequests = Array.from(endpointMetrics.values())
    .reduce((sum, metric) => sum + metric.count, 0);

  const errorRate = totalRequests > 0 
    ? ((recentErrorsLast5Min.length / totalRequests) * 100).toFixed(2)
    : '0.00';

  return {
    last5Minutes: recentErrorsLast5Min.length,
    last1Hour: recentErrorsLast1Hour.length,
    rate: `${errorRate}%`,
  };
}

/**
 * Detect slow endpoints (avg > 1000ms)
 */
function getSlowEndpoints(): Array<{
  endpoint: string;
  avgMs: number;
  count: number;
}> {
  const slowEndpoints: Array<{ endpoint: string; avgMs: number; count: number }> = [];

  endpointMetrics.forEach((metric, endpoint) => {
    const avgDuration = metric.totalDuration / metric.count;
    
    if (avgDuration > 1000) {
      slowEndpoints.push({
        endpoint,
        avgMs: Math.round(avgDuration),
        count: metric.count,
      });
    }
  });

  // Sort by avg duration (slowest first)
  slowEndpoints.sort((a, b) => b.avgMs - a.avgMs);

  return slowEndpoints.slice(0, 5); // Return top 5
}

/**
 * Get memory usage
 */
function getMemoryMetrics(): {
  rssMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
} {
  const memUsage = process.memoryUsage();
  
  return {
    rssMB: Math.round(memUsage.rss / 1024 / 1024),
    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    externalMB: Math.round(memUsage.external / 1024 / 1024),
  };
}

/**
 * Determine overall system health status
 */
function determineHealthStatus(
  dbStatus: string,
  errorRate: number,
  slowEndpoints: number
): 'healthy' | 'degraded' | 'unhealthy' {
  // Unhealthy: Database is down
  if (dbStatus !== 'ok') {
    return 'unhealthy';
  }

  // Degraded: High error rate or many slow endpoints
  if (errorRate > 5 || slowEndpoints > 3) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * GET /api/health/detailed
 * Detailed health check with metrics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Gather all metrics
    const uptime = Date.now() - serverStartTime;
    const dbHealth = await checkDatabase();
    const errorMetrics = getErrorMetrics();
    const slowEndpoints = getSlowEndpoints();
    const memoryMetrics = getMemoryMetrics();

    // Parse error rate
    const errorRateNum = parseFloat(errorMetrics.rate);

    // Determine overall status
    const overallStatus = determineHealthStatus(
      dbHealth.status,
      errorRateNum,
      slowEndpoints.length
    );

    // Build response
    const response = {
      status: overallStatus,
      uptime: formatUptime(uptime),
      timestamp: new Date().toISOString(),
      
      database: {
        status: dbHealth.status,
        responseTimeMs: dbHealth.responseTimeMs,
        pool: dbHealth.poolStats,
        error: dbHealth.error,
      },

      errors: {
        last5Minutes: errorMetrics.last5Minutes,
        last1Hour: errorMetrics.last1Hour,
        rate: errorMetrics.rate,
      },

      performance: {
        slowEndpoints: slowEndpoints.length > 0 ? slowEndpoints : undefined,
      },

      memory: memoryMetrics,

      // Environment info (safe to expose)
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development',
      },
    };

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    return res.status(httpStatus).json(response);

  } catch (error: any) {
    logger.error('Health check endpoint failed', error);
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router;
