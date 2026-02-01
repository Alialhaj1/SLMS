/**
 * 👥 CUSTOMERS ROUTES
 * ====================
 * Customer management API endpoints
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import logger from '../../utils/logger';
import { CustomerService } from '../../services/customerService';
import { DocumentNumberService } from '../../services/documentNumberService';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// CUSTOMER TYPES
// ============================================

router.get('/types', requirePermission('customers:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM customer_types WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching customer types:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer types' } });
  }
});

// ============================================
// CUSTOMER CATEGORIES
// ============================================

router.get('/categories', requirePermission('customer_categories:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(`
      SELECT cc.*, pc.name as parent_name
      FROM customer_categories cc
      LEFT JOIN customer_categories pc ON cc.parent_id = pc.id
      WHERE cc.company_id = $1 AND cc.deleted_at IS NULL 
      ORDER BY cc.sort_order, cc.name
    `, [companyId]);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching customer categories:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer categories' } });
  }
});

router.post('/categories', requirePermission('customer_categories:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, description, parent_id, default_credit_limit, default_discount_percent, default_price_list_id } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    const result = await pool.query(`
      INSERT INTO customer_categories (company_id, code, name, name_ar, description, parent_id, default_credit_limit, default_discount_percent, default_price_list_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [companyId, code, name, name_ar, description, parent_id, default_credit_limit, default_discount_percent, default_price_list_id, userId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    logger.error('Error creating customer category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Category code already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create customer category' } });
  }
});

// ============================================
// CUSTOMER STATUSES
// ============================================

router.get('/statuses', requirePermission('customers:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM customer_statuses WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching customer statuses:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer statuses' } });
  }
});

// ============================================
// CUSTOMERS - CRUD
// ============================================

// GET /api/sales/customers - List customers
router.get('/', requirePermission('customers:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status_id, category_id, customer_type_id, sales_rep_id, credit_status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE c.company_id = $1 AND c.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (c.code ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status_id) {
      whereClause += ` AND c.status_id = $${paramIndex}`;
      params.push(status_id);
      paramIndex++;
    }

    if (category_id) {
      whereClause += ` AND c.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (customer_type_id) {
      whereClause += ` AND c.customer_type_id = $${paramIndex}`;
      params.push(customer_type_id);
      paramIndex++;
    }

    if (sales_rep_id) {
      whereClause += ` AND c.sales_rep_id = $${paramIndex}`;
      params.push(sales_rep_id);
      paramIndex++;
    }

    if (credit_status === 'exceeded') {
      whereClause += ` AND c.credit_limit > 0 AND c.current_balance >= c.credit_limit`;
    } else if (credit_status === 'warning') {
      whereClause += ` AND c.credit_limit > 0 AND c.current_balance >= c.credit_limit * 0.9 AND c.current_balance < c.credit_limit`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM customers c ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        c.*,
        ct.name as customer_type_name,
        cc.name as category_name,
        cs.name as status_name, cs.color as status_color,
        cs.allows_sales_orders, cs.allows_invoicing, cs.is_blocked,
        cur.code as currency_code,
        u.first_name || ' ' || u.last_name as sales_rep_name
      FROM customers c
      LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
      LEFT JOIN customer_categories cc ON c.category_id = cc.id
      LEFT JOIN customer_statuses cs ON c.status_id = cs.id
      LEFT JOIN currencies cur ON c.currency_id = cur.id
      LEFT JOIN users u ON c.sales_rep_id = u.id
      ${whereClause}
      ORDER BY c.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
    });
  } catch (error) {
    logger.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customers' } });
  }
});

// GET /api/sales/customers/:id - Get single customer
router.get('/:id', requirePermission('customers:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        c.*,
        ct.name as customer_type_name, ct.name_ar as customer_type_name_ar,
        cc.name as category_name, cc.name_ar as category_name_ar,
        cs.name as status_name, cs.name_ar as status_name_ar, cs.color as status_color,
        cs.allows_sales_orders, cs.allows_invoicing, cs.allows_credit, cs.is_blocked,
        cur.code as currency_code, cur.symbol as currency_symbol,
        u.first_name || ' ' || u.last_name as sales_rep_name,
        co.name as country_name,
        ccomp.is_credit_blocked, ccomp.credit_block_reason, ccomp.risk_level
      FROM customers c
      LEFT JOIN customer_types ct ON c.customer_type_id = ct.id
      LEFT JOIN customer_categories cc ON c.category_id = cc.id
      LEFT JOIN customer_statuses cs ON c.status_id = cs.id
      LEFT JOIN currencies cur ON c.currency_id = cur.id
      LEFT JOIN users u ON c.sales_rep_id = u.id
      LEFT JOIN countries co ON c.country_id = co.id
      LEFT JOIN customer_compliance ccomp ON c.id = ccomp.customer_id AND ccomp.company_id = c.company_id
      WHERE c.id = $1 AND c.company_id = $2 AND c.deleted_at IS NULL
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    // Get contacts
    const contactsResult = await pool.query(
      'SELECT * FROM customer_contacts WHERE customer_id = $1 AND deleted_at IS NULL ORDER BY is_primary DESC, first_name',
      [id]
    );

    // Get credit history (last 10)
    const creditHistoryResult = await pool.query(`
      SELECT cch.*, u.first_name || ' ' || u.last_name as approved_by_name
      FROM customer_credit_history cch
      LEFT JOIN users u ON cch.approved_by = u.id
      WHERE cch.customer_id = $1
      ORDER BY cch.created_at DESC
      LIMIT 10
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...result.rows[0],
        contacts: contactsResult.rows,
        credit_history: creditHistoryResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching customer:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer' } });
  }
});

// POST /api/sales/customers - Create customer
router.post('/', requirePermission('customers:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      code, name, name_ar, legal_name,
      customer_type_id, category_id, status_id,
      email, phone, mobile, fax, website,
      tax_registration_number, commercial_registration, vat_number, is_vat_exempt,
      address_line1, address_line2, city, state_province, postal_code, country_id,
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state_province, shipping_postal_code, shipping_country_id,
      currency_id, payment_terms_id, credit_limit, credit_rating,
      price_list_id, discount_percent,
      sales_rep_id, territory_id,
      receivable_account_id, revenue_account_id,
      notes, internal_notes,
      contacts
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Customer name is required' } });
    }

    await client.query('BEGIN');

    // Generate code if not provided
    let customerCode = code;
    if (!customerCode) {
      const lastCustomer = await client.query(
        "SELECT code FROM customers WHERE company_id = $1 ORDER BY id DESC LIMIT 1",
        [companyId]
      );
      
      customerCode = 'CUST-0001';
      if (lastCustomer.rows.length > 0) {
        const lastNum = parseInt(lastCustomer.rows[0].code.replace(/\D/g, '')) || 0;
        customerCode = `CUST-${String(lastNum + 1).padStart(4, '0')}`;
      }
    }

    // Get default status if not provided
    let effectiveStatusId = status_id;
    if (!effectiveStatusId) {
      const defaultStatus = await client.query(
        "SELECT id FROM customer_statuses WHERE company_id = $1 AND code = 'ACTIVE' AND deleted_at IS NULL",
        [companyId]
      );
      effectiveStatusId = defaultStatus.rows[0]?.id;
    }

    // Insert customer
    const result = await client.query(`
      INSERT INTO customers (
        company_id, code, name, name_ar, legal_name,
        customer_type_id, category_id, status_id,
        email, phone, mobile, fax, website,
        tax_registration_number, commercial_registration, vat_number, is_vat_exempt,
        address_line1, address_line2, city, state_province, postal_code, country_id,
        shipping_address_line1, shipping_address_line2, shipping_city, shipping_state_province, shipping_postal_code, shipping_country_id,
        currency_id, payment_terms_id, credit_limit, credit_rating,
        price_list_id, discount_percent,
        sales_rep_id, territory_id,
        receivable_account_id, revenue_account_id,
        notes, internal_notes,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
      ) RETURNING *
    `, [
      companyId, customerCode, name, name_ar, legal_name,
      customer_type_id, category_id, effectiveStatusId,
      email, phone, mobile, fax, website,
      tax_registration_number, commercial_registration, vat_number, is_vat_exempt,
      address_line1, address_line2, city, state_province, postal_code, country_id,
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state_province, shipping_postal_code, shipping_country_id,
      currency_id, payment_terms_id, credit_limit || 0, credit_rating,
      price_list_id, discount_percent || 0,
      sales_rep_id, territory_id,
      receivable_account_id, revenue_account_id,
      notes, internal_notes,
      userId
    ]);

    const customerId = result.rows[0].id;

    // Insert contacts if provided
    if (contacts && Array.isArray(contacts)) {
      for (const contact of contacts) {
        await client.query(`
          INSERT INTO customer_contacts (
            customer_id, first_name, last_name, title, department,
            email, phone, mobile, is_primary, is_billing_contact, is_shipping_contact, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          customerId, contact.first_name, contact.last_name, contact.title, contact.department,
          contact.email, contact.phone, contact.mobile, 
          contact.is_primary || false, contact.is_billing_contact || false, contact.is_shipping_contact || false,
          contact.notes
        ]);
      }
    }

    // Record initial credit limit in history
    if (credit_limit && credit_limit > 0) {
      await client.query(`
        INSERT INTO customer_credit_history (
          customer_id, change_type, new_limit, reason, approved_by, approved_at, created_by
        ) VALUES ($1, 'limit_increase', $2, 'Initial credit limit set on customer creation', $3, NOW(), $3)
      `, [customerId, credit_limit, userId]);
    }

    await client.query('COMMIT');

    logger.info('Customer created', { customerId, customerCode, userId });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error creating customer:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Customer code already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create customer' } });
  } finally {
    client.release();
  }
});

// PUT /api/sales/customers/:id - Update customer
router.put('/:id', requirePermission('customers:update'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const updates = req.body;

    // Check if customer exists
    const existing = await pool.query(
      'SELECT * FROM customers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    // Build dynamic update query
    const allowedFields = [
      'name', 'name_ar', 'legal_name',
      'customer_type_id', 'category_id', 'status_id',
      'email', 'phone', 'mobile', 'fax', 'website',
      'tax_registration_number', 'commercial_registration', 'vat_number', 'is_vat_exempt',
      'address_line1', 'address_line2', 'city', 'state_province', 'postal_code', 'country_id',
      'shipping_address_line1', 'shipping_address_line2', 'shipping_city', 'shipping_state_province', 'shipping_postal_code', 'shipping_country_id',
      'currency_id', 'payment_terms_id', 'credit_rating',
      'price_list_id', 'discount_percent',
      'sales_rep_id', 'territory_id',
      'receivable_account_id', 'revenue_account_id',
      'notes', 'internal_notes', 'is_active'
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;

    values.push(id, companyId);

    const result = await pool.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    logger.info('Customer updated', { customerId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating customer:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update customer' } });
  }
});

// DELETE /api/sales/customers/:id - Soft delete customer
router.delete('/:id', requirePermission('customers:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Check for linked documents
    const linkedDocs = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM sales_orders WHERE customer_id = $1 AND deleted_at IS NULL) as orders,
        (SELECT COUNT(*) FROM sales_invoices WHERE customer_id = $1 AND deleted_at IS NULL) as invoices
    `, [id]);

    const docs = linkedDocs.rows[0];
    if (parseInt(docs.orders) > 0 || parseInt(docs.invoices) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'HAS_LINKED_DOCUMENTS', 
          message: `Cannot delete customer with ${docs.orders} order(s) and ${docs.invoices} invoice(s). Consider deactivating instead.` 
        } 
      });
    }

    const result = await pool.query(
      'UPDATE customers SET deleted_at = NOW(), updated_by = $1 WHERE id = $2 AND company_id = $3 RETURNING id',
      [userId, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    logger.info('Customer deleted', { customerId: id, userId });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error('Error deleting customer:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete customer' } });
  }
});

// ============================================
// CREDIT MANAGEMENT
// ============================================

// PUT /api/sales/customers/:id/credit-limit
router.put('/:id/credit-limit', requirePermission('customers:credit_manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { credit_limit, reason } = req.body;

    if (credit_limit === undefined || !reason) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Credit limit and reason are required' } });
    }

    await CustomerService.updateCreditLimit(
      parseInt(id),
      companyId,
      credit_limit,
      reason,
      userId
    );

    res.json({ success: true, message: 'Credit limit updated successfully' });
  } catch (error) {
    logger.error('Error updating credit limit:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update credit limit' } });
  }
});

// POST /api/sales/customers/:id/credit-check
router.post('/:id/credit-check', requirePermission('customers:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount is required' } });
    }

    const result = await CustomerService.checkCreditAvailability(
      parseInt(id),
      companyId,
      parseFloat(amount)
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error checking credit:', error);
    res.status(500).json({ success: false, error: { code: 'CHECK_ERROR', message: 'Failed to check credit' } });
  }
});

// PUT /api/sales/customers/:id/block
router.put('/:id/block', requirePermission('customers:block'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Block reason is required' } });
    }

    await CustomerService.setCreditBlock(
      parseInt(id),
      companyId,
      true,
      reason,
      userId
    );

    res.json({ success: true, message: 'Customer credit blocked successfully' });
  } catch (error) {
    logger.error('Error blocking customer:', error);
    res.status(500).json({ success: false, error: { code: 'BLOCK_ERROR', message: 'Failed to block customer' } });
  }
});

// PUT /api/sales/customers/:id/unblock
router.put('/:id/unblock', requirePermission('customers:block'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    await CustomerService.setCreditBlock(
      parseInt(id),
      companyId,
      false,
      reason || 'Credit block removed',
      userId
    );

    res.json({ success: true, message: 'Customer credit unblocked successfully' });
  } catch (error) {
    logger.error('Error unblocking customer:', error);
    res.status(500).json({ success: false, error: { code: 'UNBLOCK_ERROR', message: 'Failed to unblock customer' } });
  }
});

// GET /api/sales/customers/:id/aging
router.get('/:id/aging', requirePermission('customers:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const aging = await CustomerService.getCustomerAging(parseInt(id), companyId);
    res.json({ success: true, data: aging });
  } catch (error) {
    logger.error('Error fetching customer aging:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customer aging' } });
  }
});

// GET /api/sales/customers/credit-review - Customers needing credit review
router.get('/credit-review', requirePermission('customers:credit_manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const customers = await CustomerService.getCustomersForCreditReview(companyId);
    res.json({ success: true, data: customers, total: customers.length });
  } catch (error) {
    logger.error('Error fetching credit review list:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch credit review list' } });
  }
});

export default router;
