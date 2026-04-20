/**
 * §13.4.3 — Background Jobs Route
 *
 * GET    /api/background-jobs          — List jobs (admin)
 * GET    /api/background-jobs/stats    — Queue stats
 * POST   /api/background-jobs          — Enqueue a job (admin)
 * DELETE /api/background-jobs/purge    — Purge old jobs
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { BackgroundJobService } from '../services/backgroundJobService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/stats', authenticate, requirePermission('background_jobs:view' as any), async (_req: Request, res: Response) => {
  try {
    const stats = await BackgroundJobService.getStats();
    sendSuccess(res, stats);
  } catch (err) {
    sendError(res, 'JOBS_ERROR', 'Failed to get job stats', 500);
  }
});

router.get('/', authenticate, requirePermission('background_jobs:view' as any), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const jobType = req.query.job_type as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await BackgroundJobService.list({ status, jobType, page, limit });
    sendSuccess(res, result.rows, 200, {
      page, limit, total: result.total,
      totalPages: Math.ceil(result.total / limit),
      per_page: limit, total_pages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    sendError(res, 'JOBS_ERROR', 'Failed to list jobs', 500);
  }
});

router.post('/', authenticate, requirePermission('background_jobs:create' as any), async (req: Request, res: Response) => {
  try {
    const { job_type, payload, priority, scheduled_at, max_retries } = req.body;
    if (!job_type) return sendError(res, 'VALIDATION_ERROR', 'job_type is required', 400);

    const tenantId = (req as any).user.tenant_id || null;
    const jobId = await BackgroundJobService.enqueue(job_type, payload || {}, {
      priority,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : undefined,
      maxRetries: max_retries,
      tenantId,
    });

    sendSuccess(res, { id: jobId }, 201, undefined, 'Job enqueued');
  } catch (err) {
    sendError(res, 'JOBS_ERROR', 'Failed to enqueue job', 500);
  }
});

router.delete('/purge', authenticate, requirePermission('background_jobs:delete' as any), async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const purged = await BackgroundJobService.purge(days);
    sendSuccess(res, { purged }, 200, undefined, `Purged ${purged} old jobs`);
  } catch (err) {
    sendError(res, 'JOBS_ERROR', 'Failed to purge jobs', 500);
  }
});

export default router;
