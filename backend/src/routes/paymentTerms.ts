/**
 * 💳 PAYMENT TERMS ROUTES — Enterprise Edition (B-13)
 * =====================================================
 *
 * Full CRUD + stats + filters for EnterpriseMasterPage.
 * Supports: Net 30/60/90, installment plans, early payment discounts,
 * advance payments, penalty rates.
 *
 * API: /api/payment-terms
 * DB:  payment_terms + payment_term_lines (migration 341)
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission } from '../middleware/rbac';
import logger from '../utils/logger';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ════════════════════════════════════════════════════════════════════════
// STATS — GET /api/payment-terms/stats
// ════════════════════════════════════════════════════════════════════════
router.get('/stats', requirePermission('payment_terms:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;

    const result = await pool.query(`
      SELECT
        COUNT(*)::int                                                    AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int                    AS active,
        COUNT(*) FILTER (WHERE is_active = false)::int                   AS inactive,
        COUNT(*) FILTER (WHERE is_installment = true)::int               AS installment,
        COUNT(*) FILTER (WHERE requires_advance = true)::int             AS with_advance,
        COUNT(*) FILTER (WHERE early_payment_discount_pct > 0)::int      AS with_early_discount,
        COUNT(*) FILTER (WHERE penalty_pct_per_month > 0)::int           AS with_penalty
      FROM payment_terms
      WHERE deleted_at IS NULL
        AND (company_id = $1 OR company_id IS NULL OR $1::int IS NULL)
    `, [companyId]);

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching payment terms stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// FILTERS — GET /api/payment-terms/filters
// ════════════════════════════════════════════════════════════════════════
router.get('/filters', requirePermission('payment_terms:view'), async (req: Request, res: Response) => {
  try {
    res.json({
      due_calculation: [
        { id: 'from_invoice_date', name_en: 'From Invoice Date', name_ar: 'من تاريخ الفاتورة' },
        { id: 'from_month_end', name_en: 'From Month End', name_ar: 'من نهاية الشهر' },
        { id: 'from_delivery_date', name_en: 'From Delivery Date', name_ar: 'من تاريخ التسليم' },
        { id: 'specific_day', name_en: 'Specific Day', name_ar: 'يوم محدد' },
      ],
    });
  } catch (error) {
    logger.error('Error fetching payment terms filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// LIST — GET /api/payment-terms
// ════════════════════════════════════════════════════════════════════════
router.get('/', requirePermission('payment_terms:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const {
      page = '1',
      limit = '25',
      search,
      sortBy = 'days',
      sortOrder = 'asc',
      is_active,
      is_installment,
      due_calculation,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    const allowedSorts: Record<string, string> = {
      code: 'pt.code',
      name: 'COALESCE(pt.name_en, pt.name)',
      days: 'pt.days',
      is_active: 'pt.is_active',
      is_installment: 'pt.is_installment',
      due_calculation: 'pt.due_calculation',
      created_at: 'pt.created_at',
    };
    const sortCol = allowedSorts[sortBy] || 'pt.days';
    const sortDir = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const conditions: string[] = ['pt.deleted_at IS NULL'];
    const params: any[] = [];
    let paramIdx = 1;

    conditions.push(`(pt.company_id = $${paramIdx} OR pt.company_id IS NULL OR $${paramIdx}::int IS NULL)`);
    params.push(companyId);
    paramIdx++;

    if (search) {
      conditions.push(`(
        pt.code ILIKE $${paramIdx}
        OR pt.name ILIKE $${paramIdx}
        OR COALESCE(pt.name_en, '') ILIKE $${paramIdx}
        OR COALESCE(pt.name_ar, '') ILIKE $${paramIdx}
      )`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (is_active !== undefined && is_active !== '') {
      conditions.push(`pt.is_active = $${paramIdx}`);
      params.push(is_active === 'true');
      paramIdx++;
    }

    if (is_installment !== undefined && is_installment !== '') {
      conditions.push(`pt.is_installment = $${paramIdx}`);
      params.push(is_installment === 'true');
      paramIdx++;
    }

    if (due_calculation) {
      conditions.push(`pt.due_calculation = $${paramIdx}`);
      params.push(due_calculation);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM payment_terms pt WHERE ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(`
      SELECT
        pt.id,
        pt.company_id,
        pt.code,
        COALESCE(pt.name_en, pt.name) AS name,
        pt.name_en,
        pt.name_ar,
        pt.description,
        pt.description_ar,
        pt.days,
        pt.due_calculation,
        pt.discount_percent,
        pt.discount_days,
        pt.early_payment_discount_pct,
        pt.early_payment_days,
        pt.is_installment,
        pt.installment_count,
        pt.requires_advance,
        pt.advance_pct,
        pt.penalty_pct_per_month,
        pt.is_active,
        pt.is_default,
        pt.created_by,
        pt.updated_by,
        pt.created_at,
        pt.updated_at,
        cu.email AS created_by_name,
        uu.email AS updated_by_name,
        (SELECT COUNT(*)::int FROM payment_term_lines l WHERE l.payment_term_id = pt.id) AS lines_count
      FROM payment_terms pt
      LEFT JOIN users cu ON pt.created_by = cu.id
      LEFT JOIN users uu ON pt.updated_by = uu.id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limitNum, offset]);

    res.json({
      data: dataResult.rows,
      total,
    });
  } catch (error) {
    logger.error('Error fetching payment terms list:', error);
    res.status(500).json({ error: 'Failed to fetch payment terms' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// DETAIL — GET /api/payment-terms/:id
// ════════════════════════════════════════════════════════════════════════
router.get('/:id', requirePermission('payment_terms:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;

    const result = await pool.query(`
      SELECT
        pt.*,
        COALESCE(pt.name_en, pt.name) AS name_display,
        cu.email AS created_by_name,
        uu.email AS updated_by_name
      FROM payment_terms pt
      LEFT JOIN users cu ON pt.created_by = cu.id
      LEFT JOIN users uu ON pt.updated_by = uu.id
      WHERE pt.id = $1 AND pt.deleted_at IS NULL
        AND (pt.company_id = $2 OR pt.company_id IS NULL OR $2::int IS NULL)
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment term not found' });
    }

    const lines = await pool.query(`
      SELECT id, line_number, percentage, due_days, description, description_ar, is_active
      FROM payment_term_lines
      WHERE payment_term_id = $1
      ORDER BY line_number
    `, [id]);

    res.json({ ...result.rows[0], lines: lines.rows });
  } catch (error) {
    logger.error('Error fetching payment term detail:', error);
    res.status(500).json({ error: 'Failed to fetch payment term' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// CREATE — POST /api/payment-terms
// ════════════════════════════════════════════════════════════════════════
router.post('/', requirePermission('payment_terms:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;

    const {
      code, name, name_en, name_ar, description, description_ar,
      days, due_calculation, discount_percent, discount_days,
      early_payment_discount_pct, early_payment_days,
      is_installment, installment_count, requires_advance, advance_pct,
      penalty_pct_per_month, is_active,
      lines,
    } = req.body;

    const finalCode = code || req.body.term_code || '';
    const finalName = name || name_en || req.body.term_name_en || '';
    const finalNameAr = name_ar || req.body.term_name_ar || '';
    const finalDays = days ?? req.body.due_days ?? req.body.days_until_due ?? 0;

    if (!finalCode || !finalName) {
      return res.status(400).json({ error: 'Code and Name are required' });
    }

    const finalDiscountDays = discount_days ?? 0;
    if (finalDiscountDays > finalDays) {
      return res.status(400).json({ error: 'Discount days cannot exceed due days' });
    }

    const dup = await pool.query(
      `SELECT id FROM payment_terms WHERE code = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL OR $2::int IS NULL)`,
      [finalCode, companyId]
    );
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: 'Payment term code already exists' });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO payment_terms (
        company_id, code, name, name_en, name_ar, description, description_ar,
        days, due_calculation, discount_percent, discount_days,
        early_payment_discount_pct, early_payment_days,
        is_installment, installment_count, requires_advance, advance_pct,
        penalty_pct_per_month, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $21
      ) RETURNING *
    `, [
      companyId, finalCode, finalName, finalName, finalNameAr,
      description || null, description_ar || null,
      finalDays, due_calculation || 'from_invoice_date',
      discount_percent || 0, finalDiscountDays,
      early_payment_discount_pct || null, early_payment_days || null,
      is_installment || false, installment_count || null,
      requires_advance || false, advance_pct || null,
      penalty_pct_per_month || null, is_active !== false,
      userId, userId
    ]);

    if (Array.isArray(lines) && lines.length > 0) {
      for (const line of lines) {
        await client.query(`
          INSERT INTO payment_term_lines (payment_term_id, line_number, percentage, due_days, description, description_ar)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [result.rows[0].id, line.line_number, line.percentage, line.due_days, line.description || null, line.description_ar || null]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating payment term:', error);
    res.status(500).json({ error: 'Failed to create payment term' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════
// UPDATE — PUT /api/payment-terms/:id
// ════════════════════════════════════════════════════════════════════════
router.put('/:id', requirePermission('payment_terms:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;

    const existing = await pool.query(
      `SELECT * FROM payment_terms WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL OR $2::int IS NULL)`,
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment term not found' });
    }

    const allowedFields = [
      'name', 'name_en', 'name_ar', 'description', 'description_ar',
      'days', 'due_calculation', 'discount_percent', 'discount_days',
      'early_payment_discount_pct', 'early_payment_days',
      'is_installment', 'installment_count', 'requires_advance', 'advance_pct',
      'penalty_pct_per_month', 'is_active', 'is_default',
    ];

    const body = { ...req.body };
    if (body.term_name_en && !body.name_en) body.name_en = body.term_name_en;
    if (body.term_name_ar && !body.name_ar) body.name_ar = body.term_name_ar;
    if (body.due_days !== undefined && body.days === undefined) body.days = body.due_days;
    if (body.days_until_due !== undefined && body.days === undefined) body.days = body.days_until_due;
    if (body.name_en && !body.name) body.name = body.name_en;
    if (body.name && !body.name_en) body.name_en = body.name;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIdx}`);
        values.push(body[field]);
        paramIdx++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const finalDays = body.days ?? existing.rows[0].days;
    const finalDiscDays = body.discount_days ?? existing.rows[0].discount_days ?? 0;
    if (finalDiscDays > finalDays) {
      return res.status(400).json({ error: 'Discount days cannot exceed due days' });
    }

    updates.push(`updated_by = $${paramIdx}`);
    values.push(userId);
    paramIdx++;
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE payment_terms SET ${updates.join(', ')} WHERE id = $${paramIdx} AND deleted_at IS NULL RETURNING *`,
      values
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating payment term:', error);
    res.status(500).json({ error: 'Failed to update payment term' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// DELETE — DELETE /api/payment-terms/:id
// ════════════════════════════════════════════════════════════════════════
router.delete('/:id', requirePermission('payment_terms:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;

    const existing = await pool.query(
      `SELECT id FROM payment_terms WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL OR $2::int IS NULL)`,
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment term not found' });
    }

    await pool.query(
      `UPDATE payment_terms SET deleted_at = NOW(), deleted_by = $1, updated_by = $1 WHERE id = $2`,
      [userId, id]
    );

    res.json({ message: 'Payment term deleted successfully' });
  } catch (error) {
    logger.error('Error deleting payment term:', error);
    res.status(500).json({ error: 'Failed to delete payment term' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// LINES — POST /api/payment-terms/:id/lines
// ════════════════════════════════════════════════════════════════════════
router.post('/:id/lines', requirePermission('payment_terms:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;

    const parent = await pool.query(
      `SELECT id FROM payment_terms WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL OR $2::int IS NULL)`,
      [id, companyId]
    );
    if (parent.rows.length === 0) {
      return res.status(404).json({ error: 'Payment term not found' });
    }

    const { line_number, percentage, due_days, description, description_ar } = req.body;

    const result = await pool.query(`
      INSERT INTO payment_term_lines (payment_term_id, line_number, percentage, due_days, description, description_ar)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, line_number, percentage, due_days, description || null, description_ar || null]);

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    logger.error('Error creating payment term line:', error);
    res.status(500).json({ error: 'Failed to create payment term line' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// LINES — DELETE /api/payment-terms/:id/lines/:lineId
// ════════════════════════════════════════════════════════════════════════
router.delete('/:id/lines/:lineId', requirePermission('payment_terms:edit'), async (req: Request, res: Response) => {
  try {
    const { id, lineId } = req.params;

    const result = await pool.query(
      `DELETE FROM payment_term_lines WHERE id = $1 AND payment_term_id = $2 RETURNING *`,
      [lineId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment term line not found' });
    }

    res.json({ message: 'Line deleted' });
  } catch (error) {
    logger.error('Error deleting payment term line:', error);
    res.status(500).json({ error: 'Failed to delete payment term line' });
  }
});

export default router;
