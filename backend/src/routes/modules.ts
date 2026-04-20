import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/modules
 * List all modules with tenant usage counts
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT
        m.id,
        m.module_name AS name,
        m.module_code AS code,
        COALESCE(m.description, '') AS description,
        COALESCE(m.icon_name, '') AS icon,
        COALESCE(m.is_active, true) AS is_enabled,
        COALESCE(m.category, '') AS category,
        '1.0.0' AS version,
        COUNT(DISTINCT tm.tenant_id) FILTER (WHERE tm.is_enabled = true) AS tenant_count
      FROM modules m
      LEFT JOIN tenant_modules tm ON tm.module_code = m.module_code AND tm.deleted_at IS NULL
      WHERE m.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(m.module_name) LIKE $${params.length} OR LOWER(m.module_code) LIKE $${params.length})`;
    }

    query += ` GROUP BY m.id, m.module_name, m.module_code, m.description, m.icon_name, m.is_active, m.category ORDER BY m.module_name`;

    const result = await pool.query(query, params);

    sendSuccess(res, result.rows);
  } catch (error: any) {
    logger.error('Failed to fetch modules', error);
    sendError(res, 'FETCH_FAILED', 'Failed to fetch modules', 500);
  }
});

/**
 * PUT /api/modules/:id
 * Toggle module enabled/disabled
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;

    const result = await pool.query(
      `UPDATE modules SET is_active = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
      [is_enabled, id]
    );

    if (result.rowCount === 0) {
      return sendError(res, 'NOT_FOUND', 'Module not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (error: any) {
    logger.error('Failed to update module', error);
    sendError(res, 'UPDATE_FAILED', 'Failed to update module', 500);
  }
});

export default router;
