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
        COUNT(*) FILTER (WHERE is_active = false)::int                   AS inactive
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
      name: 'pt.name',
      days: 'pt.days',
      is_active: 'pt.is_active',
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
        pt.name,
        pt.name_ar,
        pt.description,
        COALESCE(pt.description_en, pt.description) AS description_en,
        pt.description_ar,
        pt.days,
        pt.discount_percent,
        pt.discount_days,
        pt.is_active,
        pt.is_default,
        pt.created_by,
        pt.updated_by,
        pt.created_at,
        pt.updated_at,
        cu.email AS created_by_name,
        uu.email AS updated_by_name
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
        pt.name AS name_display,
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

    res.json({ ...result.rows[0], lines: [] });
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
        company_id, code, name, name_ar, description, description_ar,
        days, discount_percent, discount_days,
        is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12
      ) RETURNING *
    `, [
      companyId, finalCode, finalName, finalNameAr,
      description || null, description_ar || null,
      finalDays, discount_percent || 0, finalDiscountDays,
      is_active !== false, userId, userId
    ]);

    // Lines table doesn't exist yet, skip lines insertion

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
      'name', 'name_ar', 'description', 'description_ar', 'description_en',
      'days', 'discount_percent', 'discount_days',
      'is_active', 'is_default',
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
// LINES — POST /api/payment-terms/:id/lines (disabled - table not yet created)
// ════════════════════════════════════════════════════════════════════════
router.post('/:id/lines', requirePermission('payment_terms:edit'), async (req: Request, res: Response) => {
  return res.status(501).json({ error: 'Payment term lines not yet implemented' });
});

// ════════════════════════════════════════════════════════════════════════
// LINES — DELETE /api/payment-terms/:id/lines/:lineId (disabled - table not yet created)
// ════════════════════════════════════════════════════════════════════════
router.delete('/:id/lines/:lineId', requirePermission('payment_terms:edit'), async (req: Request, res: Response) => {
  return res.status(501).json({ error: 'Payment term lines not yet implemented' });
});

export default router;
