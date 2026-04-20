/**
 * A-14 Contact Methods — Full CRUD API
 * ======================================
 * Table       : contact_methods
 * Permissions : master:contact_methods:[view|create|edit|delete|export]
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

applyEnhancedAudit(router, 'contact_methods');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TABLE = 'contact_methods';
const COLS  = `id, code, name_en, name_ar, description_en, description_ar,
  icon, icon_color, input_type, input_format, validation_regex,
  placeholder_en, placeholder_ar,
  is_primary, is_notification_channel, is_system, is_active, status,
  sort_order, created_by, updated_by, created_at, updated_at`;

// ─── GET / — List with search, filter, sort, pagination ───────────────────────
router.get('/',
  requirePermission('master:contact_methods:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1, limit = 25, search = '',
        status, is_active, input_type, is_primary, is_notification_channel,
        sortBy = 'sort_order', sortOrder = 'asc',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const params: any[] = [];
      const where: string[] = ['deleted_at IS NULL'];

      if (search) {
        params.push(`%${search}%`);
        const i = params.length;
        where.push(`(code ILIKE $${i} OR name_en ILIKE $${i} OR name_ar ILIKE $${i} OR description_en ILIKE $${i})`);
      }
      if (status)     { params.push(status);     where.push(`status = $${params.length}`); }
      if (is_active !== undefined) { params.push(is_active === 'true'); where.push(`is_active = $${params.length}`); }
      if (input_type) { params.push(input_type); where.push(`input_type = $${params.length}`); }
      if (is_primary !== undefined) { params.push(is_primary === 'true'); where.push(`is_primary = $${params.length}`); }
      if (is_notification_channel !== undefined) { params.push(is_notification_channel === 'true'); where.push(`is_notification_channel = $${params.length}`); }

      const allowedSort = ['code','name_en','name_ar','sort_order','input_type','created_at','is_active'];
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
      console.error('[ContactMethods] List error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch contact methods', 500);
    }
  },
);

// ─── GET /stats — Stat cards data ─────────────────────────────────────────────
router.get('/stats',
  requirePermission('master:contact_methods:view'),
  async (_req: Request, res: Response) => {
    try {
      const r = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL)                                         AS total,
          COUNT(*) FILTER (WHERE is_active = true AND deleted_at IS NULL)                    AS active,
          COUNT(*) FILTER (WHERE is_active = false AND deleted_at IS NULL)                   AS inactive,
          COUNT(*) FILTER (WHERE is_primary = true AND deleted_at IS NULL)                   AS primary_count,
          COUNT(*) FILTER (WHERE is_notification_channel = true AND deleted_at IS NULL)      AS notification_channels
        FROM ${TABLE}
      `);
      sendSuccess(res, r.rows[0]);
    } catch (err: any) {
      console.error('[ContactMethods] Stats error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
    }
  },
);

// ─── GET /filters — Distinct filter options ───────────────────────────────────
router.get('/filters',
  requirePermission('master:contact_methods:view'),
  async (_req: Request, res: Response) => {
    try {
      const [inputTypes] = await Promise.all([
        pool.query(`SELECT DISTINCT input_type FROM ${TABLE} WHERE deleted_at IS NULL AND input_type IS NOT NULL ORDER BY input_type`),
      ]);
      sendSuccess(res, {
        inputTypes: inputTypes.rows.map(r => r.input_type),
      });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
    }
  },
);

// ─── GET /:id — Single record ─────────────────────────────────────────────────
router.get('/:id',
  requirePermission('master:contact_methods:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT ${COLS} FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`,
        [req.params.id],
      );
      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Contact method not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch contact method', 500);
    }
  },
);

// ─── POST / — Create ─────────────────────────────────────────────────────────
router.post('/',
  requirePermission('master:contact_methods:create'),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name_en, name_ar, description_en, description_ar,
        icon, icon_color, input_type, input_format, validation_regex,
        placeholder_en, placeholder_ar,
        is_primary, is_notification_channel, is_system, is_active, sort_order,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND deleted_at IS NULL`, [code.toLowerCase()]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'A contact method with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        INSERT INTO ${TABLE} (
          code, name_en, name_ar, description_en, description_ar,
          icon, icon_color, input_type, input_format, validation_regex,
          placeholder_en, placeholder_ar,
          is_primary, is_notification_channel, is_system, is_active, status,
          sort_order, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12,
          $13, $14, $15, $16, 'active',
          $17, $18
        ) RETURNING ${COLS}
      `, [
        code.toLowerCase(), name_en, name_ar, description_en, description_ar,
        icon, icon_color, input_type || 'text', input_format, validation_regex,
        placeholder_en, placeholder_ar,
        is_primary ?? false, is_notification_channel ?? false, is_system ?? false,
        is_active ?? true, sort_order || 0, userId,
      ]);

      sendSuccess(res, result.rows[0], 201);
    } catch (err: any) {
      console.error('[ContactMethods] Create error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to create contact method', 500);
    }
  },
);

// ─── PUT /:id — Update ───────────────────────────────────────────────────────
router.put('/:id',
  requirePermission('master:contact_methods:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Contact method not found', 404);
      }
      if (existing.rows[0].is_system) {
        return sendError(res, 'PROTECTED', 'System contact methods cannot be modified', 403);
      }

      const {
        code, name_en, name_ar, description_en, description_ar,
        icon, icon_color, input_type, input_format, validation_regex,
        placeholder_en, placeholder_ar,
        is_primary, is_notification_channel, is_system, is_active, sort_order,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND id != $2 AND deleted_at IS NULL`, [code.toLowerCase(), id]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'Another contact method with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET
          code = $1, name_en = $2, name_ar = $3, description_en = $4, description_ar = $5,
          icon = $6, icon_color = $7, input_type = $8, input_format = $9, validation_regex = $10,
          placeholder_en = $11, placeholder_ar = $12,
          is_primary = $13, is_notification_channel = $14, is_system = $15, is_active = $16,
          sort_order = $17, updated_by = $18, updated_at = NOW()
        WHERE id = $19 AND deleted_at IS NULL
        RETURNING ${COLS}
      `, [
        code.toLowerCase(), name_en, name_ar, description_en, description_ar,
        icon, icon_color, input_type || 'text', input_format, validation_regex,
        placeholder_en, placeholder_ar,
        is_primary ?? false, is_notification_channel ?? false, is_system ?? false,
        is_active ?? true, sort_order, userId, id,
      ]);

      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      console.error('[ContactMethods] Update error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to update contact method', 500);
    }
  },
);

// ─── PATCH /:id/status — Toggle active/inactive ──────────────────────────────
router.patch('/:id/status',
  requirePermission('master:contact_methods:edit'),
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
        return sendError(res, 'NOT_FOUND', 'Contact method not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to update status', 500);
    }
  },
);

// ─── DELETE /:id — Soft delete ────────────────────────────────────────────────
router.delete('/:id',
  requirePermission('master:contact_methods:delete'),
  dynamicDeletionProtection('contact_methods'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(`SELECT is_system FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Contact method not found', 404);
      }
      if (existing.rows[0].is_system) {
        return sendError(res, 'PROTECTED', 'System contact methods cannot be deleted', 403);
      }

      const userId = (req as any).user?.id || null;
      await pool.query(
        `UPDATE ${TABLE} SET deleted_at = NOW(), status = 'inactive', is_active = false, updated_by = $1 WHERE id = $2`,
        [userId, id],
      );
      sendSuccess(res, { message: 'Contact method deleted' });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to delete contact method', 500);
    }
  },
);

// ─── POST /:id/restore — Restore soft-deleted ────────────────────────────────
router.post('/:id/restore',
  requirePermission('master:contact_methods:edit'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET deleted_at = NULL, status = 'active', is_active = true, updated_by = $1, updated_at = NOW()
        WHERE id = $2 RETURNING ${COLS}
      `, [userId, req.params.id]);

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Contact method not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to restore contact method', 500);
    }
  },
);

// ─── POST /bulk/status — Bulk status change ──────────────────────────────────
router.post('/bulk/status',
  requirePermission('master:contact_methods:edit'),
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
  requirePermission('master:contact_methods:delete'),
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
