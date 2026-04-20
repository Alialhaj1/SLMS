/**
 * A-03 Languages — Full CRUD API
 * ==============================
 * Table       : system_languages
 * Permissions : master:languages:[view|create|edit|delete|export]
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

applyEnhancedAudit(router, 'system_languages');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TABLE = 'system_languages';
const COLS  = `id, code, name_en, name_ar, name_native, direction,
  date_format, time_format, number_format, currency_position,
  decimal_separator, thousands_separator,
  flag_icon, is_default, is_system_language, is_document_language,
  is_protected, is_system, is_global, is_favorite,
  is_active, status, sort_order,
  created_by, updated_by, created_at, updated_at`;

// ─── GET / — List with search, filter, sort, pagination ───────────────────────
router.get('/',
  requirePermission('master:languages:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1, limit = 25, search = '',
        status, is_active, direction, is_system_language, is_document_language,
        sortBy = 'sort_order', sortOrder = 'asc',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const params: any[] = [];
      const where: string[] = ['deleted_at IS NULL'];

      if (search) {
        params.push(`%${search}%`);
        const i = params.length;
        where.push(`(code ILIKE $${i} OR name_en ILIKE $${i} OR name_ar ILIKE $${i} OR name_native ILIKE $${i})`);
      }
      if (status)    { params.push(status);     where.push(`status = $${params.length}`); }
      if (is_active !== undefined) { params.push(is_active === 'true'); where.push(`is_active = $${params.length}`); }
      if (direction) { params.push(direction);  where.push(`direction = $${params.length}`); }
      if (is_system_language !== undefined) { params.push(is_system_language === 'true'); where.push(`is_system_language = $${params.length}`); }
      if (is_document_language !== undefined) { params.push(is_document_language === 'true'); where.push(`is_document_language = $${params.length}`); }

      const allowedSort = ['code','name_en','name_ar','name_native','sort_order','direction','created_at','is_active'];
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
      console.error('[Languages] List error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch languages', 500);
    }
  },
);

// ─── GET /stats — Stat cards data ─────────────────────────────────────────────
router.get('/stats',
  requirePermission('master:languages:view'),
  async (_req: Request, res: Response) => {
    try {
      const r = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL)                                          AS total,
          COUNT(*) FILTER (WHERE is_active = true AND deleted_at IS NULL)                     AS active,
          COUNT(*) FILTER (WHERE is_active = false AND deleted_at IS NULL)                    AS inactive,
          COUNT(*) FILTER (WHERE direction = 'rtl' AND deleted_at IS NULL)                    AS rtl_count,
          COUNT(*) FILTER (WHERE is_system_language = true AND deleted_at IS NULL)             AS system_languages,
          COUNT(*) FILTER (WHERE is_document_language = true AND deleted_at IS NULL)           AS document_languages
        FROM ${TABLE}
      `);
      sendSuccess(res, r.rows[0]);
    } catch (err: any) {
      console.error('[Languages] Stats error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
    }
  },
);

// ─── GET /filters — Distinct filter options ───────────────────────────────────
router.get('/filters',
  requirePermission('master:languages:view'),
  async (_req: Request, res: Response) => {
    try {
      const [directions] = await Promise.all([
        pool.query(`SELECT DISTINCT direction FROM ${TABLE} WHERE deleted_at IS NULL AND direction IS NOT NULL ORDER BY direction`),
      ]);
      sendSuccess(res, {
        directions: directions.rows.map(r => r.direction),
      });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
    }
  },
);

// ─── GET /:id — Single record ─────────────────────────────────────────────────
router.get('/:id',
  requirePermission('master:languages:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT ${COLS} FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`,
        [req.params.id],
      );
      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Language not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch language', 500);
    }
  },
);

// ─── POST / — Create ─────────────────────────────────────────────────────────
router.post('/',
  requirePermission('master:languages:create'),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name_en, name_ar, name_native, direction,
        date_format, time_format, number_format, currency_position,
        decimal_separator, thousands_separator,
        flag_icon, is_default, is_system_language, is_document_language,
        is_protected, is_system, is_global, is_favorite,
        is_active, sort_order,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND deleted_at IS NULL`, [code.toLowerCase()]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'A language with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        INSERT INTO ${TABLE} (
          code, name_en, name_ar, name_native, direction,
          date_format, time_format, number_format, currency_position,
          decimal_separator, thousands_separator,
          flag_icon, is_default, is_system_language, is_document_language,
          is_protected, is_system, is_global, is_favorite,
          is_active, status, sort_order, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, 'active', $21, $22
        ) RETURNING ${COLS}
      `, [
        code.toLowerCase(), name_en, name_ar, name_native, direction || 'ltr',
        date_format || 'YYYY-MM-DD', time_format || 'HH:mm:ss', number_format || '#,##0.00',
        currency_position || 'before', decimal_separator || '.', thousands_separator || ',',
        flag_icon, is_default ?? false, is_system_language ?? false, is_document_language ?? false,
        is_protected ?? false, is_system ?? false, is_global ?? true, is_favorite ?? false,
        is_active ?? true, sort_order || 0, userId,
      ]);

      sendSuccess(res, result.rows[0], 201);
    } catch (err: any) {
      console.error('[Languages] Create error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to create language', 500);
    }
  },
);

// ─── PUT /:id — Update ───────────────────────────────────────────────────────
router.put('/:id',
  requirePermission('master:languages:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Language not found', 404);
      }
      if (existing.rows[0].is_protected) {
        return sendError(res, 'PROTECTED', 'Protected languages cannot be modified', 403);
      }

      const {
        code, name_en, name_ar, name_native, direction,
        date_format, time_format, number_format, currency_position,
        decimal_separator, thousands_separator,
        flag_icon, is_default, is_system_language, is_document_language,
        is_protected, is_system, is_global, is_favorite,
        is_active, sort_order,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND id != $2 AND deleted_at IS NULL`, [code.toLowerCase(), id]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'Another language with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET
          code = $1, name_en = $2, name_ar = $3, name_native = $4, direction = $5,
          date_format = $6, time_format = $7, number_format = $8, currency_position = $9,
          decimal_separator = $10, thousands_separator = $11,
          flag_icon = $12, is_default = $13, is_system_language = $14, is_document_language = $15,
          is_protected = $16, is_system = $17, is_global = $18, is_favorite = $19,
          is_active = $20, sort_order = $21, updated_by = $22, updated_at = NOW()
        WHERE id = $23 AND deleted_at IS NULL
        RETURNING ${COLS}
      `, [
        code.toLowerCase(), name_en, name_ar, name_native, direction || 'ltr',
        date_format, time_format, number_format, currency_position,
        decimal_separator, thousands_separator,
        flag_icon, is_default ?? false, is_system_language ?? false, is_document_language ?? false,
        is_protected ?? false, is_system ?? false, is_global ?? true, is_favorite ?? false,
        is_active ?? true, sort_order, userId, id,
      ]);

      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      console.error('[Languages] Update error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to update language', 500);
    }
  },
);

// ─── PATCH /:id/status — Toggle active/inactive ──────────────────────────────
router.patch('/:id/status',
  requirePermission('master:languages:edit'),
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
        return sendError(res, 'NOT_FOUND', 'Language not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to update status', 500);
    }
  },
);

// ─── DELETE /:id — Soft delete ────────────────────────────────────────────────
router.delete('/:id',
  requirePermission('master:languages:delete'),
  dynamicDeletionProtection('system_languages'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(`SELECT is_protected FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Language not found', 404);
      }
      if (existing.rows[0].is_protected) {
        return sendError(res, 'PROTECTED', 'Protected languages cannot be deleted', 403);
      }

      const userId = (req as any).user?.id || null;
      await pool.query(
        `UPDATE ${TABLE} SET deleted_at = NOW(), status = 'inactive', is_active = false, updated_by = $1 WHERE id = $2`,
        [userId, id],
      );
      sendSuccess(res, { message: 'Language deleted' });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to delete language', 500);
    }
  },
);

// ─── POST /:id/restore — Restore soft-deleted ────────────────────────────────
router.post('/:id/restore',
  requirePermission('master:languages:edit'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET deleted_at = NULL, status = 'active', is_active = true, updated_by = $1, updated_at = NOW()
        WHERE id = $2 RETURNING ${COLS}
      `, [userId, req.params.id]);

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Language not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to restore language', 500);
    }
  },
);

// ─── POST /bulk/status — Bulk status change ──────────────────────────────────
router.post('/bulk/status',
  requirePermission('master:languages:edit'),
  async (req: Request, res: Response) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || !['active', 'inactive'].includes(status)) {
        return sendError(res, 'VALIDATION_ERROR', 'ids[] and valid status required', 400);
      }
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET status = $1, is_active = $2, updated_by = $3, updated_at = NOW()
        WHERE id = ANY($4) AND deleted_at IS NULL AND is_protected = false
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
  requirePermission('master:languages:delete'),
  async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'ids[] required', 400);
      }
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET deleted_at = NOW(), status = 'inactive', is_active = false, updated_by = $1
        WHERE id = ANY($2) AND deleted_at IS NULL AND is_protected = false
        RETURNING id
      `, [userId, ids]);

      sendSuccess(res, { deleted: result.rowCount });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Bulk delete failed', 500);
    }
  },
);

export default router;
