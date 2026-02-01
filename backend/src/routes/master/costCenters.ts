/**
 * COST CENTERS API
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

router.get(
  '/',
  requirePermission('master:cost_centers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId ?? (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const { search, is_active } = req.query;

      let query = `
        SELECT 
          cc.id,
          cc.company_id,
          cc.parent_id,
          cc.code,
          cc.name,
          cc.name_ar,
          cc.description,
          cc.level,
          cc.is_group,
          cc.is_active,
          cc.numbering_series_id,
          cc.sequence_no,
          cc.created_by,
          cc.created_at,
          cc.updated_at,
          cc.is_deleted,
          cc.deleted_at,
          cc.deleted_by,
          slms_format_sequence(cc.numbering_series_id, cc.sequence_no) as sequence_display,
          pcc.code as parent_code,
          pcc.name as parent_name,
          pcc.name_ar as parent_name_ar
        FROM cost_centers cc
        LEFT JOIN cost_centers pcc ON cc.parent_id = pcc.id
        WHERE cc.company_id = $1 AND cc.deleted_at IS NULL
      `;

      const params: any[] = [companyId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        query += ` AND (cc.name ILIKE $${paramCount} OR cc.code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND cc.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      query += ` ORDER BY cc.code`;

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      console.error('Error fetching cost centers:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch cost centers' } });
    }
  }
);

router.post(
  '/',
  requirePermission('master:cost_centers:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId ?? (req as any).companyId;
      const userId = (req as any).user?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { code, name, name_ar, parent_id, description, is_active = true } = req.body;

      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Check duplicate
      const duplicateCheck = await pool.query(
        'SELECT id FROM cost_centers WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Cost center code already exists' } });
      }

      // Check parent exists
      if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
        const parsedParentId = Number(parent_id);
        if (!Number.isFinite(parsedParentId) || parsedParentId <= 0) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parent cost center' } });
        }
        const parentCheck = await pool.query(
          'SELECT id FROM cost_centers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [parsedParentId, companyId]
        );

        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_PARENT', message: 'Invalid parent cost center' } });
        }
      }

      const resolvedParentId =
        parent_id === undefined || parent_id === null || parent_id === '' ? null : Number(parent_id);

      const result = await pool.query(
        `INSERT INTO cost_centers (
          company_id,
          code,
          name,
          name_ar,
          parent_id,
          description,
          is_active,
          is_deleted,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        RETURNING id, company_id, parent_id, code, name, name_ar, description, level, is_group, is_active, numbering_series_id, sequence_no, created_by, created_at, updated_at, is_deleted, deleted_at, deleted_by`,
        [companyId, code.toUpperCase(), name, name_ar || null, resolvedParentId, description || null, is_active, userId]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Cost center created successfully' });
    } catch (error: any) {
      console.error('Error creating cost center:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create cost center' } });
    }
  }
);

router.put(
  '/:id',
  requirePermission('master:cost_centers:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId ?? (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const { name, name_ar, parent_id, description, is_active } = req.body;

      const existingCostCenter = await pool.query(
        'SELECT * FROM cost_centers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingCostCenter.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cost center not found' } });
      }

      // Prevent circular reference
      if (parent_id && parent_id === parseInt(id)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PARENT', message: 'Cost center cannot be its own parent' } });
      }

      if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
        const parsedParentId = Number(parent_id);
        if (!Number.isFinite(parsedParentId) || parsedParentId <= 0) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parent cost center' } });
        }
        const parentCheck = await pool.query(
          'SELECT id FROM cost_centers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [parsedParentId, companyId]
        );

        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_PARENT', message: 'Invalid parent cost center' } });
        }
      }

      const resolvedParentId =
        parent_id === undefined ? existingCostCenter.rows[0].parent_id : parent_id === '' ? null : parent_id;

      const result = await pool.query(
        `UPDATE cost_centers 
        SET 
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          parent_id = $3,
          description = COALESCE($4, description),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND company_id = $7 AND deleted_at IS NULL
        RETURNING id, company_id, parent_id, code, name, name_ar, description, level, is_group, is_active, numbering_series_id, sequence_no, created_by, created_at, updated_at, is_deleted, deleted_at, deleted_by`,
        [
          name ?? null,
          name_ar ?? null,
          resolvedParentId,
          description ?? null,
          typeof is_active === 'boolean' ? is_active : null,
          id,
          companyId,
        ]
      );

      res.json({ success: true, data: result.rows[0], message: 'Cost center updated successfully' });
    } catch (error: any) {
      console.error('Error updating cost center:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update cost center' } });
    }
  }
);

router.delete(
  '/:id',
  requirePermission('master:cost_centers:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId ?? (req as any).companyId;
      const userId = (req as any).user?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const existingCostCenter = await pool.query(
        'SELECT * FROM cost_centers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingCostCenter.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cost center not found' } });
      }

      // Check if has children
      const childrenCheck = await pool.query(
        'SELECT id FROM cost_centers WHERE parent_id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (childrenCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'HAS_CHILDREN', message: 'Cannot delete cost center with sub-cost centers' } });
      }

      await pool.query(
        `UPDATE cost_centers
         SET deleted_at = CURRENT_TIMESTAMP,
             is_deleted = TRUE,
             deleted_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $3`,
        [userId, id, companyId]
      );

      res.json({ success: true, message: 'Cost center deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting cost center:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete cost center' } });
    }
  }
);

router.post(
  '/:id/restore',
  requirePermission('master:cost_centers:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId ?? (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const result = await pool.query(
        `UPDATE cost_centers 
        SET deleted_at = NULL,
            is_deleted = FALSE,
            deleted_by = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
        RETURNING *`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cost center not found or already active' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Cost center restored successfully' });
    } catch (error: any) {
      console.error('Error restoring cost center:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore cost center' } });
    }
  }
);

export default router;
