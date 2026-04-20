/**
 * §13.1.2 — Anomaly Detection Route
 *
 * GET  /api/anomaly-detection            — List login anomaly events
 * POST /api/anomaly-detection/:id/review — Review/acknowledge an anomaly
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { AnomalyDetectionService } from '../services/anomalyDetectionService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', authenticate, requirePermission('anomaly_detection:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const anomalies = await AnomalyDetectionService.listAnomalies({ tenantId, page, limit });
    sendSuccess(res, anomalies);
  } catch (err) {
    sendError(res, 'ANOMALY_ERROR', 'Failed to list anomalies', 500);
  }
});

router.post('/:id/review', authenticate, requirePermission('anomaly_detection:update' as any), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await AnomalyDetectionService.reviewAnomaly(parseInt(req.params.id), userId);

    if (!result) return sendError(res, 'NOT_FOUND', 'Anomaly event not found', 404);
    sendSuccess(res, { reviewed: true }, 200, undefined, 'Anomaly reviewed');
  } catch (err) {
    sendError(res, 'ANOMALY_ERROR', 'Failed to review anomaly', 500);
  }
});

export default router;
