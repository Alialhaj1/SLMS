import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// GET /api/master/vendors - List all vendors
router.get(
  '/',
  requirePermission('master:vendors:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { search, status, vendor_type } = req.query;
      const params: any[] = [companyId];
      let paramIndex = 2;

      let query = `
        SELECT 
          v.*,
          slms_format_sequence(v.numbering_series_id, v.sequence_no) as sequence_display,
          cn.name as country_name,
          ct.name as city_name,
          cur.code as currency_code,
          pt.name as payment_terms_name
        FROM vendors v
        LEFT JOIN countries cn ON v.country_id = cn.id
        LEFT JOIN cities ct ON v.city_id = ct.id
        LEFT JOIN currencies cur ON v.currency_id = cur.id
        LEFT JOIN payment_terms pt ON v.payment_terms_id = pt.id
        WHERE v.company_id = $1 AND v.deleted_at IS NULL
      `;

      if (search) {
        query += ` AND (v.code ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex} OR v.name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        query += ` AND v.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (vendor_type) {
        query += ` AND v.vendor_type = $${paramIndex}`;
        params.push(vendor_type);
        paramIndex++;
      }

      query += ` ORDER BY v.code`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendors' } });
    }
  }
);

// GET /api/master/vendors/:id - Get single vendor
router.get(
  '/:id',
  requirePermission('master:vendors:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          v.*,
          slms_format_sequence(v.numbering_series_id, v.sequence_no) as sequence_display,
          cn.name as country_name,
          ct.name as city_name,
          cur.code as currency_code,
          pt.name as payment_terms_name
        FROM vendors v
        LEFT JOIN countries cn ON v.country_id = cn.id
        LEFT JOIN cities ct ON v.city_id = ct.id
        LEFT JOIN currencies cur ON v.currency_id = cur.id
        LEFT JOIN payment_terms pt ON v.payment_terms_id = pt.id
        WHERE v.id = $1 AND v.company_id = $2 AND v.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor' } });
    }
  }
);

// POST /api/master/vendors - Create new vendor
router.post(
  '/',
  requirePermission('master:vendors:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;

      const {
        code, name, name_ar, vendor_type, vendor_group_id,
        tax_number, commercial_register, primary_contact_name,
        phone, mobile, email, website,
        country_id, city_id, address, postal_code,
        payment_terms_id, currency_id, payable_account_id, expense_account_id,
        bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
        lead_time_days, min_order_amount, status, notes,
        is_external
      } = req.body;

      const isExternal = typeof is_external === 'boolean' ? is_external : false;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Check for duplicate code
      const duplicate = await pool.query(
        'SELECT id FROM vendors WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Vendor code already exists' } });
      }

      const result = await pool.query(
        `INSERT INTO vendors (
          company_id, code, name, name_ar, vendor_type, vendor_group_id,
          tax_number, commercial_register, primary_contact_name,
          phone, mobile, email, website,
          country_id, city_id, address, postal_code,
          payment_terms_id, currency_id, payable_account_id, expense_account_id,
          bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
          lead_time_days, min_order_amount, status, is_external, notes, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, NOW()
        ) RETURNING *`,
        [
          companyId, code, name, name_ar, vendor_type || 'supplier', vendor_group_id,
          tax_number, commercial_register, primary_contact_name,
          phone, mobile, email, website,
          country_id, city_id, address, postal_code,
          payment_terms_id, currency_id, payable_account_id, expense_account_id,
          bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
          lead_time_days || 0, min_order_amount, status || 'active', isExternal, notes, userId
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create vendor' } });
    }
  }
);

// PUT /api/master/vendors/:id - Update vendor
router.put(
  '/:id',
  requirePermission('master:vendors:edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const {
        code, name, name_ar, vendor_type, vendor_group_id,
        tax_number, commercial_register, primary_contact_name,
        phone, mobile, email, website,
        country_id, city_id, address, postal_code,
        payment_terms_id, currency_id, payable_account_id, expense_account_id,
        bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
        lead_time_days, min_order_amount, status, notes,
        is_external
      } = req.body;

      const isExternal = typeof is_external === 'boolean' ? is_external : null;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Check if vendor exists
      const existing = await pool.query(
        'SELECT id FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      }

      // Check for duplicate code (excluding current vendor)
      const duplicate = await pool.query(
        'SELECT id FROM vendors WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
        [companyId, code, id]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Vendor code already exists' } });
      }

      const result = await pool.query(
        `UPDATE vendors SET
          code = $1, name = $2, name_ar = $3, vendor_type = $4, vendor_group_id = $5,
          tax_number = $6, commercial_register = $7, primary_contact_name = $8,
          phone = $9, mobile = $10, email = $11, website = $12,
          country_id = $13, city_id = $14, address = $15, postal_code = $16,
          payment_terms_id = $17, currency_id = $18, payable_account_id = $19, expense_account_id = $20,
          bank_id = $21, bank_account_name = $22, bank_account_number = $23, bank_iban = $24, bank_swift = $25,
          lead_time_days = $26, min_order_amount = $27, status = $28,
          is_external = COALESCE($29, is_external),
          notes = $30, updated_by = $31, updated_at = NOW()
        WHERE id = $32 AND company_id = $33 AND deleted_at IS NULL
        RETURNING *`,
        [
          code, name, name_ar, vendor_type, vendor_group_id,
          tax_number, commercial_register, primary_contact_name,
          phone, mobile, email, website,
          country_id, city_id, address, postal_code,
          payment_terms_id, currency_id, payable_account_id, expense_account_id,
          bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
          lead_time_days, min_order_amount, status,
          isExternal,
          notes, userId,
          id, companyId
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating vendor:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update vendor' } });
    }
  }
);

// DELETE /api/master/vendors/:id - Soft delete vendor
router.delete(
  '/:id',
  requirePermission('master:vendors:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE vendors SET deleted_at = NOW(), deleted_by = $1
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
        RETURNING id`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      }

      res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete vendor' } });
    }
  }
);

// POST /api/master/vendors/:id/restore - Restore soft-deleted vendor
router.post(
  '/:id/restore',
  requirePermission('master:vendors:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE vendors SET deleted_at = NULL, deleted_by = NULL
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
        RETURNING *`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deleted vendor not found' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Vendor restored successfully' });
    } catch (error) {
      console.error('Error restoring vendor:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore vendor' } });
    }
  }
);

export default router;
