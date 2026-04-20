/**
 * §13.3.11 — Usage Analytics Route (replaces subscriptionUsage stub)
 *
 * GET  /api/subscription/usage                — Current usage for tenant
 * GET  /api/subscription/usage/timeseries     — Time series for a metric
 * GET  /api/subscription/usage/aggregated     — Aggregated stats for a metric
 * GET  /api/subscription/usage/all-tenants    — All tenants' usage (platform admin)
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { UsageAnalyticsService } from '../services/usageAnalyticsService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) {
      return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    }
    const usage = await UsageAnalyticsService.getCurrentUsage(tenantId);
    sendSuccess(res, usage);
  } catch (err) {
    sendError(res, 'USAGE_ERROR', 'Failed to get usage data', 500);
  }
});

router.get('/usage/timeseries', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) {
      return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    }

    const { metric, start_date, end_date } = req.query;
    if (!metric || !start_date || !end_date) {
      return sendError(res, 'VALIDATION_ERROR', 'metric, start_date, and end_date are required', 400);
    }

    const data = await UsageAnalyticsService.getTimeSeries(
      tenantId,
      metric as string,
      start_date as string,
      end_date as string
    );
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, 'USAGE_ERROR', 'Failed to get time series data', 500);
  }
});

router.get('/usage/aggregated', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) {
      return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    }

    const { metric, start_date, end_date } = req.query;
    if (!metric || !start_date || !end_date) {
      return sendError(res, 'VALIDATION_ERROR', 'metric, start_date, and end_date are required', 400);
    }

    const stats = await UsageAnalyticsService.getAggregatedUsage(
      tenantId,
      metric as string,
      start_date as string,
      end_date as string
    );
    sendSuccess(res, stats);
  } catch (err) {
    sendError(res, 'USAGE_ERROR', 'Failed to get aggregated usage', 500);
  }
});

// Platform admin: view all tenants' usage
router.get('/usage/all-tenants', authenticate, requirePermission('usage_analytics:view' as any), async (req: Request, res: Response) => {
  try {
    const { metric, date } = req.query;
    if (!metric) {
      return sendError(res, 'VALIDATION_ERROR', 'metric is required', 400);
    }
    const data = await UsageAnalyticsService.getAllTenantsUsage(metric as string, date as string);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, 'USAGE_ERROR', 'Failed to get all tenants usage', 500);
  }
});

export default router;
