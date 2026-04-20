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
import { loadCompanyContext } from '../middleware/companyContext';
import { loadBranchAccess, buildBranchFilter, resolveBranchId } from '../middleware/branchAccess';
import { ApprovalWorkflowEngine } from '../services/approvalWorkflowEngine';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);
router.use(loadBranchAccess);

// ── LIST ──────────────────────────────────────────────────────────────
router.get('/', requireAnyPermission(['receipt_vouchers:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
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

    // Branch access filter
    const branchFilter = buildBranchFilter(req, 'rv', paramIdx + 1);
    if (branchFilter.clause !== '1=1') {
      query += ` AND ${branchFilter.clause}`;
      params.push(...branchFilter.params);
      paramIdx = branchFilter.nextIndex - 1;
    }
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
    const companyId = (req as any).companyId;
    const userId = (req as any).user?.id;
    const {
      customer_id, receipt_date, payment_method_id, bank_account_id, cash_register_id,
      currency_id, exchange_rate, amount, reference_number, notes, lines
    } = req.body;

    if (!customer_id || !amount || !currency_id) {
      return res.status(400).json({ error: 'Customer, amount, and currency are required' });
    }

    // Resolve branch for this document
    const { branchId: resolvedBranchId, error: branchError } = resolveBranchId(req, 'write');
    if (branchError) {
      return res.status(400).json({ error: branchError });
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
       (company_id, branch_id, voucher_number, customer_id, receipt_date, payment_method_id,
        bank_account_id, cash_register_id, currency_id, exchange_rate, amount, amount_base,
        reference_number, notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft',$15)
       RETURNING *`,
      [companyId, resolvedBranchId, voucherNumber, customer_id, receipt_date || new Date().toISOString().split('T')[0],
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

// ── SUBMIT FOR APPROVAL ───────────────────────────────────────────────
router.post('/:id/submit-for-approval', requireAnyPermission(['receipt_vouchers:create']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).companyId;

    const rv = await pool.query(
      `SELECT * FROM receipt_vouchers WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (rv.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt voucher not found' });
    }

    const voucher = rv.rows[0];
    if (voucher.status !== 'draft') {
      return res.status(400).json({ error: `Cannot submit voucher in status: ${voucher.status}` });
    }

    const result = await ApprovalWorkflowEngine.submitDocument({
      companyId: companyId || voucher.company_id,
      tenantId: (req as any).tenantId || voucher.tenant_id,
      documentType: 'receipt_voucher',
      referenceId: voucher.id,
      referenceTable: 'receipt_vouchers',
      documentNumber: voucher.voucher_number,
      title: voucher.description || `Receipt Voucher ${voucher.voucher_number}`,
      amount: parseFloat(voucher.total_amount || voucher.amount) || 0,
      currency: 'SAR',
      createdBy: userId,
      branchId: voucher.branch_id,
      notes: req.body.notes,
      priority: req.body.priority || 'normal',
      watchers: req.body.watchers,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    await pool.query(
      `UPDATE receipt_vouchers 
       SET status = 'pending_approval', approval_document_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [result.approvalDocumentId, id]
    );

    res.json({
      success: true,
      message: result.autoApproved
        ? 'Receipt voucher auto-approved and posted'
        : 'Receipt voucher submitted for approval',
      data: { approvalDocumentId: result.approvalDocumentId, autoApproved: result.autoApproved },
    });
  } catch (error) {
    console.error('Error submitting receipt voucher for approval:', error);
    res.status(500).json({ error: 'Failed to submit for approval' });
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
router.post('/:id/post', requireAnyPermission(['receipt_vouchers:post', 'receipt_vouchers:approve']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId || (req as any).companyId;
    const tenantId = (req as any).tenantId || (req as any).companyContext?.tenant_id || null;

    await client.query('BEGIN');

    // Get the voucher — allow 'draft' or 'approved'
    const rvResult = await client.query(
      `SELECT rv.*, c.code as currency_code
       FROM receipt_vouchers rv
       LEFT JOIN currencies c ON c.id = rv.currency_id
       WHERE rv.id = $1 AND rv.deleted_at IS NULL AND rv.status IN ('draft', 'approved')`,
      [id]
    );
    if (rvResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot post — voucher must be draft or approved' });
    }
    const rv = rvResult.rows[0];

    // If already has a journal entry, just post it
    if (rv.journal_entry_id) {
      const postResult = await client.query(
        `SELECT post_journal_entry($1, $2) as success`,
        [rv.journal_entry_id, userId]
      );
      if (!postResult.rows[0]?.success) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Failed to post journal entry' });
      }
      await client.query(
        `UPDATE receipt_vouchers SET status = 'posted', posted_by = $2, posted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id, userId]
      );
      await client.query('COMMIT');
      return res.json({ success: true, data: { id: rv.id, journal_entry_id: rv.journal_entry_id } });
    }

    // Resolve customer receivable account
    const custResult = await client.query(
      `SELECT c.receivable_account_id FROM customers c WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [rv.customer_id]
    );
    const receivableAccountId = custResult.rows[0]?.receivable_account_id;

    // Fallback to default AR_TRADE account
    let debitAccountId: number | null = receivableAccountId || null;
    if (!debitAccountId) {
      const defaultAR = await client.query(
        `SELECT account_id FROM default_accounts WHERE company_id = $1 AND account_key = 'AR_TRADE' LIMIT 1`,
        [rv.company_id]
      );
      debitAccountId = defaultAR.rows[0]?.account_id || null;
    }

    // Resolve cash/bank credit account
    let creditAccountId: number | null = null;
    if (rv.cash_register_id) {
      const cb = await client.query(
        `SELECT gl_account_id FROM cash_boxes WHERE id = $1 AND deleted_at IS NULL`,
        [rv.cash_register_id]
      );
      creditAccountId = cb.rows[0]?.gl_account_id || null;
    }
    if (!creditAccountId && rv.bank_account_id) {
      const ba = await client.query(
        `SELECT gl_account_id FROM bank_accounts WHERE id = $1 AND deleted_at IS NULL`,
        [rv.bank_account_id]
      );
      creditAccountId = ba.rows[0]?.gl_account_id || null;
    }

    // Fallback: use default CASH account
    if (!creditAccountId) {
      const defaultCash = await client.query(
        `SELECT account_id FROM default_accounts WHERE company_id = $1 AND account_key = 'CASH' LIMIT 1`,
        [rv.company_id]
      );
      creditAccountId = defaultCash.rows[0]?.account_id || null;
    }

    if (!debitAccountId || !creditAccountId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot post — missing receivable or cash/bank GL account' });
    }

    // Fiscal period
    const receiptDate = rv.receipt_date || new Date().toISOString().split('T')[0];
    const fiscalInfo = await client.query(
      `SELECT fy.id as fiscal_year_id, ap.id as period_id
       FROM fiscal_years fy
       JOIN accounting_periods ap ON ap.fiscal_year_id = fy.id
       WHERE fy.company_id = $1 AND $2::date BETWEEN ap.start_date AND ap.end_date
       LIMIT 1`,
      [rv.company_id, receiptDate]
    );

    if (fiscalInfo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No open accounting period found for this date' });
    }

    const exchangeRate = parseFloat(rv.exchange_rate) || 1;
    const amount = parseFloat(rv.amount) || 0;
    const amountBase = parseFloat(rv.amount_base) || amount * exchangeRate;

    // Generate journal entry number with SAVEPOINT
    let jeNumber: string;
    try {
      await client.query('SAVEPOINT gen_rv_je');
      const numResult = await client.query(
        `SELECT generate_document_number($1, 'journal_entry', $2, NULL, NULL, $3::date) as number`,
        [rv.company_id, userId, receiptDate]
      );
      jeNumber = numResult.rows[0]?.number || `JE-RV-${Date.now()}`;
      await client.query('RELEASE SAVEPOINT gen_rv_je');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT gen_rv_je');
      jeNumber = `JE-RV-${Date.now()}`;
    }

    const description = `Receipt Voucher ${rv.voucher_number}`;

    // Create journal entry — Debit Cash/Bank, Credit Receivable
    const header = await client.query(
      `INSERT INTO journal_entries (
        tenant_id, company_id, branch_id, entry_number, entry_date,
        fiscal_year_id, period_id,
        entry_type,
        source_document_type, source_document_number,
        currency_id, exchange_rate,
        total_debit, total_credit, total_debit_fc, total_credit_fc,
        description, status, created_by, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft',$18,NOW())
      RETURNING id`,
      [
        tenantId, rv.company_id, rv.branch_id, jeNumber, receiptDate,
        fiscalInfo.rows[0].fiscal_year_id, fiscalInfo.rows[0].period_id,
        'receipt_voucher', 'receipt_voucher', rv.voucher_number,
        rv.currency_id, exchangeRate,
        amountBase, amountBase, amount !== amountBase ? amount : 0, amount !== amountBase ? amount : 0,
        description, userId,
      ]
    );
    const journalId = header.rows[0].id;

    // Line 1: Debit Cash/Bank (asset increases)
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, line_number, account_id, debit_amount, credit_amount, fc_debit_amount, fc_credit_amount, currency_id, exchange_rate, description)
       VALUES ($1, 1, $2, $3, 0, $4, 0, $5, $6, $7)`,
      [journalId, creditAccountId, amountBase, amount !== amountBase ? amount : 0, rv.currency_id, exchangeRate, description]
    );

    // Line 2: Credit Receivable (reduces customer debt)
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, line_number, account_id, debit_amount, credit_amount, fc_debit_amount, fc_credit_amount, currency_id, exchange_rate, description)
       VALUES ($1, 2, $2, 0, $3, 0, $4, $5, $6, $7)`,
      [journalId, debitAccountId, amountBase, amount !== amountBase ? amount : 0, rv.currency_id, exchangeRate, description]
    );

    // Post the journal entry to GL
    await client.query(`SELECT post_journal_entry($1, $2)`, [journalId, userId]);

    // Update receipt voucher
    await client.query(
      `UPDATE receipt_vouchers SET 
        status = 'posted', journal_entry_id = $2, posted_by = $3, posted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id, journalId, userId]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: { id: rv.id, journal_entry_id: journalId } });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error posting receipt voucher:', error);
    res.status(500).json({ error: 'Failed to post receipt voucher' });
  } finally {
    client.release();
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
