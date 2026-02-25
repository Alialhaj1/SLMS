/**
 * 📋 CONTRACT TYPES API (Enterprise Edition)
 * ============================================================
 * Contract Types management (C-15):
 *   - Enterprise CRUD (create, read, update, soft-delete)
 *   - Stats endpoint for dashboard cards
 *   - Filter by status, duration_type, is_renewable, requires_approval, is_system
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
applyEnhancedAudit(router, 'contract_types');

// ─── GET /stats — Stats for dashboard cards ─────────────────────────────
router.get(
  '/stats',
  requireAnyPermission(['contract_types:view', 'contract_types:manage']),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*)::int                                                        AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int                       AS active,
          COUNT(*) FILTER (WHERE duration_type = 'fixed')::int                 AS fixed,
          COUNT(*) FILTER (WHERE duration_type = 'open')::int                  AS open_ended,
          COUNT(*) FILTER (WHERE duration_type = 'milestone')::int             AS milestone,
          COUNT(*) FILTER (WHERE is_renewable = true)::int                     AS renewable,
          COUNT(*) FILTER (WHERE requires_approval = true)::int                AS requires_approval,
          COUNT(*) FILTER (WHERE is_system = true)::int                        AS system_count
        FROM contract_types
        WHERE deleted_at IS NULL
      `);
      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('contract_types stats error:', err);
      res.status(500).json({ error: 'Failed to fetch contract type stats' });
    }
  }
);

// ─── GET / — List with search, filter, sort, paginate ───────────────────
router.get(
  '/',
  requireAnyPermission(['contract_types:view', 'contract_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const {
        search, status, duration_type, is_renewable,
        requires_approval, is_system, applies_to,
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
        conditions.push(`status = $${idx}`);
        params.push(status);
        idx++;
      }
      if (duration_type) {
        conditions.push(`duration_type = $${idx}`);
        params.push(duration_type);
        idx++;
      }
      if (is_renewable !== undefined && is_renewable !== '') {
        conditions.push(`is_renewable = $${idx}`);
        params.push(is_renewable === 'true');
        idx++;
      }
      if (requires_approval !== undefined && requires_approval !== '') {
        conditions.push(`requires_approval = $${idx}`);
        params.push(requires_approval === 'true');
        idx++;
      }
      if (is_system !== undefined && is_system !== '') {
        conditions.push(`is_system = $${idx}`);
        params.push(is_system === 'true');
        idx++;
      }
      if (applies_to) {
        conditions.push(`applies_to ILIKE $${idx}`);
        params.push(`%${applies_to}%`);
        idx++;
      }

      const allowedSort = [
        'id', 'code', 'name_en', 'name_ar', 'duration_type',
        'default_duration_months', 'is_renewable', 'requires_approval',
        'is_system', 'sort_order', 'status', 'created_at',
      ];
      const sortCol = allowedSort.includes(sort) ? sort : 'sort_order';
      const where = conditions.join(' AND ');

      const [dataRes, countRes] = await Promise.all([
        pool.query(
          `SELECT * FROM contract_types WHERE ${where} ORDER BY ${sortCol} ${effectiveOrder} LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, effectiveLimit, offset]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total FROM contract_types WHERE ${where}`,
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
      console.error('contract_types list error:', err);
      res.status(500).json({ error: 'Failed to fetch contract types' });
    }
  }
);

// ─── GET /:id — Single record ────────────────────────────────────────────
router.get(
  '/:id',
  requireAnyPermission(['contract_types:view', 'contract_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM contract_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Contract type not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('contract_types get error:', err);
      res.status(500).json({ error: 'Failed to fetch contract type' });
    }
  }
);

// ─── POST / — Create ────────────────────────────────────────────────────
router.post(
  '/',
  requireAnyPermission(['contract_types:create', 'contract_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name_en, name_ar, description_en, description_ar,
        duration_type, default_duration_months, is_renewable, renewal_notice_days,
        requires_approval, approval_workflow_code, applies_to, icon,
        is_system, sort_order, status,
      } = req.body;

      if (!code || !name_en) {
        return res.status(400).json({ error: 'code and name_en are required' });
      }
      if (!duration_type || !['fixed', 'open', 'milestone'].includes(duration_type)) {
        return res.status(400).json({ error: 'duration_type must be fixed, open, or milestone' });
      }

      // Check duplicate code
      const dup = await pool.query(
        'SELECT id FROM contract_types WHERE code = $1 AND deleted_at IS NULL',
        [code.toUpperCase().trim()]
      );
      if (dup.rows.length) {
        return res.status(409).json({ error: `Code "${code}" already exists` });
      }

      const result = await pool.query(
        `INSERT INTO contract_types
          (code, name_en, name_ar, description_en, description_ar,
           duration_type, default_duration_months, is_renewable, renewal_notice_days,
           requires_approval, approval_workflow_code, applies_to, icon,
           is_system, sort_order, status,
           created_by, company_id, is_global, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING *`,
        [
          code.toUpperCase().trim(), name_en.trim(), name_ar?.trim() || null,
          description_en || null, description_ar || null,
          duration_type,
          default_duration_months || null, is_renewable ?? false, renewal_notice_days || null,
          requires_approval ?? true, approval_workflow_code || null,
          applies_to || 'general', icon || null,
          is_system ?? false,
          sort_order ?? 0, status || 'active',
          (req as any).user?.id || null,
          (req as any).companyId || null,
          true, true,
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('contract_types create error:', err);
      res.status(500).json({ error: 'Failed to create contract type' });
    }
  }
);

// ─── PUT /:id — Update ──────────────────────────────────────────────────
router.put(
  '/:id',
  requireAnyPermission(['contract_types:edit', 'contract_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM contract_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Contract type not found' });
      }

      const old = existing.rows[0];
      const {
        code, name_en, name_ar, description_en, description_ar,
        duration_type, default_duration_months, is_renewable, renewal_notice_days,
        requires_approval, approval_workflow_code, applies_to, icon,
        sort_order, status,
      } = req.body;

      // System records: cannot change code
      const newCode = old.is_system ? old.code : (code?.toUpperCase().trim() || old.code);

      // Check duplicate code if changed
      if (newCode !== old.code) {
        const dup = await pool.query(
          'SELECT id FROM contract_types WHERE code = $1 AND id != $2 AND deleted_at IS NULL',
          [newCode, id]
        );
        if (dup.rows.length) {
          return res.status(409).json({ error: `Code "${newCode}" already exists` });
        }
      }

      const result = await pool.query(
        `UPDATE contract_types SET
          code                     = COALESCE($1, code),
          name_en                  = COALESCE($2, name_en),
          name_ar                  = COALESCE($3, name_ar),
          description_en           = COALESCE($4, description_en),
          description_ar           = COALESCE($5, description_ar),
          duration_type            = COALESCE($6, duration_type),
          default_duration_months  = COALESCE($7, default_duration_months),
          is_renewable             = COALESCE($8, is_renewable),
          renewal_notice_days      = COALESCE($9, renewal_notice_days),
          requires_approval        = COALESCE($10, requires_approval),
          approval_workflow_code   = COALESCE($11, approval_workflow_code),
          applies_to               = COALESCE($12, applies_to),
          icon                     = COALESCE($13, icon),
          sort_order               = COALESCE($14, sort_order),
          status                   = COALESCE($15, status),
          updated_by               = $16,
          updated_at               = NOW()
        WHERE id = $17 AND deleted_at IS NULL
        RETURNING *`,
        [
          newCode, name_en?.trim(), name_ar?.trim(),
          description_en, description_ar,
          duration_type,
          default_duration_months, is_renewable, renewal_notice_days,
          requires_approval, approval_workflow_code,
          applies_to, icon,
          sort_order, status,
          (req as any).user?.id || null,
          id,
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('contract_types update error:', err);
      res.status(500).json({ error: 'Failed to update contract type' });
    }
  }
);

// ─── DELETE /:id — Soft delete ───────────────────────────────────────────
router.delete(
  '/:id',
  requireAnyPermission(['contract_types:delete', 'contract_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM contract_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Contract type not found' });
      }
      if (existing.rows[0].is_system) {
        return res.status(403).json({ error: 'Cannot delete a system contract type' });
      }

      await pool.query(
        'UPDATE contract_types SET deleted_at = NOW(), updated_by = $1 WHERE id = $2',
        [(req as any).user?.id || null, id]
      );

      res.json({ success: true, message: 'Contract type deleted' });
    } catch (err: any) {
      console.error('contract_types delete error:', err);
      res.status(500).json({ error: 'Failed to delete contract type' });
    }
  }
);

// ─── PATCH /:id/toggle-status — Toggle active/inactive ──────────────────
router.patch(
  '/:id/toggle-status',
  requireAnyPermission(['contract_types:edit', 'contract_types:manage']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await pool.query(
        'SELECT * FROM contract_types WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ error: 'Contract type not found' });
      }

      const newStatus = existing.rows[0].status === 'active' ? 'inactive' : 'active';
      const result = await pool.query(
        `UPDATE contract_types SET status = $1, updated_by = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [newStatus, (req as any).user?.id || null, id]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
      console.error('contract_types toggle error:', err);
      res.status(500).json({ error: 'Failed to toggle status' });
    }
  }
);

export default router;
