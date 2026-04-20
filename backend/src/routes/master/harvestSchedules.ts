/**
 * 🌾 HARVEST SCHEDULES ROUTES (Enterprise Edition)
 * ====================================================
 * Phase D — Screen 17: Harvest Schedules (مواعيد الحصاد)
 * Manage harvest seasons and schedules for agricultural/seasonal products.
 * Depends on: Item Groups (Screen 13), Countries, Units.
 *
 * Endpoints:
 *   GET    /stats              — Dashboard stat cards
 *   GET    /                   — List with filters + joined lookups
 *   GET    /:id                — Single record with lookups
 *   POST   /                   — Create
 *   PUT    /:id                — Update
 *   DELETE /:id                — Soft delete
 *   PATCH  /:id/toggle-status  — Toggle active/inactive
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requireAnyPermission } from '../../middleware/rbac';
import { enhancedAudit } from '../../middleware/enhancedAuditLog';

const router = Router();

// ─── Permissions ────────────────────────────────────────────────────────────
const VIEW_PERMS   = ['harvest_schedules:view',   'harvest_schedules:manage', 'master:harvest_schedules:view'];
const EDIT_PERMS   = ['harvest_schedules:edit',   'harvest_schedules:manage', 'master:harvest_schedules:edit'];
const CREATE_PERMS = ['harvest_schedules:create', 'harvest_schedules:manage', 'master:harvest_schedules:create'];
const DELETE_PERMS = ['harvest_schedules:delete', 'harvest_schedules:manage', 'master:harvest_schedules:delete'];

router.use(authenticate);
router.use(loadCompanyContext);

// ─── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireAnyPermission(VIEW_PERMS), async (_req: Request, res: Response) => {
  try {
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active,
        COUNT(*) FILTER (WHERE
          (start_month <= end_month AND $1 >= start_month AND $1 <= end_month)
          OR (start_month > end_month AND ($1 >= start_month OR $1 <= end_month))
        )::int AS in_season,
        COUNT(DISTINCT season)::int AS season_count,
        COUNT(DISTINCT country_id) FILTER (WHERE country_id IS NOT NULL)::int AS country_count
      FROM harvest_schedules
      WHERE deleted_at IS NULL
    `, [currentMonth]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching harvest schedule stats:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch stats' } });
  }
});

// ─── GET / ──────────────────────────────────────────────────────────────────
router.get('/', requireAnyPermission(VIEW_PERMS), async (req: Request, res: Response) => {
  try {
    const {
      page = '1', limit = '25',
      sortBy = 'created_at', sortOrder = 'desc',
      search, season, country_id,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset   = (pageNum - 1) * limitNum;

    const allowedSort = ['code', 'name', 'name_ar', 'season', 'start_month', 'end_month', 'is_active', 'created_at'];
    const sortField = allowedSort.includes(sortBy as string) ? `hs.${sortBy}` : 'hs.created_at';
    const order = (sortOrder as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const params: any[] = [];
    let paramIdx = 1;
    const conditions = ['hs.deleted_at IS NULL'];

    if (search) {
      conditions.push(`(hs.code ILIKE $${paramIdx} OR hs.name ILIKE $${paramIdx} OR hs.name_ar ILIKE $${paramIdx} OR hs.region ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (season && season !== '') {
      conditions.push(`hs.season = $${paramIdx}`);
      params.push(season);
      paramIdx++;
    }
    if (country_id && country_id !== '') {
      conditions.push(`hs.country_id = $${paramIdx}`);
      params.push(parseInt(country_id as string, 10));
      paramIdx++;
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM harvest_schedules hs WHERE ${where}`,
      params
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(`
      SELECT hs.*,
        c.name_en AS country_name_en,
        c.name_ar AS country_name_ar,
        (SELECT COUNT(*)::int FROM items i WHERE i.harvest_schedule_id = hs.id AND i.deleted_at IS NULL) AS usage_count
      FROM harvest_schedules hs
      LEFT JOIN countries c ON c.id = hs.country_id
      WHERE ${where}
      ORDER BY ${sortField} ${order}, hs.id ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limitNum, offset]);

    res.json({ success: true, data: result.rows, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching harvest schedules:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch harvest schedules' } });
  }
});

// ─── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', requireAnyPermission(VIEW_PERMS), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT hs.*,
        c.name_en AS country_name_en,
        c.name_ar AS country_name_ar,
        (SELECT COUNT(*)::int FROM items i WHERE i.harvest_schedule_id = hs.id AND i.deleted_at IS NULL) AS usage_count
      FROM harvest_schedules hs
      LEFT JOIN countries c ON c.id = hs.country_id
      WHERE hs.id = $1 AND hs.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Harvest schedule not found' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching harvest schedule:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch harvest schedule' } });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────
const toIntOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
};
const toFloatOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
};
const toStringOrNull = (v: any): string | null => {
  if (v === null || v === undefined || v === '') return null;
  return String(v);
};

// ─── POST / ─────────────────────────────────────────────────────────────────
router.post('/', requireAnyPermission(CREATE_PERMS), enhancedAudit('harvest_schedules'), async (req: Request, res: Response) => {
  try {
    const { code, name: nameVal, name_ar, description } = req.body;
    const season = req.body.season || 'year_round';
    const start_month    = toIntOrNull(req.body.start_month);
    const end_month      = toIntOrNull(req.body.end_month);
    const harvest_duration_days = toIntOrNull(req.body.harvest_duration_days);
    const country_id     = toIntOrNull(req.body.country_id);
    const region         = toStringOrNull(req.body.region);
    const notes          = toStringOrNull(req.body.notes);

    if (!code || !nameVal || !name_ar) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'code, name and name_ar are required' } });
    }
    if (start_month === null || end_month === null || start_month < 1 || start_month > 12 || end_month < 1 || end_month > 12) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'start_month and end_month must be between 1 and 12' } });
    }

    const validSeasons = ['spring', 'summer', 'autumn', 'winter', 'year_round'];
    if (!validSeasons.includes(season)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `season must be one of: ${validSeasons.join(', ')}` } });
    }

    // Check duplicate code
    const dup = await pool.query('SELECT id FROM harvest_schedules WHERE code = $1 AND deleted_at IS NULL', [code]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `Code "${code}" already exists` } });
    }

    const userId = (req as any).user?.sub || (req as any).user?.id;
    const companyId = (req as any).companyContext?.companyId || 1;

    const result = await pool.query(`
      INSERT INTO harvest_schedules (
        company_id, code, name, name_ar, description,
        season, start_month, end_month,
        harvest_duration_days,
        region, country_id,
        notes,
        is_active,
        created_by, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13,NOW(),NOW())
      RETURNING *
    `, [
      companyId, code, nameVal, name_ar, description || '',
      season, start_month, end_month,
      harvest_duration_days,
      region, country_id,
      notes,
      userId,
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating harvest schedule:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create harvest schedule' } });
  }
});

// ─── PUT /:id ───────────────────────────────────────────────────────────────
router.put('/:id', requireAnyPermission(EDIT_PERMS), enhancedAudit('harvest_schedules'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM harvest_schedules WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Harvest schedule not found' } });
    }

    if (existing.rows[0].is_active === false && req.body.is_active === undefined) {
      // No special handling needed for non-system records
    }

    const { code, name: nameVal, name_ar, description } = req.body;
    const season      = req.body.season || undefined;
    const start_month    = toIntOrNull(req.body.start_month);
    const end_month      = toIntOrNull(req.body.end_month);
    const harvest_duration_days = toIntOrNull(req.body.harvest_duration_days);
    const country_id     = toIntOrNull(req.body.country_id);
    const region         = toStringOrNull(req.body.region);
    const notes          = toStringOrNull(req.body.notes);
    const is_active      = req.body.is_active;

    if (code && code !== existing.rows[0].code) {
      const dup = await pool.query('SELECT id FROM harvest_schedules WHERE code = $1 AND id != $2 AND deleted_at IS NULL', [code, id]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `Code "${code}" already exists` } });
      }
    }

    if (season) {
      const validSeasons = ['spring', 'summer', 'autumn', 'winter', 'year_round'];
      if (!validSeasons.includes(season)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `season must be one of: ${validSeasons.join(', ')}` } });
      }
    }

    const userId = (req as any).user?.sub || (req as any).user?.id;
    const result = await pool.query(`
      UPDATE harvest_schedules SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        name_ar = COALESCE($3, name_ar),
        description = COALESCE($4, description),
        season = COALESCE($5, season),
        start_month = COALESCE($6, start_month),
        end_month = COALESCE($7, end_month),
        harvest_duration_days = $8,
        region = $9,
        country_id = $10,
        notes = $11,
        is_active = COALESCE($12, is_active),
        updated_by = $13,
        updated_at = NOW()
      WHERE id = $14 AND deleted_at IS NULL
      RETURNING *
    `, [
      code, nameVal, name_ar, description,
      season, start_month, end_month,
      harvest_duration_days,
      region, country_id,
      notes,
      is_active, userId, id,
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating harvest schedule:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update harvest schedule' } });
  }
});

// ─── DELETE /:id ────────────────────────────────────────────────────────────
router.delete('/:id', requireAnyPermission(DELETE_PERMS), enhancedAudit('harvest_schedules'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM harvest_schedules WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Harvest schedule not found' } });
    }

    // Check if used by any items
    const usage = await pool.query('SELECT COUNT(*)::int AS cnt FROM items WHERE harvest_schedule_id = $1 AND deleted_at IS NULL', [id]);
    if (usage.rows[0].cnt > 0) {
      return res.status(409).json({ success: false, error: { code: 'IN_USE', message: `Cannot delete — used by ${usage.rows[0].cnt} item(s)` } });
    }

    const userId = (req as any).user?.sub || (req as any).user?.id;
    await pool.query(
      'UPDATE harvest_schedules SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
      [userId, id]
    );

    res.json({ success: true, message: 'Harvest schedule deleted' });
  } catch (error) {
    console.error('Error deleting harvest schedule:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete harvest schedule' } });
  }
});

// ─── PATCH /:id/toggle-status ───────────────────────────────────────────────
router.patch('/:id/toggle-status', requireAnyPermission(EDIT_PERMS), enhancedAudit('harvest_schedules'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.sub || (req as any).user?.id;

    const result = await pool.query(`
      UPDATE harvest_schedules SET
        is_active = NOT is_active,
        updated_by = $1,
        updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Harvest schedule not found' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error toggling harvest schedule status:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to toggle status' } });
  }
});

export default router;
