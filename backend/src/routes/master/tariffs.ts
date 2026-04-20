import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

/* ───────── helpers ───────── */
function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(String(query.limit ?? '25'), 10) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getCompanyId(req: Request): number | undefined {
  return (req as any).companyId || (req as any).user?.company_id;
}

const BASE_SELECT = `
  ct.id,
  ct.company_id,
  ct.hs_code,
  hs.description_en AS hs_description_en,
  hs.description_ar AS hs_description_ar,
  ct.country_code,
  ct.duty_rate_percent,
  ct.effective_from,
  ct.effective_to,
  ct.notes_en,
  ct.notes_ar,
  ct.is_active,
  ct.duty_type_code,
  dt.name_en  AS duty_type_name_en,
  dt.name_ar  AS duty_type_name_ar,
  ct.rate_type,
  ct.rate_fixed,
  ct.fta_code,
  ct.origin_country_code,
  ct.calculation_basis,
  CASE
    WHEN ct.duty_rate_percent = 0 AND COALESCE(ct.rate_fixed, 0) = 0 THEN 'EXEMPT'
    ELSE 'DUTY'
  END AS rule_type,
  ct.created_at,
  ct.updated_at
`;

const BASE_FROM = `
  FROM customs_tariffs ct
  LEFT JOIN hs_codes hs
    ON hs.company_id = ct.company_id AND hs.code = ct.hs_code AND hs.deleted_at IS NULL
  LEFT JOIN customs_duty_types dt
    ON dt.company_id = ct.company_id AND dt.code = ct.duty_type_code AND dt.deleted_at IS NULL
`;

function buildWhere(req: Request) {
  const companyId = getCompanyId(req);
  const where: string[] = ['ct.deleted_at IS NULL'];
  const params: any[] = [];
  let pc = 1;

  if (companyId) {
    where.push(`ct.company_id = $${pc}`);
    params.push(companyId);
    pc++;
  }

  const q = req.query;
  if (q.search) {
    where.push(`(ct.hs_code ILIKE $${pc} OR ct.country_code ILIKE $${pc} OR hs.description_en ILIKE $${pc} OR hs.description_ar ILIKE $${pc} OR ct.notes_en ILIKE $${pc} OR ct.notes_ar ILIKE $${pc} OR ct.fta_code ILIKE $${pc})`);
    params.push(`%${String(q.search).trim()}%`);
    pc++;
  }
  if (q.country_code) {
    where.push(`ct.country_code = $${pc}`); params.push(q.country_code); pc++;
  }
  if (q.duty_type_code) {
    where.push(`ct.duty_type_code = $${pc}`); params.push(q.duty_type_code); pc++;
  }
  if (q.fta_code) {
    if (q.fta_code === '__none__') {
      where.push(`ct.fta_code IS NULL`);
    } else {
      where.push(`ct.fta_code = $${pc}`); params.push(q.fta_code); pc++;
    }
  }
  if (q.rule_type) {
    if (q.rule_type === 'EXEMPT') {
      where.push(`ct.duty_rate_percent = 0 AND COALESCE(ct.rate_fixed, 0) = 0`);
    } else if (q.rule_type === 'DUTY') {
      where.push(`(ct.duty_rate_percent > 0 OR COALESCE(ct.rate_fixed, 0) > 0)`);
    }
  }

  return { whereSql: `WHERE ${where.join(' AND ')}`, params, pc };
}

/* ═══════════════════════════════════════════════════════════ */
/*  GET /stats — aggregate statistics                        */
/* ═══════════════════════════════════════════════════════════ */
router.get('/stats', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const companyWhere = companyId ? `AND ct.company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const r = await pool.query(`
      SELECT
        COUNT(*)::int                                                   AS total,
        COUNT(*) FILTER (WHERE ct.is_active = true)::int                AS active,
        COUNT(*) FILTER (WHERE ct.is_active = false)::int               AS inactive,
        COUNT(DISTINCT ct.hs_code)::int                                 AS unique_hs_codes,
        COUNT(DISTINCT ct.country_code)::int                            AS unique_countries,
        COUNT(*) FILTER (WHERE ct.duty_rate_percent = 0 AND COALESCE(ct.rate_fixed,0) = 0)::int AS zero_duty,
        COUNT(*) FILTER (WHERE ct.duty_rate_percent > 0 OR COALESCE(ct.rate_fixed,0) > 0)::int  AS with_duty,
        COUNT(*) FILTER (WHERE ct.fta_code IS NOT NULL)::int            AS fta_rates,
        COUNT(DISTINCT ct.fta_code) FILTER (WHERE ct.fta_code IS NOT NULL)::int AS fta_agreements,
        COUNT(DISTINCT ct.duty_type_code)::int                          AS duty_types,
        ROUND(AVG(ct.duty_rate_percent)::numeric, 2)                    AS avg_rate,
        MAX(ct.duty_rate_percent)                                       AS max_rate,
        COUNT(*) FILTER (WHERE ct.duty_type_code = 'excise_tax')::int   AS excise_items,
        COUNT(*) FILTER (WHERE ct.effective_to IS NOT NULL AND ct.effective_to < CURRENT_DATE)::int AS expired
      FROM customs_tariffs ct
      WHERE ct.deleted_at IS NULL ${companyWhere}
    `, params);

    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    console.error('tariffs/stats error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

/* ═══════════════════════════════════════════════════════════ */
/*  GET /filters — distinct values for filter dropdowns      */
/* ═══════════════════════════════════════════════════════════ */
router.get('/filters', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const cw = companyId ? `AND ct.company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const [countries, dutyTypes, ftaAgreements] = await Promise.all([
      pool.query(`SELECT DISTINCT ct.country_code FROM customs_tariffs ct WHERE ct.deleted_at IS NULL ${cw} ORDER BY ct.country_code`, params),
      pool.query(`
        SELECT DISTINCT ct.duty_type_code,
               COALESCE(dt.name_en, ct.duty_type_code) AS name_en,
               COALESCE(dt.name_ar, ct.duty_type_code) AS name_ar
        FROM customs_tariffs ct
        LEFT JOIN customs_duty_types dt ON dt.company_id = ct.company_id AND dt.code = ct.duty_type_code AND dt.deleted_at IS NULL
        WHERE ct.deleted_at IS NULL ${cw}
        ORDER BY ct.duty_type_code
      `, params),
      pool.query(`SELECT DISTINCT ct.fta_code FROM customs_tariffs ct WHERE ct.deleted_at IS NULL AND ct.fta_code IS NOT NULL ${cw} ORDER BY ct.fta_code`, params),
    ]);

    sendSuccess(res, {
      countries: countries.rows.map(r => r.country_code),
      dutyTypes: dutyTypes.rows,
      ftaAgreements: ftaAgreements.rows.map(r => r.fta_code),
    });
  } catch (err: any) {
    console.error('tariffs/filters error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch filters', 500);
  }
});

/* ═══════════════════════════════════════════════════════════ */
/*  GET /calculate — duty calculator                         */
/* ═══════════════════════════════════════════════════════════ */
router.get('/calculate', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { hs_code, country_code = 'SA', value = '0', quantity = '1' } = req.query as Record<string, string>;

    if (!hs_code) return sendError(res, 'VALIDATION', 'hs_code is required', 400);

    const goodsValue = Number(value) || 0;
    const qty = Number(quantity) || 1;

    const cw = companyId ? `AND ct.company_id = $3` : '';
    const params: any[] = [hs_code, country_code];
    if (companyId) params.push(companyId);

    const tariffs = await pool.query(`
      SELECT
        ct.duty_type_code,
        COALESCE(dt.name_en, ct.duty_type_code) AS duty_type_name_en,
        COALESCE(dt.name_ar, ct.duty_type_code) AS duty_type_name_ar,
        ct.duty_rate_percent,
        ct.rate_type,
        ct.rate_fixed,
        ct.fta_code
      FROM customs_tariffs ct
      LEFT JOIN customs_duty_types dt ON dt.company_id = ct.company_id AND dt.code = ct.duty_type_code AND dt.deleted_at IS NULL
      WHERE ct.deleted_at IS NULL
        AND ct.is_active = true
        AND ct.hs_code = $1
        AND ct.country_code = $2
        AND (ct.effective_to IS NULL OR ct.effective_to >= CURRENT_DATE)
        ${cw}
      ORDER BY ct.duty_type_code
    `, params);

    const breakdown = tariffs.rows.map(t => {
      let amount = 0;
      if (t.rate_type === 'fixed_per_unit') {
        amount = (Number(t.rate_fixed) || 0) * qty;
      } else if (t.rate_type === 'compound') {
        amount = (goodsValue * (Number(t.duty_rate_percent) / 100)) + ((Number(t.rate_fixed) || 0) * qty);
      } else {
        amount = goodsValue * (Number(t.duty_rate_percent) / 100);
      }
      return {
        duty_type_code: t.duty_type_code,
        duty_type_name_en: t.duty_type_name_en,
        duty_type_name_ar: t.duty_type_name_ar,
        rate_type: t.rate_type || 'percentage',
        rate_percent: Number(t.duty_rate_percent),
        rate_fixed: Number(t.rate_fixed) || 0,
        fta_code: t.fta_code,
        calculated_amount: Math.round(amount * 100) / 100,
      };
    });

    const totalDuty = breakdown.reduce((s, b) => s + b.calculated_amount, 0);

    sendSuccess(res, {
      hs_code,
      country_code,
      goods_value: goodsValue,
      quantity: qty,
      breakdown,
      total_duty: Math.round(totalDuty * 100) / 100,
      total_with_goods: Math.round((goodsValue + totalDuty) * 100) / 100,
      tariffs_found: tariffs.rows.length,
    });
  } catch (err: any) {
    console.error('tariffs/calculate error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to calculate duties', 500);
  }
});

/* ═══════════════════════════════════════════════════════════ */
/*  GET / — list with search, filters, pagination            */
/* ═══════════════════════════════════════════════════════════ */
router.get('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereSql, params, pc } = buildWhere(req);

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total ${BASE_FROM} ${whereSql}`, params
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listResult = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} ${whereSql}
       ORDER BY ct.hs_code ASC, ct.country_code ASC, ct.effective_from DESC
       LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: listResult.rows, total, page, limit });
  } catch (err: any) {
    console.error('tariffs list error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tariffs', 500);
  }
});

/* ═══════════════════════════════════════════════════════════ */
/*  GET /:id — single record                                 */
/* ═══════════════════════════════════════════════════════════ */
router.get('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);

    const companyId = getCompanyId(req);
    const cw = companyId ? `AND ct.company_id = $2` : '';
    const params: any[] = [id];
    if (companyId) params.push(companyId);

    const result = await pool.query(
      `SELECT ${BASE_SELECT} ${BASE_FROM} WHERE ct.id = $1 AND ct.deleted_at IS NULL ${cw}`, params
    );
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tariff not found', 404);

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    console.error('tariffs/:id error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to fetch tariff', 500);
  }
});

/* ═══════════════════════════════════════════════════════════ */
/*  POST / — create                                          */
/* ═══════════════════════════════════════════════════════════ */
router.post('/', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const {
      hs_code, country_code, duty_rate_percent = 0, effective_from,
      effective_to, notes_en, notes_ar, is_active = true,
      duty_type_code = 'import_duty', rate_type = 'percentage',
      rate_fixed = 0, fta_code, origin_country_code, calculation_basis = 'cif_value',
    } = req.body;

    if (!hs_code || !country_code || !effective_from) {
      return sendError(res, 'VALIDATION', 'hs_code, country_code, effective_from are required', 400);
    }

    const result = await pool.query(`
      INSERT INTO customs_tariffs
        (company_id, hs_code, country_code, duty_rate_percent, effective_from, effective_to,
         notes_en, notes_ar, is_active, duty_type_code, rate_type, rate_fixed,
         fta_code, origin_country_code, calculation_basis)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      companyId, hs_code, country_code, Number(duty_rate_percent), effective_from,
      effective_to || null, notes_en || null, notes_ar || null, is_active,
      duty_type_code, rate_type, Number(rate_fixed) || 0,
      fta_code || null, origin_country_code || null, calculation_basis,
    ]);

    sendSuccess(res, result.rows[0], 201);
  } catch (err: any) {
    console.error('tariffs POST error:', err);
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Tariff with same HS code, country, and date already exists', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to create tariff', 500);
  }
});

/* ═══════════════════════════════════════════════════════════ */
/*  PUT /:id — update                                        */
/* ═══════════════════════════════════════════════════════════ */
router.put('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);

    const companyId = getCompanyId(req);
    const {
      hs_code, country_code, duty_rate_percent, effective_from,
      effective_to, notes_en, notes_ar, is_active,
      duty_type_code, rate_type, rate_fixed,
      fta_code, origin_country_code, calculation_basis,
    } = req.body;

    const cw = companyId ? `AND company_id = $16` : '';
    const params = [
      hs_code, country_code, Number(duty_rate_percent), effective_from,
      effective_to || null, notes_en || null, notes_ar || null, is_active,
      duty_type_code, rate_type, Number(rate_fixed) || 0,
      fta_code || null, origin_country_code || null, calculation_basis || 'cif_value',
      id,
    ];
    if (companyId) params.push(companyId);

    const result = await pool.query(`
      UPDATE customs_tariffs SET
        hs_code = $1, country_code = $2, duty_rate_percent = $3, effective_from = $4,
        effective_to = $5, notes_en = $6, notes_ar = $7, is_active = $8,
        duty_type_code = $9, rate_type = $10, rate_fixed = $11,
        fta_code = $12, origin_country_code = $13, calculation_basis = $14,
        updated_at = NOW()
      WHERE id = $15 AND deleted_at IS NULL ${cw}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tariff not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    console.error('tariffs PUT error:', err);
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Duplicate tariff entry', 409);
    sendError(res, 'SERVER_ERROR', 'Failed to update tariff', 500);
  }
});

/* ═══════════════════════════════════════════════════════════ */
/*  DELETE /:id — soft delete                                */
/* ═══════════════════════════════════════════════════════════ */
router.delete('/:id', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return sendError(res, 'VALIDATION', 'Invalid id', 400);

    const companyId = getCompanyId(req);
    const cw = companyId ? `AND company_id = $2` : '';
    const params: any[] = [id];
    if (companyId) params.push(companyId);

    const result = await pool.query(
      `UPDATE customs_tariffs SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL ${cw} RETURNING id`, params
    );
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Tariff not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    console.error('tariffs DELETE error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to delete tariff', 500);
  }
});

export default router;
