/**
 * A-04 Timezones — Full CRUD API
 * ===============================
 * Table       : time_zones
 * Permissions : master:timezones:[view|create|edit|delete|export]
 * Middleware   : authenticate → loadCompanyContext → requirePermission
 * Audit        : ✅ applyEnhancedAudit
 * Reference Protection: ✅ dynamicDeletionProtection
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import { applyEnhancedAudit } from '../../middleware/enhancedAuditLog';
import { dynamicDeletionProtection } from '../../services/referenceIntegrityEngine';
import pool from '../../db';

const router = Router();

// ─── Global Middleware ────────────────────────────────────────────────────────
router.use(authenticate);
router.use(loadCompanyContext);

applyEnhancedAudit(router, 'time_zones');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TABLE = 'time_zones';
const COLS  = `id, code, name_en, name_ar, description_en, description_ar,
  abbreviation, utc_offset, dst_observed, region,
  is_default, is_system, is_active, status, sort_order,
  created_by, updated_by, created_at, updated_at`;

// ─── GET / — List with search, filter, sort, pagination ───────────────────────
router.get('/',
  requirePermission('master:timezones:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1, limit = 25, search = '',
        status, is_active, region, dst_observed,
        sortBy = 'sort_order', sortOrder = 'asc',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const params: any[] = [];
      const where: string[] = ['deleted_at IS NULL'];

      if (search) {
        params.push(`%${search}%`);
        const i = params.length;
        where.push(`(code ILIKE $${i} OR name_en ILIKE $${i} OR name_ar ILIKE $${i} OR abbreviation ILIKE $${i} OR utc_offset ILIKE $${i})`);
      }
      if (status)    { params.push(status);     where.push(`status = $${params.length}`); }
      if (is_active !== undefined) { params.push(is_active === 'true'); where.push(`is_active = $${params.length}`); }
      if (region)    { params.push(region);     where.push(`region = $${params.length}`); }
      if (dst_observed !== undefined) { params.push(dst_observed === 'true'); where.push(`dst_observed = $${params.length}`); }

      const allowedSort = ['code','name_en','name_ar','utc_offset','abbreviation','sort_order','region','created_at','is_active'];
      const col = allowedSort.includes(String(sortBy)) ? String(sortBy) : 'sort_order';
      const dir = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const whereStr = where.join(' AND ');
      const countQ = `SELECT COUNT(*) FROM ${TABLE} WHERE ${whereStr}`;
      const dataQ  = `SELECT ${COLS} FROM ${TABLE} WHERE ${whereStr} ORDER BY ${col} ${dir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      params.push(Number(limit), offset);

      const [countRes, dataRes] = await Promise.all([
        pool.query(countQ, params.slice(0, params.length - 2)),
        pool.query(dataQ, params),
      ]);

      sendSuccess(res, {
        data: dataRes.rows,
        total: parseInt(countRes.rows[0].count),
        page: Number(page),
        limit: Number(limit),
      });
    } catch (err: any) {
      console.error('[Timezones] List error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch timezones', 500);
    }
  },
);

// ─── GET /stats — Stat cards data ─────────────────────────────────────────────
router.get('/stats',
  requirePermission('master:timezones:view'),
  async (_req: Request, res: Response) => {
    try {
      const r = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL)                                  AS total,
          COUNT(*) FILTER (WHERE is_active = true AND deleted_at IS NULL)             AS active,
          COUNT(*) FILTER (WHERE is_active = false AND deleted_at IS NULL)            AS inactive,
          COUNT(*) FILTER (WHERE dst_observed = true AND deleted_at IS NULL)          AS dst_count,
          COUNT(DISTINCT region) FILTER (WHERE deleted_at IS NULL AND region IS NOT NULL) AS regions
        FROM ${TABLE}
      `);
      sendSuccess(res, r.rows[0]);
    } catch (err: any) {
      console.error('[Timezones] Stats error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
    }
  },
);

// ─── GET /filters — Distinct filter options ───────────────────────────────────
router.get('/filters',
  requirePermission('master:timezones:view'),
  async (_req: Request, res: Response) => {
    try {
      const [regions] = await Promise.all([
        pool.query(`SELECT DISTINCT region FROM ${TABLE} WHERE deleted_at IS NULL AND region IS NOT NULL ORDER BY region`),
      ]);
      sendSuccess(res, {
        regions: regions.rows.map(r => r.region),
      });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
    }
  },
);

// ─── GET /:id — Single record ─────────────────────────────────────────────────
router.get('/:id',
  requirePermission('master:timezones:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT ${COLS} FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`,
        [req.params.id],
      );
      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Timezone not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch timezone', 500);
    }
  },
);

// ─── POST / — Create ─────────────────────────────────────────────────────────
router.post('/',
  requirePermission('master:timezones:create'),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name_en, name_ar, description_en, description_ar,
        abbreviation, utc_offset, dst_observed, region,
        is_default, is_system, is_active, sort_order,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND deleted_at IS NULL`, [code]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'A timezone with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        INSERT INTO ${TABLE} (
          code, name_en, name_ar, description_en, description_ar,
          abbreviation, utc_offset, dst_observed, region,
          is_default, is_system, is_active, status, sort_order, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, 'active', $13, $14
        ) RETURNING ${COLS}
      `, [
        code, name_en, name_ar, description_en, description_ar,
        abbreviation, utc_offset || '+00:00', dst_observed ?? false, region,
        is_default ?? false, is_system ?? false, is_active ?? true,
        sort_order || 0, userId,
      ]);

      sendSuccess(res, result.rows[0], 201);
    } catch (err: any) {
      console.error('[Timezones] Create error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to create timezone', 500);
    }
  },
);

// ─── PUT /:id — Update ───────────────────────────────────────────────────────
router.put('/:id',
  requirePermission('master:timezones:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Timezone not found', 404);
      }
      if (existing.rows[0].is_system) {
        return sendError(res, 'PROTECTED', 'System timezones cannot be modified', 403);
      }

      const {
        code, name_en, name_ar, description_en, description_ar,
        abbreviation, utc_offset, dst_observed, region,
        is_default, is_system, is_active, sort_order,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND id != $2 AND deleted_at IS NULL`, [code, id]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'Another timezone with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET
          code = $1, name_en = $2, name_ar = $3, description_en = $4, description_ar = $5,
          abbreviation = $6, utc_offset = $7, dst_observed = $8, region = $9,
          is_default = $10, is_system = $11, is_active = $12,
          sort_order = $13, updated_by = $14, updated_at = NOW()
        WHERE id = $15 AND deleted_at IS NULL
        RETURNING ${COLS}
      `, [
        code, name_en, name_ar, description_en, description_ar,
        abbreviation, utc_offset, dst_observed ?? false, region,
        is_default ?? false, is_system ?? false, is_active ?? true,
        sort_order, userId, id,
      ]);

      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      console.error('[Timezones] Update error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to update timezone', 500);
    }
  },
);

// ─── PATCH /:id/status — Toggle active/inactive ──────────────────────────────
router.patch('/:id/status',
  requirePermission('master:timezones:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive'].includes(status)) {
        return sendError(res, 'VALIDATION_ERROR', 'Status must be "active" or "inactive"', 400);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET status = $1, is_active = $2, updated_by = $3, updated_at = NOW()
        WHERE id = $4 AND deleted_at IS NULL RETURNING ${COLS}
      `, [status, status === 'active', userId, id]);

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Timezone not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to update status', 500);
    }
  },
);

// ─── DELETE /:id — Soft delete ────────────────────────────────────────────────
router.delete('/:id',
  requirePermission('master:timezones:delete'),
  dynamicDeletionProtection('time_zones'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(`SELECT is_system FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Timezone not found', 404);
      }
      if (existing.rows[0].is_system) {
        return sendError(res, 'PROTECTED', 'System timezones cannot be deleted', 403);
      }

      const userId = (req as any).user?.id || null;
      await pool.query(
        `UPDATE ${TABLE} SET deleted_at = NOW(), status = 'inactive', is_active = false, updated_by = $1 WHERE id = $2`,
        [userId, id],
      );
      sendSuccess(res, { message: 'Timezone deleted' });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to delete timezone', 500);
    }
  },
);

// ─── POST /:id/restore — Restore soft-deleted ────────────────────────────────
router.post('/:id/restore',
  requirePermission('master:timezones:edit'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET deleted_at = NULL, status = 'active', is_active = true, updated_by = $1, updated_at = NOW()
        WHERE id = $2 RETURNING ${COLS}
      `, [userId, req.params.id]);

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Timezone not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to restore timezone', 500);
    }
  },
);

// ─── POST /bulk/status — Bulk status change ──────────────────────────────────
router.post('/bulk/status',
  requirePermission('master:timezones:edit'),
  async (req: Request, res: Response) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || !['active', 'inactive'].includes(status)) {
        return sendError(res, 'VALIDATION_ERROR', 'ids[] and valid status required', 400);
      }
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET status = $1, is_active = $2, updated_by = $3, updated_at = NOW()
        WHERE id = ANY($4) AND deleted_at IS NULL AND is_system = false
        RETURNING id
      `, [status, status === 'active', userId, ids]);

      sendSuccess(res, { updated: result.rowCount });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Bulk status update failed', 500);
    }
  },
);

// ─── POST /bulk/delete — Bulk soft-delete ─────────────────────────────────────
router.post('/bulk/delete',
  requirePermission('master:timezones:delete'),
  async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'ids[] required', 400);
      }
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET deleted_at = NOW(), status = 'inactive', is_active = false, updated_by = $1
        WHERE id = ANY($2) AND deleted_at IS NULL AND is_system = false
        RETURNING id
      `, [userId, ids]);

      sendSuccess(res, { deleted: result.rowCount });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Bulk delete failed', 500);
    }
  },
);

export default router;
