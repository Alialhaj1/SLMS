/**
 * §13.3.9 — Scheduled Reports Route
 *
 * CRUD + toggle for scheduled report definitions.
 *
 * GET    /api/scheduled-reports           — List
 * GET    /api/scheduled-reports/:id       — Get by ID
 * POST   /api/scheduled-reports           — Create
 * PUT    /api/scheduled-reports/:id       — Update
 * DELETE /api/scheduled-reports/:id       — Delete
 * POST   /api/scheduled-reports/:id/toggle — Toggle active
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { ScheduledReportService } from '../services/scheduledReportService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', authenticate, requirePermission('scheduled_reports:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await ScheduledReportService.list(tenantId, page, limit);
    sendSuccess(res, result.rows, 200, {
      page, limit, total: result.total,
      totalPages: Math.ceil(result.total / limit),
      per_page: limit, total_pages: Math.ceil(result.total / limit)
    });
  } catch (err) {
    sendError(res, 'SCHEDULED_REPORTS_ERROR', 'Failed to list scheduled reports', 500);
  }
});

router.get('/:id', authenticate, requirePermission('scheduled_reports:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const report = await ScheduledReportService.getById(parseInt(req.params.id), tenantId);
    if (!report) return sendError(res, 'NOT_FOUND', 'Scheduled report not found', 404);
    sendSuccess(res, report);
  } catch (err) {
    sendError(res, 'SCHEDULED_REPORTS_ERROR', 'Failed to get scheduled report', 500);
  }
});

router.post('/', authenticate, requirePermission('scheduled_reports:create' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const userId = (req as any).user.id;
    const { name, report_type, schedule_cron, parameters, delivery_method, delivery_target, format } = req.body;

    if (!name || !report_type || !schedule_cron || !delivery_method || !delivery_target) {
      return sendError(res, 'VALIDATION_ERROR', 'name, report_type, schedule_cron, delivery_method, and delivery_target are required', 400);
    }

    const report = await ScheduledReportService.create({
      name,
      report_type,
      schedule_cron,
      parameters,
      delivery_method,
      delivery_target,
      format,
      tenant_id: tenantId,
      created_by: userId,
    });

    sendSuccess(res, report, 201, undefined, 'Scheduled report created');
  } catch (err) {
    sendError(res, 'SCHEDULED_REPORTS_ERROR', 'Failed to create scheduled report', 500);
  }
});

router.put('/:id', authenticate, requirePermission('scheduled_reports:update' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const report = await ScheduledReportService.update(parseInt(req.params.id), req.body, tenantId);
    if (!report) return sendError(res, 'NOT_FOUND', 'Scheduled report not found', 404);
    sendSuccess(res, report, 200, undefined, 'Scheduled report updated');
  } catch (err) {
    sendError(res, 'SCHEDULED_REPORTS_ERROR', 'Failed to update scheduled report', 500);
  }
});

router.delete('/:id', authenticate, requirePermission('scheduled_reports:delete' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const deleted = await ScheduledReportService.delete(parseInt(req.params.id), tenantId);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Scheduled report not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Scheduled report deleted');
  } catch (err) {
    sendError(res, 'SCHEDULED_REPORTS_ERROR', 'Failed to delete scheduled report', 500);
  }
});

router.post('/:id/toggle', authenticate, requirePermission('scheduled_reports:update' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const report = await ScheduledReportService.toggleActive(parseInt(req.params.id), tenantId);
    if (!report) return sendError(res, 'NOT_FOUND', 'Scheduled report not found', 404);
    sendSuccess(res, report, 200, undefined, 'Scheduled report toggled');
  } catch (err) {
    sendError(res, 'SCHEDULED_REPORTS_ERROR', 'Failed to toggle scheduled report', 500);
  }
});

export default router;
