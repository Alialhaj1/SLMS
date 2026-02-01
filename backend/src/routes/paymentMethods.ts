import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();

const paymentMethodSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional().nullable(),
  payment_type: z.enum(['cash', 'bank_transfer', 'cheque', 'credit_card', 'digital_wallet', 'credit', 'other']),
  gl_account_code: z.string().max(50).optional().nullable(),
  requires_reference: z.boolean().default(false),
  requires_bank: z.boolean().default(false),
  processing_days: z.number().int().min(0).max(3650).default(0),
  transaction_fee_percent: z.number().min(0).max(100).optional().nullable(),
  transaction_fee_fixed: z.number().min(0).optional().nullable(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  description: z.string().optional().nullable(),
  company_id: z.number().int().positive().optional().nullable(),
});

const isMissingTableError = (error: any) => {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('relation') && msg.includes('payment_methods') && msg.includes('does not exist');
};

/**
 * GET /api/payment-methods
 */
router.get('/', authenticate, requirePermission('master:payment_methods:view'), async (req: Request, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { search, payment_type, is_active } = req.query;

    let query = `
      SELECT
        id,
        code,
        name,
        name_ar,
        payment_type,
        gl_account_code,
        COALESCE(requires_reference, FALSE) AS requires_reference,
        COALESCE(requires_bank, requires_bank_account, FALSE) AS requires_bank,
        COALESCE(processing_days, 0) AS processing_days,
        transaction_fee_percent,
        transaction_fee_fixed,
        COALESCE(is_default, FALSE) AS is_default,
        is_active,
        description,
        created_at
      FROM payment_methods
      WHERE deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (companyId) {
      query += ` AND (company_id = $${paramCount} OR company_id IS NULL)`;
      params.push(companyId);
      paramCount++;
    }

    if (payment_type) {
      query += ` AND payment_type = $${paramCount}`;
      params.push(payment_type);
      paramCount++;
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (code ILIKE $${paramCount} OR name ILIKE $${paramCount} OR name_ar ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY is_default DESC, code ASC`;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.json({ success: true, data: [], total: 0 });
    }

    console.error('Error fetching payment methods:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch payment methods' } });
  }
});

/**
 * POST /api/payment-methods
 */
router.post('/', authenticate, requirePermission('master:payment_methods:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id: userId, companyId, roles } = req.user!;
    const validated = paymentMethodSchema.parse(req.body);

    let targetCompanyId = validated.company_id ?? companyId ?? null;
    if (!roles.includes('super_admin') && validated.company_id && validated.company_id !== companyId) {
      return res.status(403).json({ success: false, error: { message: 'Cannot create payment method for another company' } });
    }

    await client.query('BEGIN');

    const dup = await client.query(
      `SELECT id FROM payment_methods WHERE code = $1 AND deleted_at IS NULL AND (company_id = $2 OR (company_id IS NULL AND $2 IS NULL))`,
      [validated.code, targetCompanyId]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { message: 'Payment method code already exists' } });
    }

    if (validated.is_default && targetCompanyId) {
      await client.query(`UPDATE payment_methods SET is_default = FALSE WHERE company_id = $1`, [targetCompanyId]);
    }

    const insert = await client.query(
      `
        INSERT INTO payment_methods (
          company_id, code, name, name_ar, payment_type,
          gl_account_code, requires_reference, requires_bank, processing_days,
          transaction_fee_percent, transaction_fee_fixed,
          is_default, is_active, description,
          created_by, updated_by
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11,
          $12, $13, $14,
          $15, $16
        )
        RETURNING id
      `,
      [
        targetCompanyId,
        validated.code,
        validated.name,
        validated.name_ar ?? null,
        validated.payment_type,
        validated.gl_account_code ?? null,
        validated.requires_reference,
        validated.requires_bank,
        validated.processing_days,
        validated.transaction_fee_percent ?? null,
        validated.transaction_fee_fixed ?? null,
        validated.is_default,
        validated.is_active,
        validated.description ?? null,
        userId,
        userId,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({ success: true, data: { id: insert.rows[0].id } });
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
    }

    console.error('Error creating payment method:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to create payment method' } });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/payment-methods/:id
 */
router.put('/:id', authenticate, requirePermission('master:payment_methods:edit'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id: userId, companyId, roles } = req.user!;
    const { id } = req.params;
    const validated = paymentMethodSchema.partial().parse(req.body);

    let targetCompanyId = validated.company_id ?? companyId ?? null;
    if (!roles.includes('super_admin') && validated.company_id && validated.company_id !== companyId) {
      return res.status(403).json({ success: false, error: { message: 'Cannot update payment method for another company' } });
    }

    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, company_id, is_default FROM payment_methods WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { message: 'Payment method not found' } });
    }

    const existingCompanyId = existing.rows[0].company_id;
    if (!roles.includes('super_admin') && companyId && existingCompanyId && existingCompanyId !== companyId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    if (validated.is_default && targetCompanyId) {
      await client.query(`UPDATE payment_methods SET is_default = FALSE WHERE company_id = $1`, [targetCompanyId]);
    }

    const update = await client.query(
      `
        UPDATE payment_methods
        SET
          code = COALESCE($1, code),
          name = COALESCE($2, name),
          name_ar = COALESCE($3, name_ar),
          payment_type = COALESCE($4, payment_type),
          gl_account_code = COALESCE($5, gl_account_code),
          requires_reference = COALESCE($6, requires_reference),
          requires_bank = COALESCE($7, requires_bank),
          processing_days = COALESCE($8, processing_days),
          transaction_fee_percent = COALESCE($9, transaction_fee_percent),
          transaction_fee_fixed = COALESCE($10, transaction_fee_fixed),
          is_default = COALESCE($11, is_default),
          is_active = COALESCE($12, is_active),
          description = COALESCE($13, description),
          updated_by = $14,
          updated_at = NOW()
        WHERE id = $15 AND deleted_at IS NULL
        RETURNING id
      `,
      [
        validated.code ?? null,
        validated.name ?? null,
        validated.name_ar ?? null,
        validated.payment_type ?? null,
        validated.gl_account_code ?? null,
        validated.requires_reference ?? null,
        validated.requires_bank ?? null,
        validated.processing_days ?? null,
        validated.transaction_fee_percent ?? null,
        validated.transaction_fee_fixed ?? null,
        validated.is_default ?? null,
        validated.is_active ?? null,
        validated.description ?? null,
        userId,
        id,
      ]
    );

    await client.query('COMMIT');

    return res.json({ success: true, data: { id: update.rows[0].id } });
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
    }

    console.error('Error updating payment method:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to update payment method' } });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/payment-methods/:id (soft delete)
 */
router.delete('/:id', authenticate, requirePermission('master:payment_methods:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(`SELECT id, is_default FROM payment_methods WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Payment method not found' } });
    }

    if (existing.rows[0].is_default) {
      return res.status(400).json({ success: false, error: { message: 'Default payment method cannot be deleted' } });
    }

    await pool.query(
      `UPDATE payment_methods SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return res.json({ success: true });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.json({ success: true });
    }

    console.error('Error deleting payment method:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to delete payment method' } });
  }
});

export default router;
