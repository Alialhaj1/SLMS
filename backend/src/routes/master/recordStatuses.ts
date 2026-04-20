/**
 * RECORD STATUSES API — Full CRUD
 * Screen A-15 — حالة السجلات
 * 
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 * Reference Protection: ✅ dynamicDeletionProtection
 * 
 * Fields: code, name_ar, name_en, description_ar, description_en,
 *   color, bg_color, icon, is_active_state, is_default, is_system,
 *   applies_to, sort_order, status, is_active
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { applyEnhancedAudit } from '../../middleware/enhancedAuditLog';
import { dynamicDeletionProtection } from '../../services/referenceIntegrityEngine';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// Apply enhanced audit (captures before/after state + field-level diffs)
applyEnhancedAudit(router, 'record_statuses');

// ────────────────────────────────────────
// GET / — List record statuses with search, filters, pagination, sorting
// ────────────────────────────────────────
router.get(
  '/',
  requirePermission('master:record_statuses:view'),
  async (req: Request, res: Response) => {
    try {
      const {
        search, status, is_active_state, is_system, is_default,
        sort_by = 'sort_order', sort_order = 'asc',
        page = '1', limit = '50'
      } = req.query as Record<string, string>;

      let query = `SELECT * FROM record_statuses WHERE deleted_at IS NULL`;
      let countQuery = `SELECT COUNT(*) FROM record_statuses WHERE deleted_at IS NULL`;
      const params: any[] = [];
      const countParams: any[] = [];
      let paramCount = 0;

      // Text search
      if (search) {
        paramCount++;
        const searchClause = ` AND (
          name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR
          code ILIKE $${paramCount} OR description_ar ILIKE $${paramCount} OR
          description_en ILIKE $${paramCount}
        )`;
        query += searchClause;
        countQuery += searchClause;
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      // Filter: status
      if (status) {
        paramCount++;
        const clause = ` AND status = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(status);
        countParams.push(status);
      }

      // Filter: is_active_state
      if (is_active_state !== undefined) {
        paramCount++;
        const clause = ` AND is_active_state = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_active_state === 'true');
        countParams.push(is_active_state === 'true');
      }

      // Filter: is_system
      if (is_system !== undefined) {
        paramCount++;
        const clause = ` AND is_system = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_system === 'true');
        countParams.push(is_system === 'true');
      }

      // Filter: is_default
      if (is_default !== undefined) {
        paramCount++;
        const clause = ` AND is_default = $${paramCount}`;
        query += clause;
        countQuery += clause;
        params.push(is_default === 'true');
        countParams.push(is_default === 'true');
      }

      // Sorting
      const allowedSortColumns = [
        'code', 'name_en', 'name_ar', 'status', 'sort_order',
        'is_active_state', 'is_system', 'is_default', 'created_at', 'updated_at'
      ];
      const safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'sort_order';
      const safeSortOrder = sort_order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      query += ` ORDER BY ${safeSortBy} ${safeSortOrder} NULLS LAST, name_en ASC`;

      // Pagination
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;

      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limitNum);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        data: dataResult.rows,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error: any) {
      console.error('Error fetching record statuses:', error);
      res.status(500).json({ error: 'Failed to fetch record statuses' });
    }
  }
);

// ────────────────────────────────────────
// GET /stats — Aggregate statistics for stats bar
// ────────────────────────────────────────
router.get(
  '/stats',
  requirePermission('master:record_statuses:view'),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active') AS active,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'inactive') AS inactive,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_system = true) AS system_count,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active_state = true) AS active_states
        FROM record_statuses
      `);

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching record status stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// ────────────────────────────────────────
// GET /filters — Distinct values for dropdowns
// ────────────────────────────────────────
router.get(
  '/filters',
  requirePermission('master:record_statuses:view'),
  async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          statuses: ['active', 'inactive'],
          booleanFilters: ['is_active_state', 'is_system', 'is_default']
        }
      });
    } catch (error: any) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({ error: 'Failed to fetch filter options' });
    }
  }
);

// ────────────────────────────────────────
// GET /:id — Get single record status by ID
// ────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('master:record_statuses:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM record_statuses WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record status not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching record status:', error);
      res.status(500).json({ error: 'Failed to fetch record status' });
    }
  }
);

// ────────────────────────────────────────
// POST / — Create a new record status
// ────────────────────────────────────────
router.post(
  '/',
  requirePermission('master:record_statuses:create'),
  async (req: Request, res: Response) => {
    try {
      const {
        code, name_ar, name_en, description_ar, description_en,
        color = '#6B7280', bg_color = '#F3F4F6', icon,
        is_active_state = false, is_default = false,
        is_system = false, applies_to = 'all',
        sort_order, status: recordStatus = 'active'
      } = req.body;

      // Validation
      if (!code || !name_ar || !name_en) {
        return res.status(400).json({ error: 'code, name_ar, and name_en are required' });
      }

      if (code.length > 20) {
        return res.status(400).json({ error: 'code must be 20 characters or less' });
      }

      // HEX color validation
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      if (color && !hexRegex.test(color)) {
        return res.status(400).json({ error: 'color must be a valid HEX color (e.g., #16A34A)' });
      }
      if (bg_color && !hexRegex.test(bg_color)) {
        return res.status(400).json({ error: 'bg_color must be a valid HEX color (e.g., #DCFCE7)' });
      }

      // Check for duplicate code
      const dupCheck = await pool.query(
        'SELECT id FROM record_statuses WHERE code = $1 AND deleted_at IS NULL',
        [code.toLowerCase()]
      );

      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Record status with this code already exists' });
      }

      const userId = (req as any).user?.id || null;

      const result = await pool.query(
        `INSERT INTO record_statuses (
          code, name_ar, name_en, description_ar, description_en,
          color, bg_color, icon,
          is_active_state, is_default, is_system, applies_to,
          sort_order, status, is_active,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15,
          $16, $16
        ) RETURNING *`,
        [
          code.toLowerCase(),
          name_ar,
          name_en,
          description_ar || null,
          description_en || null,
          color,
          bg_color,
          icon || null,
          is_active_state,
          is_default,
          is_system,
          applies_to,
          sort_order || null,
          recordStatus,
          recordStatus === 'active',
          userId
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Record status created successfully' });
    } catch (error: any) {
      console.error('Error creating record status:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Record status code already exists' });
      }
      res.status(500).json({ error: 'Failed to create record status' });
    }
  }
);

// ────────────────────────────────────────
// PUT /:id — Update an existing record status
// ────────────────────────────────────────
router.put(
  '/:id',
  requirePermission('master:record_statuses:edit'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const {
        code, name_ar, name_en, description_ar, description_en,
        color, bg_color, icon,
        is_active_state, is_default, is_system,
        applies_to, sort_order, status: recordStatus
      } = req.body;

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT * FROM record_statuses WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Record status not found' });
      }

      // Protect system records: code cannot be changed
      if (existing.rows[0].is_system && code && code !== existing.rows[0].code) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot change the code of a system record status' });
      }

      // Check code uniqueness if changed
      if (code && code !== existing.rows[0].code) {
        const dupCheck = await client.query(
          'SELECT id FROM record_statuses WHERE code = $1 AND id != $2 AND deleted_at IS NULL',
          [code.toLowerCase(), id]
        );
        if (dupCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Record status with this code already exists' });
        }
      }

      const newStatus = recordStatus ?? existing.rows[0].status;
      const newIsActive = newStatus === 'active';
      const userId = (req as any).user?.id || null;

      const result = await client.query(
        `UPDATE record_statuses SET
          code = COALESCE($1, code),
          name_ar = COALESCE($2, name_ar),
          name_en = COALESCE($3, name_en),
          description_ar = COALESCE($4, description_ar),
          description_en = COALESCE($5, description_en),
          color = COALESCE($6, color),
          bg_color = COALESCE($7, bg_color),
          icon = COALESCE($8, icon),
          is_active_state = COALESCE($9, is_active_state),
          is_default = COALESCE($10, is_default),
          is_system = COALESCE($11, is_system),
          applies_to = COALESCE($12, applies_to),
          sort_order = COALESCE($13, sort_order),
          status = $14,
          is_active = $15,
          updated_by = $16,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $17 AND deleted_at IS NULL
        RETURNING *`,
        [
          code?.toLowerCase(), name_ar, name_en, description_ar, description_en,
          color, bg_color, icon,
          is_active_state, is_default, is_system,
          applies_to, sort_order,
          newStatus, newIsActive,
          userId, id
        ]
      );

      await client.query('COMMIT');

      res.json({ success: true, data: result.rows[0], message: 'Record status updated successfully' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating record status:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Record status code already exists' });
      }
      res.status(500).json({ error: 'Failed to update record status' });
    } finally {
      client.release();
    }
  }
);

// ────────────────────────────────────────
// PATCH /:id/status — Change status
// ────────────────────────────────────────
router.patch(
  '/:id/status',
  requirePermission('master:record_statuses:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status: newStatus } = req.body;

      if (!['active', 'inactive'].includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid status. Must be: active or inactive' });
      }

      const userId = (req as any).user?.id || null;

      const result = await pool.query(
        `UPDATE record_statuses 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND deleted_at IS NULL
         RETURNING *`,
        [newStatus, newStatus === 'active', userId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record status not found' });
      }

      res.json({ success: true, data: result.rows[0], message: `Status changed to ${newStatus}` });
    } catch (error: any) {
      console.error('Error changing status:', error);
      res.status(500).json({ error: 'Failed to change status' });
    }
  }
);

// ────────────────────────────────────────
// DELETE /:id — Soft delete
// ────────────────────────────────────────
router.delete(
  '/:id',
  requirePermission('master:record_statuses:delete'),
  dynamicDeletionProtection('record_statuses'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await pool.query(
        'SELECT * FROM record_statuses WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Record status not found' });
      }

      // Prevent deletion of system statuses
      if (existing.rows[0].is_system) {
        return res.status(400).json({ error: 'Cannot delete a system record status. Deactivate it instead.' });
      }

      const userId = (req as any).user?.id || null;

      await pool.query(
        `UPDATE record_statuses SET deleted_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $1`,
        [id, userId]
      );

      res.json({ success: true, message: 'Record status deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting record status:', error);
      res.status(500).json({ error: 'Failed to delete record status' });
    }
  }
);

// ────────────────────────────────────────
// POST /:id/restore — Restore soft-deleted record
// ────────────────────────────────────────
router.post(
  '/:id/restore',
  requirePermission('master:record_statuses:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || null;

      const result = await pool.query(
        `UPDATE record_statuses 
         SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = $2
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record status not found or already active' });
      }

      res.json({ success: true, data: result.rows[0], message: 'Record status restored successfully' });
    } catch (error: any) {
      console.error('Error restoring record status:', error);
      res.status(500).json({ error: 'Failed to restore record status' });
    }
  }
);

// ────────────────────────────────────────
// Bulk Actions
// ────────────────────────────────────────
router.post(
  '/bulk/status',
  requirePermission('master:record_statuses:edit'),
  async (req: Request, res: Response) => {
    try {
      const { ids, status: newStatus } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      if (!['active', 'inactive'].includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const userId = (req as any).user?.id || null;

      const result = await pool.query(
        `UPDATE record_statuses 
         SET status = $1, is_active = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($4) AND deleted_at IS NULL
         RETURNING id`,
        [newStatus, newStatus === 'active', userId, ids]
      );

      res.json({ success: true, updated: result.rowCount, message: `${result.rowCount} records updated` });
    } catch (error: any) {
      console.error('Error bulk updating:', error);
      res.status(500).json({ error: 'Failed to bulk update' });
    }
  }
);

router.post(
  '/bulk/delete',
  requirePermission('master:record_statuses:delete'),
  async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      const userId = (req as any).user?.id || null;

      // Exclude system records from bulk delete
      const result = await pool.query(
        `UPDATE record_statuses 
         SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
         WHERE id = ANY($2) AND deleted_at IS NULL AND is_system = false
         RETURNING id`,
        [userId, ids]
      );

      res.json({ success: true, deleted: result.rowCount, message: `${result.rowCount} records deleted` });
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      res.status(500).json({ error: 'Failed to bulk delete' });
    }
  }
);

export default router;
