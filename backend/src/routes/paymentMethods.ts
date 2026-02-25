/**
 * 💳 PAYMENT METHODS — Enterprise Route (B-14)
 * ═══════════════════════════════════════════════════════════════
 * Endpoints: stats, filters, paginated list, detail, CRUD
 * DB table : payment_methods (migration 016 + 055 + 342)
 * Perms    : payment_methods:view / create / edit / delete
 */
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';
import logger from '../utils/logger';

const router = Router();
router.use(authenticate, loadCompanyContext);

// ════════════════════════════════════════════════════════════════════════
// STATS — GET /api/payment-methods/stats
// ════════════════════════════════════════════════════════════════════════
router.get('/stats', requirePermission('payment_methods:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(`
      SELECT
        COUNT(*)::int                                                              AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int                              AS active,
        COUNT(*) FILTER (WHERE is_active = false)::int                             AS inactive,
        COUNT(*) FILTER (WHERE payment_type = 'cash')::int                         AS cash,
        COUNT(*) FILTER (WHERE payment_type = 'bank_transfer')::int                AS bank_transfer,
        COUNT(*) FILTER (WHERE payment_type = 'check')::int                        AS "check",
        COUNT(*) FILTER (WHERE payment_type IN ('credit_card','debit_card'))::int   AS card,
        COUNT(*) FILTER (WHERE payment_type = 'digital_wallet')::int               AS digital_wallet,
        COUNT(*) FILTER (WHERE payment_type = 'letter_of_credit')::int             AS letter_of_credit,
        COUNT(*) FILTER (WHERE is_available_for_sales = true)::int                 AS for_sales,
        COUNT(*) FILTER (WHERE is_available_for_purchases = true)::int             AS for_purchases
      FROM payment_methods
      WHERE deleted_at IS NULL
        AND (company_id = $1 OR company_id IS NULL OR $1::int IS NULL)
    `, [companyId]);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching payment methods stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// FILTERS — GET /api/payment-methods/filters
// ════════════════════════════════════════════════════════════════════════
router.get('/filters', requirePermission('payment_methods:view'), async (_req: Request, res: Response) => {
  try {
    res.json({
      payment_type: [
        { id: 'cash',             name_en: 'Cash',              name_ar: 'نقدي' },
        { id: 'bank_transfer',    name_en: 'Bank Transfer',     name_ar: 'تحويل بنكي' },
        { id: 'check',            name_en: 'Cheque',            name_ar: 'شيك' },
        { id: 'credit_card',      name_en: 'Credit Card',       name_ar: 'بطاقة ائتمانية' },
        { id: 'debit_card',       name_en: 'Debit Card',        name_ar: 'بطاقة خصم' },
        { id: 'digital_wallet',   name_en: 'Digital Wallet',    name_ar: 'محفظة رقمية' },
        { id: 'letter_of_credit', name_en: 'Letter of Credit',  name_ar: 'خطاب اعتماد' },
      ],
    });
  } catch (error) {
    logger.error('Error fetching payment methods filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// LIST — GET /api/payment-methods
// ════════════════════════════════════════════════════════════════════════
router.get('/', requirePermission('payment_methods:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const {
      page = '1', limit = '25', search,
      sortBy = 'sort_order', sortOrder = 'asc',
      is_active, payment_type, is_available_for_sales, is_available_for_purchases,
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset   = (pageNum - 1) * limitNum;

    const allowedSorts: Record<string, string> = {
      code: 'pm.code', name: 'COALESCE(pm.name_en, pm.name)',
      payment_type: 'pm.payment_type', clearing_days: 'pm.clearing_days',
      sort_order: 'pm.sort_order', is_active: 'pm.is_active',
      created_at: 'pm.created_at',
    };
    const sortCol = allowedSorts[sortBy] || 'pm.sort_order';
    const sortDir = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const conditions: string[] = ['pm.deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    conditions.push(`(pm.company_id = $${idx} OR pm.company_id IS NULL OR $${idx}::int IS NULL)`);
    params.push(companyId); idx++;

    if (search) {
      conditions.push(`(
        pm.code ILIKE $${idx}
        OR pm.name ILIKE $${idx}
        OR COALESCE(pm.name_en,'') ILIKE $${idx}
        OR COALESCE(pm.name_ar,'') ILIKE $${idx}
      )`);
      params.push(`%${search}%`); idx++;
    }
    if (is_active !== undefined && is_active !== '') {
      conditions.push(`pm.is_active = $${idx}`);
      params.push(is_active === 'true'); idx++;
    }
    if (payment_type) {
      conditions.push(`pm.payment_type = $${idx}`);
      params.push(payment_type); idx++;
    }
    if (is_available_for_sales !== undefined && is_available_for_sales !== '') {
      conditions.push(`pm.is_available_for_sales = $${idx}`);
      params.push(is_available_for_sales === 'true'); idx++;
    }
    if (is_available_for_purchases !== undefined && is_available_for_purchases !== '') {
      conditions.push(`pm.is_available_for_purchases = $${idx}`);
      params.push(is_available_for_purchases === 'true'); idx++;
    }

    const where = conditions.join(' AND ');

    const countQ = await pool.query(`SELECT COUNT(*)::int AS total FROM payment_methods pm WHERE ${where}`, params);
    const total = countQ.rows[0].total;

    const dataQ = await pool.query(`
      SELECT
        pm.id, pm.code, pm.name, pm.name_en, pm.name_ar,
        pm.payment_type, pm.icon,
        COALESCE(pm.requires_reference, FALSE)     AS requires_reference,
        COALESCE(pm.requires_bank, pm.requires_bank_account, FALSE) AS requires_bank_account,
        COALESCE(pm.requires_due_date, FALSE)      AS requires_due_date,
        COALESCE(pm.clearing_days, pm.processing_days, 0) AS clearing_days,
        pm.account_id, pm.gl_account_code,
        pm.zatca_code,
        pm.is_available_for_sales,
        pm.is_available_for_purchases,
        pm.sort_order,
        pm.transaction_fee_percent,
        pm.transaction_fee_fixed,
        COALESCE(pm.is_default, FALSE) AS is_default,
        pm.is_active,
        pm.description, pm.description_en, pm.description_ar,
        pm.created_at, pm.updated_at,
        cu.email AS created_by_name,
        uu.email AS updated_by_name
      FROM payment_methods pm
      LEFT JOIN users cu ON pm.created_by = cu.id
      LEFT JOIN users uu ON pm.updated_by = uu.id
      WHERE ${where}
      ORDER BY ${sortCol} ${sortDir}, pm.code ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limitNum, offset]);

    res.json({ data: dataQ.rows, total, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Error fetching payment methods list:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// DETAIL — GET /api/payment-methods/:id
// ════════════════════════════════════════════════════════════════════════
router.get('/:id', requirePermission('payment_methods:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;

    const result = await pool.query(`
      SELECT pm.*,
        COALESCE(pm.name_en, pm.name) AS name_display,
        COALESCE(pm.requires_bank, pm.requires_bank_account, FALSE) AS requires_bank_account,
        COALESCE(pm.clearing_days, pm.processing_days, 0) AS clearing_days,
        cu.email AS created_by_name,
        uu.email AS updated_by_name
      FROM payment_methods pm
      LEFT JOIN users cu ON pm.created_by = cu.id
      LEFT JOIN users uu ON pm.updated_by = uu.id
      WHERE pm.id = $1 AND pm.deleted_at IS NULL
        AND (pm.company_id = $2 OR pm.company_id IS NULL OR $2::int IS NULL)
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching payment method detail:', error);
    res.status(500).json({ error: 'Failed to fetch payment method' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// CREATE — POST /api/payment-methods
// ════════════════════════════════════════════════════════════════════════
router.post('/', requirePermission('payment_methods:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId    = (req as any).user?.id;

    const {
      code, name, name_en, name_ar, payment_type, icon,
      requires_reference, requires_bank_account, requires_due_date,
      clearing_days, account_id, gl_account_code, zatca_code,
      is_available_for_sales, is_available_for_purchases,
      sort_order, transaction_fee_percent, transaction_fee_fixed,
      is_default, is_active, description, description_en, description_ar,
    } = req.body;

    if (!code || !payment_type) {
      return res.status(400).json({ error: 'code and payment_type are required' });
    }

    const finalNameEn = name_en || name || code;
    const finalName   = name || name_en || code;

    await client.query('BEGIN');

    // Duplicate check
    const dup = await client.query(
      `SELECT id FROM payment_methods
       WHERE code = $1 AND deleted_at IS NULL
         AND (company_id = $2 OR company_id IS NULL OR $2::int IS NULL)`,
      [code, companyId]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Payment method code already exists' });
    }

    // Clear is_default if needed
    if (is_default) {
      await client.query(
        `UPDATE payment_methods SET is_default = FALSE WHERE (company_id = $1 OR company_id IS NULL OR $1::int IS NULL) AND deleted_at IS NULL`,
        [companyId]
      );
    }

    const insert = await client.query(`
      INSERT INTO payment_methods (
        company_id, code, name, name_en, name_ar, payment_type, icon,
        requires_reference, requires_bank_account, requires_bank, requires_due_date,
        clearing_days, processing_days, account_id, gl_account_code, zatca_code,
        is_available_for_sales, is_available_for_purchases,
        sort_order, transaction_fee_percent, transaction_fee_fixed,
        is_default, is_active, description, description_en, description_ar,
        created_by, updated_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$9,$10,
        $11,$11,$12,$13,$14,
        $15,$16,
        $17,$18,$19,
        $20,$21,$22,$23,$24,
        $25,$26
      ) RETURNING id
    `, [
      companyId, code, finalName, finalNameEn, name_ar || null, payment_type, icon || null,
      requires_reference ?? false, requires_bank_account ?? false, requires_due_date ?? false,
      clearing_days ?? 0, account_id || null, gl_account_code || null, zatca_code || null,
      is_available_for_sales ?? true, is_available_for_purchases ?? true,
      sort_order ?? 0, transaction_fee_percent || null, transaction_fee_fixed || null,
      is_default ?? false, is_active ?? true, description || null, description_en || null, description_ar || null,
      userId, userId,
    ]);

    await client.query('COMMIT');
    res.status(201).json({ data: { id: insert.rows[0].id } });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating payment method:', error);
    res.status(500).json({ error: 'Failed to create payment method' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════
// UPDATE — PUT /api/payment-methods/:id
// ════════════════════════════════════════════════════════════════════════
router.put('/:id', requirePermission('payment_methods:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;
    const userId    = (req as any).user?.id;

    const existing = await pool.query(
      `SELECT * FROM payment_methods WHERE id = $1 AND deleted_at IS NULL
         AND (company_id = $2 OR company_id IS NULL OR $2::int IS NULL)`,
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Protect global system records from modification
    if (existing.rows[0].is_system && existing.rows[0].is_global) {
      return res.status(400).json({ error: 'System payment methods cannot be modified. Clone to your company scope first.' });
    }

    const allowedFields = [
      'name', 'name_en', 'name_ar', 'payment_type', 'icon',
      'requires_reference', 'requires_bank_account', 'requires_due_date',
      'clearing_days', 'account_id', 'gl_account_code', 'zatca_code',
      'is_available_for_sales', 'is_available_for_purchases',
      'sort_order', 'transaction_fee_percent', 'transaction_fee_fixed',
      'is_default', 'is_active', 'description', 'description_en', 'description_ar',
    ];

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'requires_bank_account') {
          // Sync both columns
          setClauses.push(`requires_bank_account = $${idx}, requires_bank = $${idx}`);
        } else if (field === 'clearing_days') {
          setClauses.push(`clearing_days = $${idx}, processing_days = $${idx}`);
        } else {
          setClauses.push(`${field} = $${idx}`);
        }
        params.push(req.body[field]);
        idx++;
      }
    }

    // Sync name ↔ name_en
    if (req.body.name_en && !req.body.name) {
      setClauses.push(`name = $${idx}`);
      params.push(req.body.name_en); idx++;
    }
    if (req.body.name && !req.body.name_en) {
      setClauses.push(`name_en = $${idx}`);
      params.push(req.body.name); idx++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Handle is_default
    if (req.body.is_default === true) {
      await pool.query(
        `UPDATE payment_methods SET is_default = FALSE WHERE (company_id = $1 OR company_id IS NULL OR $1::int IS NULL) AND deleted_at IS NULL AND id != $2`,
        [companyId, id]
      );
    }

    setClauses.push(`updated_by = $${idx}`);
    params.push(userId); idx++;
    setClauses.push(`updated_at = NOW()`);

    params.push(id); // For WHERE clause

    await pool.query(
      `UPDATE payment_methods SET ${setClauses.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL`,
      params
    );

    res.json({ message: 'Payment method updated successfully' });
  } catch (error) {
    logger.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// DELETE — DELETE /api/payment-methods/:id
// ════════════════════════════════════════════════════════════════════════
router.delete('/:id', requirePermission('payment_methods:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).companyContext?.companyId;
    const userId    = (req as any).user?.id;

    const existing = await pool.query(
      `SELECT id, is_default, is_system, is_global FROM payment_methods WHERE id = $1 AND deleted_at IS NULL
         AND (company_id = $2 OR company_id IS NULL OR $2::int IS NULL)`,
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }
    // Protect global system records from deletion
    if (existing.rows[0].is_system && existing.rows[0].is_global) {
      return res.status(400).json({ error: 'System payment methods cannot be deleted. Clone to your company scope first.' });
    }
    if (existing.rows[0].is_default) {
      return res.status(400).json({ error: 'Default payment method cannot be deleted' });
    }

    await pool.query(
      `UPDATE payment_methods SET deleted_at = NOW(), deleted_by = $1, updated_by = $1, is_active = FALSE WHERE id = $2`,
      [userId, id]
    );
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    logger.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

export default router;
