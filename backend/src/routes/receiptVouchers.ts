/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  RECEIPT VOUCHERS ROUTES                                                   ║
 * ║  Phase 4 — Module F-04 — Customer Collections                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// ── LIST ──────────────────────────────────────────────────────────────
router.get('/', requireAnyPermission(['receipt_vouchers:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { status, customer_id, search, from_date, to_date, page = '1', limit = '50' } = req.query;

    let query = `
      SELECT rv.*,
             c.code AS currency_code,
             pm.name_en AS payment_method_name,
             ba.account_number AS bank_account_number, ba.bank_name AS bank_name,
             u.email AS created_by_email
      FROM receipt_vouchers rv
      LEFT JOIN currencies c ON c.id = rv.currency_id
      LEFT JOIN payment_methods pm ON pm.id = rv.payment_method_id
      LEFT JOIN bank_accounts ba ON ba.id = rv.bank_account_id
      LEFT JOIN users u ON u.id = rv.created_by
      WHERE rv.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIdx = 0;

    if (companyId) { params.push(companyId); query += ` AND rv.company_id = $${++paramIdx}`; }
    if (status) { params.push(status); query += ` AND rv.status = $${++paramIdx}`; }
    if (customer_id) { params.push(customer_id); query += ` AND rv.customer_id = $${++paramIdx}`; }
    if (from_date) { params.push(from_date); query += ` AND rv.receipt_date >= $${++paramIdx}`; }
    if (to_date) { params.push(to_date); query += ` AND rv.receipt_date <= $${++paramIdx}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (rv.voucher_number ILIKE $${++paramIdx} OR rv.reference_number ILIKE $${paramIdx})`;
    }

    // Count
    const countQuery = query.replace(/SELECT rv\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Paginate
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    params.push(parseInt(limit as string));
    query += ` ORDER BY rv.receipt_date DESC, rv.created_at DESC LIMIT $${++paramIdx}`;
    params.push(offset);
    query += ` OFFSET $${++paramIdx}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    console.error('Error fetching receipt vouchers:', error);
    res.status(500).json({ error: 'Failed to fetch receipt vouchers' });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────
router.get('/:id', requireAnyPermission(['receipt_vouchers:view']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT rv.*,
              c.code AS currency_code,
              pm.name_en AS payment_method_name, pm.code AS payment_method_code,
              ba.account_number AS bank_account_number, ba.bank_name AS bank_name
       FROM receipt_vouchers rv
       LEFT JOIN currencies c ON c.id = rv.currency_id
       LEFT JOIN payment_methods pm ON pm.id = rv.payment_method_id
       LEFT JOIN bank_accounts ba ON ba.id = rv.bank_account_id
       WHERE rv.id = $1 AND rv.deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt voucher not found' });
    }

    // Fetch lines
    const lines = await pool.query(
      'SELECT * FROM receipt_voucher_lines WHERE receipt_voucher_id = $1 ORDER BY id',
      [id]
    );

    res.json({ data: { ...result.rows[0], lines: lines.rows } });
  } catch (error) {
    console.error('Error fetching receipt voucher:', error);
    res.status(500).json({ error: 'Failed to fetch receipt voucher' });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────
router.post('/', requireAnyPermission(['receipt_vouchers:create']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.id;
    const {
      customer_id, receipt_date, payment_method_id, bank_account_id, cash_register_id,
      currency_id, exchange_rate, amount, reference_number, notes, lines
    } = req.body;

    if (!customer_id || !amount || !currency_id) {
      return res.status(400).json({ error: 'Customer, amount, and currency are required' });
    }

    await client.query('BEGIN');

    // Generate voucher number
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(voucher_number, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1 AS next_num
       FROM receipt_vouchers WHERE company_id = $1`,
      [companyId]
    );
    const nextNum = seqResult.rows[0]?.next_num || 1;
    const voucherNumber = `RV-${new Date().getFullYear()}-${String(nextNum).padStart(5, '0')}`;

    const amountBase = amount * (exchange_rate || 1);

    const result = await client.query(
      `INSERT INTO receipt_vouchers 
       (company_id, voucher_number, customer_id, receipt_date, payment_method_id,
        bank_account_id, cash_register_id, currency_id, exchange_rate, amount, amount_base,
        reference_number, notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft',$14)
       RETURNING *`,
      [companyId, voucherNumber, customer_id, receipt_date || new Date().toISOString().split('T')[0],
       payment_method_id, bank_account_id, cash_register_id, currency_id,
       exchange_rate || 1, amount, amountBase, reference_number, notes, userId]
    );

    const voucherId = result.rows[0].id;

    // Insert lines if provided
    if (lines && Array.isArray(lines) && lines.length > 0) {
      for (const line of lines) {
        await client.query(
          `INSERT INTO receipt_voucher_lines 
           (receipt_voucher_id, invoice_id, invoice_number, invoice_amount, amount_paid, discount_amount, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [voucherId, line.invoice_id, line.invoice_number, line.invoice_amount,
           line.amount_paid, line.discount_amount || 0, line.notes]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Voucher number already exists' });
    }
    console.error('Error creating receipt voucher:', error);
    res.status(500).json({ error: 'Failed to create receipt voucher' });
  } finally {
    client.release();
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────
router.put('/:id', requireAnyPermission(['receipt_vouchers:edit']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const {
      customer_id, receipt_date, payment_method_id, bank_account_id, cash_register_id,
      currency_id, exchange_rate, amount, reference_number, notes
    } = req.body;

    // Only drafts can be edited
    const check = await pool.query('SELECT status FROM receipt_vouchers WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (check.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft vouchers can be edited' });
    }

    const result = await pool.query(
      `UPDATE receipt_vouchers SET
        customer_id = COALESCE($2, customer_id),
        receipt_date = COALESCE($3, receipt_date),
        payment_method_id = COALESCE($4, payment_method_id),
        bank_account_id = $5,
        cash_register_id = $6,
        currency_id = COALESCE($7, currency_id),
        exchange_rate = COALESCE($8, exchange_rate),
        amount = COALESCE($9, amount),
        reference_number = $10,
        notes = $11,
        updated_by = $12,
        updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, customer_id, receipt_date, payment_method_id, bank_account_id, cash_register_id,
       currency_id, exchange_rate, amount, reference_number, notes, userId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating receipt voucher:', error);
    res.status(500).json({ error: 'Failed to update receipt voucher' });
  }
});

// ── APPROVE ───────────────────────────────────────────────────────────
router.post('/:id/approve', requireAnyPermission(['receipt_vouchers:approve']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const result = await pool.query(
      `UPDATE receipt_vouchers SET 
        status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'draft' AND deleted_at IS NULL
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot approve — voucher is not in draft status' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error approving receipt voucher:', error);
    res.status(500).json({ error: 'Failed to approve receipt voucher' });
  }
});

// ── POST TO GL ────────────────────────────────────────────────────────
router.post('/:id/post', requireAnyPermission(['receipt_vouchers:post']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const result = await pool.query(
      `UPDATE receipt_vouchers SET 
        status = 'posted', posted_by = $2, posted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot post — voucher must be approved first' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error posting receipt voucher:', error);
    res.status(500).json({ error: 'Failed to post receipt voucher' });
  }
});

// ── REVERSE ───────────────────────────────────────────────────────────
router.post('/:id/reverse', requireAnyPermission(['receipt_vouchers:reverse']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE receipt_vouchers SET 
        status = 'reversed', reversed_by = $2, reversed_at = NOW(), 
        reversal_reason = $3, updated_at = NOW()
       WHERE id = $1 AND status = 'posted' AND deleted_at IS NULL
       RETURNING *`,
      [id, userId, reason || 'Reversed']
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot reverse — voucher must be posted first' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error reversing receipt voucher:', error);
    res.status(500).json({ error: 'Failed to reverse receipt voucher' });
  }
});

// ── DELETE ─────────────────────────────────────────────────────────────
router.delete('/:id', requireAnyPermission(['receipt_vouchers:delete']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT status FROM receipt_vouchers WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (check.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft vouchers can be deleted' });
    }

    await pool.query('UPDATE receipt_vouchers SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'Receipt voucher deleted' });
  } catch (error) {
    console.error('Error deleting receipt voucher:', error);
    res.status(500).json({ error: 'Failed to delete receipt voucher' });
  }
});

export default router;
