/**
 * §13.2.2 — User Preferences & Recent Items Routes
 *
 * GET    /api/user-preferences          — Get all preferences
 * GET    /api/user-preferences/:key     — Get a specific preference
 * PUT    /api/user-preferences/:key     — Set a preference
 * PUT    /api/user-preferences          — Bulk set preferences
 * DELETE /api/user-preferences/:key     — Delete a preference
 *
 * GET    /api/user-preferences/pinned/:resource  — Get pinned record IDs
 * POST   /api/user-preferences/pinned/:resource/:id — Pin a record
 * DELETE /api/user-preferences/pinned/:resource/:id — Unpin a record
 *
 * GET    /api/user-preferences/recent   — Get recent items
 * POST   /api/user-preferences/recent   — Track a recent item
 * DELETE /api/user-preferences/recent   — Clear recent items
 *
 * GET    /api/user-preferences/columns/:table — Get table column config
 * PUT    /api/user-preferences/columns/:table — Set table column config
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { UserPreferencesService, RecentItemsService } from '../services/userPreferencesService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// ─── Preferences ─────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const prefix = req.query.prefix as string | undefined;
    const prefs = await UserPreferencesService.getAll(userId, prefix);
    sendSuccess(res, prefs);
  } catch (err) {
    sendError(res, 'PREFERENCES_ERROR', 'Failed to get preferences', 500);
  }
});

router.get('/recent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const items = await RecentItemsService.list(userId, limit);
    sendSuccess(res, items);
  } catch (err) {
    sendError(res, 'RECENT_ITEMS_ERROR', 'Failed to get recent items', 500);
  }
});

router.post('/recent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { resource_type, resource_id, title } = req.body;
    if (!resource_type || !resource_id || !title) {
      return sendError(res, 'VALIDATION_ERROR', 'resource_type, resource_id, and title are required', 400);
    }
    const tenantId = (req as any).user.tenant_id ?? null;
    await RecentItemsService.track({
      userId,
      tenantId,
      resourceType: resource_type,
      resourceId: resource_id,
      resourceLabel: title,
    });
    sendSuccess(res, { tracked: true }, 201);
  } catch (err) {
    sendError(res, 'RECENT_ITEMS_ERROR', 'Failed to track recent item', 500);
  }
});

router.delete('/recent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await RecentItemsService.clear(userId);
    sendSuccess(res, { cleared: true });
  } catch (err) {
    sendError(res, 'RECENT_ITEMS_ERROR', 'Failed to clear recent items', 500);
  }
});

router.get('/pinned/:resource', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const ids = await UserPreferencesService.getPinnedIds(userId, req.params.resource);
    sendSuccess(res, ids);
  } catch (err) {
    sendError(res, 'PINNED_ERROR', 'Failed to get pinned records', 500);
  }
});

router.post('/pinned/:resource/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await UserPreferencesService.pinRecord(userId, req.params.resource, parseInt(req.params.id));
    sendSuccess(res, { pinned: true }, 201);
  } catch (err) {
    sendError(res, 'PINNED_ERROR', 'Failed to pin record', 500);
  }
});

router.delete('/pinned/:resource/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await UserPreferencesService.unpinRecord(userId, req.params.resource, parseInt(req.params.id));
    sendSuccess(res, { unpinned: true });
  } catch (err) {
    sendError(res, 'PINNED_ERROR', 'Failed to unpin record', 500);
  }
});

router.get('/columns/:table', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const columns = await UserPreferencesService.getTableColumns(userId, req.params.table);
    sendSuccess(res, columns);
  } catch (err) {
    sendError(res, 'COLUMNS_ERROR', 'Failed to get column config', 500);
  }
});

router.put('/columns/:table', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await UserPreferencesService.setTableColumns(userId, req.params.table, req.body.columns);
    sendSuccess(res, { saved: true });
  } catch (err) {
    sendError(res, 'COLUMNS_ERROR', 'Failed to save column config', 500);
  }
});

router.get('/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const value = await UserPreferencesService.get(userId, req.params.key);
    sendSuccess(res, { key: req.params.key, value });
  } catch (err) {
    sendError(res, 'PREFERENCES_ERROR', 'Failed to get preference', 500);
  }
});

router.put('/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { value } = req.body;
    if (value === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'value is required', 400);
    }
    await UserPreferencesService.set(userId, req.params.key, value);
    sendSuccess(res, { saved: true });
  } catch (err) {
    sendError(res, 'PREFERENCES_ERROR', 'Failed to set preference', 500);
  }
});

router.put('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const prefs = req.body;
    if (!prefs || typeof prefs !== 'object') {
      return sendError(res, 'VALIDATION_ERROR', 'Request body must be an object of key-value pairs', 400);
    }
    await UserPreferencesService.setBulk(userId, prefs);
    sendSuccess(res, { saved: true });
  } catch (err) {
    sendError(res, 'PREFERENCES_ERROR', 'Failed to set preferences', 500);
  }
});

router.delete('/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await UserPreferencesService.delete(userId, req.params.key);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    sendError(res, 'PREFERENCES_ERROR', 'Failed to delete preference', 500);
  }
});

export default router;
