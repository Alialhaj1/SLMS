/**
 * §13.4.2 — Feature Flags Route (replaces stub)
 *
 * GET    /api/feature-flags                        — List all flags
 * GET    /api/feature-flags/evaluate               — Evaluate all flags for current user
 * GET    /api/feature-flags/:key                   — Get flag details
 * GET    /api/feature-flags/:key/check             — Check if flag is enabled
 * POST   /api/feature-flags                        — Create flag
 * PUT    /api/feature-flags/:key                   — Update flag
 * DELETE /api/feature-flags/:key                   — Delete flag
 * GET    /api/feature-flags/:key/overrides         — List overrides
 * POST   /api/feature-flags/:key/overrides         — Set override
 * DELETE /api/feature-flags/:key/overrides/:id     — Remove override
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { FeatureFlagService } from '../services/featureFlagService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Public: evaluate all flags for current context
router.get('/evaluate', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const flags = await FeatureFlagService.evaluateAll({
      tenantId: user.tenant_id || null,
      userId: user.id,
    });
    sendSuccess(res, flags);
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to evaluate feature flags', 500);
  }
});

// Admin: list all flags
router.get('/', authenticate, requirePermission('feature_flags:view' as any), async (_req: Request, res: Response) => {
  try {
    const flags = await FeatureFlagService.list();
    sendSuccess(res, flags);
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to list feature flags', 500);
  }
});

router.get('/:key', authenticate, requirePermission('feature_flags:view' as any), async (req: Request, res: Response) => {
  try {
    const flag = await FeatureFlagService.getByKey(req.params.key);
    if (!flag) return sendError(res, 'NOT_FOUND', 'Feature flag not found', 404);
    sendSuccess(res, flag);
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to get feature flag', 500);
  }
});

router.get('/:key/check', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const enabled = await FeatureFlagService.isEnabled(req.params.key, {
      tenantId: user.tenant_id || null,
      userId: user.id,
    });
    sendSuccess(res, { flag_key: req.params.key, enabled });
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to check feature flag', 500);
  }
});

router.post('/', authenticate, requirePermission('feature_flags:create' as any), async (req: Request, res: Response) => {
  try {
    const { flag_key, description, flag_type, is_enabled, percentage, user_list } = req.body;
    if (!flag_key) return sendError(res, 'VALIDATION_ERROR', 'flag_key is required', 400);
    const flag = await FeatureFlagService.create({ flag_key, description, flag_type, is_enabled, percentage, user_list });
    sendSuccess(res, flag, 201, undefined, 'Feature flag created');
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to create feature flag', 500);
  }
});

router.put('/:key', authenticate, requirePermission('feature_flags:update' as any), async (req: Request, res: Response) => {
  try {
    const flag = await FeatureFlagService.update(req.params.key, req.body);
    if (!flag) return sendError(res, 'NOT_FOUND', 'Feature flag not found', 404);
    sendSuccess(res, flag, 200, undefined, 'Feature flag updated');
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to update feature flag', 500);
  }
});

router.delete('/:key', authenticate, requirePermission('feature_flags:delete' as any), async (req: Request, res: Response) => {
  try {
    const deleted = await FeatureFlagService.delete(req.params.key);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Feature flag not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Feature flag deleted');
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to delete feature flag', 500);
  }
});

// Overrides
router.get('/:key/overrides', authenticate, requirePermission('feature_flags:view' as any), async (req: Request, res: Response) => {
  try {
    const overrides = await FeatureFlagService.listOverrides(req.params.key);
    sendSuccess(res, overrides);
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to list overrides', 500);
  }
});

router.post('/:key/overrides', authenticate, requirePermission('feature_flags:update' as any), async (req: Request, res: Response) => {
  try {
    const { tenant_id, user_id, is_enabled } = req.body;
    if (is_enabled === undefined) return sendError(res, 'VALIDATION_ERROR', 'is_enabled is required', 400);
    const override = await FeatureFlagService.setOverride(req.params.key, tenant_id || null, user_id || null, is_enabled);
    sendSuccess(res, override, 201, undefined, 'Override set');
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to set override', 500);
  }
});

router.delete('/:key/overrides/:id', authenticate, requirePermission('feature_flags:update' as any), async (req: Request, res: Response) => {
  try {
    const deleted = await FeatureFlagService.removeOverride(parseInt(req.params.id));
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Override not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Override removed');
  } catch (err) {
    sendError(res, 'FEATURE_FLAGS_ERROR', 'Failed to remove override', 500);
  }
});

export default router;
