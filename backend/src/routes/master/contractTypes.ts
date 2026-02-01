import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// GET /api/contract-types - List all contract types
router.get(
  '/',
  requirePermission('master:contract-types:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { search, is_active } = req.query;
      const params: any[] = [companyId];
      let paramIndex = 2;

      let query = `
        SELECT 
          id,
          code,
          name,
          name_ar,
          description,
          description_ar,
          duration_type,
          requires_approval,
          approval_workflow_code,
          sort_order,
          is_active,
          created_at,
          updated_at
        FROM contract_types
        WHERE company_id = $1 AND deleted_at IS NULL
      `;

      if (search) {
        query += ` AND (code ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      query += ` ORDER BY sort_order, code`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
    } catch (error) {
      console.error('Error fetching contract types:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch contract types' } });
    }
  }
);

// GET /api/contract-types/:id - Get single contract type
router.get(
  '/:id',
  requirePermission('master:contract-types:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          id,
          code,
          name,
          name_ar,
          description,
          description_ar,
          duration_type,
          requires_approval,
          approval_workflow_code,
          sort_order,
          is_active,
          created_at,
          updated_at
        FROM contract_types 
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contract type not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching contract type:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch contract type' } });
    }
  }
);

// POST /api/contract-types - Create contract type
router.post(
  '/',
  requirePermission('master:contract-types:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        code,
        name,
        name_ar,
        description,
        description_ar,
        duration_type,
        requires_approval,
        approval_workflow_code,
        sort_order,
        is_active
      } = req.body;

      // Validation
      if (!code || !name || !duration_type) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: 'Code, name, and duration_type are required' } 
        });
      }

      // Check for duplicate code
      const existing = await pool.query(
        'SELECT id FROM contract_types WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'DUPLICATE_CODE', message: 'Contract type code already exists' } 
        });
      }

      const result = await pool.query(
        `INSERT INTO contract_types (
          company_id, code, name, name_ar, description, description_ar,
          duration_type, requires_approval, approval_workflow_code, sort_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          companyId,
          code,
          name,
          name_ar || null,
          description || null,
          description_ar || null,
          duration_type,
          requires_approval ?? true,
          approval_workflow_code || null,
          sort_order || 0,
          is_active ?? true
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating contract type:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create contract type' } });
    }
  }
);

// PUT /api/contract-types/:id - Update contract type
router.put(
  '/:id',
  requirePermission('master:contract-types:update'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;
      const {
        code,
        name,
        name_ar,
        description,
        description_ar,
        duration_type,
        requires_approval,
        approval_workflow_code,
        sort_order,
        is_active
      } = req.body;

      // Check exists
      const existing = await pool.query(
        'SELECT id FROM contract_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contract type not found' } });
      }

      // Check for duplicate code if code changed
      if (code) {
        const duplicate = await pool.query(
          'SELECT id FROM contract_types WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
          [companyId, code, id]
        );
        if (duplicate.rows.length > 0) {
          return res.status(400).json({ 
            success: false, 
            error: { code: 'DUPLICATE_CODE', message: 'Contract type code already exists' } 
          });
        }
      }

      const result = await pool.query(
        `UPDATE contract_types SET
          code = COALESCE($1, code),
          name = COALESCE($2, name),
          name_ar = COALESCE($3, name_ar),
          description = COALESCE($4, description),
          description_ar = COALESCE($5, description_ar),
          duration_type = COALESCE($6, duration_type),
          requires_approval = COALESCE($7, requires_approval),
          approval_workflow_code = COALESCE($8, approval_workflow_code),
          sort_order = COALESCE($9, sort_order),
          is_active = COALESCE($10, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11 AND company_id = $12 AND deleted_at IS NULL
        RETURNING *`,
        [
          code,
          name,
          name_ar,
          description,
          description_ar,
          duration_type,
          requires_approval,
          approval_workflow_code,
          sort_order,
          is_active,
          id,
          companyId
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating contract type:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update contract type' } });
    }
  }
);

// DELETE /api/contract-types/:id - Soft delete contract type
router.delete(
  '/:id',
  requirePermission('master:contract-types:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE contract_types 
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contract type not found' } });
      }

      res.json({ success: true, message: 'Contract type deleted successfully' });
    } catch (error) {
      console.error('Error deleting contract type:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete contract type' } });
    }
  }
);

export default router;
