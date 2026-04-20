/**
 * ============================================================
 * Platform Settings Routes — Architecture §5.1 #11
 * ============================================================
 *
 * CRUD for platform-wide configuration stored in `platform_settings`.
 * Categories: smtp, security, backup, monitoring, general.
 *
 * Access: platform.settings.read / platform.settings.update
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// ────────────────────────────────────────────
// GET / — List all settings (grouped by category)
// ────────────────────────────────────────────
router.get('/', authenticate, platformGate('platform.settings.read'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, category, key, value, value_type, description, is_secret, updated_at
       FROM platform_settings
       ORDER BY category, key`
    );

    // Mask secret values
    const settings = result.rows.map((s: any) => ({
      ...s,
      value: s.is_secret ? '********' : s.value,
    }));

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }

    sendSuccess(res, { settings: grouped, total: result.rowCount });
  } catch (err: any) {
    logger.error('Failed to fetch platform settings', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to fetch settings', 500);
  }
});

// ────────────────────────────────────────────
// GET /:category — Get settings for a specific category
// ────────────────────────────────────────────
router.get('/:category', authenticate, platformGate('platform.settings.read'), async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const validCategories = ['smtp', 'security', 'backup', 'monitoring', 'general'];
    if (!validCategories.includes(category)) {
      return sendError(res, 'VALIDATION_ERROR', `Invalid category. Valid: ${validCategories.join(', ')}`, 400);
    }

    const result = await pool.query(
      `SELECT id, category, key, value, value_type, description, is_secret, updated_at
       FROM platform_settings WHERE category = $1 ORDER BY key`,
      [category]
    );

    const settings = result.rows.map((s: any) => ({
      ...s,
      value: s.is_secret ? '********' : s.value,
    }));

    sendSuccess(res, { category, settings });
  } catch (err: any) {
    logger.error('Failed to fetch category settings', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to fetch settings', 500);
  }
});

// ────────────────────────────────────────────
// PUT / — Batch update settings
// ────────────────────────────────────────────
router.put('/', authenticate, platformGate('platform.settings.update'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { settings } = req.body;
    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Settings array is required', 400);
    }

    await client.query('BEGIN');

    const updated: any[] = [];
    for (const s of settings) {
      if (!s.category || !s.key) continue;
      const result = await client.query(
        `UPDATE platform_settings
         SET value = $1, updated_by = $2, updated_at = NOW()
         WHERE category = $3 AND key = $4
         RETURNING id, category, key, value_type, is_secret`,
        [s.value, (req as any).user?.id, s.category, s.key]
      );
      if (result.rows.length > 0) {
        updated.push({ category: s.category, key: s.key });
      }
    }

    // Audit log
    try {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address, created_at)
         VALUES ($1, 'platform_settings_update', 'platform_settings', $2, $3, NOW())`,
        [
          (req as any).user?.id,
          JSON.stringify({ updated_keys: updated }),
          req.ip,
        ]
      );
    } catch { /* audit non-fatal */ }

    await client.query('COMMIT');

    logger.info({
      event: 'platform_settings_updated',
      userId: (req as any).user?.id,
      updatedCount: updated.length,
    });

    sendSuccess(res, { updated, count: updated.length });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Failed to update settings', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to update settings', 500);
  } finally {
    client.release();
  }
});

export default router;
