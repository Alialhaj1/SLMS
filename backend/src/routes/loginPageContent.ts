/**
 * ============================================================================
 * Login Page Content Routes — Public + Admin Management
 * ============================================================================
 * Public endpoints (no auth):
 *   GET /api/login-page/content   — active content for the login page
 *   GET /api/login-page/settings  — active settings for the login page
 *
 * Admin endpoints (platform.settings.update):
 *   GET    /api/login-page/admin/content          — all content (inc. inactive)
 *   POST   /api/login-page/admin/content          — create new block
 *   PUT    /api/login-page/admin/content/:id       — update block
 *   DELETE /api/login-page/admin/content/:id       — delete block
 *   PATCH  /api/login-page/admin/content/:id/toggle — toggle active
 *   PUT    /api/login-page/admin/content/reorder   — bulk reorder
 *   GET    /api/login-page/admin/settings          — all settings
 *   PUT    /api/login-page/admin/settings/:key     — update setting
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// ============================================================================
// PUBLIC ENDPOINTS (no authentication)
// ============================================================================

/**
 * GET /content — Active login page content grouped by section
 * Respects scheduling (starts_at / ends_at) and is_active flag
 */
router.get('/content', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, section, title, title_ar, subtitle, subtitle_ar,
              body, body_ar, image_url, icon, link_url, link_label, link_label_ar,
              badge_text, badge_text_ar, bg_color, text_color, sort_order
       FROM login_page_content
       WHERE is_active = true
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at >= NOW())
       ORDER BY section, sort_order, id`
    );

    // Group by section
    const grouped: Record<string, any[]> = {};
    for (const row of result.rows) {
      if (!grouped[row.section]) grouped[row.section] = [];
      grouped[row.section].push(row);
    }

    sendSuccess(res, grouped);
  } catch (err: any) {
    logger.error('Failed to fetch login page content', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to fetch content', 500);
  }
});

/**
 * GET /settings — Active login page settings (key-value)
 */
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT key, value, value_type FROM login_page_settings ORDER BY key`
    );

    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      if (row.value_type === 'boolean') settings[row.key] = row.value === 'true';
      else if (row.value_type === 'number') settings[row.key] = Number(row.value);
      else if (row.value_type === 'json') {
        try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
      } else settings[row.key] = row.value;
    }

    sendSuccess(res, settings);
  } catch (err: any) {
    logger.error('Failed to fetch login page settings', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to fetch settings', 500);
  }
});

// ============================================================================
// ADMIN ENDPOINTS (platform admin only)
// ============================================================================

/**
 * GET /admin/content — All content blocks (including inactive)
 */
router.get('/admin/content', authenticate, platformGate('platform.settings.read'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM login_page_content ORDER BY section, sort_order, id`
    );
    sendSuccess(res, result.rows);
  } catch (err: any) {
    logger.error('Admin: failed to fetch login page content', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to fetch content', 500);
  }
});

/**
 * POST /admin/content — Create new content block
 */
router.post('/admin/content', authenticate, platformGate('platform.settings.update'), async (req: Request, res: Response) => {
  try {
    const {
      section, title, title_ar, subtitle, subtitle_ar, body, body_ar,
      image_url, icon, link_url, link_label, link_label_ar,
      badge_text, badge_text_ar, bg_color, text_color,
      sort_order, is_active, starts_at, ends_at
    } = req.body;

    const validSections = ['hero_slide', 'announcement', 'news', 'feature', 'promo_banner', 'partner_logo', 'testimonial', 'faq'];
    if (!section || !validSections.includes(section)) {
      return sendError(res, 'VALIDATION_ERROR', `Invalid section. Must be one of: ${validSections.join(', ')}`, 400);
    }

    const userId = (req as any).user?.id || null;

    const result = await pool.query(
      `INSERT INTO login_page_content
       (section, title, title_ar, subtitle, subtitle_ar, body, body_ar,
        image_url, icon, link_url, link_label, link_label_ar,
        badge_text, badge_text_ar, bg_color, text_color,
        sort_order, is_active, starts_at, ends_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [section, title, title_ar, subtitle, subtitle_ar, body, body_ar,
       image_url, icon, link_url, link_label, link_label_ar,
       badge_text, badge_text_ar, bg_color, text_color,
       sort_order || 0, is_active !== false, starts_at || null, ends_at || null, userId]
    );

    sendSuccess(res, result.rows[0], 201);
  } catch (err: any) {
    logger.error('Admin: failed to create login page content', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to create content', 500);
  }
});

/**
 * PUT /admin/content/:id — Update content block
 */
router.put('/admin/content/:id', authenticate, platformGate('platform.settings.update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      section, title, title_ar, subtitle, subtitle_ar, body, body_ar,
      image_url, icon, link_url, link_label, link_label_ar,
      badge_text, badge_text_ar, bg_color, text_color,
      sort_order, is_active, starts_at, ends_at
    } = req.body;

    const result = await pool.query(
      `UPDATE login_page_content SET
        section = COALESCE($1, section),
        title = $2, title_ar = $3, subtitle = $4, subtitle_ar = $5,
        body = $6, body_ar = $7, image_url = $8, icon = $9,
        link_url = $10, link_label = $11, link_label_ar = $12,
        badge_text = $13, badge_text_ar = $14, bg_color = $15, text_color = $16,
        sort_order = COALESCE($17, sort_order),
        is_active = COALESCE($18, is_active),
        starts_at = $19, ends_at = $20,
        updated_at = NOW()
       WHERE id = $21
       RETURNING *`,
      [section, title, title_ar, subtitle, subtitle_ar, body, body_ar,
       image_url, icon, link_url, link_label, link_label_ar,
       badge_text, badge_text_ar, bg_color, text_color,
       sort_order, is_active, starts_at || null, ends_at || null, id]
    );

    if (result.rowCount === 0) {
      return sendError(res, 'NOT_FOUND', 'Content block not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    logger.error('Admin: failed to update login page content', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to update content', 500);
  }
});

/**
 * DELETE /admin/content/:id — Delete content block
 */
router.delete('/admin/content/:id', authenticate, platformGate('platform.settings.update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM login_page_content WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return sendError(res, 'NOT_FOUND', 'Content block not found', 404);
    }
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    logger.error('Admin: failed to delete login page content', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to delete content', 500);
  }
});

/**
 * PATCH /admin/content/:id/toggle — Toggle active status
 */
router.patch('/admin/content/:id/toggle', authenticate, platformGate('platform.settings.update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE login_page_content SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    if (result.rowCount === 0) {
      return sendError(res, 'NOT_FOUND', 'Content block not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    logger.error('Admin: failed to toggle content', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to toggle content', 500);
  }
});

/**
 * PUT /admin/content/reorder — Bulk reorder items within a section
 * Body: { items: [{ id: number, sort_order: number }] }
 */
router.put('/admin/content/reorder', authenticate, platformGate('platform.settings.update'), async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Items array is required', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        if (item.id && typeof item.sort_order === 'number') {
          await client.query(
            'UPDATE login_page_content SET sort_order = $1, updated_at = NOW() WHERE id = $2',
            [item.sort_order, item.id]
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    sendSuccess(res, { reordered: items.length });
  } catch (err: any) {
    logger.error('Admin: failed to reorder content', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to reorder content', 500);
  }
});

/**
 * GET /admin/settings — All login page settings
 */
router.get('/admin/settings', authenticate, platformGate('platform.settings.read'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM login_page_settings ORDER BY key'
    );
    sendSuccess(res, result.rows);
  } catch (err: any) {
    logger.error('Admin: failed to fetch login page settings', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to fetch settings', 500);
  }
});

/**
 * PUT /admin/settings/:key — Update a setting value
 */
router.put('/admin/settings/:key', authenticate, platformGate('platform.settings.update'), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = (req as any).user?.id || null;

    const result = await pool.query(
      `UPDATE login_page_settings SET value = $1, updated_by = $2, updated_at = NOW()
       WHERE key = $3 RETURNING *`,
      [String(value), userId, key]
    );

    if (result.rowCount === 0) {
      return sendError(res, 'NOT_FOUND', 'Setting not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    logger.error('Admin: failed to update login page setting', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to update setting', 500);
  }
});

export default router;
