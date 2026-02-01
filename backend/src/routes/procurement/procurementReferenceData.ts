import { Router } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

// ================== PURCHASE ORDER TYPES ==================

// GET /purchase-order-types - List all purchase order types
router.get('/purchase-order-types', authenticate, requirePermission('procurement:purchase_orders:view'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `SELECT * FROM purchase_order_types 
       WHERE company_id = $1 AND deleted_at IS NULL 
       ORDER BY sort_order, name`,
      [companyId]
    );

    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching purchase order types:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order types' });
  }
});

// POST /purchase-order-types - Create new purchase order type
router.post('/purchase-order-types', authenticate, requirePermission('procurement:purchase_orders:create'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, color, is_active = true, sort_order = 0 } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO purchase_order_types 
       (company_id, code, name, name_ar, description, color, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [companyId, code, name, name_ar, description, color, is_active, sort_order]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating purchase order type:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Purchase order type code already exists' });
    }
    res.status(500).json({ error: 'Failed to create purchase order type' });
  }
});

// PUT /purchase-order-types/:id - Update purchase order type
router.put('/purchase-order-types/:id', authenticate, requirePermission('procurement:purchase_orders:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, color, is_active, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE purchase_order_types 
       SET code = $1, name = $2, name_ar = $3, description = $4, color = $5, 
           is_active = $6, sort_order = $7, updated_at = NOW()
       WHERE id = $8 AND company_id = $9 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar, description, color, is_active, sort_order, id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase order type not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating purchase order type:', error);
    res.status(500).json({ error: 'Failed to update purchase order type' });
  }
});

// DELETE /purchase-order-types/:id - Soft delete purchase order type
router.delete('/purchase-order-types/:id', authenticate, requirePermission('procurement:purchase_orders:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `UPDATE purchase_order_types 
       SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase order type not found' });
    }

    res.json({ message: 'Purchase order type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting purchase order type:', error);
    res.status(500).json({ error: 'Failed to delete purchase order type' });
  }
});

// ================== PURCHASE ORDER STATUSES ==================

// GET /purchase-order-statuses - List all purchase order statuses
router.get('/purchase-order-statuses', authenticate, requirePermission('procurement:purchase_orders:view'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `SELECT * FROM purchase_order_statuses 
       WHERE company_id = $1 AND deleted_at IS NULL 
       ORDER BY sort_order, name`,
      [companyId]
    );

    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching purchase order statuses:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order statuses' });
  }
});

// POST /purchase-order-statuses - Create new purchase order status
router.post('/purchase-order-statuses', authenticate, requirePermission('procurement:purchase_orders:create'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, color, is_active = true, sort_order = 0 } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO purchase_order_statuses 
       (company_id, code, name, name_ar, description, color, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [companyId, code, name, name_ar, description, color, is_active, sort_order]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating purchase order status:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Purchase order status code already exists' });
    }
    res.status(500).json({ error: 'Failed to create purchase order status' });
  }
});

// PUT /purchase-order-statuses/:id - Update purchase order status
router.put('/purchase-order-statuses/:id', authenticate, requirePermission('procurement:purchase_orders:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, color, is_active, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE purchase_order_statuses 
       SET code = $1, name = $2, name_ar = $3, description = $4, color = $5, 
           is_active = $6, sort_order = $7, updated_at = NOW()
       WHERE id = $8 AND company_id = $9 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar, description, color, is_active, sort_order, id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase order status not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ error: 'Failed to update purchase order status' });
  }
});

// DELETE /purchase-order-statuses/:id - Soft delete purchase order status
router.delete('/purchase-order-statuses/:id', authenticate, requirePermission('procurement:purchase_orders:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `UPDATE purchase_order_statuses 
       SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Purchase order status not found' });
    }

    res.json({ message: 'Purchase order status deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting purchase order status:', error);
    res.status(500).json({ error: 'Failed to delete purchase order status' });
  }
});

// ================== SUPPLY TERMS ==================

// GET /supply-terms - List all supply terms
router.get('/supply-terms', authenticate, requirePermission('procurement:purchase_orders:view'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `SELECT * FROM supply_terms 
       WHERE company_id = $1 AND deleted_at IS NULL 
       ORDER BY sort_order, name`,
      [companyId]
    );

    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching supply terms:', error);
    res.status(500).json({ error: 'Failed to fetch supply terms' });
  }
});

// POST /supply-terms - Create new supply term
router.post('/supply-terms', authenticate, requirePermission('procurement:purchase_orders:create'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, is_active = true, sort_order = 0 } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO supply_terms 
       (company_id, code, name, name_ar, description, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [companyId, code, name, name_ar, description, is_active, sort_order]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating supply term:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Supply term code already exists' });
    }
    res.status(500).json({ error: 'Failed to create supply term' });
  }
});

// PUT /supply-terms/:id - Update supply term
router.put('/supply-terms/:id', authenticate, requirePermission('procurement:purchase_orders:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, is_active, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE supply_terms 
       SET code = $1, name = $2, name_ar = $3, description = $4, 
           is_active = $5, sort_order = $6, updated_at = NOW()
       WHERE id = $7 AND company_id = $8 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar, description, is_active, sort_order, id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Supply term not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating supply term:', error);
    res.status(500).json({ error: 'Failed to update supply term' });
  }
});

// DELETE /supply-terms/:id - Soft delete supply term
router.delete('/supply-terms/:id', authenticate, requirePermission('procurement:purchase_orders:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `UPDATE supply_terms 
       SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Supply term not found' });
    }

    res.json({ message: 'Supply term deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supply term:', error);
    res.status(500).json({ error: 'Failed to delete supply term' });
  }
});

// ================== VENDOR PRICE LISTS ==================

// GET /vendor-price-lists - List all vendor price lists
router.get('/vendor-price-lists', authenticate, requirePermission('procurement:vendors:view'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `SELECT vpl.*, v.name as vendor_name 
       FROM vendor_price_lists vpl
       LEFT JOIN vendors v ON vpl.vendor_id = v.id
       WHERE vpl.company_id = $1 AND vpl.deleted_at IS NULL 
       ORDER BY vpl.created_at DESC`,
      [companyId]
    );

    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching vendor price lists:', error);
    res.status(500).json({ error: 'Failed to fetch vendor price lists' });
  }
});

// POST /vendor-price-lists - Create new vendor price list
router.post('/vendor-price-lists', authenticate, requirePermission('procurement:vendors:create'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { vendor_id, name, name_ar, effective_date, expiry_date, currency = 'SAR', is_active = true } = req.body;

    if (!vendor_id || !name || !effective_date) {
      return res.status(400).json({ error: 'Vendor, name, and effective date are required' });
    }

    const result = await pool.query(
      `INSERT INTO vendor_price_lists 
       (company_id, vendor_id, name, name_ar, effective_date, expiry_date, currency, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [companyId, vendor_id, name, name_ar, effective_date, expiry_date, currency, is_active]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating vendor price list:', error);
    res.status(500).json({ error: 'Failed to create vendor price list' });
  }
});

// PUT /vendor-price-lists/:id - Update vendor price list
router.put('/vendor-price-lists/:id', authenticate, requirePermission('procurement:vendors:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;
    const { vendor_id, name, name_ar, effective_date, expiry_date, currency, is_active } = req.body;

    const result = await pool.query(
      `UPDATE vendor_price_lists 
       SET vendor_id = $1, name = $2, name_ar = $3, effective_date = $4, 
           expiry_date = $5, currency = $6, is_active = $7, updated_at = NOW()
       WHERE id = $8 AND company_id = $9 AND deleted_at IS NULL
       RETURNING *`,
      [vendor_id, name, name_ar, effective_date, expiry_date, currency, is_active, id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor price list not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating vendor price list:', error);
    res.status(500).json({ error: 'Failed to update vendor price list' });
  }
});

// DELETE /vendor-price-lists/:id - Soft delete vendor price list
router.delete('/vendor-price-lists/:id', authenticate, requirePermission('procurement:vendors:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `UPDATE vendor_price_lists 
       SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor price list not found' });
    }

    res.json({ message: 'Vendor price list deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vendor price list:', error);
    res.status(500).json({ error: 'Failed to delete vendor price list' });
  }
});

// ================== DELIVERY TERMS ==================

// GET /delivery-terms - List all delivery terms
router.get('/delivery-terms', authenticate, requirePermission('procurement:purchase_orders:view'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `SELECT * FROM delivery_terms 
       WHERE company_id = $1 AND deleted_at IS NULL 
       ORDER BY sort_order, name`,
      [companyId]
    );

    res.json({ data: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error('Error fetching delivery terms:', error);
    res.status(500).json({ error: 'Failed to fetch delivery terms' });
  }
});

// POST /delivery-terms - Create new delivery term
router.post('/delivery-terms', authenticate, requirePermission('procurement:purchase_orders:create'), async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, is_active = true, sort_order = 0 } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO delivery_terms 
       (company_id, code, name, name_ar, description, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [companyId, code, name, name_ar, description, is_active, sort_order]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating delivery term:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Delivery term code already exists' });
    }
    res.status(500).json({ error: 'Failed to create delivery term' });
  }
});

// PUT /delivery-terms/:id - Update delivery term
router.put('/delivery-terms/:id', authenticate, requirePermission('procurement:purchase_orders:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;
    const { code, name, name_ar, description, is_active, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE delivery_terms 
       SET code = $1, name = $2, name_ar = $3, description = $4, 
           is_active = $5, sort_order = $6, updated_at = NOW()
       WHERE id = $7 AND company_id = $8 AND deleted_at IS NULL
       RETURNING *`,
      [code, name, name_ar, description, is_active, sort_order, id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Delivery term not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating delivery term:', error);
    res.status(500).json({ error: 'Failed to update delivery term' });
  }
});

// DELETE /delivery-terms/:id - Soft delete delivery term
router.delete('/delivery-terms/:id', authenticate, requirePermission('procurement:purchase_orders:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId || 1;

    const result = await pool.query(
      `UPDATE delivery_terms 
       SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Delivery term not found' });
    }

    res.json({ message: 'Delivery term deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting delivery term:', error);
    res.status(500).json({ error: 'Failed to delete delivery term' });
  }
});

export default router;
