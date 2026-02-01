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
// CONTRACT TYPES
// ============================================

router.get('/types', requirePermission('vendor_contracts:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM contract_types WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching contract types:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch contract types' } });
  }
});

// ============================================
// CONTRACT STATUSES
// ============================================

router.get('/statuses', requirePermission('vendor_contracts:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM contract_statuses WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching contract statuses:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch contract statuses' } });
  }
});

// ============================================
// VENDOR CONTRACTS - Full CRUD
// ============================================

// GET /api/procurement/contracts - List contracts
router.get('/', requirePermission('vendor_contracts:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status_id, vendor_id, contract_type_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE vc.company_id = $1 AND vc.deleted_at IS NULL';

    if (search) {
      whereClause += ` AND (vc.contract_number ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status_id) {
      whereClause += ` AND vc.status_id = $${paramIndex}`;
      params.push(status_id);
      paramIndex++;
    }

    if (vendor_id) {
      whereClause += ` AND vc.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    if (contract_type_id) {
      whereClause += ` AND vc.contract_type_id = $${paramIndex}`;
      params.push(contract_type_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM vendor_contracts vc LEFT JOIN vendors v ON vc.vendor_id = v.id ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        vc.*,
        v.name as vendor_name, v.name_ar as vendor_name_ar,
        ct.name as contract_type_name, ct.name_ar as contract_type_name_ar,
        cs.name as status_name, cs.name_ar as status_name_ar, cs.color as status_color,
        c.code as currency_code, c.symbol as currency_symbol
      FROM vendor_contracts vc
      LEFT JOIN vendors v ON vc.vendor_id = v.id
      LEFT JOIN contract_types ct ON vc.contract_type_id = ct.id
      LEFT JOIN contract_statuses cs ON vc.status_id = cs.id
      LEFT JOIN currencies c ON vc.currency_id = c.id
      ${whereClause}
      ORDER BY vc.contract_date DESC, vc.contract_number DESC
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
    logger.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch contracts' } });
  }
});

// GET /api/procurement/contracts/:id - Get single contract with items
router.get('/:id', requirePermission('vendor_contracts:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const conResult = await pool.query(`
      SELECT 
        vc.*,
        v.name as vendor_name, v.name_ar as vendor_name_ar,
        ct.name as contract_type_name, ct.name_ar as contract_type_name_ar,
        cs.name as status_name, cs.name_ar as status_name_ar, cs.color as status_color, cs.allows_purchase_orders,
        c.code as currency_code, c.symbol as currency_symbol,
        vpt.name as payment_terms_name,
        dt.name as delivery_terms_name,
        st.name as supply_terms_name
      FROM vendor_contracts vc
      LEFT JOIN vendors v ON vc.vendor_id = v.id
      LEFT JOIN contract_types ct ON vc.contract_type_id = ct.id
      LEFT JOIN contract_statuses cs ON vc.status_id = cs.id
      LEFT JOIN currencies c ON vc.currency_id = c.id
      LEFT JOIN vendor_payment_terms vpt ON vc.payment_terms_id = vpt.id
      LEFT JOIN delivery_terms dt ON vc.delivery_terms_id = dt.id
      LEFT JOIN supply_terms st ON vc.supply_terms_id = st.id
      WHERE vc.id = $1 AND vc.company_id = $2 AND vc.deleted_at IS NULL
    `, [id, companyId]);

    if (conResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        vci.*,
        i.code as item_display_code, i.name as item_display_name, i.name_ar as item_display_name_ar,
        u.code as uom_code, u.name as uom_name
      FROM vendor_contract_items vci
      LEFT JOIN items i ON vci.item_id = i.id
      LEFT JOIN units_of_measure u ON vci.uom_id = u.id
      WHERE vci.contract_id = $1
    `, [id]);

    // Get approvals
    const approvalsResult = await pool.query(`
      SELECT 
        ca.*,
        cas.name as stage_name, cas.name_ar as stage_name_ar,
        u.email as approved_by_email
      FROM contract_approvals ca
      LEFT JOIN contract_approval_stages cas ON ca.stage_id = cas.id
      LEFT JOIN users u ON ca.approved_by = u.id
      WHERE ca.contract_id = $1
      ORDER BY cas.stage_order
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...conResult.rows[0],
        items: itemsResult.rows,
        approvals: approvalsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching contract:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch contract' } });
  }
});

// POST /api/procurement/contracts - Create contract
router.post('/', requirePermission('vendor_contracts:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      vendor_id, contract_type_id, contract_date, start_date, end_date,
      currency_id, total_value, payment_terms_id, delivery_terms_id, supply_terms_id,
      description, terms_and_conditions, items
    } = req.body;

    if (!vendor_id || !contract_date || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor, dates are required' } });
    }

    await client.query('BEGIN');

    // Generate contract number
    const lastCon = await client.query(
      "SELECT contract_number FROM vendor_contracts WHERE company_id = $1 ORDER BY id DESC LIMIT 1",
      [companyId]
    );
    
    let contractNumber = 'CON-0001';
    if (lastCon.rows.length > 0) {
      const lastNum = parseInt(lastCon.rows[0].contract_number.replace('CON-', '')) || 0;
      contractNumber = `CON-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Get draft status
    const draftStatus = await client.query(
      'SELECT id FROM contract_statuses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
      [companyId, 'DRAFT']
    );

    // Insert contract
    const conResult = await client.query(`
      INSERT INTO vendor_contracts (
        company_id, vendor_id, contract_number, contract_type_id,
        contract_date, start_date, end_date, currency_id, total_value,
        payment_terms_id, delivery_terms_id, supply_terms_id,
        status_id, description, terms_and_conditions, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `, [
      companyId, vendor_id, contractNumber, contract_type_id,
      contract_date, start_date, end_date, currency_id, total_value || 0,
      payment_terms_id, delivery_terms_id, supply_terms_id,
      draftStatus.rows[0]?.id, description, terms_and_conditions, userId
    ]);

    const contractId = conResult.rows[0].id;

    // Insert items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const lineTotal = (item.contracted_qty || 0) * (item.unit_price || 0);
        await client.query(`
          INSERT INTO vendor_contract_items (
            contract_id, item_id, item_code, item_name, uom_id,
            contracted_qty, unit_price, line_total, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          contractId, item.item_id, item.item_code, item.item_name, item.uom_id,
          item.contracted_qty, item.unit_price, lineTotal, item.notes
        ]);
      }
    }

    await client.query('COMMIT');

    logger.info('Vendor contract created', { contractId, contractNumber, userId });
    res.status(201).json({ success: true, data: conResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating contract:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create contract' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/contracts/:id/approve - Approve contract
router.put('/:id/approve', requirePermission('vendor_contracts:approve'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { comments } = req.body;

    // Get approved status
    const approvedStatus = await pool.query(
      'SELECT id FROM contract_statuses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
      [companyId, 'APPROVED']
    );

    if (approvedStatus.rows.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'CONFIG_ERROR', message: 'Approved status not configured' } });
    }

    // Update contract
    const result = await pool.query(`
      UPDATE vendor_contracts 
      SET status_id = $1, approval_status = 'approved', approved_by = $2, approved_at = CURRENT_TIMESTAMP, 
          updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [approvedStatus.rows[0].id, userId, id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    }

    logger.info('Vendor contract approved', { contractId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error approving contract:', error);
    res.status(500).json({ success: false, error: { code: 'APPROVE_ERROR', message: 'Failed to approve contract' } });
  }
});

export default router;
