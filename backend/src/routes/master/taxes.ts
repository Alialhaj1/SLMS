/**
 * TAXES API ROUTES
 * ==================================================
 * Manages tax types, rates, and accounting integration
 * 
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

// Apply middlewares to all routes
router.use(authenticate);
router.use(loadCompanyContext);

/**
 * GET /api/master/taxes
 * List all taxes for the selected company
 */
router.get(
  '/',
  requirePermission('master:taxes:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const { search, is_active, tax_type } = req.query;

      let query = `
        SELECT 
          t.*,
          slms_format_sequence(t.numbering_series_id, t.sequence_no) as sequence_display,
          a.code as account_code,
          a.name as account_name,
          u1.email as created_by_email,
          u2.email as updated_by_email
        FROM taxes t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.updated_by = u2.id
        WHERE t.company_id = $1 
          AND t.deleted_at IS NULL
      `;

      const params: any[] = [companyId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        query += ` AND (t.name ILIKE $${paramCount} OR t.code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND t.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (tax_type) {
        paramCount++;
        query += ` AND t.tax_type = $${paramCount}`;
        params.push(tax_type);
      }

      query += ` ORDER BY t.code`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        total: result.rowCount,
      });
    } catch (error: any) {
      console.error('Error fetching taxes:', error);
      res.status(500).json({ error: 'Failed to fetch taxes' });
    }
  }
);

/**
 * GET /api/master/taxes/:id
 * Get single tax by ID
 */
router.get(
  '/:id',
  requirePermission('master:taxes:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;

      const result = await pool.query(
        `SELECT 
          t.*,
          slms_format_sequence(t.numbering_series_id, t.sequence_no) as sequence_display,
          a.code as account_code,
          a.name as account_name
        FROM taxes t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.id = $1 
          AND t.company_id = $2 
          AND t.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tax not found' });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error fetching tax:', error);
      res.status(500).json({ error: 'Failed to fetch tax' });
    }
  }
);

/**
 * POST /api/master/taxes
 * Create new tax
 */
router.post(
  '/',
  requirePermission('master:taxes:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;
      const {
        code,
        name,
        name_ar,
        tax_type,
        rate,
        account_id,
        description,
        is_active = true,
      } = req.body;

      // Validation
      if (!code || !name || !tax_type || rate === undefined || rate === null) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (rate < 0 || rate > 100) {
        return res.status(400).json({ error: 'Rate must be between 0 and 100' });
      }

      if (!account_id) {
        return res.status(400).json({ error: 'Tax account is required' });
      }

      // Check if account exists and belongs to company
      const accountCheck = await pool.query(
        'SELECT id FROM accounts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [account_id, companyId]
      );

      if (accountCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid account or account does not belong to your company' });
      }

      // Check for duplicate code
      const duplicateCheck = await pool.query(
        'SELECT id FROM taxes WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Tax code already exists' });
      }

      const result = await pool.query(
        `INSERT INTO taxes (
          company_id, code, name, name_ar, tax_type, rate, 
          account_id, description, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          companyId,
          code.toUpperCase(),
          name,
          name_ar || null,
          tax_type,
          rate,
          account_id,
          description || null,
          is_active,
          userId,
          userId,
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Tax created successfully',
      });
    } catch (error: any) {
      console.error('Error creating tax:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Tax code already exists' });
      }
      res.status(500).json({ error: 'Failed to create tax' });
    }
  }
);

/**
 * PUT /api/master/taxes/:id
 * Update tax
 */
router.put(
  '/:id',
  requirePermission('master:taxes:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;
      const {
        name,
        name_ar,
        tax_type,
        rate,
        account_id,
        description,
        is_active,
      } = req.body;

      // Check if tax exists
      const existingTax = await pool.query(
        'SELECT * FROM taxes WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingTax.rows.length === 0) {
        return res.status(404).json({ error: 'Tax not found' });
      }

      // Validation
      if (rate !== undefined && (rate < 0 || rate > 100)) {
        return res.status(400).json({ error: 'Rate must be between 0 and 100' });
      }

      if (account_id) {
        const accountCheck = await pool.query(
          'SELECT id FROM accounts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [account_id, companyId]
        );

        if (accountCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid account' });
        }
      }

      const result = await pool.query(
        `UPDATE taxes 
        SET 
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          tax_type = COALESCE($3, tax_type),
          rate = COALESCE($4, rate),
          account_id = COALESCE($5, account_id),
          description = COALESCE($6, description),
          is_active = COALESCE($7, is_active),
          updated_by = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND company_id = $10 AND deleted_at IS NULL
        RETURNING *`,
        [
          name,
          name_ar,
          tax_type,
          rate,
          account_id,
          description,
          is_active,
          userId,
          id,
          companyId,
        ]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Tax updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating tax:', error);
      res.status(500).json({ error: 'Failed to update tax' });
    }
  }
);

/**
 * DELETE /api/master/taxes/:id
 * Soft delete tax
 */
router.delete(
  '/:id',
  requirePermission('master:taxes:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;

      // Check if tax exists
      const existingTax = await pool.query(
        'SELECT * FROM taxes WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingTax.rows.length === 0) {
        return res.status(404).json({ error: 'Tax not found' });
      }

      // Check if tax is used in transactions (future: add check for invoices/journals)
      // For now, just soft delete

      await pool.query(
        `UPDATE taxes 
        SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1 
        WHERE id = $2 AND company_id = $3`,
        [userId, id, companyId]
      );

      res.json({
        success: true,
        message: 'Tax deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting tax:', error);
      res.status(500).json({ error: 'Failed to delete tax' });
    }
  }
);

/**
 * POST /api/master/taxes/:id/restore
 * Restore soft-deleted tax
 */
router.post(
  '/:id/restore',
  requirePermission('master:taxes:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyId;
      const userId = (req as any).user.id;

      const result = await pool.query(
        `UPDATE taxes 
        SET deleted_at = NULL, updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NOT NULL
        RETURNING *`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tax not found or already active' });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Tax restored successfully',
      });
    } catch (error: any) {
      console.error('Error restoring tax:', error);
      res.status(500).json({ error: 'Failed to restore tax' });
    }
  }
);

export default router;
