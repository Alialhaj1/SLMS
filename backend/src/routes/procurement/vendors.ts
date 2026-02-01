import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { UploadService } from '../../services/uploadService';
import logger from '../../utils/logger';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// VENDORS - Full CRUD
// ============================================

// GET /api/procurement/vendors - List vendors
router.get('/', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status, category_id, type_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE v.company_id = $1 AND v.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (v.code ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex} OR v.name_ar ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category_id) {
      whereClause += ` AND v.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (type_id) {
      whereClause += ` AND v.type_id = $${paramIndex}`;
      params.push(type_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM vendors v ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        v.*,
        vc.name as category_name, vc.name_ar as category_name_ar,
        vt.name as type_name, vt.name_ar as type_name_ar,
        vs.name as status_name, vs.name_ar as status_name_ar, vs.color as status_color,
        vs.allows_purchase_orders as allows_purchase_orders,
        c.name as currency_name, c.code as currency_code,
        COALESCE(v.current_balance, 0) as current_balance
      FROM vendors v
      LEFT JOIN vendor_categories vc ON v.category_id = vc.id
      LEFT JOIN vendor_types vt ON v.type_id = vt.id
      LEFT JOIN vendor_statuses vs ON v.status_id = vs.id
      LEFT JOIN currencies c ON v.currency_id = c.id
      ${whereClause}
      ORDER BY v.code
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
    logger.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendors' } });
  }
});

// GET /api/procurement/vendors/:id - Get single vendor
// POST /api/procurement/vendors - Create vendor
router.post('/', requirePermission('vendors:create'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      code, name, name_ar, vendor_type, category_id, type_id, status_id,
      is_external,
      tax_number, commercial_register, phone, mobile, email, website,
      address, country_id, city_id, postal_code, currency_id,
      credit_limit, bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
      lead_time_days, min_order_amount, notes
    } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    // Check for duplicate code
    const existing = await pool.query(
      'SELECT id FROM vendors WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL',
      [code, companyId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Vendor code already exists' } });
    }

    // Get default status if not provided
    let finalStatusId = status_id;
    if (!finalStatusId) {
      const defaultStatus = await pool.query(
        'SELECT id FROM vendor_statuses WHERE company_id = $1 AND is_default = true AND deleted_at IS NULL',
        [companyId]
      );
      if (defaultStatus.rows.length > 0) {
        finalStatusId = defaultStatus.rows[0].id;
      }
    }

    const result = await pool.query(`
      INSERT INTO vendors (
        company_id, code, name, name_ar, vendor_type, category_id, type_id, status_id,
        is_external,
        tax_number, commercial_register, phone, mobile, email, website,
        address, country_id, city_id, postal_code, currency_id,
        credit_limit, bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
        lead_time_days, min_order_amount, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, 'active', $30)
      RETURNING *
    `, [
      companyId, code, name, name_ar, vendor_type || 'supplier', category_id, type_id, finalStatusId,
      typeof is_external === 'boolean' ? is_external : false,
      tax_number, commercial_register, phone, mobile, email, website,
      address, country_id, city_id, postal_code, currency_id,
      credit_limit || 0, bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
      lead_time_days || 0, min_order_amount, notes, userId
    ]);

    logger.info('Vendor created', { vendorId: result.rows[0].id, code, userId });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error creating vendor:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create vendor' } });
  }
});

// ============================================
// PROCUREMENT REFERENCE DATA (for dropdowns)
// NOTE: Must appear BEFORE '/:id' vendor routes to avoid route shadowing.
// ============================================

// ============================================
// VENDOR CATEGORIES - CRUD
// ============================================

router.get('/vendor-categories', requirePermission('vendor_categories:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM vendor_categories WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching vendor categories:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor categories' } });
  }
});

router.post('/vendor-categories', requirePermission('vendor_categories:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, description, description_ar, sort_order } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name required' } });
    }

    const result = await pool.query(
      `
      INSERT INTO vendor_categories (company_id, code, name, name_ar, description, description_ar, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [companyId, code, name, name_ar, description, description_ar, sort_order || 0, userId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Category code already exists' } });
    }
    logger.error('Error creating vendor category:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create category' } });
  }
});

router.delete('/vendor-categories/:id', requirePermission('vendor_categories:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const inUse = await pool.query(
      'SELECT COUNT(*) FROM vendors WHERE category_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(400).json({ success: false, error: { code: 'HAS_DEPENDENCIES', message: 'Cannot delete category in use by vendors' } });
    }

    const result = await pool.query(
      'UPDATE vendor_categories SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL RETURNING id',
      [userId, id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vendor category:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete category' } });
  }
});

// ============================================
// VENDOR TYPES - CRUD
// ============================================

router.get('/vendor-types', requirePermission('vendor_types:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM vendor_types WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching vendor types:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor types' } });
  }
});

router.post('/vendor-types', requirePermission('vendor_types:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, description, description_ar, affects_inventory, creates_asset, sort_order, is_active } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name required' } });
    }

    const result = await pool.query(
      `
      INSERT INTO vendor_types (
        company_id, code, name, name_ar, description, description_ar,
        affects_inventory, creates_asset,
        sort_order, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        companyId,
        code,
        name,
        name_ar,
        description,
        description_ar,
        affects_inventory ?? true,
        creates_asset ?? false,
        sort_order || 0,
        is_active ?? true,
        userId
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Type code already exists' } });
    }
    logger.error('Error creating vendor type:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create vendor type' } });
  }
});

router.delete('/vendor-types/:id', requirePermission('vendor_types:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const inUse = await pool.query(
      'SELECT COUNT(*) FROM vendors WHERE type_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(400).json({ success: false, error: { code: 'HAS_DEPENDENCIES', message: 'Cannot delete type in use by vendors' } });
    }

    const result = await pool.query(
      'UPDATE vendor_types SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL RETURNING id',
      [userId, id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Type not found' } });
    }

    res.json({ success: true, message: 'Type deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vendor type:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete vendor type' } });
  }
});

// ============================================
// VENDOR STATUSES - CRUD
// ============================================

router.get('/vendor-statuses', requirePermission('vendor_statuses:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM vendor_statuses WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching vendor statuses:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor statuses' } });
  }
});

router.post('/vendor-statuses', requirePermission('vendor_statuses:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { code, name, name_ar, description, description_ar, color, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order, is_active } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name required' } });
    }

    const result = await pool.query(
      `
      INSERT INTO vendor_statuses (
        company_id, code, name, name_ar, description, description_ar,
        color, allows_purchase_orders, allows_invoices, allows_payments,
        is_default, sort_order, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `,
      [
        companyId,
        code,
        name,
        name_ar,
        description,
        description_ar,
        color || 'gray',
        allows_purchase_orders ?? true,
        allows_invoices ?? true,
        allows_payments ?? true,
        is_default ?? false,
        sort_order || 0,
        is_active ?? true
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Status code already exists' } });
    }
    logger.error('Error creating vendor status:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create vendor status' } });
  }
});

router.delete('/vendor-statuses/:id', requirePermission('vendor_statuses:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const inUse = await pool.query(
      'SELECT COUNT(*) FROM vendors WHERE status_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(400).json({ success: false, error: { code: 'HAS_DEPENDENCIES', message: 'Cannot delete status in use by vendors' } });
    }

    const result = await pool.query(
      'UPDATE vendor_statuses SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id',
      [id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Status not found' } });
    }

    res.json({ success: true, message: 'Status deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vendor status:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete vendor status' } });
  }
});

// ============================================
// VENDOR PAYMENT TERMS - CRUD
// ============================================

router.get('/payment-terms', requirePermission('vendor_payment_terms:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM vendor_payment_terms WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching payment terms:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch payment terms' } });
  }
});

router.post('/payment-terms', requirePermission('vendor_payment_terms:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { code, name, name_ar, description, payment_type, due_days, discount_days, discount_percent, is_default, sort_order } = req.body;

    if (!code || !name || !payment_type) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code, name and payment_type required' } });
    }

    const result = await pool.query(
      `
      INSERT INTO vendor_payment_terms (company_id, code, name, name_ar, description, payment_type, due_days, discount_days, discount_percent, is_default, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `,
      [companyId, code, name, name_ar, description, payment_type, due_days || 0, discount_days || 0, discount_percent || 0, is_default || false, sort_order || 0, userId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Payment terms code already exists' } });
    }
    logger.error('Error creating payment terms:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create payment terms' } });
  }
});

router.delete('/payment-terms/:id', requirePermission('vendor_payment_terms:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const inUse = await pool.query(
      'SELECT COUNT(*) FROM vendors WHERE payment_term_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(400).json({ success: false, error: { code: 'HAS_DEPENDENCIES', message: 'Cannot delete payment terms in use by vendors' } });
    }

    const result = await pool.query(
      'UPDATE vendor_payment_terms SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL RETURNING id',
      [userId, id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment terms not found' } });
    }

    res.json({ success: true, message: 'Payment terms deleted successfully' });
  } catch (error) {
    logger.error('Error deleting payment terms:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete payment terms' } });
  }
});

// ============================================
// DELIVERY TERMS - CRUD
// ============================================

router.get('/delivery-terms', requirePermission('delivery_terms:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM delivery_terms WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching delivery terms:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch delivery terms' } });
  }
});

router.delete('/delivery-terms/:id', requirePermission('delivery_terms:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE delivery_terms SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id',
      [id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Delivery terms not found' } });
    }

    res.json({ success: true, message: 'Delivery terms deleted successfully' });
  } catch (error) {
    logger.error('Error deleting delivery terms:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete delivery terms' } });
  }
});

// ============================================
// SUPPLY TERMS - CRUD
// ============================================

router.get('/supply-terms', requirePermission('supply_terms:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM supply_terms WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching supply terms:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch supply terms' } });
  }
});

router.delete('/supply-terms/:id', requirePermission('supply_terms:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE supply_terms SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id',
      [id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Supply terms not found' } });
    }

    res.json({ success: true, message: 'Supply terms deleted successfully' });
  } catch (error) {
    logger.error('Error deleting supply terms:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete supply terms' } });
  }
});

// ============================================
// VENDOR DOCUMENT TYPES (must be before /:id)
// ============================================

// GET /api/procurement/vendors/document-types - Get document types reference
router.get('/document-types', requirePermission('vendors:documents:view'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vendor_document_types WHERE is_active = true ORDER BY sort_order, name_en`
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching document types:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch document types' } });
  }
});

// GET /api/procurement/vendors/classifications - Get vendor classifications (must be before /:id)
router.get('/classifications', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM vendor_classifications WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching vendor classifications:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch classifications' } });
  }
});

// GET /api/procurement/vendors/stats - Get vendor statistics (must be before /:id)
router.get('/stats', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status != 'active' OR status IS NULL) as inactive,
        COUNT(*) FILTER (WHERE is_external = false OR is_external IS NULL) as local,
        COUNT(*) FILTER (WHERE is_external = true) as foreign,
        COALESCE(SUM(COALESCE(outstanding_balance, current_balance, 0)), 0) as total_outstanding,
        COALESCE(SUM(credit_limit), 0) as total_credit_limit,
        COUNT(*) FILTER (WHERE COALESCE(outstanding_balance, current_balance, 0) > credit_limit AND credit_limit > 0) as over_limit
      FROM vendors
      WHERE company_id = $1 AND deleted_at IS NULL
    `, [companyId]);

    const stats = statsResult.rows[0];
    
    // Get expired documents count
    const expiredDocsResult = await pool.query(`
      SELECT COUNT(DISTINCT vendor_id) as count
      FROM vendor_documents
      WHERE company_id = $1 AND expiry_date < CURRENT_DATE AND deleted_at IS NULL
    `, [companyId]);

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        inactive: parseInt(stats.inactive) || 0,
        local: parseInt(stats.local) || 0,
        foreign: parseInt(stats.foreign) || 0,
        totalOutstanding: parseFloat(stats.total_outstanding) || 0,
        totalCreditLimit: parseFloat(stats.total_credit_limit) || 0,
        overLimit: parseInt(stats.over_limit) || 0,
        expiredDocuments: parseInt(expiredDocsResult.rows[0]?.count) || 0,
        highRisk: parseInt(stats.over_limit) || 0,
        attentionNeeded: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching vendor stats:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor statistics' } });
  }
});

// GET /api/procurement/vendors/:id - Get single vendor
router.get('/:id', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        v.*,
        vc.name as category_name, vc.name_ar as category_name_ar,
        vt.name as type_name, vt.name_ar as type_name_ar,
        vs.name as status_name, vs.name_ar as status_name_ar, vs.color as status_color,
        c.name as currency_name, c.code as currency_code
      FROM vendors v
      LEFT JOIN vendor_categories vc ON v.category_id = vc.id
      LEFT JOIN vendor_types vt ON v.type_id = vt.id
      LEFT JOIN vendor_statuses vs ON v.status_id = vs.id
      LEFT JOIN currencies c ON v.currency_id = c.id
      WHERE v.id = $1 AND v.company_id = $2 AND v.deleted_at IS NULL
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching vendor:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor' } });
  }
});

// PUT /api/procurement/vendors/:id - Update vendor
router.put('/:id', requirePermission('vendors:edit'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const {
      code, name, name_ar, vendor_type, category_id, type_id, status_id,
      is_external,
      tax_number, commercial_register, phone, mobile, email, website,
      address, country_id, city_id, postal_code, currency_id,
      credit_limit, bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
      lead_time_days, min_order_amount, notes, status
    } = req.body;

    // Check if vendor exists
    const existing = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    // Check for duplicate code (excluding current)
    if (code) {
      const duplicate = await pool.query(
        'SELECT id FROM vendors WHERE code = $1 AND company_id = $2 AND id != $3 AND deleted_at IS NULL',
        [code, companyId, id]
      );
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Vendor code already exists' } });
      }
    }

    const result = await pool.query(`
      UPDATE vendors SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        name_ar = COALESCE($3, name_ar),
        vendor_type = COALESCE($4, vendor_type),
        category_id = $5,
        type_id = $6,
        status_id = $7,
        is_external = COALESCE($8, is_external),
        tax_number = COALESCE($9, tax_number),
        commercial_register = COALESCE($10, commercial_register),
        phone = COALESCE($11, phone),
        mobile = COALESCE($12, mobile),
        email = COALESCE($13, email),
        website = COALESCE($14, website),
        address = COALESCE($15, address),
        country_id = $16,
        city_id = $17,
        postal_code = COALESCE($18, postal_code),
        currency_id = $19,
        credit_limit = COALESCE($20, credit_limit),
        bank_id = $21,
        bank_account_name = COALESCE($22, bank_account_name),
        bank_account_number = COALESCE($23, bank_account_number),
        bank_iban = COALESCE($24, bank_iban),
        bank_swift = COALESCE($25, bank_swift),
        lead_time_days = COALESCE($26, lead_time_days),
        min_order_amount = $27,
        notes = COALESCE($28, notes),
        status = COALESCE($29, status),
        updated_by = $30,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $31 AND company_id = $32 AND deleted_at IS NULL
      RETURNING *
    `, [
      code, name, name_ar, vendor_type, category_id, type_id, status_id,
      typeof is_external === 'boolean' ? is_external : false,
      tax_number, commercial_register, phone, mobile, email, website,
      address, country_id, city_id, postal_code, currency_id,
      credit_limit, bank_id, bank_account_name, bank_account_number, bank_iban, bank_swift,
      lead_time_days, min_order_amount, notes, status, userId, id, companyId
    ]);

    logger.info('Vendor updated', { vendorId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating vendor:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update vendor' } });
  }
});

// ============================================
// VENDOR 360° PROFILE ENDPOINTS
// ============================================

// GET /api/procurement/vendors/:id/profile - Get complete vendor profile with statistics
router.get('/:id/profile', requirePermission('vendors:profile:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    // Get vendor with all related info
    const vendorResult = await pool.query(`
      SELECT 
        v.*,
        vc.name as category_name, vc.name_ar as category_name_ar, vc.code as category_code,
        vt.name as type_name, vt.name_ar as type_name_ar,
        vs.name as status_name, vs.name_ar as status_name_ar, vs.color as status_color,
        vs.allows_purchase_orders, vs.allows_invoices, vs.allows_payments,
        vcl.name as classification_name, vcl.name_ar as classification_name_ar, vcl.color as classification_color,
        c.name as currency_name, c.code as currency_code, c.symbol as currency_symbol,
        co.name as country_name, co.name_ar as country_name_ar,
        ci.name as city_name, ci.name_ar as city_name_ar,
        pt.name as payment_terms_name, pt.name_ar as payment_terms_name_ar,
        a.code as gl_account_code, a.name as gl_account_name,
        b.name as bank_name
      FROM vendors v
      LEFT JOIN vendor_categories vc ON v.category_id = vc.id
      LEFT JOIN vendor_types vt ON v.type_id = vt.id
      LEFT JOIN vendor_statuses vs ON v.status_id = vs.id
      LEFT JOIN vendor_classifications vcl ON v.classification_id = vcl.id
      LEFT JOIN currencies c ON v.currency_id = c.id
      LEFT JOIN countries co ON v.country_id = co.id
      LEFT JOIN cities ci ON v.city_id = ci.id
      LEFT JOIN vendor_payment_terms pt ON v.default_payment_term_id = pt.id
      LEFT JOIN accounts a ON v.payable_account_id = a.id
      LEFT JOIN banks b ON v.bank_id = b.id
      WHERE v.id = $1 AND v.company_id = $2 AND v.deleted_at IS NULL
    `, [id, companyId]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    const vendor = vendorResult.rows[0];

    // Get statistics
    const [poStats, invoiceStats, paymentStats, shipmentStats] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COALESCE(SUM(total_amount), 0) as total_amount
        FROM purchase_orders 
        WHERE vendor_id = $1 AND deleted_at IS NULL
      `, [id]),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status NOT IN ('paid')) as unpaid,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(paid_amount), 0) as paid_amount
        FROM purchase_invoices 
        WHERE vendor_id = $1 AND deleted_at IS NULL
      `, [id]),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(payment_amount), 0) as total_amount,
          MAX(payment_date) as last_payment
        FROM vendor_payments 
        WHERE vendor_id = $1 AND status = 'posted' AND deleted_at IS NULL
      `, [id]),
      pool.query(`
        SELECT COUNT(*) as total
        FROM logistics_shipments 
        WHERE vendor_id = $1 AND deleted_at IS NULL
      `, [id])
    ]);

    // Get contracts count
    const contractStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE vc.end_date >= CURRENT_DATE) as active
      FROM vendor_contracts vc
      WHERE vc.vendor_id = $1 AND vc.deleted_at IS NULL
    `, [id]);

    // Get price lists count
    const priceListStats = await pool.query(`
      SELECT COUNT(*) as total
      FROM vendor_price_lists 
      WHERE vendor_id = $1 AND status = 'active' AND deleted_at IS NULL
    `, [id]);

    res.json({
      success: true,
      data: {
        vendor,
        statistics: {
          purchaseOrders: {
            total: parseInt(poStats.rows[0].total),
            pending: parseInt(poStats.rows[0].pending),
            approved: parseInt(poStats.rows[0].approved),
            totalAmount: parseFloat(poStats.rows[0].total_amount) || 0
          },
          invoices: {
            total: parseInt(invoiceStats.rows[0].total),
            unpaid: parseInt(invoiceStats.rows[0].unpaid),
            totalAmount: parseFloat(invoiceStats.rows[0].total_amount) || 0,
            paidAmount: parseFloat(invoiceStats.rows[0].paid_amount) || 0
          },
          payments: {
            total: parseInt(paymentStats.rows[0].total),
            totalAmount: parseFloat(paymentStats.rows[0].total_amount) || 0,
            lastPayment: paymentStats.rows[0].last_payment
          },
          shipments: {
            total: parseInt(shipmentStats.rows[0].total)
          },
          contracts: {
            total: parseInt(contractStats.rows[0].total),
            active: parseInt(contractStats.rows[0].active)
          },
          priceLists: {
            total: parseInt(priceListStats.rows[0].total)
          }
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching vendor profile:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor profile' } });
  }
});

// GET /api/procurement/vendors/:id/bank-accounts - Get vendor bank accounts
router.get('/:id/bank-accounts', requirePermission('vendors:bank_accounts:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        vba.*,
        b.name as bank_name_lookup, b.swift_code as bank_swift_code,
        c.code as currency_code, c.symbol as currency_symbol,
        co.name as country_name
      FROM vendor_bank_accounts vba
      LEFT JOIN banks b ON vba.bank_id = b.id
      LEFT JOIN currencies c ON vba.currency_id = c.id
      LEFT JOIN countries co ON vba.country_id = co.id
      WHERE vba.vendor_id = $1 AND vba.deleted_at IS NULL
      ORDER BY vba.is_default DESC, vba.created_at
    `, [id]);

    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching vendor bank accounts:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch bank accounts' } });
  }
});

// POST /api/procurement/vendors/:id/bank-accounts - Add vendor bank account
router.post('/:id/bank-accounts', requirePermission('vendors:bank_accounts:manage'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { bank_id, bank_name, account_name, account_number, iban, swift_code, currency_id, country_id, branch_name, branch_address, is_default, notes } = req.body;

    if (!account_name || !account_number) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Account name and number are required' } });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE vendor_bank_accounts SET is_default = false WHERE vendor_id = $1', [id]);
    }

    const result = await pool.query(`
      INSERT INTO vendor_bank_accounts (
        vendor_id, bank_id, bank_name, account_name, account_number, iban, swift_code,
        currency_id, country_id, branch_name, branch_address, is_default, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [id, bank_id, bank_name, account_name, account_number, iban, swift_code, currency_id, country_id, branch_name, branch_address, is_default || false, notes, userId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error adding vendor bank account:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to add bank account' } });
  }
});

// PUT /api/procurement/vendors/:vendorId/bank-accounts/:bankAccountId - Update bank account
router.put('/:vendorId/bank-accounts/:bankAccountId', requirePermission('vendors:bank_accounts:manage'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { vendorId, bankAccountId } = req.params;
    const { bank_id, bank_name, account_name, account_number, iban, swift_code, currency_id, country_id, branch_name, branch_address, is_default, is_active, notes } = req.body;

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE vendor_bank_accounts SET is_default = false WHERE vendor_id = $1 AND id != $2', [vendorId, bankAccountId]);
    }

    const result = await pool.query(`
      UPDATE vendor_bank_accounts SET
        bank_id = COALESCE($1, bank_id),
        bank_name = COALESCE($2, bank_name),
        account_name = COALESCE($3, account_name),
        account_number = COALESCE($4, account_number),
        iban = COALESCE($5, iban),
        swift_code = COALESCE($6, swift_code),
        currency_id = $7,
        country_id = $8,
        branch_name = COALESCE($9, branch_name),
        branch_address = COALESCE($10, branch_address),
        is_default = COALESCE($11, is_default),
        is_active = COALESCE($12, is_active),
        notes = COALESCE($13, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14 AND vendor_id = $15 AND deleted_at IS NULL
      RETURNING *
    `, [bank_id, bank_name, account_name, account_number, iban, swift_code, currency_id, country_id, branch_name, branch_address, is_default, is_active, notes, bankAccountId, vendorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bank account not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating vendor bank account:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update bank account' } });
  }
});

// DELETE /api/procurement/vendors/:vendorId/bank-accounts/:bankAccountId
router.delete('/:vendorId/bank-accounts/:bankAccountId', requirePermission('vendors:bank_accounts:manage'), async (req: Request, res: Response) => {
  try {
    const { vendorId, bankAccountId } = req.params;

    const result = await pool.query(
      'UPDATE vendor_bank_accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL RETURNING id',
      [bankAccountId, vendorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bank account not found' } });
    }

    res.json({ success: true, message: 'Bank account deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vendor bank account:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete bank account' } });
  }
});

// GET /api/procurement/vendors/:id/items - Get vendor items and prices
router.get('/:id/items', requirePermission('vendors:items:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [id];
    let paramIndex = 2;

    let whereClause = 'WHERE vi.vendor_id = $1 AND vi.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (i.code ILIKE $${paramIndex} OR i.name ILIKE $${paramIndex} OR vi.vendor_item_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM vendor_items vi JOIN items i ON vi.item_id = i.id ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const result = await pool.query(`
      SELECT 
        vi.*,
        i.code as item_code, i.name as item_name, i.name_ar as item_name_ar,
        c.code as currency_code
      FROM vendor_items vi
      JOIN items i ON vi.item_id = i.id
      LEFT JOIN currencies c ON vi.currency_id = c.id
      ${whereClause}
      ORDER BY i.code
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching vendor items:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch vendor items' } });
  }
});

// GET /api/procurement/vendors/:id/purchase-orders - Get vendor POs
router.get('/:id/purchase-orders', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    let companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Fallback: get company from vendor if not in context
    if (!companyId) {
      const vendorResult = await pool.query('SELECT company_id FROM vendors WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (vendorResult.rows.length > 0) {
        companyId = vendorResult.rows[0].company_id;
      }
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Company context required' } });
    }

    const params: any[] = [id, companyId];
    let paramIndex = 3;

    let whereClause = 'WHERE po.vendor_id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL';

    if (status) {
      whereClause += ` AND po.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM purchase_orders po ${whereClause}`, params);

    params.push(Number(limit), offset);
    const result = await pool.query(`
      SELECT po.*, c.code as currency_code
      FROM purchase_orders po
      LEFT JOIN currencies c ON po.currency_id = c.id
      ${whereClause}
      ORDER BY po.order_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching vendor POs:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch purchase orders' } });
  }
});

// GET /api/procurement/vendors/:id/invoices - Get vendor invoices
router.get('/:id/invoices', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    let companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const { id } = req.params;
    const { payment_status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Fallback: get company from vendor if not in context
    if (!companyId) {
      const vendorResult = await pool.query('SELECT company_id FROM vendors WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (vendorResult.rows.length > 0) {
        companyId = vendorResult.rows[0].company_id;
      }
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Company context required' } });
    }

    const params: any[] = [id, companyId];
    let paramIndex = 3;

    let whereClause = 'WHERE pi.vendor_id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL';

    if (payment_status) {
      whereClause += ` AND pi.payment_status = $${paramIndex}`;
      params.push(payment_status);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM purchase_invoices pi ${whereClause}`, params);

    params.push(Number(limit), offset);
    const result = await pool.query(`
      SELECT pi.*, c.code as currency_code
      FROM purchase_invoices pi
      LEFT JOIN currencies c ON pi.currency_id = c.id
      ${whereClause}
      ORDER BY pi.invoice_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching vendor invoices:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch invoices' } });
  }
});

// GET /api/procurement/vendors/:id/payments - Get vendor payments
router.get('/:id/payments', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    let companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Fallback: get company from vendor if not in context
    if (!companyId) {
      const vendorResult = await pool.query('SELECT company_id FROM vendors WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (vendorResult.rows.length > 0) {
        companyId = vendorResult.rows[0].company_id;
      }
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Company context required' } });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM vendor_payments WHERE vendor_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    const result = await pool.query(`
      SELECT vp.*, c.code as currency_code, pm.name as payment_method_name
      FROM vendor_payments vp
      LEFT JOIN currencies c ON vp.currency_id = c.id
      LEFT JOIN payment_methods pm ON vp.payment_method = pm.code
      WHERE vp.vendor_id = $1 AND vp.company_id = $2 AND vp.deleted_at IS NULL
      ORDER BY vp.payment_date DESC
      LIMIT $3 OFFSET $4
    `, [id, companyId, Number(limit), offset]);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching vendor payments:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch payments' } });
  }
});

// GET /api/procurement/vendors/:id/contracts - Get vendor contracts
router.get('/:id/contracts', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [id, companyId];
    let paramIndex = 3;

    let whereClause = 'WHERE vc.vendor_id = $1 AND vc.company_id = $2 AND vc.deleted_at IS NULL';

    if (status) {
      whereClause += ` AND vc.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM vendor_contracts vc ${whereClause}`, params);

    params.push(Number(limit), offset);
    const result = await pool.query(`
      SELECT vc.*, c.code as currency_code
      FROM vendor_contracts vc
      LEFT JOIN currencies c ON vc.currency_id = c.id
      ${whereClause}
      ORDER BY vc.start_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching vendor contracts:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch contracts' } });
  }
});

// GET /api/procurement/vendors/:id/shipments - Get vendor shipments
router.get('/:id/shipments', requirePermission('vendors:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM logistics_shipments WHERE vendor_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    const result = await pool.query(`
      SELECT ls.*, c.code as currency_code
      FROM logistics_shipments ls
      LEFT JOIN currencies c ON ls.currency_id = c.id
      WHERE ls.vendor_id = $1 AND ls.company_id = $2 AND ls.deleted_at IS NULL
      ORDER BY ls.created_at DESC
      LIMIT $3 OFFSET $4
    `, [id, companyId, Number(limit), offset]);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching vendor shipments:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch shipments' } });
  }
});

// GET /api/procurement/vendors/:id/statement - Get vendor statement (ledger)
router.get('/:id/statement', requirePermission('vendors:statements:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const { from_date, to_date, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let dateFilter = '';
    const params: any[] = [id, companyId];
    let paramIndex = 3;

    if (from_date) {
      dateFilter += ` AND transaction_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }
    if (to_date) {
      dateFilter += ` AND transaction_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    // Get opening balance if from_date is specified
    let openingBalance = 0;
    if (from_date) {
      const obResult = await pool.query(`
        SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE -amount END), 0) as balance
        FROM vendor_balance_transactions
        WHERE vendor_id = $1 AND transaction_date < $2
      `, [id, from_date]);
      openingBalance = parseFloat(obResult.rows[0].balance) || 0;
    }

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM vendor_balance_transactions 
      WHERE vendor_id = $1 AND deleted_at IS NULL ${dateFilter}
    `, params);

    params.push(Number(limit), offset);
    const result = await pool.query(`
      SELECT 
        vbt.*,
        c.code as currency_code
      FROM vendor_balance_transactions vbt
      LEFT JOIN currencies c ON vbt.currency_id = c.id
      WHERE vbt.vendor_id = $1 AND vbt.deleted_at IS NULL ${dateFilter}
      ORDER BY vbt.transaction_date, vbt.id
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    // Calculate running balance
    let runningBalance = openingBalance;
    const transactions = result.rows.map(row => {
      if (row.transaction_type === 'debit') {
        runningBalance += parseFloat(row.amount);
      } else {
        runningBalance -= parseFloat(row.amount);
      }
      return { ...row, running_balance: runningBalance };
    });

    res.json({
      success: true,
      data: {
        openingBalance,
        transactions,
        closingBalance: runningBalance
      },
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching vendor statement:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch statement' } });
  }
});

// POST /api/procurement/vendors/:id/toggle-status - Enable/disable vendor
router.post('/:id/toggle-status', requirePermission('vendors:toggle_status'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { is_active, blocked_reason } = req.body;

    const newStatus = is_active ? 'active' : 'blocked';

    const result = await pool.query(`
      UPDATE vendors SET
        status = $1,
        blocked_reason = $2,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND company_id = $5 AND deleted_at IS NULL
      RETURNING *
    `, [newStatus, is_active ? null : blocked_reason, userId, id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    logger.info('Vendor status toggled', { vendorId: id, status: newStatus, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error toggling vendor status:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update vendor status' } });
  }
});

// ============================================
// VENDOR DOCUMENTS CRUD
// ============================================

// GET /api/procurement/vendors/:id/documents - Get vendor documents
router.get('/:id/documents', requirePermission('vendors:documents:view'), async (req: Request, res: Response) => {
  try {
    let companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const { id } = req.params;
    const { status, type } = req.query;

    // Fallback: get company from vendor if not in context
    if (!companyId) {
      const vendorResult = await pool.query('SELECT company_id FROM vendors WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (vendorResult.rows.length > 0) {
        companyId = vendorResult.rows[0].company_id;
      }
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Company context required' } });
    }

    let whereClause = 'WHERE vd.vendor_id = $1 AND vd.company_id = $2 AND vd.deleted_at IS NULL';
    const params: any[] = [id, companyId];
    let paramIndex = 3;

    if (status) {
      whereClause += ` AND vd.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND vd.document_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT 
        vd.*,
        vdt.name_en as type_name_en,
        vdt.name_ar as type_name_ar,
        vdt.requires_expiry,
        vdt.expiry_warning_days,
        CASE 
          WHEN vd.expiry_date IS NOT NULL AND vd.expiry_date < CURRENT_DATE THEN 'expired'
          WHEN vd.expiry_date IS NOT NULL AND vd.expiry_date <= CURRENT_DATE + vdt.expiry_warning_days THEN 'expiring_soon'
          ELSE 'valid'
        END as expiry_status,
        CASE 
          WHEN vd.expiry_date IS NOT NULL THEN (vd.expiry_date - CURRENT_DATE)
          ELSE NULL
        END as days_until_expiry,
        u.email as created_by_email
      FROM vendor_documents vd
      LEFT JOIN vendor_document_types vdt ON vdt.code = vd.document_type
      LEFT JOIN users u ON u.id = vd.created_by
      ${whereClause}
      ORDER BY vdt.sort_order, vd.created_at DESC
    `, params);

    // Summary counts
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired,
        COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + 30) as expiring_soon,
        COUNT(*) FILTER (WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE + 30) as valid
      FROM vendor_documents
      WHERE vendor_id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);

    res.json({ 
      success: true, 
      data: result.rows, 
      total: result.rowCount,
      summary: summaryResult.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching vendor documents:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch documents' } });
  }
});

// POST /api/procurement/vendors/:id/documents - Add vendor document
router.post('/:id/documents', requirePermission('vendors:documents:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { 
      document_type, document_number, document_name, description,
      file_url, file_name, file_size, file_type,
      issue_date, expiry_date, is_required
    } = req.body;

    if (!document_type || !document_name || !file_url || !file_name) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'document_type, document_name, file_url, file_name are required' } 
      });
    }

    const result = await pool.query(`
      INSERT INTO vendor_documents (
        vendor_id, company_id, document_type, document_number, document_name, description,
        file_url, file_name, file_size, file_type, issue_date, expiry_date, is_required,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14)
      RETURNING *
    `, [id, companyId, document_type, document_number, document_name, description,
        file_url, file_name, file_size, file_type, issue_date, expiry_date, is_required || false, userId]);

    logger.info(`Vendor document added: vendor=${id}, type=${document_type}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error adding vendor document:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to add document' } });
  }
});

// PUT /api/procurement/vendors/:vendorId/documents/:documentId - Update document
router.put('/:vendorId/documents/:documentId', requirePermission('vendors:documents:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { vendorId, documentId } = req.params;
    const { 
      document_type, document_number, document_name, description,
      file_url, file_name, file_size, file_type,
      issue_date, expiry_date, is_required, status
    } = req.body;

    const result = await pool.query(`
      UPDATE vendor_documents SET
        document_type = COALESCE($1, document_type),
        document_number = $2,
        document_name = COALESCE($3, document_name),
        description = $4,
        file_url = COALESCE($5, file_url),
        file_name = COALESCE($6, file_name),
        file_size = $7,
        file_type = $8,
        issue_date = $9,
        expiry_date = $10,
        is_required = COALESCE($11, is_required),
        status = COALESCE($12, status),
        updated_by = $13,
        updated_at = NOW()
      WHERE id = $14 AND vendor_id = $15 AND company_id = $16 AND deleted_at IS NULL
      RETURNING *
    `, [document_type, document_number, document_name, description,
        file_url, file_name, file_size, file_type, issue_date, expiry_date,
        is_required, status, userId, documentId, vendorId, companyId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating vendor document:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update document' } });
  }
});

// DELETE /api/procurement/vendors/:vendorId/documents/:documentId - Soft delete document
router.delete('/:vendorId/documents/:documentId', requirePermission('vendors:documents:manage'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { vendorId, documentId } = req.params;

    const result = await pool.query(`
      UPDATE vendor_documents 
      SET deleted_at = NOW() 
      WHERE id = $1 AND vendor_id = $2 AND company_id = $3 AND deleted_at IS NULL
      RETURNING id
    `, [documentId, vendorId, companyId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    logger.error('Error deleting vendor document:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete document' } });
  }
});

// ============================================
// VENDOR LOGO
// ============================================

// PUT /api/procurement/vendors/:id/logo - Update vendor logo
router.put('/:id/logo', requirePermission('vendors:logo:update'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const { vendor_logo_url } = req.body;

    const result = await pool.query(`
      UPDATE vendors 
      SET vendor_logo_url = $1, updated_at = NOW()
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
      RETURNING id, vendor_logo_url
    `, [vendor_logo_url, id, companyId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating vendor logo:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update logo' } });
  }
});

// POST /api/procurement/vendors/:id/logo/upload - Upload vendor logo from device
router.post('/:id/logo/upload', requirePermission('vendors:logo:upload'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: { code: 'NO_IMAGE', message: 'No image provided' } });
    }

    // Verify vendor exists
    const vendorCheck = await pool.query(
      'SELECT id, vendor_logo_url FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (vendorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    // Delete old logo if exists
    const oldLogoUrl = vendorCheck.rows[0].vendor_logo_url;
    if (oldLogoUrl && oldLogoUrl.startsWith('/uploads/')) {
      await UploadService.deleteFile(oldLogoUrl);
    }

    // Save new image
    const uploadResult = await UploadService.saveBase64Image(image, 'vendors/logos');

    if (!uploadResult.success) {
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: uploadResult.error } });
    }

    // Update vendor record
    const result = await pool.query(`
      UPDATE vendors 
      SET vendor_logo_url = $1, updated_by = $2, updated_at = NOW()
      WHERE id = $3 AND company_id = $4
      RETURNING id, code, name, vendor_logo_url
    `, [uploadResult.url, userId, id, companyId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'UPLOAD_VENDOR_LOGO', 'vendor', id, JSON.stringify({ vendor_logo_url: uploadResult.url }), companyId]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Vendor logo uploaded successfully'
    });
  } catch (error: any) {
    logger.error('Error uploading vendor logo:', error);
    res.status(500).json({ success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to upload logo' } });
  }
});

// DELETE /api/procurement/vendors/:id/logo - Delete vendor logo
router.delete('/:id/logo', requirePermission('vendors:logo:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Get current logo URL
    const vendorResult = await pool.query(
      'SELECT vendor_logo_url FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (vendorResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    // Delete file if it's a local upload
    const logoUrl = vendorResult.rows[0].vendor_logo_url;
    if (logoUrl && logoUrl.startsWith('/uploads/')) {
      await UploadService.deleteFile(logoUrl);
    }

    // Clear logo URL
    await pool.query(`
      UPDATE vendors 
      SET vendor_logo_url = NULL, updated_by = $1, updated_at = NOW()
      WHERE id = $2 AND company_id = $3
    `, [userId, id, companyId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'DELETE_VENDOR_LOGO', 'vendor', id, JSON.stringify({ vendor_logo_url: logoUrl }), companyId]
    );

    res.json({ success: true, message: 'Vendor logo deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting vendor logo:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete logo' } });
  }
});

// ============================================
// VENDOR COVER IMAGE
// ============================================

// POST /api/procurement/vendors/:id/cover/upload - Upload vendor cover image
router.post('/:id/cover/upload', requirePermission('vendors:cover:upload'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: { code: 'NO_IMAGE', message: 'No image provided' } });
    }

    // Verify vendor exists
    const vendorCheck = await pool.query(
      'SELECT id, vendor_cover_url FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (vendorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    // Delete old cover if exists
    const oldCoverUrl = vendorCheck.rows[0].vendor_cover_url;
    if (oldCoverUrl && oldCoverUrl.startsWith('/uploads/')) {
      await UploadService.deleteFile(oldCoverUrl);
    }

    // Save new image
    const uploadResult = await UploadService.saveBase64Image(image, 'vendors/covers');

    if (!uploadResult.success) {
      return res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: uploadResult.error } });
    }

    // Update vendor record
    const result = await pool.query(`
      UPDATE vendors 
      SET vendor_cover_url = $1, updated_by = $2, updated_at = NOW()
      WHERE id = $3 AND company_id = $4
      RETURNING id, code, name, vendor_cover_url
    `, [uploadResult.url, userId, id, companyId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'UPLOAD_VENDOR_COVER', 'vendor', id, JSON.stringify({ vendor_cover_url: uploadResult.url }), companyId]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Vendor cover image uploaded successfully'
    });
  } catch (error: any) {
    logger.error('Error uploading vendor cover:', error);
    res.status(500).json({ success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to upload cover image' } });
  }
});

// DELETE /api/procurement/vendors/:id/cover - Delete vendor cover image
router.delete('/:id/cover', requirePermission('vendors:cover:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Get current cover URL
    const vendorResult = await pool.query(
      'SELECT vendor_cover_url FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (vendorResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    // Delete file if it's a local upload
    const coverUrl = vendorResult.rows[0].vendor_cover_url;
    if (coverUrl && coverUrl.startsWith('/uploads/')) {
      await UploadService.deleteFile(coverUrl);
    }

    // Clear cover URL
    await pool.query(`
      UPDATE vendors 
      SET vendor_cover_url = NULL, updated_by = $1, updated_at = NOW()
      WHERE id = $2 AND company_id = $3
    `, [userId, id, companyId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, before_data, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'DELETE_VENDOR_COVER', 'vendor', id, JSON.stringify({ vendor_cover_url: coverUrl }), companyId]
    );

    res.json({ success: true, message: 'Vendor cover image deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting vendor cover:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete cover image' } });
  }
});

// ============================================
// VENDOR PROJECTS
// ============================================

// GET /api/procurement/vendors/:id/projects - Get vendor project relationships
router.get('/:id/projects', requirePermission('vendors:projects:view'), async (req: Request, res: Response) => {
  try {
    let companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const { id } = req.params;

    // Fallback: get company from vendor if not in context
    if (!companyId) {
      const vendorResult = await pool.query('SELECT company_id FROM vendors WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (vendorResult.rows.length > 0) {
        companyId = vendorResult.rows[0].company_id;
      }
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Company context required' } });
    }

    // Get projects linked to this vendor through POs, Invoices, or Payments
    const result = await pool.query(`
      SELECT 
        p.id,
        p.code,
        p.name,
        p.name_ar,
        p.status,
        COALESCE(po_totals.total_po_amount, 0) as total_contracted,
        COALESCE(inv_totals.total_invoice_amount, 0) as total_invoiced,
        COALESCE(pay_totals.total_paid, 0) as total_paid,
        COALESCE(po_totals.total_po_amount, 0) - COALESCE(pay_totals.total_paid, 0) as outstanding,
        COALESCE(po_totals.po_count, 0) as po_count,
        COALESCE(inv_totals.invoice_count, 0) as invoice_count,
        COALESCE(pay_totals.payment_count, 0) as payment_count
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(total_amount) as total_po_amount, COUNT(*) as po_count
        FROM purchase_orders
        WHERE vendor_id = $1 AND company_id = $2 AND deleted_at IS NULL
        GROUP BY project_id
      ) po_totals ON po_totals.project_id = p.id
      LEFT JOIN (
        SELECT po.project_id, SUM(pi.total_amount) as total_invoice_amount, COUNT(*) as invoice_count
        FROM purchase_invoices pi
        JOIN purchase_orders po ON pi.purchase_order_id = po.id
        WHERE pi.vendor_id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL AND po.project_id IS NOT NULL
        GROUP BY po.project_id
      ) inv_totals ON inv_totals.project_id = p.id
      LEFT JOIN (
        SELECT project_id, SUM(payment_amount) as total_paid, COUNT(*) as payment_count
        FROM vendor_payments
        WHERE vendor_id = $1 AND company_id = $2 AND deleted_at IS NULL
        GROUP BY project_id
      ) pay_totals ON pay_totals.project_id = p.id
      WHERE p.company_id = $2 AND p.deleted_at IS NULL
      AND (po_totals.po_count > 0 OR inv_totals.invoice_count > 0 OR pay_totals.payment_count > 0)
      ORDER BY po_totals.total_po_amount DESC NULLS LAST
    `, [id, companyId]);

    // Summary totals
    const summary = result.rows.reduce((acc, row) => ({
      total_contracted: acc.total_contracted + parseFloat(row.total_contracted || 0),
      total_paid: acc.total_paid + parseFloat(row.total_paid || 0),
      total_outstanding: acc.total_outstanding + parseFloat(row.outstanding || 0),
      project_count: acc.project_count + 1
    }), { total_contracted: 0, total_paid: 0, total_outstanding: 0, project_count: 0 });

    res.json({ success: true, data: result.rows, total: result.rowCount, summary });
  } catch (error) {
    logger.error('Error fetching vendor projects:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch projects' } });
  }
});

// ============================================
// VENDOR RATING
// ============================================

// PUT /api/procurement/vendors/:id/rating - Update vendor rating breakdown
router.put('/:id/rating', requirePermission('vendors:rating:edit'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { rating_quality, rating_delivery, rating_price, rating_compliance, rating_notes } = req.body;

    // Calculate average rating_score
    const ratings = [rating_quality, rating_delivery, rating_price, rating_compliance].filter(r => r != null);
    const avgScore = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const result = await pool.query(`
      UPDATE vendors SET
        rating_quality = $1,
        rating_delivery = $2,
        rating_price = $3,
        rating_compliance = $4,
        rating_notes = $5,
        rating_score = $6,
        updated_at = NOW()
      WHERE id = $7 AND company_id = $8 AND deleted_at IS NULL
      RETURNING id, rating_quality, rating_delivery, rating_price, rating_compliance, rating_notes, rating_score
    `, [rating_quality, rating_delivery, rating_price, rating_compliance, rating_notes, avgScore, id, companyId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating vendor rating:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update rating' } });
  }
});

// ============================================
// EXPIRING DOCUMENTS ALERT
// ============================================

// GET /api/procurement/vendors/expiring-documents - Get all expiring documents
router.get('/expiring-documents', requirePermission('vendors:documents:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { days = 30 } = req.query;

    const result = await pool.query(`
      SELECT 
        vd.id,
        vd.vendor_id,
        v.code as vendor_code,
        v.name as vendor_name,
        v.name_ar as vendor_name_ar,
        vd.document_type,
        vdt.name_en as type_name_en,
        vdt.name_ar as type_name_ar,
        vd.document_name,
        vd.document_number,
        vd.expiry_date,
        (vd.expiry_date - CURRENT_DATE) as days_until_expiry,
        CASE 
          WHEN vd.expiry_date < CURRENT_DATE THEN 'expired'
          ELSE 'expiring'
        END as alert_type
      FROM vendor_documents vd
      JOIN vendors v ON v.id = vd.vendor_id
      LEFT JOIN vendor_document_types vdt ON vdt.code = vd.document_type
      WHERE vd.company_id = $1 
      AND vd.deleted_at IS NULL 
      AND vd.status = 'active'
      AND vd.expiry_date IS NOT NULL
      AND vd.expiry_date <= CURRENT_DATE + $2::INTEGER
      ORDER BY vd.expiry_date ASC
    `, [companyId, Number(days)]);

    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching expiring documents:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch expiring documents' } });
  }
});

// DELETE /api/procurement/vendors/:id - Soft delete vendor
router.delete('/:id', requirePermission('vendors:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Import posting service for validation
    const { canDeleteVendor } = await import('../../services/purchasePostingService');
    
    // Check if vendor can be deleted (no open balances or posted transactions)
    const deleteCheck = await canDeleteVendor(parseInt(id), companyId);
    if (!deleteCheck.canDelete) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'HAS_DEPENDENCIES', 
          message: deleteCheck.reason || 'Cannot delete vendor with active transactions' 
        } 
      });
    }

    // Check if vendor has any purchase orders
    const poCheck = await pool.query(
      'SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (parseInt(poCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'HAS_DEPENDENCIES', message: 'Cannot delete vendor with purchase orders. Archive instead.' } 
      });
    }

    const result = await pool.query(
      'UPDATE vendors SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL RETURNING id',
      [userId, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    logger.info('Vendor deleted', { vendorId: id, userId });
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vendor:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete vendor' } });
  }
});

// POST /api/procurement/vendors/:id/approve - Approve vendor
router.post('/:id/approve', requirePermission('vendors:approve'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Get approved status ID
    const approvedStatus = await pool.query(
      'SELECT id FROM vendor_statuses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
      [companyId, 'APPROVED']
    );

    if (approvedStatus.rows.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'CONFIG_ERROR', message: 'Approved status not configured' } });
    }

    const result = await pool.query(`
      UPDATE vendors 
      SET status_id = $1, status = 'active', updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [approvedStatus.rows[0].id, userId, id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    logger.info('Vendor approved', { vendorId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error approving vendor:', error);
    res.status(500).json({ success: false, error: { code: 'APPROVE_ERROR', message: 'Failed to approve vendor' } });
  }
});

export default router;
