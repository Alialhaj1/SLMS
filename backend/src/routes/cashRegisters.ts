/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  CASH REGISTERS / PETTY CASH ROUTES                                       ║
 * ║  Phase 4 — Module C-02                                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// ── LIST ──────────────────────────────────────────────────────────────
router.get('/', requireAnyPermission(['cash_registers:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { branch_id, is_active, search } = req.query;

    let query = `
      SELECT cr.*, 
             b.name AS branch_name, b.code AS branch_code,
             c.code AS currency_code, c.name_en AS currency_name,
             a.code AS gl_account_code
      FROM cash_registers cr
      LEFT JOIN branches b ON b.id = cr.branch_id
      LEFT JOIN currencies c ON c.id = cr.currency_id
      LEFT JOIN accounts a ON a.id = cr.gl_account_id
      WHERE cr.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIdx = 0;

    if (companyId) {
      params.push(companyId);
      query += ` AND cr.company_id = $${++paramIdx}`;
    }
    if (branch_id) {
      params.push(branch_id);
      query += ` AND cr.branch_id = $${++paramIdx}`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND cr.is_active = $${++paramIdx}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (cr.code ILIKE $${++paramIdx} OR cr.name_ar ILIKE $${paramIdx} OR cr.name_en ILIKE $${paramIdx} OR cr.custodian_name ILIKE $${paramIdx})`;
    }

    query += ' ORDER BY cr.code';

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error) {
    console.error('Error fetching cash registers:', error);
    res.status(500).json({ error: 'Failed to fetch cash registers' });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────
router.get('/:id', requireAnyPermission(['cash_registers:view']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT cr.*, 
              b.name AS branch_name, b.code AS branch_code,
              c.code AS currency_code,
              a.code AS gl_account_code
       FROM cash_registers cr
       LEFT JOIN branches b ON b.id = cr.branch_id
       LEFT JOIN currencies c ON c.id = cr.currency_id
       LEFT JOIN accounts a ON a.id = cr.gl_account_id
       WHERE cr.id = $1 AND cr.deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash register not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching cash register:', error);
    res.status(500).json({ error: 'Failed to fetch cash register' });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────
router.post('/', requireAnyPermission(['cash_registers:create']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.id;
    const {
      branch_id, gl_account_id, currency_id, code, name_ar, name_en,
      custodian_name, max_amount, replenishment_threshold, current_balance,
      is_pos, is_active
    } = req.body;

    if (!code || !name_ar || !custodian_name || !branch_id) {
      return res.status(400).json({ error: 'Code, name, custodian, and branch are required' });
    }

    const result = await pool.query(
      `INSERT INTO cash_registers 
       (company_id, branch_id, gl_account_id, currency_id, code, name_ar, name_en,
        custodian_name, max_amount, replenishment_threshold, current_balance,
        is_pos, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [companyId, branch_id, gl_account_id, currency_id, code, name_ar, name_en,
       custodian_name, max_amount || 10000, replenishment_threshold || 2000,
       current_balance || 0, is_pos || false, is_active !== false, userId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Cash register code already exists' });
    }
    console.error('Error creating cash register:', error);
    res.status(500).json({ error: 'Failed to create cash register' });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────
router.put('/:id', requireAnyPermission(['cash_registers:edit']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const {
      branch_id, gl_account_id, currency_id, code, name_ar, name_en,
      custodian_name, max_amount, replenishment_threshold,
      is_pos, is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE cash_registers SET
        branch_id = COALESCE($2, branch_id),
        gl_account_id = COALESCE($3, gl_account_id),
        currency_id = COALESCE($4, currency_id),
        code = COALESCE($5, code),
        name_ar = COALESCE($6, name_ar),
        name_en = COALESCE($7, name_en),
        custodian_name = COALESCE($8, custodian_name),
        max_amount = COALESCE($9, max_amount),
        replenishment_threshold = COALESCE($10, replenishment_threshold),
        is_pos = COALESCE($11, is_pos),
        is_active = COALESCE($12, is_active),
        updated_by = $13,
        updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, branch_id, gl_account_id, currency_id, code, name_ar, name_en,
       custodian_name, max_amount, replenishment_threshold, is_pos, is_active, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash register not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating cash register:', error);
    res.status(500).json({ error: 'Failed to update cash register' });
  }
});

// ── DELETE (soft) ─────────────────────────────────────────────────────
router.delete('/:id', requireAnyPermission(['cash_registers:delete']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE cash_registers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash register not found' });
    }
    res.json({ message: 'Cash register deleted' });
  } catch (error) {
    console.error('Error deleting cash register:', error);
    res.status(500).json({ error: 'Failed to delete cash register' });
  }
});

// ── TRANSACTIONS ──────────────────────────────────────────────────────
router.get('/:id/transactions', requireAnyPermission(['cash_registers:view']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM cash_register_transactions 
       WHERE cash_register_id = $1 AND deleted_at IS NULL 
       ORDER BY created_at DESC LIMIT 100`,
      [id]
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ── RECORD TRANSACTION ────────────────────────────────────────────────
router.post('/:id/transactions', requireAnyPermission(['cash_registers:transact']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.id;
    const { transaction_type, amount, description, reference_type, reference_id } = req.body;

    await client.query('BEGIN');

    // Get current balance
    const regResult = await client.query(
      'SELECT current_balance, max_amount FROM cash_registers WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [id]
    );
    if (regResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cash register not found' });
    }

    const currentBalance = parseFloat(regResult.rows[0].current_balance);
    const maxAmount = parseFloat(regResult.rows[0].max_amount);
    let newBalance: number;

    if (['expense', 'deposit'].includes(transaction_type)) {
      newBalance = currentBalance - Math.abs(amount);
      if (newBalance < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient cash balance' });
      }
    } else {
      newBalance = currentBalance + Math.abs(amount);
      if (newBalance > maxAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Exceeds maximum amount (${maxAmount})` });
      }
    }

    // Insert transaction
    const txnResult = await client.query(
      `INSERT INTO cash_register_transactions 
       (company_id, cash_register_id, transaction_type, amount, balance_before, balance_after,
        description, reference_type, reference_id, transaction_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_DATE,$10)
       RETURNING *`,
      [companyId, id, transaction_type, amount, currentBalance, newBalance,
       description, reference_type, reference_id, userId]
    );

    // Update balance
    await client.query(
      'UPDATE cash_registers SET current_balance = $2, updated_at = NOW() WHERE id = $1',
      [id, newBalance]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: txnResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording transaction:', error);
    res.status(500).json({ error: 'Failed to record transaction' });
  } finally {
    client.release();
  }
});

export default router;
