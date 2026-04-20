/**
 * A-16 Request Statuses — Full CRUD API
 * ======================================
 * Table       : request_statuses
 * Permissions : master:request_statuses:[view|create|edit|delete|export]
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

applyEnhancedAudit(router, 'request_statuses');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TABLE = 'request_statuses';
const COLS  = `id, code, name, name_en, name_ar, description, description_en, description_ar,
  stage, category, color, bg_color, icon, sort_order,
  allows_edit, allows_delete, allows_print, allows_submit, allows_approve, allows_execute,
  is_editable, is_deletable, is_final, requires_approval, applies_to,
  is_active, is_system, status, created_by, updated_by, created_at, updated_at`;

// ─── GET / — List with search, filter, sort, pagination ───────────────────────
router.get('/',
  requirePermission('master:request_statuses:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1, limit = 25, search = '',
        status, is_active, is_system, category, stage,
        sortBy = 'sort_order', sortOrder = 'asc',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const params: any[] = [];
      const where: string[] = ['deleted_at IS NULL'];

      if (search) {
        params.push(`%${search}%`);
        const i = params.length;
        where.push(`(code ILIKE $${i} OR name ILIKE $${i} OR name_en ILIKE $${i} OR name_ar ILIKE $${i} OR description ILIKE $${i})`);
      }
      if (status)    { params.push(status);     where.push(`status = $${params.length}`); }
      if (is_active !== undefined) { params.push(is_active === 'true'); where.push(`is_active = $${params.length}`); }
      if (is_system !== undefined) { params.push(is_system === 'true'); where.push(`is_system = $${params.length}`); }
      if (category)  { params.push(category);   where.push(`category = $${params.length}`); }
      if (stage)     { params.push(stage);      where.push(`stage = $${params.length}`); }

      const allowedSort = ['code','name','name_en','name_ar','sort_order','stage','category','created_at','is_active'];
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
      console.error('[RequestStatuses] List error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch request statuses', 500);
    }
  },
);

// ─── GET /stats — Stat cards data ─────────────────────────────────────────────
router.get('/stats',
  requirePermission('master:request_statuses:view'),
  async (_req: Request, res: Response) => {
    try {
      const r = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL)                         AS total,
          COUNT(*) FILTER (WHERE is_active = true AND deleted_at IS NULL)    AS active,
          COUNT(*) FILTER (WHERE is_active = false AND deleted_at IS NULL)   AS inactive,
          COUNT(*) FILTER (WHERE is_system = true AND deleted_at IS NULL)    AS system_count,
          COUNT(*) FILTER (WHERE is_final = true AND deleted_at IS NULL)     AS final_states,
          COUNT(*) FILTER (WHERE requires_approval = true AND deleted_at IS NULL) AS approval_required
        FROM ${TABLE}
      `);
      sendSuccess(res, r.rows[0]);
    } catch (err: any) {
      console.error('[RequestStatuses] Stats error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
    }
  },
);

// ─── GET /filters — Distinct filter options ───────────────────────────────────
router.get('/filters',
  requirePermission('master:request_statuses:view'),
  async (_req: Request, res: Response) => {
    try {
      const [categories, stages] = await Promise.all([
        pool.query(`SELECT DISTINCT category FROM ${TABLE} WHERE deleted_at IS NULL AND category IS NOT NULL ORDER BY category`),
        pool.query(`SELECT DISTINCT stage FROM ${TABLE} WHERE deleted_at IS NULL AND stage IS NOT NULL ORDER BY stage`),
      ]);
      sendSuccess(res, {
        categories: categories.rows.map(r => r.category),
        stages:     stages.rows.map(r => r.stage),
      });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
    }
  },
);

// ─── GET /:id — Single record ─────────────────────────────────────────────────
router.get('/:id',
  requirePermission('master:request_statuses:view'),
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT ${COLS} FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`,
        [req.params.id],
      );
      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Request status not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to fetch request status', 500);
    }
  },
);

// ─── POST / — Create ─────────────────────────────────────────────────────────
router.post('/',
  requirePermission('master:request_statuses:create'),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name_en, name_ar, description_en, description_ar,
        stage, category, color, bg_color, icon, sort_order,
        is_editable, is_deletable, is_final, requires_approval,
        applies_to, is_active, is_system,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      // Check duplicate code
      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND deleted_at IS NULL`, [code.toUpperCase()]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'A request status with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        INSERT INTO ${TABLE} (
          code, name, name_en, name_ar, description, description_en, description_ar,
          stage, category, color, bg_color, icon, sort_order,
          allows_edit, allows_delete, is_editable, is_deletable,
          is_final, requires_approval, applies_to,
          is_active, is_system, status, created_by
        ) VALUES (
          $1, $2, $2, $3, $4, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $12, $13,
          $14, $15, $16,
          $17, $18, 'active', $19
        ) RETURNING ${COLS}
      `, [
        code.toUpperCase(), name_en, name_ar, description_en, description_ar,
        stage || 'draft', category || 'general', color || '#6B7280', bg_color || '#F3F4F6',
        icon, sort_order || 0,
        is_editable ?? true, is_deletable ?? true,
        is_final ?? false, requires_approval ?? false, applies_to || 'all',
        is_active ?? true, is_system ?? false, userId,
      ]);

      sendSuccess(res, result.rows[0], 201);
    } catch (err: any) {
      console.error('[RequestStatuses] Create error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to create request status', 500);
    }
  },
);

// ─── PUT /:id — Update ───────────────────────────────────────────────────────
router.put('/:id',
  requirePermission('master:request_statuses:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check exists
      const existing = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Request status not found', 404);
      }

      // System protection
      if (existing.rows[0].is_system) {
        return sendError(res, 'PROTECTED', 'System request statuses cannot be modified', 403);
      }

      const {
        code, name_en, name_ar, description_en, description_ar,
        stage, category, color, bg_color, icon, sort_order,
        is_editable, is_deletable, is_final, requires_approval,
        applies_to, is_active, is_system,
      } = req.body;

      if (!code || !name_en) {
        return sendError(res, 'VALIDATION_ERROR', 'Code and name_en are required', 400);
      }

      // Duplicate code check (exclude self)
      const dup = await pool.query(`SELECT id FROM ${TABLE} WHERE code = $1 AND id != $2 AND deleted_at IS NULL`, [code.toUpperCase(), id]);
      if (dup.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'Another request status with this code already exists', 409);
      }

      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET
          code = $1, name = $2, name_en = $2, name_ar = $3,
          description = $4, description_en = $4, description_ar = $5,
          stage = $6, category = $7, color = $8, bg_color = $9, icon = $10, sort_order = $11,
          allows_edit = $12, allows_delete = $13, is_editable = $12, is_deletable = $13,
          is_final = $14, requires_approval = $15, applies_to = $16,
          is_active = $17, is_system = $18, updated_by = $19, updated_at = NOW()
        WHERE id = $20 AND deleted_at IS NULL
        RETURNING ${COLS}
      `, [
        code.toUpperCase(), name_en, name_ar, description_en, description_ar,
        stage || 'draft', category || 'general', color, bg_color, icon, sort_order,
        is_editable ?? true, is_deletable ?? true,
        is_final ?? false, requires_approval ?? false, applies_to || 'all',
        is_active ?? true, is_system ?? false, userId, id,
      ]);

      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      console.error('[RequestStatuses] Update error:', err);
      sendError(res, 'SERVER_ERROR', 'Failed to update request status', 500);
    }
  },
);

// ─── PATCH /:id/status — Toggle active/inactive ──────────────────────────────
router.patch('/:id/status',
  requirePermission('master:request_statuses:edit'),
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
        return sendError(res, 'NOT_FOUND', 'Request status not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to update status', 500);
    }
  },
);

// ─── DELETE /:id — Soft delete ────────────────────────────────────────────────
router.delete('/:id',
  requirePermission('master:request_statuses:delete'),
  dynamicDeletionProtection('request_statuses'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // System protection
      const existing = await pool.query(`SELECT is_system FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Request status not found', 404);
      }
      if (existing.rows[0].is_system) {
        return sendError(res, 'PROTECTED', 'System request statuses cannot be deleted', 403);
      }

      const userId = (req as any).user?.id || null;
      await pool.query(
        `UPDATE ${TABLE} SET deleted_at = NOW(), status = 'inactive', is_active = false, updated_by = $1 WHERE id = $2`,
        [userId, id],
      );
      sendSuccess(res, { message: 'Request status deleted' });
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to delete request status', 500);
    }
  },
);

// ─── POST /:id/restore — Restore soft-deleted ────────────────────────────────
router.post('/:id/restore',
  requirePermission('master:request_statuses:edit'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || null;
      const result = await pool.query(`
        UPDATE ${TABLE} SET deleted_at = NULL, status = 'active', is_active = true, updated_by = $1, updated_at = NOW()
        WHERE id = $2 RETURNING ${COLS}
      `, [userId, req.params.id]);

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Request status not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (err: any) {
      sendError(res, 'SERVER_ERROR', 'Failed to restore request status', 500);
    }
  },
);

// ─── POST /bulk/status — Bulk status change ──────────────────────────────────
router.post('/bulk/status',
  requirePermission('master:request_statuses:edit'),
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
  requirePermission('master:request_statuses:delete'),
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
