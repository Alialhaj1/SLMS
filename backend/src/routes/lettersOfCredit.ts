/**
 * 📄 LETTERS OF CREDIT API
 * ========================
 * Full LC management: types, statuses, amendments, documents, payments, alerts
 * 
 * Endpoints:
 * - GET    /api/letters-of-credit                   - List all LCs
 * - GET    /api/letters-of-credit/:id               - Get single LC
 * - POST   /api/letters-of-credit                   - Create LC
 * - PUT    /api/letters-of-credit/:id               - Update LC
 * - DELETE /api/letters-of-credit/:id               - Delete LC
 * - POST   /api/letters-of-credit/:id/amend         - Create amendment
 * - GET    /api/letters-of-credit/:id/amendments    - Get amendments
 * - GET    /api/letters-of-credit/:id/documents     - Get documents
 * - POST   /api/letters-of-credit/:id/documents     - Add document
 * - GET    /api/letters-of-credit/:id/payments      - Get payments
 * - POST   /api/letters-of-credit/:id/payments      - Add payment
 * - GET    /api/letters-of-credit/alerts            - Get alerts
 * - GET    /api/letters-of-credit/dashboard         - Get dashboard stats
 * - GET    /api/letters-of-credit/types             - Get LC types
 * - GET    /api/letters-of-credit/statuses          - Get LC statuses
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();

// Apply authenticate and loadCompanyContext to all routes
router.use(authenticate, loadCompanyContext);

// =====================================================
// GET LC TYPES
// =====================================================
router.get('/types', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    
    const result = await pool.query(`
      SELECT id, code, name, name_ar, description,
             is_sight, is_usance, is_revolving, is_transferable,
             is_back_to_back, is_red_clause, is_green_clause, is_standby,
             is_active, display_order
      FROM lc_types
      WHERE company_id = $1 AND deleted_at IS NULL
      ORDER BY display_order, code
    `, [companyId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching LC types:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// CREATE LC TYPE
// =====================================================
router.post('/types', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { 
      code, name, name_ar, description,
      is_sight, is_usance, is_revolving, is_transferable,
      is_back_to_back, is_red_clause, is_green_clause, is_standby,
      display_order
    } = req.body;
    
    if (!code || !name || !name_ar) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Code, name, and name_ar are required' } 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO lc_types (
        company_id, code, name, name_ar, description,
        is_sight, is_usance, is_revolving, is_transferable,
        is_back_to_back, is_red_clause, is_green_clause, is_standby,
        display_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      companyId, code, name, name_ar, description || null,
      is_sight || false, is_usance || false, is_revolving || false, is_transferable || false,
      is_back_to_back || false, is_red_clause || false, is_green_clause || false, is_standby || false,
      display_order || 0, userId
    ]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating LC type:', error);
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'A type with this code already exists' } 
      });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// UPDATE LC TYPE
// =====================================================
router.put('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { 
      code, name, name_ar, description,
      is_sight, is_usance, is_revolving, is_transferable,
      is_back_to_back, is_red_clause, is_green_clause, is_standby,
      display_order, is_active
    } = req.body;
    
    const result = await pool.query(`
      UPDATE lc_types SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        name_ar = COALESCE($3, name_ar),
        description = COALESCE($4, description),
        is_sight = COALESCE($5, is_sight),
        is_usance = COALESCE($6, is_usance),
        is_revolving = COALESCE($7, is_revolving),
        is_transferable = COALESCE($8, is_transferable),
        is_back_to_back = COALESCE($9, is_back_to_back),
        is_red_clause = COALESCE($10, is_red_clause),
        is_green_clause = COALESCE($11, is_green_clause),
        is_standby = COALESCE($12, is_standby),
        display_order = COALESCE($13, display_order),
        is_active = COALESCE($14, is_active),
        updated_by = $15,
        updated_at = NOW()
      WHERE id = $16 AND company_id = $17 AND deleted_at IS NULL
      RETURNING *
    `, [
      code, name, name_ar, description,
      is_sight, is_usance, is_revolving, is_transferable,
      is_back_to_back, is_red_clause, is_green_clause, is_standby,
      display_order, is_active, userId, id, companyId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'LC type not found' } });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating LC type:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// DELETE LC TYPE
// =====================================================
router.delete('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    
    // Check if type is in use
    const usageCheck = await pool.query(`
      SELECT COUNT(*) as count FROM letters_of_credit 
      WHERE lc_type_id = $1 AND deleted_at IS NULL
    `, [id]);
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Cannot delete type that is in use by existing LCs' } 
      });
    }
    
    const result = await pool.query(`
      UPDATE lc_types SET 
        deleted_at = NOW(),
        deleted_by = $1
      WHERE id = $2 AND company_id = $3
      RETURNING id
    `, [userId, id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'LC type not found' } });
    }
    
    res.json({ success: true, message: 'LC type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting LC type:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET LC STATUSES
// =====================================================
router.get('/statuses', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    
    const result = await pool.query(`
      SELECT id, code, name, name_ar, description, color,
             is_initial, is_final, display_order
      FROM lc_statuses
      WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL
      ORDER BY display_order, code
    `, [companyId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching LC statuses:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET DASHBOARD STATS
// =====================================================
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')) as active_lcs,
        COUNT(*) FILTER (WHERE st.code = 'DRAFT') as draft_lcs,
        COUNT(*) FILTER (WHERE st.code = 'ISSUED') as issued_lcs,
        COUNT(*) FILTER (WHERE st.code = 'PAID') as paid_lcs,
        COUNT(*) FILTER (WHERE lc.expiry_date <= CURRENT_DATE + INTERVAL '30 days' 
                         AND st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')) as expiring_soon,
        COUNT(*) FILTER (WHERE lc.latest_shipment_date <= CURRENT_DATE + INTERVAL '14 days'
                         AND st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED', 'PAID')) as shipment_due_soon,
        COALESCE(SUM(lc.current_amount) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')), 0) as total_active_amount,
        COALESCE(SUM(lc.utilized_amount) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')), 0) as total_utilized,
        COALESCE(SUM(lc.current_amount - lc.utilized_amount) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')), 0) as total_available,
        COALESCE(SUM(lc.margin_amount) FILTER (WHERE st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')), 0) as total_margin
      FROM letters_of_credit lc
      LEFT JOIN lc_statuses st ON lc.status_id = st.id
      WHERE lc.company_id = $1 AND lc.deleted_at IS NULL
    `, [companyId]);
    
    // Get currency breakdown
    const currencyResult = await pool.query(`
      SELECT 
        cur.code as currency_code,
        COUNT(*) as count,
        COALESCE(SUM(lc.current_amount), 0) as total_amount
      FROM letters_of_credit lc
      JOIN currencies cur ON lc.currency_id = cur.id
      LEFT JOIN lc_statuses st ON lc.status_id = st.id
      WHERE lc.company_id = $1 
        AND lc.deleted_at IS NULL
        AND st.code NOT IN ('EXPIRED', 'CANCELLED', 'CLOSED')
      GROUP BY cur.code
      ORDER BY total_amount DESC
    `, [companyId]);
    
    // Get recent alerts
    const alertsResult = await pool.query(`
      SELECT la.*, lc.lc_number
      FROM lc_alerts la
      JOIN letters_of_credit lc ON la.lc_id = lc.id
      WHERE la.company_id = $1 
        AND la.is_read = false 
        AND la.is_dismissed = false
        AND la.trigger_date <= CURRENT_DATE
      ORDER BY la.priority DESC, la.trigger_date
      LIMIT 10
    `, [companyId]);
    
    res.json({ 
      success: true, 
      data: {
        summary: result.rows[0],
        by_currency: currencyResult.rows,
        recent_alerts: alertsResult.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching LC dashboard:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET AVAILABLE PROJECTS FOR VENDOR (no existing LC)
// =====================================================
router.get('/available-projects/:vendorId', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { vendorId } = req.params;
    
    if (!vendorId) {
      return res.status(400).json({ success: false, error: { message: 'Vendor ID is required' } });
    }
    
    // Get projects linked to this vendor (via purchase orders) that don't have an LC yet
    const result = await pool.query(`
      SELECT DISTINCT
        p.id,
        p.code,
        p.name,
        p.name_ar,
        p.start_date,
        p.end_date,
        p.status,
        COUNT(DISTINCT po.id) as purchase_orders_count,
        SUM(po.total_amount) as total_po_amount
      FROM projects p
      INNER JOIN purchase_orders po ON po.project_id = p.id AND po.deleted_at IS NULL
      WHERE po.vendor_id = $1
        AND po.company_id = $2
        AND p.company_id = $2
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM letters_of_credit lc 
          WHERE lc.project_id = p.id 
            AND lc.beneficiary_vendor_id = $1
            AND lc.company_id = $2
            AND lc.deleted_at IS NULL
        )
      GROUP BY p.id, p.code, p.name, p.name_ar, p.start_date, p.end_date, p.status
      ORDER BY p.code
    `, [vendorId, companyId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching available projects for vendor:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET ALL LCs (with filters)
// =====================================================
router.get('/', requirePermission('letters_of_credit:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { 
      status, type, project_id, vendor_id, bank_id,
      expiring_within_days, search, page = 1, limit = 50 
    } = req.query;
    
    let whereClause = 'lc.company_id = $1 AND lc.deleted_at IS NULL';
    const params: any[] = [companyId];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      whereClause += ` AND st.code = $${paramCount}`;
      params.push(status);
    }
    
    if (type) {
      paramCount++;
      whereClause += ` AND lt.code = $${paramCount}`;
      params.push(type);
    }
    
    if (project_id) {
      paramCount++;
      whereClause += ` AND lc.project_id = $${paramCount}`;
      params.push(project_id);
    }
    
    if (vendor_id) {
      paramCount++;
      whereClause += ` AND lc.beneficiary_vendor_id = $${paramCount}`;
      params.push(vendor_id);
    }
    
    if (bank_id) {
      paramCount++;
      whereClause += ` AND lc.issuing_bank_id = $${paramCount}`;
      params.push(bank_id);
    }
    
    if (expiring_within_days) {
      paramCount++;
      whereClause += ` AND lc.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $${paramCount}`;
      params.push(expiring_within_days);
    }
    
    if (search) {
      paramCount++;
      whereClause += ` AND (lc.lc_number ILIKE $${paramCount} OR lc.beneficiary_name ILIKE $${paramCount} OR v.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const result = await pool.query(`
      SELECT 
        lc.*,
        lt.name as type_name, lt.name_ar as type_name_ar,
        st.name as status_name, st.name_ar as status_name_ar, st.color as status_color,
        v.name as vendor_name, v.name_ar as vendor_name_ar,
        b.name as issuing_bank_name_display, ba.account_number as bank_account_number,
        cur.code as currency_code, cur.symbol as currency_symbol,
        p.code as project_code, p.name as project_name,
        po.order_number as po_number,
        ls.shipment_number,
        (SELECT COUNT(*) FROM lc_amendments WHERE lc_id = lc.id AND deleted_at IS NULL) as amendments_count,
        (SELECT COUNT(*) FROM lc_documents WHERE lc_id = lc.id AND deleted_at IS NULL) as documents_count,
        (SELECT COUNT(*) FROM lc_payments WHERE lc_id = lc.id AND deleted_at IS NULL) as payments_count
      FROM letters_of_credit lc
      LEFT JOIN lc_types lt ON lc.lc_type_id = lt.id
      LEFT JOIN lc_statuses st ON lc.status_id = st.id
      LEFT JOIN vendors v ON lc.beneficiary_vendor_id = v.id
      LEFT JOIN bank_accounts ba ON lc.issuing_bank_id = ba.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      LEFT JOIN currencies cur ON lc.currency_id = cur.id
      LEFT JOIN projects p ON lc.project_id = p.id
      LEFT JOIN purchase_orders po ON lc.purchase_order_id = po.id
      LEFT JOIN logistics_shipments ls ON lc.shipment_id = ls.id
      WHERE ${whereClause}
      ORDER BY lc.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) 
      FROM letters_of_credit lc
      LEFT JOIN lc_types lt ON lc.lc_type_id = lt.id
      LEFT JOIN lc_statuses st ON lc.status_id = st.id
      LEFT JOIN vendors v ON lc.beneficiary_vendor_id = v.id
      WHERE ${whereClause}
    `, params);
    
    res.json({ 
      success: true, 
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    console.error('Error fetching LCs:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET LC ALERTS (Simple endpoint for frontend)
// =====================================================
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    
    const result = await pool.query(`
      SELECT 
        la.id, la.lc_id as letter_of_credit_id, 
        lc.lc_number, v.name as vendor_name,
        la.alert_type, la.alert_date, la.message, la.message_ar,
        CASE 
          WHEN la.priority = 'critical' THEN 'critical'
          WHEN la.priority = 'high' THEN 'warning'
          ELSE 'info'
        END as severity,
        la.is_read, la.is_dismissed as is_resolved,
        la.dismissed_at as resolved_at, la.dismissed_by as resolved_by,
        la.created_at,
        lc.expiry_date, lc.latest_shipment_date,
        lc.current_amount as amount, cur.code as currency
      FROM lc_alerts la
      JOIN letters_of_credit lc ON la.lc_id = lc.id
      LEFT JOIN vendors v ON lc.beneficiary_vendor_id = v.id
      LEFT JOIN currencies cur ON lc.currency_id = cur.id
      WHERE la.company_id = $1
      ORDER BY 
        CASE la.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        la.trigger_date DESC
      LIMIT 100
    `, [companyId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching LC alerts:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET LC ALERTS (Full with filters)
// =====================================================
router.get('/alerts/all', requirePermission('lc_alerts:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { unread_only, priority, limit = 50 } = req.query;
    
    let whereClause = 'la.company_id = $1';
    const params: any[] = [companyId];
    let paramCount = 1;
    
    if (unread_only === 'true') {
      whereClause += ' AND la.is_read = false AND la.is_dismissed = false';
    }
    
    if (priority) {
      paramCount++;
      whereClause += ` AND la.priority = $${paramCount}`;
      params.push(priority);
    }
    
    const result = await pool.query(`
      SELECT 
        la.*,
        lc.lc_number, lc.expiry_date, lc.current_amount,
        cur.code as currency_code
      FROM lc_alerts la
      JOIN letters_of_credit lc ON la.lc_id = lc.id
      LEFT JOIN currencies cur ON lc.currency_id = cur.id
      WHERE ${whereClause}
      ORDER BY la.priority DESC, la.trigger_date DESC
      LIMIT $${paramCount + 1}
    `, [...params, limit]);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching LC alerts:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// MARK ALERT AS READ
// =====================================================
router.put('/alerts/:alertId/read', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user?.id;
    
    await pool.query(`
      UPDATE lc_alerts SET is_read = true, read_by = $1, read_at = NOW() WHERE id = $2
    `, [userId, alertId]);
    
    res.json({ success: true, message: 'Alert marked as read' });
  } catch (error: any) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// MARK ALERT AS RESOLVED
// =====================================================
router.put('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user?.id;
    
    await pool.query(`
      UPDATE lc_alerts SET 
        is_dismissed = true, 
        dismissed_by = $1, 
        dismissed_at = NOW(),
        is_read = true,
        read_by = COALESCE(read_by, $1),
        read_at = COALESCE(read_at, NOW())
      WHERE id = $2
    `, [userId, alertId]);
    
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error: any) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET SINGLE LC
// =====================================================
router.get('/:id', requirePermission('letters_of_credit:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;
    
    const result = await pool.query(`
      SELECT 
        lc.*,
        lt.name as type_name, lt.name_ar as type_name_ar, lt.code as type_code,
        st.name as status_name, st.name_ar as status_name_ar, st.color as status_color, st.code as status_code,
        v.name as vendor_name, v.name_ar as vendor_name_ar, v.code as vendor_code,
        b.name as issuing_bank_name_display, ba.account_number as bank_account_number,
        cur.code as currency_code, cur.symbol as currency_symbol, cur.name as currency_name,
        p.code as project_code, p.name as project_name,
        po.order_number as po_number, po.total_amount as po_amount,
        ls.shipment_number, ls.bl_no,
        c.name as beneficiary_country_name,
        expense_acc.code as expense_account_code, expense_acc.name_ar as expense_account_name,
        liability_acc.code as liability_account_code, liability_acc.name_ar as liability_account_name,
        margin_acc.code as margin_account_code, margin_acc.name_ar as margin_account_name,
        pol.name as port_of_loading_name,
        pod.name as port_of_discharge_name
      FROM letters_of_credit lc
      LEFT JOIN lc_types lt ON lc.lc_type_id = lt.id
      LEFT JOIN lc_statuses st ON lc.status_id = st.id
      LEFT JOIN vendors v ON lc.beneficiary_vendor_id = v.id
      LEFT JOIN bank_accounts ba ON lc.issuing_bank_id = ba.id
      LEFT JOIN banks b ON ba.bank_id = b.id
      LEFT JOIN currencies cur ON lc.currency_id = cur.id
      LEFT JOIN projects p ON lc.project_id = p.id
      LEFT JOIN purchase_orders po ON lc.purchase_order_id = po.id
      LEFT JOIN logistics_shipments ls ON lc.shipment_id = ls.id
      LEFT JOIN countries c ON lc.beneficiary_country_id = c.id
      LEFT JOIN accounts expense_acc ON lc.expense_account_id = expense_acc.id
      LEFT JOIN accounts liability_acc ON lc.liability_account_id = liability_acc.id
      LEFT JOIN accounts margin_acc ON lc.margin_account_id = margin_acc.id
      LEFT JOIN ports pol ON lc.port_of_loading_id = pol.id
      LEFT JOIN ports pod ON lc.port_of_discharge_id = pod.id
      WHERE lc.id = $1 AND lc.company_id = $2 AND lc.deleted_at IS NULL
    `, [id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'LC not found' } });
    }
    
    // Get amendments
    const amendments = await pool.query(`
      SELECT * FROM lc_amendments 
      WHERE lc_id = $1 AND deleted_at IS NULL 
      ORDER BY amendment_number DESC
    `, [id]);
    
    // Get documents
    const documents = await pool.query(`
      SELECT * FROM lc_documents 
      WHERE lc_id = $1 AND deleted_at IS NULL 
      ORDER BY document_date DESC
    `, [id]);
    
    // Get payments
    const payments = await pool.query(`
      SELECT lp.*, cur.code as currency_code, cur.symbol as currency_symbol
      FROM lc_payments lp
      LEFT JOIN currencies cur ON lp.currency_id = cur.id
      WHERE lp.lc_id = $1 AND lp.deleted_at IS NULL 
      ORDER BY lp.payment_date DESC
    `, [id]);
    
    res.json({ 
      success: true, 
      data: {
        ...result.rows[0],
        amendments: amendments.rows,
        documents: documents.rows,
        payments: payments.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching LC:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// CREATE LC
// =====================================================
router.post('/', requirePermission('letters_of_credit:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = (req as any).user?.id;
    const companyId = (req as any).companyContext?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ success: false, error: { message: 'Company context required' } });
    }
    
    const {
      lc_number, lc_type_id, status_id,
      beneficiary_vendor_id, beneficiary_name, beneficiary_name_ar, beneficiary_address, beneficiary_country_id,
      issuing_bank_id, issuing_bank_name, issuing_bank_swift, issuing_bank_address,
      advising_bank_name, advising_bank_swift, advising_bank_country_id,
      confirming_bank_name, confirming_bank_swift, is_confirmed,
      currency_id, original_amount, tolerance_percent,
      exchange_rate = 1,
      issue_date, expiry_date, latest_shipment_date, presentation_period_days,
      payment_terms, tenor_days, partial_shipments, transhipment,
      port_of_loading, port_of_loading_id, port_of_discharge, port_of_discharge_id, incoterm,
      goods_description, quantity, unit_of_measure, unit_price,
      project_id, purchase_order_id, shipment_id,
      required_documents,
      expense_account_id, liability_account_id, margin_account_id, margin_percent, margin_amount,
      opening_commission, amendment_fees, swift_charges, other_charges,
      days_before_expiry_alert, days_before_shipment_alert,
      special_conditions, internal_notes
    } = req.body;
    
    // Validate required field: vendor
    if (!beneficiary_vendor_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Vendor (beneficiary) is required' } 
      });
    }
    
    // Convert empty strings to null for dates
    const cleanIssueDate = issue_date && issue_date.trim() !== '' ? issue_date : null;
    const cleanExpiryDate = expiry_date && expiry_date.trim() !== '' ? expiry_date : null;
    const cleanShipmentDate = latest_shipment_date && latest_shipment_date.trim() !== '' ? latest_shipment_date : null;
    
    // Calculate amount in base currency
    const amountInBaseCurrency = Number(original_amount) * Number(exchange_rate);
    
    // Get default status if not provided
    let finalStatusId = status_id;
    if (!finalStatusId) {
      const statusResult = await client.query(`
        SELECT id FROM lc_statuses WHERE company_id = $1 AND is_initial = true LIMIT 1
      `, [companyId]);
      finalStatusId = statusResult.rows[0]?.id;
    }
    
    const result = await client.query(`
      INSERT INTO letters_of_credit (
        company_id, lc_number, lc_type_id, status_id,
        beneficiary_vendor_id, beneficiary_name, beneficiary_name_ar, beneficiary_address, beneficiary_country_id,
        issuing_bank_id, issuing_bank_name, issuing_bank_swift, issuing_bank_address,
        advising_bank_name, advising_bank_swift, advising_bank_country_id,
        confirming_bank_name, confirming_bank_swift, is_confirmed,
        currency_id, original_amount, current_amount, tolerance_percent,
        exchange_rate, amount_in_base_currency,
        issue_date, expiry_date, latest_shipment_date, presentation_period_days,
        payment_terms, tenor_days, partial_shipments, transhipment,
        port_of_loading, port_of_loading_id, port_of_discharge, port_of_discharge_id, incoterm,
        goods_description, quantity, unit_of_measure, unit_price,
        project_id, purchase_order_id, shipment_id,
        required_documents,
        expense_account_id, liability_account_id, margin_account_id, margin_percent, margin_amount,
        opening_commission, amendment_fees, swift_charges, other_charges,
        days_before_expiry_alert, days_before_shipment_alert,
        special_conditions, internal_notes,
        created_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25,
        $26, $27, $28, $29,
        $30, $31, $32, $33,
        $34, $35, $36, $37, $38,
        $39, $40, $41, $42,
        $43, $44, $45,
        $46,
        $47, $48, $49, $50, $51,
        $52, $53, $54, $55,
        $56, $57,
        $58, $59,
        $60
      ) RETURNING *
    `, [
      companyId, lc_number, lc_type_id, finalStatusId,
      beneficiary_vendor_id, beneficiary_name, beneficiary_name_ar, beneficiary_address, beneficiary_country_id,
      issuing_bank_id, issuing_bank_name, issuing_bank_swift, issuing_bank_address,
      advising_bank_name, advising_bank_swift, advising_bank_country_id,
      confirming_bank_name, confirming_bank_swift, is_confirmed || false,
      currency_id, original_amount, original_amount, tolerance_percent || 0,
      exchange_rate, amountInBaseCurrency,
      cleanIssueDate, cleanExpiryDate, cleanShipmentDate, presentation_period_days || 21,
      payment_terms, tenor_days, partial_shipments || 'allowed', transhipment || 'allowed',
      port_of_loading, port_of_loading_id, port_of_discharge, port_of_discharge_id, incoterm,
      goods_description, quantity, unit_of_measure, unit_price,
      project_id, purchase_order_id, shipment_id,
      required_documents ? JSON.stringify(required_documents) : '[]',
      expense_account_id, liability_account_id, margin_account_id, margin_percent || 0, margin_amount || 0,
      opening_commission || 0, amendment_fees || 0, swift_charges || 0, other_charges || 0,
      days_before_expiry_alert || 30, days_before_shipment_alert || 14,
      special_conditions, internal_notes,
      userId
    ]);
    
    // Create expiry alert
    if (cleanExpiryDate && days_before_expiry_alert) {
      const alertDate = new Date(cleanExpiryDate);
      alertDate.setDate(alertDate.getDate() - (days_before_expiry_alert || 30));
      
      await client.query(`
        INSERT INTO lc_alerts (company_id, lc_id, alert_type, alert_date, trigger_date, title, title_ar, message, priority)
        VALUES ($1, $2, 'expiry_warning', $3, $3, $4, $5, $6, 'high')
      `, [
        companyId, result.rows[0].id, alertDate,
        `LC ${lc_number} expiring soon`,
        `الاعتماد ${lc_number} قارب على الانتهاء`,
        `Letter of Credit ${lc_number} will expire on ${expiry_date}`
      ]);
    }
    
    // Create vendor payment record for this LC
    if (beneficiary_vendor_id && original_amount && Number(original_amount) > 0) {
      // Generate payment number
      const paymentNumberResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
        FROM vendor_payments WHERE company_id = $1
      `, [companyId]);
      const paymentNumber = `VP-${String(paymentNumberResult.rows[0].next_num).padStart(6, '0')}`;
      
      await client.query(`
        INSERT INTO vendor_payments (
          company_id, vendor_id, payment_number, payment_date, payment_amount, payment_method,
          currency_id, exchange_rate, base_amount,
          project_id, purchase_order_id, shipment_id, lc_id,
          reference_number, notes, status, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, 'posted', $16
        )
      `, [
        companyId, 
        beneficiary_vendor_id,
        paymentNumber,
        cleanIssueDate || new Date().toISOString().split('T')[0],
        original_amount,
        'LC', // Payment method
        currency_id,
        exchange_rate,
        amountInBaseCurrency,
        project_id || null,
        purchase_order_id || null,
        shipment_id || null,
        result.rows[0].id, // LC ID
        lc_number,
        `Letter of Credit ${lc_number}`,
        userId
      ]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating LC:', error);
    
    // Handle duplicate LC number
    if (error.code === '23505' && error.constraint === 'letters_of_credit_company_id_lc_number_key') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'DUPLICATE_LC_NUMBER',
          message: 'An LC with this number already exists. Please use a different LC number.' 
        } 
      });
    }
    
    res.status(500).json({ success: false, error: { message: error.message } });
  } finally {
    client.release();
  }
});

// =====================================================
// UPDATE LC
// =====================================================
router.put('/:id', requirePermission('letters_of_credit:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).companyContext?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ success: false, error: { message: 'Company context required' } });
    }
    
    // Check if LC exists
    const existing = await pool.query(`
      SELECT * FROM letters_of_credit WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'LC not found' } });
    }
    
    const {
      lc_number, lc_type_id, status_id,
      beneficiary_vendor_id, beneficiary_name, beneficiary_name_ar, beneficiary_address, beneficiary_country_id,
      issuing_bank_id, issuing_bank_name, issuing_bank_swift, issuing_bank_address,
      advising_bank_name, advising_bank_swift, advising_bank_country_id,
      confirming_bank_name, confirming_bank_swift, is_confirmed,
      currency_id, exchange_rate,
      expiry_date, latest_shipment_date, presentation_period_days,
      payment_terms, tenor_days, partial_shipments, transhipment,
      port_of_loading, port_of_loading_id, port_of_discharge, port_of_discharge_id, incoterm,
      goods_description, quantity, unit_of_measure, unit_price,
      project_id, purchase_order_id, shipment_id,
      required_documents,
      expense_account_id, liability_account_id, margin_account_id, margin_percent, margin_amount,
      days_before_expiry_alert, days_before_shipment_alert,
      special_conditions, internal_notes
    } = req.body;
    
    // Convert empty strings to null for dates
    const cleanExpiryDate = expiry_date && expiry_date.trim() !== '' ? expiry_date : null;
    const cleanShipmentDate = latest_shipment_date && latest_shipment_date.trim() !== '' ? latest_shipment_date : null;
    
    const result = await pool.query(`
      UPDATE letters_of_credit SET
        lc_number = COALESCE($1, lc_number),
        lc_type_id = COALESCE($2, lc_type_id),
        status_id = COALESCE($3, status_id),
        beneficiary_vendor_id = $4,
        beneficiary_name = $5,
        beneficiary_name_ar = $6,
        beneficiary_address = $7,
        beneficiary_country_id = $8,
        issuing_bank_id = $9,
        issuing_bank_name = $10,
        issuing_bank_swift = $11,
        issuing_bank_address = $12,
        advising_bank_name = $13,
        advising_bank_swift = $14,
        advising_bank_country_id = $15,
        confirming_bank_name = $16,
        confirming_bank_swift = $17,
        is_confirmed = COALESCE($18, is_confirmed),
        currency_id = COALESCE($19, currency_id),
        exchange_rate = COALESCE($20, exchange_rate),
        expiry_date = COALESCE($21, expiry_date),
        latest_shipment_date = $22,
        presentation_period_days = COALESCE($23, presentation_period_days),
        payment_terms = $24,
        tenor_days = $25,
        partial_shipments = COALESCE($26, partial_shipments),
        transhipment = COALESCE($27, transhipment),
        port_of_loading = $28,
        port_of_loading_id = $29,
        port_of_discharge = $30,
        port_of_discharge_id = $31,
        incoterm = $32,
        goods_description = $33,
        quantity = $34,
        unit_of_measure = $35,
        unit_price = $36,
        project_id = $37,
        purchase_order_id = $38,
        shipment_id = $39,
        required_documents = COALESCE($40, required_documents),
        expense_account_id = $41,
        liability_account_id = $42,
        margin_account_id = $43,
        margin_percent = COALESCE($44, margin_percent),
        margin_amount = COALESCE($45, margin_amount),
        days_before_expiry_alert = COALESCE($46, days_before_expiry_alert),
        days_before_shipment_alert = COALESCE($47, days_before_shipment_alert),
        special_conditions = $48,
        internal_notes = $49,
        updated_by = $50,
        updated_at = NOW()
      WHERE id = $51
      RETURNING *
    `, [
      lc_number || null, lc_type_id || null, status_id || null,
      beneficiary_vendor_id || null, beneficiary_name || null, beneficiary_name_ar || null, beneficiary_address || null, beneficiary_country_id || null,
      issuing_bank_id || null, issuing_bank_name || null, issuing_bank_swift || null, issuing_bank_address || null,
      advising_bank_name || null, advising_bank_swift || null, advising_bank_country_id || null,
      confirming_bank_name || null, confirming_bank_swift || null, is_confirmed,
      currency_id || null, exchange_rate || null,
      cleanExpiryDate, cleanShipmentDate, presentation_period_days || null,
      payment_terms || null, tenor_days || null, partial_shipments || null, transhipment || null,
      port_of_loading || null, port_of_loading_id || null, port_of_discharge || null, port_of_discharge_id || null, incoterm || null,
      goods_description || null, quantity || null, unit_of_measure || null, unit_price || null,
      project_id || null, purchase_order_id || null, shipment_id || null,
      required_documents ? JSON.stringify(required_documents) : null,
      expense_account_id || null, liability_account_id || null, margin_account_id || null, margin_percent || null, margin_amount || null,
      days_before_expiry_alert || null, days_before_shipment_alert || null,
      special_conditions || null, internal_notes || null,
      userId, id
    ]);
    
    const updatedLC = result.rows[0];
    
    // ====================================
    // Update vendor payment record
    // ====================================
    if (beneficiary_vendor_id && updatedLC.amount_usd) {
      // Check if payment already exists for this LC
      const existingPayment = await pool.query(`
        SELECT id FROM vendor_payments 
        WHERE lc_id = $1 AND company_id = $2 AND deleted_at IS NULL
      `, [id, companyId]);
      
      if (existingPayment.rows.length > 0) {
        // Update existing payment
        await pool.query(`
          UPDATE vendor_payments SET
            vendor_id = $1,
            payment_date = $2,
            payment_amount = $3,
            currency_id = $4,
            exchange_rate = $5,
            base_amount = $6,
            project_id = $7,
            purchase_order_id = $8,
            shipment_id = $9,
            reference_number = $10,
            updated_by = $11,
            updated_at = NOW()
          WHERE id = $12 AND company_id = $13
        `, [
          beneficiary_vendor_id,
          updatedLC.issue_date || new Date(),
          updatedLC.original_amount,
          currency_id || null,
          exchange_rate || null,
          updatedLC.amount_in_base_currency,
          project_id || null,
          purchase_order_id || null,
          shipment_id || null,
          lc_number || null,
          userId,
          existingPayment.rows[0].id,
          companyId
        ]);
      } else {
        // Create new payment if it doesn't exist
        const paymentNumberResult = await pool.query(`
          SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
          FROM vendor_payments WHERE company_id = $1
        `, [companyId]);
        const paymentNumber = `VP-${String(paymentNumberResult.rows[0].next_num).padStart(6, '0')}`;
        
        await pool.query(`
          INSERT INTO vendor_payments (
            company_id, vendor_id, payment_number, payment_date, payment_amount, 
            payment_method, currency_id, exchange_rate, base_amount, project_id, 
            purchase_order_id, shipment_id, lc_id, reference_number, 
            status, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, 'LC', $6, $7, $8, $9, $10, $11, $12, $13, 'posted', $14
          )
        `, [
          companyId,
          beneficiary_vendor_id,
          paymentNumber,
          updatedLC.issue_date || new Date(),
          updatedLC.original_amount,
          currency_id || null,
          exchange_rate || null,
          updatedLC.amount_in_base_currency,
          project_id || null,
          purchase_order_id || null,
          shipment_id || null,
          id,
          lc_number || null,
          userId
        ]);
      }
    }
    
    res.json({ success: true, data: updatedLC });
  } catch (error: any) {
    console.error('Error updating LC:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// DELETE LC (soft delete)
// =====================================================
router.delete('/:id', requirePermission('letters_of_credit:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).companyContext?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ success: false, error: { message: 'Company context required' } });
    }
    
    const result = await pool.query(`
      UPDATE letters_of_credit 
      SET deleted_at = NOW(), updated_by = $1 
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
      RETURNING id
    `, [userId, id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'LC not found' } });
    }
    
    // ====================================
    // Soft delete the associated vendor payment
    // ====================================
    await pool.query(`
      UPDATE vendor_payments 
      SET deleted_at = NOW(), updated_by = $1 
      WHERE lc_id = $2 AND company_id = $3 AND deleted_at IS NULL
    `, [userId, id, companyId]);
    
    res.json({ success: true, message: 'LC deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting LC:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// CREATE AMENDMENT
// =====================================================
router.post('/:id/amend', requirePermission('letters_of_credit:amend'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).companyContext?.companyId;
    
    // Get current LC
    const lcResult = await client.query(`
      SELECT * FROM letters_of_credit WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);
    
    if (lcResult.rows.length === 0) {
      throw new Error('LC not found');
    }
    
    const lc = lcResult.rows[0];
    
    // Get next amendment number
    const nextNumResult = await client.query(`
      SELECT COALESCE(MAX(amendment_number), 0) + 1 as next_num FROM lc_amendments WHERE lc_id = $1
    `, [id]);
    const amendmentNumber = nextNumResult.rows[0].next_num;
    
    const {
      amendment_date, change_type, change_description,
      new_amount, new_expiry_date, new_shipment_date,
      new_values, amendment_fee, reason, bank_reference
    } = req.body;
    
    // Calculate amount change
    const amountChange = new_amount ? Number(new_amount) - Number(lc.current_amount) : null;
    
    // Create amendment record
    const amendmentResult = await client.query(`
      INSERT INTO lc_amendments (
        company_id, lc_id, amendment_number, amendment_date,
        change_type, change_description,
        previous_amount, new_amount, amount_change,
        previous_expiry_date, new_expiry_date,
        previous_shipment_date, new_shipment_date,
        previous_values, new_values,
        amendment_fee, reason, bank_reference,
        status, created_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9,
        $10, $11,
        $12, $13,
        $14, $15,
        $16, $17, $18,
        'approved', $19
      ) RETURNING *
    `, [
      companyId, id, amendmentNumber, amendment_date,
      change_type, change_description,
      lc.current_amount, new_amount, amountChange,
      lc.expiry_date, new_expiry_date,
      lc.latest_shipment_date, new_shipment_date,
      JSON.stringify({ amount: lc.current_amount, expiry_date: lc.expiry_date }),
      new_values ? JSON.stringify(new_values) : null,
      amendment_fee || 0, reason, bank_reference,
      userId
    ]);
    
    // Update LC with new values
    const updates: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;
    
    if (new_amount) {
      updates.push(`current_amount = $${paramIndex++}`);
      updateParams.push(new_amount);
    }
    if (new_expiry_date) {
      updates.push(`expiry_date = $${paramIndex++}`);
      updateParams.push(new_expiry_date);
    }
    if (new_shipment_date) {
      updates.push(`latest_shipment_date = $${paramIndex++}`);
      updateParams.push(new_shipment_date);
    }
    if (amendment_fee) {
      updates.push(`amendment_fees = amendment_fees + $${paramIndex++}`);
      updateParams.push(amendment_fee);
    }
    
    // Update status to AMENDED
    const amendedStatus = await client.query(`
      SELECT id FROM lc_statuses WHERE company_id = $1 AND code = 'AMENDED' LIMIT 1
    `, [companyId]);
    if (amendedStatus.rows.length > 0) {
      updates.push(`status_id = $${paramIndex++}`);
      updateParams.push(amendedStatus.rows[0].id);
    }
    
    updates.push(`updated_by = $${paramIndex++}`);
    updateParams.push(userId);
    
    if (updates.length > 0) {
      updateParams.push(id);
      await client.query(`
        UPDATE letters_of_credit SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}
      `, updateParams);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({ success: true, data: amendmentResult.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating amendment:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  } finally {
    client.release();
  }
});

export default router;


