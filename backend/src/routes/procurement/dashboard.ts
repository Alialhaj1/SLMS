import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

/**
 * GET /api/procurement/dashboard/stats
 * Dashboard KPI Statistics - 7 key metrics
 * 
 * KPI DEFINITIONS (Explicit Accounting Rules):
 * ============================================
 * 
 * 1. purchases_mtd (Month-to-Date):
 *    - SOURCE: purchase_invoices.total_amount
 *    - FILTER: is_posted = true (journal entry created)
 *    - PERIOD: EXTRACT(YEAR/MONTH FROM invoice_date) = CURRENT_MONTH
 *    - EXCLUDES: Drafts, cancelled, deleted, unpaid GRs
 * 
 * 2. purchases_ytd (Year-to-Date):
 *    - SOURCE: purchase_invoices.total_amount
 *    - FILTER: is_posted = true
 *    - PERIOD: EXTRACT(YEAR FROM invoice_date) = CURRENT_YEAR
 * 
 * 3. outstanding_pos:
 *    - SOURCE: purchase_orders.total_amount
 *    - FILTER: status IN ('approved', 'partially_received')
 *    - MEANING: POs approved but not fully received/closed
 * 
 * 4. pending_approvals:
 *    - SOURCE: purchase_orders
 *    - FILTER: status = 'pending_approval'
 *    - MEANING: POs awaiting manager/admin approval
 * 
 * 5. avg_payment_days:
 *    - SOURCE: AVG(payment_terms.days)
 *    - FILTER: vendors with status='active' and linked payment_terms
 *    - MEANING: Average credit period granted by vendors
 * 
 * 6. active_vendors:
 *    - SOURCE: vendors
 *    - FILTER: status = 'active', deleted_at IS NULL
 *    - MEANING: Vendors eligible for new transactions
 * 
 * 7. overdue_invoices:
 *    - SOURCE: purchase_invoices
 *    - FILTER: is_posted = true, due_date < CURRENT_DATE, balance > 0
 *    - CALCULATION: balance = total_amount - SUM(payments)
 *    - MEANING: Invoices past due date with unpaid balance
 * 
 * Business Rules:
 *  - All amounts from POSTED invoices only (is_posted = true)
 *  - Drafted/Cancelled invoices excluded from all calculations
 *  - Company-scoped (req.user.companyId)
 *  - Currency-aware (company.base_currency_code)
 */
router.get('/stats', authenticate, requirePermission('procurement:dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get company base currency
    const companyResult = await pool.query(
      'SELECT base_currency_code FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [companyId]
    );
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const baseCurrency = companyResult.rows[0].base_currency_code || 'SAR';

    // Purchases MTD (Month-to-Date)
    const mtdResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM purchase_invoices
      WHERE company_id = $1
        AND currency_code = $2
        AND is_posted = true
        AND status NOT IN ('cancelled', 'draft')
        AND deleted_at IS NULL
        AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM invoice_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    `, [companyId, baseCurrency]);

    // Purchases YTD (Year-to-Date)
    const ytdResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM purchase_invoices
      WHERE company_id = $1
        AND currency_code = $2
        AND is_posted = true
        AND status NOT IN ('cancelled', 'draft')
        AND deleted_at IS NULL
        AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [companyId, baseCurrency]);

    // Outstanding Purchase Orders
    const outstandingPOsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT po.id) as count,
        COALESCE(SUM(po.total_amount), 0) as total_amount
      FROM purchase_orders po
      WHERE po.company_id = $1
        AND po.currency_code = $2
        AND po.status IN ('approved', 'partially_received')
        AND po.deleted_at IS NULL
    `, [companyId, baseCurrency]);

    // Pending Approvals (POs)
    const pendingApprovalsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM purchase_orders
      WHERE company_id = $1
        AND status = 'pending_approval'
        AND deleted_at IS NULL
    `, [companyId]);

    // Average Payment Days (from vendor payment terms)
    const avgPaymentDaysResult = await pool.query(`
      SELECT 
        COALESCE(AVG(pt.days), 0) as avg_days
      FROM vendors v
      LEFT JOIN payment_terms pt ON v.payment_terms_id = pt.id
      WHERE v.company_id = $1
        AND v.status = 'active'
        AND v.deleted_at IS NULL
    `, [companyId]);

    // Active Vendors
    const activeVendorsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM vendors
      WHERE company_id = $1
        AND status = 'active'
        AND deleted_at IS NULL
    `, [companyId]);

    // Overdue Invoices (unpaid balance past due date)
    const overdueInvoicesResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(
          total_amount - COALESCE((
            SELECT SUM(amount)
            FROM vendor_balance_transactions vbt
            WHERE vbt.invoice_id = pi.id
              AND vbt.transaction_type = 'payment'
              AND vbt.deleted_at IS NULL
          ), 0)
        ), 0) as total_overdue
      FROM purchase_invoices pi
      WHERE pi.company_id = $1
        AND pi.currency_code = $2
        AND pi.is_posted = true
        AND pi.status NOT IN ('cancelled', 'draft')
        AND pi.deleted_at IS NULL
        AND pi.due_date < CURRENT_DATE
        AND (
          pi.total_amount - COALESCE((
            SELECT SUM(amount)
            FROM vendor_balance_transactions vbt
            WHERE vbt.invoice_id = pi.id
              AND vbt.transaction_type = 'payment'
              AND vbt.deleted_at IS NULL
          ), 0)
        ) > 0
    `, [companyId, baseCurrency]);

    res.json({
      data: {
        purchases_mtd: parseFloat(mtdResult.rows[0].total),
        purchases_ytd: parseFloat(ytdResult.rows[0].total),
        outstanding_pos: {
          count: parseInt(outstandingPOsResult.rows[0].count),
          amount: parseFloat(outstandingPOsResult.rows[0].total_amount),
        },
        pending_approvals: {
          count: parseInt(pendingApprovalsResult.rows[0].count),
        },
        avg_payment_days: Math.round(parseFloat(avgPaymentDaysResult.rows[0].avg_days)),
        active_vendors: {
          count: parseInt(activeVendorsResult.rows[0].count),
        },
        overdue_invoices: {
          count: parseInt(overdueInvoicesResult.rows[0].count),
          amount: parseFloat(overdueInvoicesResult.rows[0].total_overdue),
        },
      },
      meta: {
        currency_code: baseCurrency,
        as_of_date: new Date().toISOString().split('T')[0],
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * GET /api/procurement/dashboard/monthly-trend
 * Monthly Purchases Trend - Last 12 months
 * 
 * Returns array of:
 *  - month: YYYY-MM
 *  - purchase_amount: Total posted invoices
 *  - invoice_count: Number of invoices
 * 
 * Business Rules:
 *  - Posted invoices only
 *  - Company base currency
 *  - Last 12 months from current date
 */
router.get('/monthly-trend', authenticate, requirePermission('procurement:dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get company base currency
    const companyResult = await pool.query(
      'SELECT base_currency_code FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [companyId]
    );
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const baseCurrency = companyResult.rows[0].base_currency_code || 'SAR';

    const query = `
      SELECT
        TO_CHAR(invoice_date, 'YYYY-MM') as month,
        COALESCE(SUM(total_amount), 0) as purchase_amount,
        COUNT(*) as invoice_count
      FROM purchase_invoices
      WHERE company_id = $1
        AND currency_code = $2
        AND is_posted = true
        AND status NOT IN ('cancelled', 'draft')
        AND deleted_at IS NULL
        AND invoice_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const result = await pool.query(query, [companyId, baseCurrency]);

    res.json({
      data: result.rows.map(row => ({
        month: row.month,
        purchase_amount: parseFloat(row.purchase_amount),
        invoice_count: parseInt(row.invoice_count),
      })),
      meta: {
        currency_code: baseCurrency,
        months_count: result.rows.length,
      }
    });

  } catch (error) {
    console.error('Error fetching monthly trend:', error);
    res.status(500).json({ error: 'Failed to fetch monthly trend' });
  }
});

/**
 * GET /api/procurement/dashboard/top-vendors
 * Top 10 Vendors by Purchase Volume (YTD)
 * 
 * Returns array of:
 *  - vendor_id, code, name, name_arabic
 *  - total_purchases: Sum of posted invoices
 *  - invoice_count: Number of invoices
 * 
 * Business Rules:
 *  - Posted invoices only
 *  - Current year only
 *  - Top 10 by total purchase amount
 */
router.get('/top-vendors', authenticate, requirePermission('procurement:dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get company base currency
    const companyResult = await pool.query(
      'SELECT base_currency_code FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [companyId]
    );
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const baseCurrency = companyResult.rows[0].base_currency_code || 'SAR';

    const query = `
      SELECT
        v.id as vendor_id,
        v.code as vendor_code,
        v.name as vendor_name,
        v.name_arabic as vendor_name_arabic,
        COALESCE(SUM(pi.total_amount), 0) as total_purchases,
        COUNT(pi.id) as invoice_count
      FROM vendors v
      LEFT JOIN purchase_invoices pi ON v.id = pi.vendor_id
        AND pi.currency_code = $2
        AND pi.is_posted = true
        AND pi.status NOT IN ('cancelled', 'draft')
        AND pi.deleted_at IS NULL
        AND EXTRACT(YEAR FROM pi.invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE v.company_id = $1
        AND v.deleted_at IS NULL
      GROUP BY v.id, v.code, v.name, v.name_arabic
      HAVING COALESCE(SUM(pi.total_amount), 0) > 0
      ORDER BY total_purchases DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [companyId, baseCurrency]);

    res.json({
      data: result.rows.map(row => ({
        vendor_id: row.vendor_id,
        vendor_code: row.vendor_code,
        vendor_name: row.vendor_name,
        vendor_name_arabic: row.vendor_name_arabic,
        total_purchases: parseFloat(row.total_purchases),
        invoice_count: parseInt(row.invoice_count),
      })),
      meta: {
        currency_code: baseCurrency,
        year: new Date().getFullYear(),
      }
    });

  } catch (error) {
    console.error('Error fetching top vendors:', error);
    res.status(500).json({ error: 'Failed to fetch top vendors' });
  }
});

/**
 * GET /api/procurement/dashboard/purchases-by-category
 * Purchases Breakdown by Item Category (YTD)
 * 
 * Returns array of:
 *  - category_id, category_name, category_name_arabic
 *  - total_amount: Sum of invoice line totals
 *  - percentage: % of total purchases
 * 
 * Business Rules:
 *  - Posted invoices only
 *  - Current year only
 *  - Grouped by item category
 */
router.get('/purchases-by-category', authenticate, requirePermission('procurement:dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    // Get company base currency
    const companyResult = await pool.query(
      'SELECT base_currency_code FROM companies WHERE id = $1 AND deleted_at IS NULL',
      [companyId]
    );
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const baseCurrency = companyResult.rows[0].base_currency_code || 'SAR';

    // Get total purchases for percentage calculation
    const totalResult = await pool.query(`
      SELECT COALESCE(SUM(pii.line_total), 0) as grand_total
      FROM purchase_invoice_items pii
      JOIN purchase_invoices pi ON pii.invoice_id = pi.id
      WHERE pi.company_id = $1
        AND pi.currency_code = $2
        AND pi.is_posted = true
        AND pi.status NOT IN ('cancelled', 'draft')
        AND pi.deleted_at IS NULL
        AND pii.deleted_at IS NULL
        AND EXTRACT(YEAR FROM pi.invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [companyId, baseCurrency]);

    const grandTotal = parseFloat(totalResult.rows[0].grand_total);

    const query = `
      SELECT
        c.id as category_id,
        c.name as category_name,
        c.name_arabic as category_name_arabic,
        COALESCE(SUM(pii.line_total), 0) as total_amount,
        CASE 
          WHEN $3 > 0 THEN (COALESCE(SUM(pii.line_total), 0) / $3) * 100
          ELSE 0
        END as percentage
      FROM item_categories c
      LEFT JOIN items i ON c.id = i.category_id AND i.deleted_at IS NULL
      LEFT JOIN purchase_invoice_items pii ON i.id = pii.item_id AND pii.deleted_at IS NULL
      LEFT JOIN purchase_invoices pi ON pii.invoice_id = pi.id
        AND pi.currency_code = $2
        AND pi.is_posted = true
        AND pi.status NOT IN ('cancelled', 'draft')
        AND pi.deleted_at IS NULL
        AND EXTRACT(YEAR FROM pi.invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE c.company_id = $1
        AND c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.name_arabic
      HAVING COALESCE(SUM(pii.line_total), 0) > 0
      ORDER BY total_amount DESC
    `;

    const result = await pool.query(query, [companyId, baseCurrency, grandTotal]);

    res.json({
      data: result.rows.map(row => ({
        category_id: row.category_id,
        category_name: row.category_name,
        category_name_arabic: row.category_name_arabic,
        total_amount: parseFloat(row.total_amount),
        percentage: parseFloat(row.percentage),
      })),
      meta: {
        currency_code: baseCurrency,
        year: new Date().getFullYear(),
        grand_total: grandTotal,
      }
    });

  } catch (error) {
    console.error('Error fetching purchases by category:', error);
    res.status(500).json({ error: 'Failed to fetch purchases by category' });
  }
});

export default router;
