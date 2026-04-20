/**
 * 📐 UNIT TYPES API (Enterprise Edition)
 * ==============================================
 * Unit Types management (D-05):
 *   - Enterprise CRUD (create, read, update, soft-delete)
 *   - Stats endpoint for dashboard cards
 *   - Filter by status, allows_decimals, is_countable, is_system
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
applyEnhancedAudit(router, 'unit_types');

// ─── GET /stats — Stats for dashboard cards ─────────────────────────────
router.get(
  '/stats',
  requireAnyPermission(['unit_types:view', 'unit_types:manage']),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*)::int                                                    AS total,
          COUNT(*) FILTER (WHERE is_active = true)::int                    AS active,
          COUNT(*) FILTER (WHERE is_system = true)::int                    AS system_count
        FROM unit_types
        WHERE deleted_at IS NULL
      `);
      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('unit_types stats error:', err);
      res.status(500).json({ error: 'Failed to fetch unit type stats' });
    }
  }
);

// ─── GET / — List with search, filter, sort, paginate ───────────────────
router.get(
  '/',
  requireAnyPermission(['unit_types:view', 'unit_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const {
        search, status, is_system,
        sort = 'sort_order', order = 'asc',
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
        conditions.push(`(code ILIKE $${idx} OR name_en ILIKE $${idx} OR name_ar ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }
      if (status) {
        conditions.push(`is_active = $${idx}`);
        params.push(status === 'active');
        idx++;
      }
      if (is_system !== undefined && is_system !== '') {
        conditions.push(`is_system = $${idx}`);
        params.push(is_system === 'true');
        idx++;
      }

      const allowedSort = [
        'id', 'code', 'name_en', 'name_ar', 'base_unit_code',
        'is_system', 'sort_order', 'is_active', 'created_at',
      ];
      const sortCol = allowedSort.includes(sort) ? sort : 'sort_order';
      const where = conditions.join(' AND ');

      const [dataRes, countRes] = await Promise.all([
        pool.query(
          `SELECT * FROM unit_types WHERE ${where} ORDER BY ${sortCol} ${effectiveOrder} LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, effectiveLimit, offset]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total FROM unit_types WHERE ${where}`,
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
      console.error('unit_types list error:', err);
      res.status(500).json({ error: 'Failed to fetch unit types' });
    }
  }
);

// ─── GET /:id — Single record ────────────────────────────────────────────
router.get(
  '/:id',
  requireAnyPermission(['unit_types:view', 'unit_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM unit_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Unit type not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('unit_types get error:', err);
      res.status(500).json({ error: 'Failed to fetch unit type' });
    }
  }
);

// ─── POST / — Create ────────────────────────────────────────────────────
router.post(
  '/',
  requireAnyPermission(['unit_types:create', 'unit_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name_en, name_ar, description_en, description_ar,
        icon, base_unit_code,
        allows_decimals, is_countable,
        is_system, sort_order, status,
      } = req.body;

      if (!code || !name_en || !name_ar) {
        return res.status(400).json({ error: 'code, name_en, and name_ar are required' });
      }
      if (!base_unit_code) {
        return res.status(400).json({ error: 'base_unit_code is required' });
      }

      // Check duplicate code
      const dup = await pool.query(
        'SELECT id FROM unit_types WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL',
        [code.trim()]
      );
      if (dup.rows.length) {
        return res.status(409).json({ error: `Code "${code}" already exists` });
      }

      const result = await pool.query(
        `INSERT INTO unit_types
          (code, name_en, name_ar, description_en, description_ar,
           symbol, base_unit_code, conversion_factor,
           is_system, sort_order, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          code.toLowerCase().trim(), name_en.trim(), name_ar.trim(),
          description_en || null, description_ar || null,
          icon || null, base_unit_code.trim(),
          req.body.conversion_factor ?? 1,
          is_system ?? false,
          sort_order ?? 0,
          req.body.category || null,
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('unit_types create error:', err);
      res.status(500).json({ error: 'Failed to create unit type' });
    }
  }
);

// ─── PUT /:id — Update ──────────────────────────────────────────────────
router.put(
  '/:id',
  requireAnyPermission(['unit_types:edit', 'unit_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM unit_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Unit type not found' });
      }

      const old = existing.rows[0];
      const {
        code, name_en, name_ar, description_en, description_ar,
        icon, base_unit_code,
        allows_decimals, is_countable,
        sort_order, status,
      } = req.body;

      // System records: cannot change code
      const newCode = old.is_system ? old.code : (code?.toLowerCase().trim() || old.code);

      // Check duplicate code if changed
      if (newCode !== old.code) {
        const dup = await pool.query(
          'SELECT id FROM unit_types WHERE LOWER(code) = LOWER($1) AND id != $2 AND deleted_at IS NULL',
          [newCode, id]
        );
        if (dup.rows.length) {
          return res.status(409).json({ error: `Code "${newCode}" already exists` });
        }
      }

      const result = await pool.query(
        `UPDATE unit_types SET
          code            = COALESCE($1, code),
          name_en         = COALESCE($2, name_en),
          name_ar         = COALESCE($3, name_ar),
          description_en  = COALESCE($4, description_en),
          description_ar  = COALESCE($5, description_ar),
          symbol          = COALESCE($6, symbol),
          base_unit_code  = COALESCE($7, base_unit_code),
          conversion_factor = COALESCE($8, conversion_factor),
          sort_order      = COALESCE($9, sort_order),
          category        = COALESCE($10, category),
          updated_at      = NOW()
        WHERE id = $11 AND deleted_at IS NULL
        RETURNING *`,
        [
          newCode, name_en?.trim(), name_ar?.trim(),
          description_en, description_ar,
          icon, base_unit_code?.trim(),
          req.body.conversion_factor,
          sort_order,
          req.body.category,
          id,
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('unit_types update error:', err);
      res.status(500).json({ error: 'Failed to update unit type' });
    }
  }
);

// ─── DELETE /:id — Soft delete ───────────────────────────────────────────
router.delete(
  '/:id',
  requireAnyPermission(['unit_types:delete', 'unit_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM unit_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Unit type not found' });
      }
      if (existing.rows[0].is_system) {
        return res.status(403).json({ error: 'Cannot delete a system unit type' });
      }

      await pool.query(
        'UPDATE unit_types SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
        [id]
      );

      res.json({ success: true, message: 'Unit type deleted' });
    } catch (err: any) {
      console.error('unit_types delete error:', err);
      res.status(500).json({ error: 'Failed to delete unit type' });
    }
  }
);

// ─── PATCH /:id/toggle-status — Toggle active/inactive ──────────────────
router.patch(
  '/:id/toggle-status',
  requireAnyPermission(['unit_types:edit', 'unit_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM unit_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Unit type not found' });
      }

      const newActive = !existing.rows[0].is_active;
      const result = await pool.query(
        `UPDATE unit_types SET is_active = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [newActive, id]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('unit_types toggle error:', err);
      res.status(500).json({ error: 'Failed to toggle status' });
    }
  }
);

export default router;
