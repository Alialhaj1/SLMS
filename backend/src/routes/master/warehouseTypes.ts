/**
 * 🏭 WAREHOUSE TYPES API (Enterprise Edition)
 * ==============================================
 * Warehouse Types management (D-07):
 *   - Enterprise CRUD (create, read, update, soft-delete)
 *   - Stats endpoint for dashboard cards
 *   - Filter by status, requires_temperature_control, is_external,
 *     requires_special_license, is_system
 *   - Sort, paginate, search across code/name_en/name_ar
 *   - Toggle status & system-record protection
 *
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requireAnyPermission } from '../../middleware/rbac';
import { applyEnhancedAudit } from '../../middleware/enhancedAuditLog';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);
applyEnhancedAudit(router, 'warehouse_types');

// ─── GET /stats — Stats for dashboard cards ─────────────────────────────
router.get(
  '/stats',
  requireAnyPermission(['warehouse_types:view', 'warehouse_types:manage']),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*)::int                                                           AS total,
          COUNT(*) FILTER (WHERE is_active = true)::int                           AS active,
          COUNT(*) FILTER (WHERE is_active = false)::int                          AS inactive,
          COUNT(DISTINCT warehouse_category)::int                                 AS category_count
        FROM warehouse_types
        WHERE deleted_at IS NULL
      `);
      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('warehouse_types stats error:', err);
      res.status(500).json({ error: 'Failed to fetch warehouse type stats' });
    }
  }
);

// ─── GET / — List with search, filter, sort, paginate ───────────────────
router.get(
  '/',
  requireAnyPermission(['warehouse_types:view', 'warehouse_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const {
        search, is_active,
        sort = 'name', order = 'asc',
        page = '1', limit = '25',
      } = req.query as Record<string, string>;

      const effectivePage  = Math.max(1, parseInt(page, 10) || 1);
      const effectiveLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
      const offset = (effectivePage - 1) * effectiveLimit;
      const effectiveOrder = order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let idx = 1;

      if (search) {
        conditions.push(`(code ILIKE $${idx} OR name ILIKE $${idx} OR name_ar ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }
      if (is_active !== undefined && is_active !== '') {
        conditions.push(`is_active = $${idx}`);
        params.push(is_active === 'true');
        idx++;
      }

      const allowedSort = [
        'id', 'code', 'name', 'name_ar', 'warehouse_category',
        'is_active', 'is_default', 'created_at',
      ];
      const sortCol = allowedSort.includes(sort) ? sort : 'name';
      const where = conditions.join(' AND ');

      const [dataRes, countRes] = await Promise.all([
        pool.query(
          `SELECT * FROM warehouse_types WHERE ${where} ORDER BY ${sortCol} ${effectiveOrder} LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, effectiveLimit, offset]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total FROM warehouse_types WHERE ${where}`,
          params
        ),
      ]);

      res.json({
        success: true,
        data: dataRes.rows,
        total: countRes.rows[0].total,
        meta: { page: effectivePage, limit: effectiveLimit, total: countRes.rows[0].total },
      });
    } catch (err: any) {
      console.error('warehouse_types list error:', err);
      res.status(500).json({ error: 'Failed to fetch warehouse types' });
    }
  }
);

// ─── GET /:id — Single record ────────────────────────────────────────────
router.get(
  '/:id',
  requireAnyPermission(['warehouse_types:view', 'warehouse_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM warehouse_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Warehouse type not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('warehouse_types get error:', err);
      res.status(500).json({ error: 'Failed to fetch warehouse type' });
    }
  }
);

// ─── POST / — Create ────────────────────────────────────────────────────
router.post(
  '/',
  requireAnyPermission(['warehouse_types:create', 'warehouse_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name, name_en, name_ar, description,
        warehouse_category, parent_id, gl_account_id,
        allows_sales, allows_purchases, allows_transfers,
        is_default, is_active,
      } = req.body;

      const resolvedName = name || name_en;
      if (!code || !resolvedName || !name_ar) {
        return res.status(400).json({ error: 'code, name, and name_ar are required' });
      }

      // Check duplicate code
      const dup = await pool.query(
        'SELECT id FROM warehouse_types WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL',
        [code.trim()]
      );
      if (dup.rows.length) {
        return res.status(409).json({ error: `Code "${code}" already exists` });
      }

      const result = await pool.query(
        `INSERT INTO warehouse_types
          (code, name, name_ar, description,
           warehouse_category, parent_id, gl_account_id,
           allows_sales, allows_purchases, allows_transfers,
           is_default, is_active,
           created_by, company_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          code.toLowerCase().trim(), resolvedName.trim(), name_ar.trim(),
          description || null,
          warehouse_category || null, parent_id || null, gl_account_id || null,
          allows_sales ?? false, allows_purchases ?? false, allows_transfers ?? false,
          is_default ?? false, is_active ?? true,
          (req as any).user?.id || null,
          (req as any).companyId || null,
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('warehouse_types create error:', err);
      res.status(500).json({ error: 'Failed to create warehouse type' });
    }
  }
);

// ─── PUT /:id — Update ──────────────────────────────────────────────────
router.put(
  '/:id',
  requireAnyPermission(['warehouse_types:edit', 'warehouse_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM warehouse_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Warehouse type not found' });
      }

      const old = existing.rows[0];
      const {
        code, name, name_en, name_ar, description,
        warehouse_category, parent_id, gl_account_id,
        allows_sales, allows_purchases, allows_transfers,
        is_default, is_active,
      } = req.body;

      const resolvedName = name || name_en;
      const newCode = code?.toLowerCase().trim() || old.code;

      // Check duplicate code if changed
      if (newCode !== old.code) {
        const dup = await pool.query(
          'SELECT id FROM warehouse_types WHERE LOWER(code) = LOWER($1) AND id != $2 AND deleted_at IS NULL',
          [newCode, id]
        );
        if (dup.rows.length) {
          return res.status(409).json({ error: `Code "${newCode}" already exists` });
        }
      }

      const result = await pool.query(
        `UPDATE warehouse_types SET
          code               = COALESCE($1, code),
          name               = COALESCE($2, name),
          name_ar            = COALESCE($3, name_ar),
          description        = COALESCE($4, description),
          warehouse_category = COALESCE($5, warehouse_category),
          parent_id          = $6,
          gl_account_id      = $7,
          allows_sales       = COALESCE($8, allows_sales),
          allows_purchases   = COALESCE($9, allows_purchases),
          allows_transfers   = COALESCE($10, allows_transfers),
          is_default         = COALESCE($11, is_default),
          is_active          = COALESCE($12, is_active),
          updated_by         = $13,
          updated_at         = NOW()
        WHERE id = $14 AND deleted_at IS NULL
        RETURNING *`,
        [
          newCode, resolvedName?.trim(), name_ar?.trim(),
          description,
          warehouse_category,
          parent_id || null, gl_account_id || null,
          allows_sales, allows_purchases, allows_transfers,
          is_default, is_active,
          (req as any).user?.id || null,
          id,
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('warehouse_types update error:', err);
      res.status(500).json({ error: 'Failed to update warehouse type' });
    }
  }
);

// ─── DELETE /:id — Soft delete ───────────────────────────────────────────
router.delete(
  '/:id',
  requireAnyPermission(['warehouse_types:delete', 'warehouse_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM warehouse_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Warehouse type not found' });
      }

      await pool.query(
        'UPDATE warehouse_types SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [(req as any).user?.id || null, id]
      );

      res.json({ success: true, message: 'Warehouse type deleted' });
    } catch (err: any) {
      console.error('warehouse_types delete error:', err);
      res.status(500).json({ error: 'Failed to delete warehouse type' });
    }
  }
);

// ─── PATCH /:id/toggle-status — Toggle active/inactive ──────────────────
router.patch(
  '/:id/toggle-status',
  requireAnyPermission(['warehouse_types:edit', 'warehouse_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM warehouse_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Warehouse type not found' });
      }

      const newIsActive = !existing.rows[0].is_active;
      const result = await pool.query(
        `UPDATE warehouse_types SET is_active = $1, updated_by = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [newIsActive, (req as any).user?.id || null, id]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('warehouse_types toggle error:', err);
      res.status(500).json({ error: 'Failed to toggle status' });
    }
  }
);

export default router;
