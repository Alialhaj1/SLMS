import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();
router.use(authenticate, loadCompanyContext);

/**
 * GET /api/procurement/reports/vendor-aging
 * Vendor Aging Report - Outstanding balances by aging buckets
 * 
 * Query params:
 *  - currency_code (optional): filter by currency, default = company base currency
 *  - as_of_date (optional): aging as of date, default = today
 *    FORMAT: YYYY-MM-DD (e.g., "2026-01-07")
 *    PURPOSE: Historical aging analysis, closing period reconciliation
 * 
 * Business Rules:
 *  - Only posted invoices (is_posted = true)
 *  - Exclude deleted/cancelled invoices
 *  - Outstanding = total_amount - paid_amount
 *  - Aging buckets: Current, 1-30, 31-60, 61-90, 120+ days
 *  - Days overdue = as_of_date - due_date
 * 
 * ACCOUNTING NOTE:
 *  - as_of_date enables:
 *    1. Month-end closing reports (e.g., as_of_date = '2025-12-31')
 *    2. Historical reconciliation (audit trail)
 *    3. Comparative aging analysis (compare aging on different dates)
 */
router.get('/vendor-aging', authenticate, requirePermission('procurement:reports:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const currencyCode = req.query.currency_code as string | undefined;
    const asOfDate = req.query.as_of_date as string || new Date().toISOString().split('T')[0];

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get company base currency if not specified
    let targetCurrency = currencyCode;
    if (!targetCurrency) {
      const companyResult = await pool.query(
        'SELECT default_currency FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [companyId]
      );
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      targetCurrency = companyResult.rows[0].default_currency || 'SAR';
    }

    // Query vendor aging with buckets
    const query = `
      WITH invoice_balances AS (
        SELECT
          pi.vendor_id,
          pi.id as invoice_id,
          pi.invoice_number,
          pi.due_date,
          pi.total_amount,
          pi.balance as outstanding_amount,
          ($3::date - pi.due_date::date) as days_overdue
        FROM purchase_invoices pi
        JOIN currencies c ON pi.currency_id = c.id
        WHERE pi.company_id = $1
          AND c.code = $2
          AND pi.is_posted = true
          AND pi.status NOT IN ('cancelled', 'draft')
          AND pi.deleted_at IS NULL
          AND pi.balance > 0
          AND pi.due_date <= $3::date
      )
      SELECT
        v.id as vendor_id,
        v.code as vendor_code,
        v.name as vendor_name,
        v.name_ar as vendor_name_arabic,
        $2 as currency_code,
        -- Current (not yet due or due today)
        COALESCE(SUM(CASE WHEN ib.days_overdue <= 0 THEN ib.outstanding_amount ELSE 0 END), 0) as current_balance,
        -- 1-30 days
        COALESCE(SUM(CASE WHEN ib.days_overdue BETWEEN 1 AND 30 THEN ib.outstanding_amount ELSE 0 END), 0) as days_1_30,
        -- 31-60 days
        COALESCE(SUM(CASE WHEN ib.days_overdue BETWEEN 31 AND 60 THEN ib.outstanding_amount ELSE 0 END), 0) as days_31_60,
        -- 61-90 days
        COALESCE(SUM(CASE WHEN ib.days_overdue BETWEEN 61 AND 90 THEN ib.outstanding_amount ELSE 0 END), 0) as days_61_90,
        -- 120+ days
        COALESCE(SUM(CASE WHEN ib.days_overdue > 90 THEN ib.outstanding_amount ELSE 0 END), 0) as days_120_plus,
        -- Total
        COALESCE(SUM(ib.outstanding_amount), 0) as total_balance
      FROM vendors v
      LEFT JOIN invoice_balances ib ON v.id = ib.vendor_id
      WHERE v.company_id = $1
        AND v.deleted_at IS NULL
      GROUP BY v.id, v.code, v.name, v.name_ar
      HAVING COALESCE(SUM(ib.outstanding_amount), 0) > 0
      ORDER BY total_balance DESC
    `;

    const result = await pool.query(query, [companyId, targetCurrency, asOfDate]);

    const totals = result.rows.reduce((acc, row) => ({
      current_balance: acc.current_balance + parseFloat(row.current_balance),
      days_1_30: acc.days_1_30 + parseFloat(row.days_1_30),
      days_31_60: acc.days_31_60 + parseFloat(row.days_31_60),
      days_61_90: acc.days_61_90 + parseFloat(row.days_61_90),
      days_120_plus: acc.days_120_plus + parseFloat(row.days_120_plus),
      total_balance: acc.total_balance + parseFloat(row.total_balance),
    }), {
      current_balance: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_120_plus: 0,
      total_balance: 0,
    });

    res.json({
      data: result.rows,
      totals,
      meta: {
        currency_code: targetCurrency,
        as_of_date: asOfDate,
        total_vendors: result.rows.length,
      }
    });

  } catch (error) {
    console.error('Error generating vendor aging report:', error);
    res.status(500).json({ error: 'Failed to generate vendor aging report' });
  }
});

/**
 * GET /api/procurement/reports/price-variance
 * Price Variance Report - Compare PO prices vs Invoice prices by item
 * 
 * Query params:
 *  - threshold (optional): variance % threshold for flagging, default = 5
 *  - from_date, to_date (optional): date range filter
 * 
 * Business Rules:
 *  - Only posted invoices
 *  - Compare AVG(PO item price) vs AVG(Invoice item price)
 *  - Variance % = ((Invoice Price - PO Price) / PO Price) * 100
 *  - Flag if |variance %| > threshold
 */
router.get('/price-variance', authenticate, requirePermission('procurement:reports:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const threshold = parseFloat(req.query.threshold as string) || 5.0;
    const fromDate = req.query.from_date as string;
    const toDate = req.query.to_date as string;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    let dateFilter = '';
    const queryParams: any[] = [companyId, threshold];
    let paramIndex = 3;

    if (fromDate) {
      dateFilter += ` AND pi.invoice_date >= $${paramIndex}`;
      queryParams.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      dateFilter += ` AND pi.invoice_date <= $${paramIndex}`;
      queryParams.push(toDate);
      paramIndex++;
    }

    const query = `
      WITH po_prices AS (
        SELECT
          poi.item_id,
          AVG(poi.unit_price) as avg_po_price,
          COUNT(DISTINCT po.id) as po_count,
          SUM(poi.ordered_qty) as total_po_qty
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.order_id = po.id
        WHERE po.company_id = $1
          AND po.status NOT IN ('cancelled', 'draft')
          AND po.deleted_at IS NULL
          AND poi.deleted_at IS NULL
        GROUP BY poi.item_id
      ),
      invoice_prices AS (
        SELECT
          pii.item_id,
          AVG(pii.unit_price) as avg_invoice_price,
          COUNT(DISTINCT pi.id) as invoice_count,
          SUM(pii.quantity) as total_invoice_qty
        FROM purchase_invoice_items pii
        JOIN purchase_invoices pi ON pii.invoice_id = pi.id
        WHERE pi.company_id = $1
          AND pi.is_posted = true
          AND pi.status NOT IN ('cancelled', 'draft')
          AND pi.deleted_at IS NULL
          ${dateFilter}
        GROUP BY pii.item_id
      )
      SELECT
        i.id as item_id,
        i.code as item_code,
        i.name as item_name,
        i.name_ar as item_name_arabic,
        u.code as uom_code,
        COALESCE(pp.avg_po_price, 0) as avg_po_price,
        COALESCE(ip.avg_invoice_price, 0) as avg_invoice_price,
        (COALESCE(ip.avg_invoice_price, 0) - COALESCE(pp.avg_po_price, 0)) as variance_amount,
        CASE 
          WHEN COALESCE(pp.avg_po_price, 0) = 0 THEN 0
          ELSE ((COALESCE(ip.avg_invoice_price, 0) - COALESCE(pp.avg_po_price, 0)) / pp.avg_po_price) * 100
        END as variance_percent,
        COALESCE(pp.po_count, 0) as po_count,
        COALESCE(ip.invoice_count, 0) as invoice_count,
        COALESCE(pp.total_po_qty, 0) as total_po_qty,
        COALESCE(ip.total_invoice_qty, 0) as total_invoice_qty,
        CASE 
          WHEN COALESCE(pp.avg_po_price, 0) = 0 THEN false
          ELSE ABS(((COALESCE(ip.avg_invoice_price, 0) - COALESCE(pp.avg_po_price, 0)) / pp.avg_po_price) * 100) > $2
        END as exceeds_threshold
      FROM items i
      LEFT JOIN po_prices pp ON i.id = pp.item_id
      LEFT JOIN invoice_prices ip ON i.id = ip.item_id
      LEFT JOIN units_of_measure u ON i.base_uom_id = u.id
      WHERE i.company_id = $1
        AND i.deleted_at IS NULL
        AND (pp.item_id IS NOT NULL OR ip.item_id IS NOT NULL)
      ORDER BY ABS(COALESCE(ip.avg_invoice_price, 0) - COALESCE(pp.avg_po_price, 0)) DESC
    `;

    const result = await pool.query(query, queryParams);

    const summary = {
      total_items: result.rows.length,
      items_exceeding_threshold: result.rows.filter(r => r.exceeds_threshold).length,
      avg_variance_percent: result.rows.length > 0 
        ? result.rows.reduce((sum, r) => sum + parseFloat(r.variance_percent), 0) / result.rows.length 
        : 0,
    };

    res.json({
      data: result.rows,
      summary,
      meta: {
        threshold_percent: threshold,
        from_date: fromDate || null,
        to_date: toDate || null,
      }
    });

  } catch (error) {
    console.error('Error generating price variance report:', error);
    res.status(500).json({ error: 'Failed to generate price variance report' });
  }
});

/**
 * GET /api/procurement/reports/outstanding-pos
 * Outstanding Purchase Orders Report - POs with unreceived quantities
 * 
 * Query params:
 *  - vendor_id (optional): filter by vendor
 *  - aging_threshold (optional): days threshold for highlighting, default = 30
 * 
 * Business Rules:
 *  - Status = 'approved' or 'partially_received'
 *  - remaining_qty = ordered_qty - received_qty > 0
 *  - Days outstanding = today - order_date
 *  - Exclude cancelled/closed orders
 */
router.get('/outstanding-pos', authenticate, requirePermission('procurement:reports:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const vendorId = req.query.vendor_id ? parseInt(req.query.vendor_id as string) : null;
    const agingThreshold = parseInt(req.query.aging_threshold as string) || 30;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    let vendorFilter = '';
    const queryParams: any[] = [companyId];
    if (vendorId) {
      vendorFilter = 'AND po.vendor_id = $2';
      queryParams.push(vendorId);
    }

    const query = `
      WITH po_details AS (
        SELECT
          po.id,
          po.order_number,
          po.order_date,
          po.expected_date as expected_delivery_date,
          po.vendor_id,
          COALESCE(cur.code, 'SAR') as currency_code,
          po.status,
          v.code as vendor_code,
          v.name as vendor_name,
          v.name_ar as vendor_name_arabic,
          SUM(poi.ordered_qty) as total_ordered,
          SUM(poi.received_qty) as total_received,
          SUM(poi.ordered_qty - poi.received_qty) as total_remaining,
          SUM(poi.ordered_qty * poi.unit_price) as total_amount,
          SUM((poi.ordered_qty - poi.received_qty) * poi.unit_price) as remaining_amount,
          (CURRENT_DATE - po.order_date::date) as days_outstanding,
          CASE 
            WHEN po.expected_date IS NOT NULL AND po.expected_date < CURRENT_DATE THEN (CURRENT_DATE - po.expected_date::date)
            ELSE 0
          END as days_overdue
        FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        JOIN purchase_order_items poi ON po.id = poi.order_id
        LEFT JOIN currencies cur ON po.currency_id = cur.id
        WHERE po.company_id = $1
          AND po.status IN ('approved', 'partially_received')
          AND po.deleted_at IS NULL
          AND poi.deleted_at IS NULL
          ${vendorFilter}
        GROUP BY po.id, po.order_number, po.order_date, po.expected_date, 
                 po.vendor_id, cur.code, po.status,
                 v.code, v.name, v.name_ar
        HAVING SUM(poi.ordered_qty - poi.received_qty) > 0
      )
      SELECT
        id,
        order_number,
        order_date,
        expected_delivery_date,
        vendor_id,
        vendor_code,
        vendor_name,
        vendor_name_arabic,
        currency_code,
        status,
        total_ordered,
        total_received,
        total_remaining,
        total_amount,
        remaining_amount,
        days_outstanding,
        days_overdue,
        CASE 
          WHEN days_overdue > 0 THEN 'overdue'
          WHEN days_outstanding > ${agingThreshold} THEN 'aging'
          ELSE 'normal'
        END as aging_status
      FROM po_details
      ORDER BY days_outstanding DESC, remaining_amount DESC
    `;

    const result = await pool.query(query, queryParams);

    const summary = {
      total_pos: result.rows.length,
      total_remaining_amount: result.rows.reduce((sum, r) => sum + parseFloat(r.remaining_amount), 0),
      overdue_count: result.rows.filter(r => r.aging_status === 'overdue').length,
      aging_count: result.rows.filter(r => r.aging_status === 'aging').length,
    };

    res.json({
      data: result.rows,
      summary,
      meta: {
        vendor_id: vendorId,
        aging_threshold_days: agingThreshold,
      }
    });

  } catch (error) {
    console.error('Error generating outstanding POs report:', error);
    res.status(500).json({ error: 'Failed to generate outstanding POs report' });
  }
});

/**
 * GET /api/procurement/reports/payment-history
 * Payment History Report - All vendor payments with allocations
 * 
 * Query params:
 *  - vendor_id (optional): filter by vendor
 *  - from_date, to_date (optional): date range
 *  - status (optional): draft, posted, cancelled
 */
router.get('/payment-history', authenticate, requirePermission('procurement:reports:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const { vendor_id, from_date, to_date, status } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    let query = `
      SELECT 
        vp.id,
        vp.payment_number,
        vp.payment_date,
        vp.payment_method,
        vp.payment_amount,
        vp.allocated_amount,
        vp.unallocated_amount,
        COALESCE(cur.code, 'SAR') as currency_code,
        vp.status,
        vp.is_posted,
        v.code as vendor_code,
        v.name as vendor_name,
        (
          SELECT COUNT(*)
          FROM vendor_payment_allocations vpa
          WHERE vpa.payment_id = vp.id AND vpa.deleted_at IS NULL
        ) as allocation_count
      FROM vendor_payments vp
      INNER JOIN vendors v ON vp.vendor_id = v.id
      LEFT JOIN currencies cur ON vp.currency_id = cur.id
      WHERE vp.company_id = $1
        AND vp.deleted_at IS NULL
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    if (vendor_id) {
      query += ` AND vp.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    if (from_date) {
      query += ` AND vp.payment_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      query += ` AND vp.payment_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    if (status) {
      query += ` AND vp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY vp.payment_date DESC, vp.id DESC`;

    const result = await pool.query(query, params);

    const summary = result.rows.reduce((acc, row) => ({
      total_payments: acc.total_payments + 1,
      total_amount: acc.total_amount + parseFloat(row.payment_amount),
      total_allocated: acc.total_allocated + parseFloat(row.allocated_amount),
      total_unallocated: acc.total_unallocated + parseFloat(row.unallocated_amount),
    }), {
      total_payments: 0,
      total_amount: 0,
      total_allocated: 0,
      total_unallocated: 0,
    });

    res.json({
      data: result.rows,
      summary,
      meta: {
        total_records: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error generating payment history report:', error);
    res.status(500).json({ error: 'Failed to generate payment history report' });
  }
});

/**
 * GET /api/procurement/reports/unapplied-payments
 * Unapplied Payments Report - Payments with unallocated amounts
 */
router.get('/unapplied-payments', authenticate, requirePermission('procurement:reports:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId || (req as any).companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const result = await pool.query(
      `SELECT 
        vp.id,
        vp.payment_number,
        vp.payment_date,
        vp.payment_amount,
        vp.allocated_amount,
        vp.unallocated_amount,
        COALESCE(cur.code, 'SAR') as currency_code,
        v.code as vendor_code,
        v.name as vendor_name,
        (CURRENT_DATE - vp.payment_date::date) as days_unapplied
      FROM vendor_payments vp
      INNER JOIN vendors v ON vp.vendor_id = v.id
      LEFT JOIN currencies cur ON vp.currency_id = cur.id
      WHERE vp.company_id = $1
        AND vp.unallocated_amount > 0
        AND vp.is_posted = true
        AND vp.deleted_at IS NULL
      ORDER BY vp.payment_date ASC`,
      [companyId]
    );

    const total_unapplied = result.rows.reduce((sum, row) => sum + parseFloat(row.unallocated_amount), 0);

    res.json({
      data: result.rows,
      summary: {
        total_payments: result.rows.length,
        total_unapplied_amount: total_unapplied
      }
    });

  } catch (error) {
    console.error('Error generating unapplied payments report:', error);
    res.status(500).json({ error: 'Failed to generate unapplied payments report' });
  }
});

/**
 * GET /api/procurement/reports/vendor-balance
 * Vendor Balance Report - Current outstanding balance per vendor
 */
router.get('/vendor-balance', authenticate, requirePermission('procurement:reports:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId || (req as any).companyId;
    const { currency_code } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get company base currency if not specified
    let targetCurrency = currency_code as string;
    if (!targetCurrency) {
      const companyResult = await pool.query(
        'SELECT default_currency FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [companyId]
      );
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      targetCurrency = companyResult.rows[0].default_currency || 'SAR';
    }

    const result = await pool.query(
      `SELECT 
        v.id as vendor_id,
        v.code as vendor_code,
        v.name as vendor_name,
        COALESCE(SUM(pi.balance), 0) as outstanding_balance,
        COUNT(pi.id) as outstanding_invoices,
        MIN(pi.due_date) as oldest_due_date,
        MAX(pi.due_date) as newest_due_date
      FROM vendors v
      LEFT JOIN purchase_invoices pi ON v.id = pi.vendor_id
        AND pi.company_id = $1
        AND pi.is_posted = true
        AND pi.balance > 0
        AND pi.deleted_at IS NULL
      LEFT JOIN currencies cur ON pi.currency_id = cur.id
      WHERE v.company_id = $1
        AND v.deleted_at IS NULL
        AND (pi.id IS NULL OR cur.code = $2)
      GROUP BY v.id, v.code, v.name
      HAVING COALESCE(SUM(pi.balance), 0) > 0
      ORDER BY outstanding_balance DESC`,
      [companyId, targetCurrency]
    );

    const total_balance = result.rows.reduce((sum, row) => sum + parseFloat(row.outstanding_balance), 0);

    res.json({
      data: result.rows,
      summary: {
        total_vendors: result.rows.length,
        total_outstanding: total_balance,
        currency_code: targetCurrency
      }
    });

  } catch (error) {
    console.error('Error generating vendor balance report:', error);
    res.status(500).json({ error: 'Failed to generate vendor balance report' });
  }
});

export default router;
