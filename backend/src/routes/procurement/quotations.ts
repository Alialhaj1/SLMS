import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import logger from '../../utils/logger';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// VENDOR QUOTATIONS - Full CRUD
// ============================================

// GET /api/procurement/quotations - List quotations
router.get('/', requirePermission('vendor_quotations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status, vendor_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE vq.company_id = $1 AND vq.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (vq.quotation_number ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND vq.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendor_id) {
      whereClause += ` AND vq.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM vendor_quotations vq LEFT JOIN vendors v ON vq.vendor_id = v.id ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        vq.*,
        v.name as vendor_name, v.name_ar as vendor_name_ar,
        c.code as currency_code, c.symbol as currency_symbol
      FROM vendor_quotations vq
      LEFT JOIN vendors v ON vq.vendor_id = v.id
      LEFT JOIN currencies c ON vq.currency_id = c.id
      ${whereClause}
      ORDER BY vq.quotation_date DESC, vq.quotation_number DESC
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
    logger.error('Error fetching quotations:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch quotations' } });
  }
});

// GET /api/procurement/quotations/:id - Get single quotation with items
router.get('/:id', requirePermission('vendor_quotations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const quotResult = await pool.query(`
      SELECT 
        vq.*,
        v.name as vendor_name, v.name_ar as vendor_name_ar, v.contact_email,
        c.code as currency_code, c.symbol as currency_symbol
      FROM vendor_quotations vq
      LEFT JOIN vendors v ON vq.vendor_id = v.id
      LEFT JOIN currencies c ON vq.currency_id = c.id
      WHERE vq.id = $1 AND vq.company_id = $2 AND vq.deleted_at IS NULL
    `, [id, companyId]);

    if (quotResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        vqi.*,
        i.code as item_display_code, i.name as item_display_name, i.name_ar as item_display_name_ar,
        u.code as uom_code, u.name as uom_name
      FROM vendor_quotation_items vqi
      LEFT JOIN items i ON vqi.item_id = i.id
      LEFT JOIN units_of_measure u ON vqi.uom_id = u.id
      WHERE vqi.quotation_id = $1
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...quotResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching quotation:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch quotation' } });
  }
});

// POST /api/procurement/quotations - Create quotation
router.post('/', requirePermission('vendor_quotations:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      vendor_id, quotation_date, valid_until, currency_id,
      description, notes, items
    } = req.body;

    if (!vendor_id || !quotation_date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor and quotation date are required' } });
    }

    await client.query('BEGIN');

    // Generate quotation number
    const lastQuot = await client.query(
      "SELECT quotation_number FROM vendor_quotations WHERE company_id = $1 ORDER BY id DESC LIMIT 1",
      [companyId]
    );
    
    let quotationNumber = 'QUOT-0001';
    if (lastQuot.rows.length > 0) {
      const lastNum = parseInt(lastQuot.rows[0].quotation_number.replace('QUOT-', '')) || 0;
      quotationNumber = `QUOT-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Calculate totals from items
    let totalAmount = 0;
    if (items && Array.isArray(items)) {
      for (const item of items) {
        totalAmount += (item.quantity || 0) * (item.unit_price || 0);
      }
    }

    // Insert quotation
    const quotResult = await client.query(`
      INSERT INTO vendor_quotations (
        company_id, vendor_id, quotation_number, quotation_date, valid_until,
        currency_id, total_amount, status, description, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10
      ) RETURNING *
    `, [
      companyId, vendor_id, quotationNumber, quotation_date, valid_until,
      currency_id, totalAmount, description, notes, userId
    ]);

    const quotationId = quotResult.rows[0].id;

    // Insert items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
        await client.query(`
          INSERT INTO vendor_quotation_items (
            quotation_id, item_id, item_code, item_name, uom_id,
            quantity, unit_price, line_total, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          quotationId, item.item_id, item.item_code, item.item_name, item.uom_id,
          item.quantity, item.unit_price, lineTotal, item.notes
        ]);
      }
    }

    await client.query('COMMIT');

    logger.info('Vendor quotation created', { quotationId, quotationNumber, userId });
    res.status(201).json({ success: true, data: quotResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating quotation:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create quotation' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/quotations/:id/accept - Accept quotation
router.put('/:id/accept', requirePermission('vendor_quotations:approve'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE vendor_quotations 
      SET status = 'accepted', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL AND status = 'pending'
      RETURNING *
    `, [userId, id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found or cannot be accepted' } });
    }

    logger.info('Vendor quotation accepted', { quotationId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error accepting quotation:', error);
    res.status(500).json({ success: false, error: { code: 'ACCEPT_ERROR', message: 'Failed to accept quotation' } });
  }
});

// PUT /api/procurement/quotations/:id/reject - Reject quotation
router.put('/:id/reject', requirePermission('vendor_quotations:approve'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE vendor_quotations 
      SET status = 'rejected', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL AND status = 'pending'
      RETURNING *
    `, [userId, id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found or cannot be rejected' } });
    }

    logger.info('Vendor quotation rejected', { quotationId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error rejecting quotation:', error);
    res.status(500).json({ success: false, error: { code: 'REJECT_ERROR', message: 'Failed to reject quotation' } });
  }
});

// DELETE /api/procurement/quotations/:id - Soft delete quotation
router.delete('/:id', requirePermission('vendor_quotations:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Check if quotation is in a deletable state
    const existing = await pool.query(
      'SELECT status FROM vendor_quotations WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }

    if (existing.rows[0].status === 'accepted') {
      return res.status(400).json({ success: false, error: { code: 'DELETE_BLOCKED', message: 'Cannot delete accepted quotation' } });
    }

    const result = await pool.query(`
      UPDATE vendor_quotations 
      SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [userId, id, companyId]);

    logger.info('Vendor quotation deleted', { quotationId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error deleting quotation:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete quotation' } });
  }
});

export default router;
