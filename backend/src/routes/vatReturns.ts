/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  VAT RETURNS ROUTES                                                        ║
 * ║  Phase 4 — Module G-05 — ZATCA VAT Return Filing                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ── LIST ──────────────────────────────────────────────────────────────
router.get('/', requireAnyPermission(['vat_returns:view']), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { status, year, page = '1', limit = '20' } = req.query;

    let query = `
      SELECT vr.*,
             ap.name AS period_name,
             u.email AS prepared_by_email
      FROM vat_returns vr
      LEFT JOIN accounting_periods ap ON ap.id = vr.period_id
      LEFT JOIN users u ON u.id = vr.prepared_by
      WHERE vr.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIdx = 0;

    // Company filter is mandatory for tenant isolation
    if (companyId) {
      params.push(companyId);
      query += ` AND vr.company_id = $${++paramIdx}`;
    } else {
      return res.json({ data: [], total: 0 });
    }
    if (status) { params.push(status); query += ` AND vr.status = $${++paramIdx}`; }
    if (year) {
      params.push(`${year}-01-01`);
      query += ` AND vr.period_start >= $${++paramIdx}`;
      params.push(`${year}-12-31`);
      query += ` AND vr.period_end <= $${++paramIdx}`;
    }

    const countQuery = query.replace(/SELECT vr\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    params.push(parseInt(limit as string));
    query += ` ORDER BY vr.period_start DESC LIMIT $${++paramIdx}`;
    params.push(offset);
    query += ` OFFSET $${++paramIdx}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total });
  } catch (error) {
    console.error('Error fetching VAT returns:', error);
    res.status(500).json({ error: 'Failed to fetch VAT returns' });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────
router.get('/:id', requireAnyPermission(['vat_returns:view']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT vr.* FROM vat_returns vr WHERE vr.id = $1 AND vr.deleted_at IS NULL`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'VAT return not found' });

    const lines = await pool.query(
      'SELECT * FROM vat_return_lines WHERE vat_return_id = $1 ORDER BY line_type, source_date', [id]
    );

    res.json({ data: { ...result.rows[0], lines: lines.rows } });
  } catch (error) {
    console.error('Error fetching VAT return:', error);
    res.status(500).json({ error: 'Failed to fetch VAT return' });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────
router.post('/', requireAnyPermission(['vat_returns:create']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.id;
    const { period_start, period_end, filing_due_date, period_id } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'Period start and end dates are required' });
    }

    await client.query('BEGIN');

    // Generate return number
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(return_number, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1 AS next_num
       FROM vat_returns WHERE company_id = $1`,
      [companyId]
    );
    const nextNum = seqResult.rows[0]?.next_num || 1;
    const returnNumber = `VAT-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

    // Calculate VAT output from sales invoices
    let standardSales = 0, vatOutput = 0, zeroSales = 0, exemptSales = 0;
    try {
      const salesResult = await client.query(
        `SELECT COALESCE(SUM(subtotal), 0) AS total_sales,
                COALESCE(SUM(vat_amount), 0) AS total_vat
         FROM sales_invoices 
         WHERE company_id = $1 AND invoice_date >= $2 AND invoice_date <= $3 
         AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL`,
        [companyId, period_start, period_end]
      );
      standardSales = parseFloat(salesResult.rows[0].total_sales) || 0;
      vatOutput = parseFloat(salesResult.rows[0].total_vat) || 0;
    } catch (e) { /* table may not exist yet */ }

    // Calculate VAT input from purchase invoices
    let standardPurchases = 0, vatInput = 0;
    try {
      const purchaseResult = await client.query(
        `SELECT COALESCE(SUM(subtotal), 0) AS total_purchases,
                COALESCE(SUM(vat_amount), 0) AS total_vat
         FROM purchase_invoices
         WHERE company_id = $1 AND invoice_date >= $2 AND invoice_date <= $3
         AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL`,
        [companyId, period_start, period_end]
      );
      standardPurchases = parseFloat(purchaseResult.rows[0].total_purchases) || 0;
      vatInput = parseFloat(purchaseResult.rows[0].total_vat) || 0;
    } catch (e) { /* table may not exist yet */ }

    const netVatDue = vatOutput - vatInput;

    const result = await client.query(
      `INSERT INTO vat_returns 
       (company_id, return_number, period_id, period_start, period_end, filing_due_date,
        standard_rated_sales, standard_vat_output, zero_rated_sales, exempt_sales, total_vat_output,
        standard_rated_purchases, standard_vat_input, total_vat_input,
        net_vat_due, total_due, status, prepared_by, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'draft',$17,$17)
       RETURNING *`,
      [companyId, returnNumber, period_id, period_start, period_end, filing_due_date,
       standardSales, vatOutput, zeroSales, exemptSales, vatOutput,
       standardPurchases, vatInput, vatInput,
       netVatDue, netVatDue, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating VAT return:', error);
    res.status(500).json({ error: 'Failed to create VAT return' });
  } finally {
    client.release();
  }
});

// ── APPROVE ───────────────────────────────────────────────────────────
router.post('/:id/approve', requireAnyPermission(['vat_returns:approve']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const result = await pool.query(
      `UPDATE vat_returns SET status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status IN ('draft', 'review') AND deleted_at IS NULL RETURNING *`,
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Cannot approve' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error approving VAT return:', error);
    res.status(500).json({ error: 'Failed to approve VAT return' });
  }
});

// ── SUBMIT TO ZATCA ───────────────────────────────────────────────────
router.post('/:id/submit', requireAnyPermission(['vat_returns:submit']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { zatca_reference } = req.body;
    const result = await pool.query(
      `UPDATE vat_returns SET status = 'submitted', submitted_at = NOW(), 
       zatca_reference = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL RETURNING *`,
      [id, zatca_reference]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Cannot submit — must be approved' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting VAT return:', error);
    res.status(500).json({ error: 'Failed to submit VAT return' });
  }
});

// ── RECORD PAYMENT ────────────────────────────────────────────────────
router.post('/:id/pay', requireAnyPermission(['vat_returns:pay']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_reference } = req.body;
    const result = await pool.query(
      `UPDATE vat_returns SET status = 'paid', paid_at = NOW(), 
       payment_reference = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'submitted' AND deleted_at IS NULL RETURNING *`,
      [id, payment_reference]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Cannot record payment' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error recording VAT payment:', error);
    res.status(500).json({ error: 'Failed to record VAT payment' });
  }
});

// ── DELETE ─────────────────────────────────────────────────────────────
router.delete('/:id', requireAnyPermission(['vat_returns:edit']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT status FROM vat_returns WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!['draft', 'review'].includes(check.rows[0].status)) {
      return res.status(400).json({ error: 'Only draft returns can be deleted' });
    }
    await pool.query('UPDATE vat_returns SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'VAT return deleted' });
  } catch (error) {
    console.error('Error deleting VAT return:', error);
    res.status(500).json({ error: 'Failed to delete VAT return' });
  }
});

export default router;
