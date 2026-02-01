import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function computeTotals(startNumber: number, endNumber: number, usedLeaves: number, cancelledLeaves: number) {
  const totalLeaves = Math.max(0, endNumber - startNumber + 1);
  const used = Math.max(0, usedLeaves);
  const cancelled = Math.max(0, cancelledLeaves);
  const available = Math.max(0, totalLeaves - used - cancelled);
  return { totalLeaves, used, cancelled, available };
}

// =============================================
// GET /api/cheque-books
// =============================================
router.get(
  '/',
  requireAnyPermission([
    'finance:cheque_books:view',
    'finance:cheque_books:manage',
    'finance:bank_accounts:view',
    'finance:bank_accounts:manage',
    // tolerate older/front-end permission namespaces
    'master:finance:view',
    'master:finance:create',
    'master:finance:update',
    'master:finance:delete',
  ]),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId as number;

      const result = await pool.query(
        `SELECT
          cb.id,
          cb.code,
          cb.bank_account_id,
          cb.series_name,
          cb.cheque_prefix,
          cb.start_number,
          cb.end_number,
          cb.current_number,
          cb.used_leaves,
          cb.cancelled_leaves,
          cb.issue_date,
          cb.expiry_date,
          cb.status,
          cb.is_default,
          cb.notes,
          cb.created_at,
          ba.id AS bank_account_id2,
          b.name AS bank_name
         FROM cheque_books cb
         JOIN bank_accounts ba ON ba.id = cb.bank_account_id AND ba.deleted_at IS NULL
         JOIN banks b ON b.id = ba.bank_id AND b.deleted_at IS NULL
         WHERE cb.company_id = $1 AND cb.deleted_at IS NULL
         ORDER BY cb.is_default DESC, cb.created_at DESC, cb.id DESC`,
        [companyId]
      );

      const data = result.rows.map((row: any) => {
        const startNumber = Number(row.start_number);
        const endNumber = Number(row.end_number);
        const usedLeaves = toNumber(row.used_leaves);
        const cancelledLeaves = toNumber(row.cancelled_leaves);
        const totals = computeTotals(startNumber, endNumber, usedLeaves, cancelledLeaves);

        return {
          id: row.id,
          code: row.code,
          bank_account_id: row.bank_account_id,
          bank_account_code: `BA${String(row.bank_account_id).padStart(3, '0')}`,
          bank_name: row.bank_name,
          series_name: row.series_name,
          cheque_prefix: row.cheque_prefix,
          start_number: startNumber,
          end_number: endNumber,
          current_number: Number(row.current_number),
          total_leaves: totals.totalLeaves,
          used_leaves: totals.used,
          cancelled_leaves: totals.cancelled,
          available_leaves: totals.available,
          issue_date: row.issue_date,
          expiry_date: row.expiry_date,
          status: row.status,
          is_default: row.is_default,
          notes: row.notes,
          created_at: row.created_at,
        };
      });

      return res.json({ success: true, data });
    } catch (error: any) {
      // If migrations haven't run yet, avoid hard-failing the UI.
      if (String(error?.code) === '42P01') {
        return res.json({ success: true, data: [] });
      }
      console.error('Error fetching cheque books:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch cheque books' });
    }
  }
);

// =============================================
// POST /api/cheque-books
// =============================================
router.post(
  '/',
  requireAnyPermission([
    'finance:cheque_books:create',
    'finance:cheque_books:manage',
    'master:finance:create',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;

      const {
        code,
        bank_account_id,
        series_name,
        cheque_prefix,
        start_number,
        end_number,
        issue_date,
        expiry_date,
        is_default,
        notes,
      } = req.body || {};

      const bankAccountId = Number(bank_account_id);
      const startNumber = Number(start_number);
      const endNumber = Number(end_number);

      if (!code || !String(code).trim()) {
        return res.status(400).json({ success: false, error: 'code is required' });
      }
      if (!Number.isInteger(bankAccountId) || bankAccountId <= 0) {
        return res.status(400).json({ success: false, error: 'bank_account_id is required' });
      }
      if (!series_name || !String(series_name).trim()) {
        return res.status(400).json({ success: false, error: 'series_name is required' });
      }
      if (!Number.isFinite(startNumber) || startNumber < 1) {
        return res.status(400).json({ success: false, error: 'start_number must be >= 1' });
      }
      if (!Number.isFinite(endNumber) || endNumber <= startNumber) {
        return res.status(400).json({ success: false, error: 'end_number must be greater than start_number' });
      }
      if (!issue_date) {
        return res.status(400).json({ success: false, error: 'issue_date is required' });
      }

      // Ensure bank account belongs to company
      const ba = await pool.query(
        `SELECT 1 FROM bank_accounts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [bankAccountId, companyId]
      );
      if (ba.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid bank_account_id' });
      }

      const makeDefault = Boolean(is_default);
      if (makeDefault) {
        await pool.query(
          `UPDATE cheque_books
           SET is_default = false, updated_at = NOW(), updated_by = $2
           WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true`,
          [companyId, userId ?? null]
        );
      }

      const inserted = await pool.query(
        `INSERT INTO cheque_books (
          company_id,
          bank_account_id,
          code,
          series_name,
          cheque_prefix,
          start_number,
          end_number,
          current_number,
          issue_date,
          expiry_date,
          status,
          is_default,
          notes,
          created_by,
          updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10::date,$11,$12,$13,$14,$15)
        RETURNING id`,
        [
          companyId,
          bankAccountId,
          String(code).trim(),
          String(series_name).trim(),
          cheque_prefix ? String(cheque_prefix).trim().toUpperCase() : null,
          startNumber,
          endNumber,
          startNumber,
          issue_date,
          expiry_date || null,
          'active',
          makeDefault,
          notes ?? null,
          userId ?? null,
          userId ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: { id: inserted.rows[0]?.id } });
    } catch (error: any) {
      console.error('Error creating cheque book:', error);
      if (String(error?.code) === '23505') {
        return res.status(409).json({ success: false, error: 'Cheque book code already exists' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create cheque book' });
    }
  }
);

// =============================================
// PUT /api/cheque-books/:id
// =============================================
router.put(
  '/:id',
  requireAnyPermission([
    'finance:cheque_books:edit',
    'finance:cheque_books:manage',
    'master:finance:update',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const exists = await pool.query(
        `SELECT used_leaves FROM cheque_books WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [id, companyId]
      );
      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Cheque book not found' });
      }

      const usedLeaves = toNumber(exists.rows[0].used_leaves);

      const {
        series_name,
        cheque_prefix,
        start_number,
        end_number,
        issue_date,
        expiry_date,
        is_default,
        notes,
      } = req.body || {};

      const startNumber = start_number === undefined ? null : Number(start_number);
      const endNumber = end_number === undefined ? null : Number(end_number);

      // If used leaves exist, prevent changing range in ways that could invalidate.
      if (usedLeaves > 0 && (startNumber !== null || endNumber !== null)) {
        // Keep it strict and simple.
        return res.status(400).json({ success: false, error: 'Cannot change range after issuing cheques' });
      }

      const makeDefault = is_default === undefined ? null : Boolean(is_default);
      if (makeDefault) {
        await pool.query(
          `UPDATE cheque_books
           SET is_default = false, updated_at = NOW(), updated_by = $2
           WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true AND id <> $3`,
          [companyId, userId ?? null, id]
        );
      }

      await pool.query(
        `UPDATE cheque_books
         SET
           series_name = COALESCE($1, series_name),
           cheque_prefix = COALESCE($2, cheque_prefix),
           start_number = COALESCE($3, start_number),
           end_number = COALESCE($4, end_number),
           issue_date = COALESCE($5::date, issue_date),
           expiry_date = $6::date,
           is_default = COALESCE($7, is_default),
           notes = $8,
           updated_by = $9,
           updated_at = NOW()
         WHERE id = $10 AND company_id = $11 AND deleted_at IS NULL`,
        [
          series_name ? String(series_name).trim() : null,
          cheque_prefix ? String(cheque_prefix).trim().toUpperCase() : null,
          startNumber,
          endNumber,
          issue_date || null,
          expiry_date || null,
          makeDefault,
          notes ?? null,
          userId ?? null,
          id,
          companyId,
        ]
      );

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating cheque book:', error);
      return res.status(500).json({ success: false, error: 'Failed to update cheque book' });
    }
  }
);

// =============================================
// DELETE /api/cheque-books/:id (soft delete)
// =============================================
router.delete(
  '/:id',
  requireAnyPermission([
    'finance:cheque_books:delete',
    'finance:cheque_books:manage',
    'master:finance:delete',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const row = await pool.query(
        `SELECT used_leaves FROM cheque_books WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [id, companyId]
      );
      if (row.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Cheque book not found' });
      }

      if (toNumber(row.rows[0].used_leaves) > 0) {
        return res.status(400).json({ success: false, error: 'Cannot delete cheque book with issued cheques' });
      }

      await pool.query(
        `UPDATE cheque_books
         SET is_deleted = true,
             deleted_at = NOW(),
             deleted_by = $3,
             updated_at = NOW(),
             updated_by = $3
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId, userId ?? null]
      );

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting cheque book:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete cheque book' });
    }
  }
);

export default router;
