/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ZATCA E-INVOICING SUBMISSIONS ROUTES                                      ║
 * ║  Phase 4 — Module F-05 — ZATCA Phase 2 Compliance                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// ── LIST SUBMISSIONS ──────────────────────────────────────────────────
router.get('/', requireAnyPermission(['zatca:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { response_status, submission_type, search, page = '1', limit = '50' } = req.query;

    let query = `
      SELECT zs.*
      FROM zatca_submissions zs
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 0;

    if (companyId) { params.push(companyId); query += ` AND zs.company_id = $${++paramIdx}`; }
    if (response_status) { params.push(response_status); query += ` AND zs.response_status = $${++paramIdx}`; }
    if (submission_type) { params.push(submission_type); query += ` AND zs.submission_type = $${++paramIdx}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (zs.invoice_number ILIKE $${++paramIdx})`;
    }

    const countQuery = query.replace(/SELECT zs\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    params.push(parseInt(limit as string));
    query += ` ORDER BY zs.created_at DESC LIMIT $${++paramIdx}`;
    params.push(offset);
    query += ` OFFSET $${++paramIdx}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total });
  } catch (error) {
    console.error('Error fetching ZATCA submissions:', error);
    res.status(500).json({ error: 'Failed to fetch ZATCA submissions' });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────
router.get('/:id', requireAnyPermission(['zatca:view']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM zatca_submissions WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching ZATCA submission:', error);
    res.status(500).json({ error: 'Failed to fetch ZATCA submission' });
  }
});

// ── SUBMIT INVOICE TO ZATCA ───────────────────────────────────────────
router.post('/submit', requireAnyPermission(['zatca:submit']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.id;
    const { invoice_id, submission_type } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    await client.query('BEGIN');

    // Get invoice details
    let invoice: any = null;
    try {
      const invoiceResult = await client.query(
        `SELECT * FROM sales_invoices WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [invoice_id, companyId]
      );
      invoice = invoiceResult.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Generate hash (placeholder — real implementation needs crypto)
    const hashValue = `SHA256:${Date.now()}:${invoice_id}`;
    
    // Get previous hash for chain
    const prevResult = await client.query(
      `SELECT hash_value FROM zatca_submissions 
       WHERE company_id = $1 AND response_status IN ('cleared', 'reported')
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    );
    const previousHash = prevResult.rows[0]?.hash_value || '0';

    // Generate QR code (placeholder TLV)
    const qrCode = Buffer.from(JSON.stringify({
      seller: companyId,
      timestamp: new Date().toISOString(),
      total: invoice.total_amount,
      vat: invoice.vat_amount,
      hash: hashValue
    })).toString('base64');

    const subType = submission_type || (invoice.transaction_type === 'b2b' ? 'clearance' : 'reporting');

    const result = await client.query(
      `INSERT INTO zatca_submissions 
       (company_id, invoice_id, invoice_number, submission_type, 
        hash_value, previous_invoice_hash, qr_code,
        response_status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)
       RETURNING *`,
      [companyId, invoice_id, invoice.invoice_number || `INV-${invoice_id}`, subType,
       hashValue, previousHash, qrCode, userId]
    );

    // Update invoice ZATCA fields
    try {
      await client.query(
        `UPDATE sales_invoices SET 
          zatca_hash = $2, zatca_qr = $3, zatca_status = 'pending', zatca_submission_date = NOW()
         WHERE id = $1`,
        [invoice_id, hashValue, qrCode]
      );
    } catch (e) { /* columns may not exist yet */ }

    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting to ZATCA:', error);
    res.status(500).json({ error: 'Failed to submit to ZATCA' });
  } finally {
    client.release();
  }
});

// ── RETRY SUBMISSION ──────────────────────────────────────────────────
router.post('/:id/retry', requireAnyPermission(['zatca:retry']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const check = await pool.query(
      'SELECT * FROM zatca_submissions WHERE id = $1 AND response_status IN ($2, $3, $4)',
      [id, 'rejected', 'error', 'timeout']
    );
    if (check.rows.length === 0) {
      return res.status(400).json({ error: 'Only failed submissions can be retried' });
    }

    const submission = check.rows[0];
    if (submission.retry_count >= submission.max_retries) {
      return res.status(400).json({ error: 'Maximum retry attempts reached' });
    }

    await pool.query(
      `UPDATE zatca_submissions SET 
        response_status = 'pending', retry_count = retry_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Submission queued for retry' });
  } catch (error) {
    console.error('Error retrying ZATCA submission:', error);
    res.status(500).json({ error: 'Failed to retry submission' });
  }
});

// ── DASHBOARD / STATS ─────────────────────────────────────────────────
router.get('/stats/summary', requireAnyPermission(['zatca:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    
    const result = await pool.query(
      `SELECT 
        COUNT(*) AS total_submissions,
        COUNT(*) FILTER (WHERE response_status = 'cleared') AS cleared,
        COUNT(*) FILTER (WHERE response_status = 'reported') AS reported,
        COUNT(*) FILTER (WHERE response_status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE response_status IN ('rejected', 'error')) AS failed,
        COUNT(*) FILTER (WHERE response_status = 'warning') AS warnings
       FROM zatca_submissions WHERE company_id = $1`,
      [companyId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching ZATCA stats:', error);
    res.status(500).json({ error: 'Failed to fetch ZATCA stats' });
  }
});

export default router;
