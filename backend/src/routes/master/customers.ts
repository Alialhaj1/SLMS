import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// GET /api/master/customers - List all customers
router.get(
  '/',
  requirePermission('master:customers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { search, status, customer_type } = req.query;
      const params: any[] = [companyId];
      let paramIndex = 2;

      let query = `
        SELECT 
          c.*,
          slms_format_sequence(c.numbering_series_id, c.sequence_no) as sequence_display,
          cn.name as country_name,
          ct.name as city_name,
          cur.code as currency_code,
          pt.name as payment_terms_name
        FROM customers c
        LEFT JOIN countries cn ON c.country_id = cn.id
        LEFT JOIN cities ct ON c.city_id = ct.id
        LEFT JOIN currencies cur ON c.currency_id = cur.id
        LEFT JOIN payment_terms pt ON c.payment_terms_id = pt.id
        WHERE c.company_id = $1 AND c.deleted_at IS NULL
      `;

      if (search) {
        query += ` AND (c.code ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR c.name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        query += ` AND c.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (customer_type) {
        query += ` AND c.customer_type = $${paramIndex}`;
        params.push(customer_type);
        paramIndex++;
      }

      query += ` ORDER BY c.code`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customers' } });
    }
  }
);

// GET /api/master/customers/:id - Get single customer
router.get(
  '/:id',
  requirePermission('master:customers:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          c.*,
          slms_format_sequence(c.numbering_series_id, c.sequence_no) as sequence_display,
          cn.name as country_name,
          ct.name as city_name,
          cur.code as currency_code,
          pt.name as payment_terms_name
        FROM customers c
        LEFT JOIN countries cn ON c.country_id = cn.id
        LEFT JOIN cities ct ON c.city_id = ct.id
        LEFT JOIN currencies cur ON c.currency_id = cur.id
        LEFT JOIN payment_terms pt ON c.payment_terms_id = pt.id
        WHERE c.id = $1 AND c.company_id = $2 AND c.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer' } });
    }
  }
);

// POST /api/master/customers - Create new customer
router.post(
  '/',
  requirePermission('master:customers:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;

      const {
        code, name, name_ar, customer_type, customer_group_id,
        tax_number, commercial_register, primary_contact_name,
        phone, mobile, email, website,
        country_id, city_id, address, postal_code,
        shipping_address, shipping_city_id, shipping_country_id,
        payment_terms_id, price_list_id, currency_id,
        credit_limit, credit_days, receivable_account_id,
        sales_person_id, territory,
        bank_id, bank_account_name, bank_account_number, bank_iban,
        is_tax_exempt, status, notes
      } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Check for duplicate code
      const duplicate = await pool.query(
        'SELECT id FROM customers WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Customer code already exists' } });
      }

      const result = await pool.query(
        `INSERT INTO customers (
          company_id, code, name, name_ar, customer_type, customer_group_id,
          tax_number, commercial_register, primary_contact_name,
          phone, mobile, email, website,
          country_id, city_id, address, postal_code,
          shipping_address, shipping_city_id, shipping_country_id,
          payment_terms_id, price_list_id, currency_id,
          credit_limit, credit_days, receivable_account_id,
          sales_person_id, territory,
          bank_id, bank_account_name, bank_account_number, bank_iban,
          is_tax_exempt, status, notes, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, NOW()
        ) RETURNING *`,
        [
          companyId, code, name, name_ar, customer_type || 'company', customer_group_id,
          tax_number, commercial_register, primary_contact_name,
          phone, mobile, email, website,
          country_id, city_id, address, postal_code,
          shipping_address, shipping_city_id, shipping_country_id,
          payment_terms_id, price_list_id, currency_id,
          credit_limit || 0, credit_days || 0, receivable_account_id,
          sales_person_id, territory,
          bank_id, bank_account_name, bank_account_number, bank_iban,
          is_tax_exempt || false, status || 'active', notes, userId
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create customer' } });
    }
  }
);

// PUT /api/master/customers/:id - Update customer
router.put(
  '/:id',
  requirePermission('master:customers:edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const {
        code, name, name_ar, customer_type, customer_group_id,
        tax_number, commercial_register, primary_contact_name,
        phone, mobile, email, website,
        country_id, city_id, address, postal_code,
        shipping_address, shipping_city_id, shipping_country_id,
        payment_terms_id, price_list_id, currency_id,
        credit_limit, credit_days, receivable_account_id,
        sales_person_id, territory,
        bank_id, bank_account_name, bank_account_number, bank_iban,
        is_tax_exempt, status, notes
      } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Check if customer exists
      const existing = await pool.query(
        'SELECT id FROM customers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }

      // Check for duplicate code (excluding current customer)
      const duplicate = await pool.query(
        'SELECT id FROM customers WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
        [companyId, code, id]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Customer code already exists' } });
      }

      const result = await pool.query(
        `UPDATE customers SET
          code = $1, name = $2, name_ar = $3, customer_type = $4, customer_group_id = $5,
          tax_number = $6, commercial_register = $7, primary_contact_name = $8,
          phone = $9, mobile = $10, email = $11, website = $12,
          country_id = $13, city_id = $14, address = $15, postal_code = $16,
          shipping_address = $17, shipping_city_id = $18, shipping_country_id = $19,
          payment_terms_id = $20, price_list_id = $21, currency_id = $22,
          credit_limit = $23, credit_days = $24, receivable_account_id = $25,
          sales_person_id = $26, territory = $27,
          bank_id = $28, bank_account_name = $29, bank_account_number = $30, bank_iban = $31,
          is_tax_exempt = $32, status = $33, notes = $34, updated_by = $35, updated_at = NOW()
        WHERE id = $36 AND company_id = $37 AND deleted_at IS NULL
        RETURNING *`,
        [
          code, name, name_ar, customer_type, customer_group_id,
          tax_number, commercial_register, primary_contact_name,
          phone, mobile, email, website,
          country_id, city_id, address, postal_code,
          shipping_address, shipping_city_id, shipping_country_id,
          payment_terms_id, price_list_id, currency_id,
          credit_limit, credit_days, receivable_account_id,
          sales_person_id, territory,
          bank_id, bank_account_name, bank_account_number, bank_iban,
          is_tax_exempt, status, notes, userId, id, companyId
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update customer' } });
    }
  }
);

// DELETE /api/master/customers/:id - Soft delete customer
router.delete(
  '/:id',
  requirePermission('master:customers:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE customers SET deleted_at = NOW(), deleted_by = $1
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
        RETURNING id`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      }

      res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete customer' } });
    }
  }
);

// POST /api/master/customers/:id/restore - Restore soft-deleted customer
router.post(
  '/:id/restore',
  requirePermission('master:customers:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE customers SET deleted_at = NULL, deleted_by = NULL
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
        RETURNING *`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deleted customer not found' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Customer restored successfully' });
    } catch (error) {
      console.error('Error restoring customer:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore customer' } });
    }
  }
);

export default router;
