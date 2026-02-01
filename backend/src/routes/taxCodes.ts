import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isMissingTableError(error: any): boolean {
  return Boolean(error && (error.code === '42P01' || error.code === '42703'));
}

function normalizeAppliesTo(value: unknown): 'sales' | 'purchases' | 'both' | null {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'sales' || v === 'purchases' || v === 'both') return v;
  return null;
}

// =====================================================
// GET /api/tax-codes - list
// =====================================================
router.get(
  '/',
  requireAnyPermission([
    'master:tax:view',
    'tax:codes:view',
    'tax:view',
    'master:view',
  ]),
  requireCompany,
  async (req: Request, res: Response) => {
    const companyId = req.companyId as number;
    const { search, applies_to, is_active } = req.query as any;

    try {
      const params: any[] = [companyId];
      let paramCount = 1;

      let query = `
        SELECT tc.*
        FROM tax_codes tc
        WHERE tc.company_id = $1
          AND tc.deleted_at IS NULL
      `;

      if (search) {
        paramCount++;
        query += ` AND (tc.code ILIKE $${paramCount} OR tc.name ILIKE $${paramCount} OR tc.name_ar ILIKE $${paramCount})`;
        params.push(`%${String(search)}%`);
      }

      const applies = normalizeAppliesTo(applies_to);
      if (applies) {
        paramCount++;
        query += ` AND tc.applies_to = $${paramCount}`;
        params.push(applies);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND tc.is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
      }

      query += ` ORDER BY tc.code ASC, tc.id DESC`;

      const result = await pool.query(query, params);
      return res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.json({ success: true, data: [], total: 0 });
      }
      console.error('Error fetching tax codes:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch tax codes' });
    }
  }
);

// =====================================================
// POST /api/tax-codes - create
// =====================================================
router.post(
  '/',
  requireAnyPermission([
    'master:tax:create',
    'tax:codes:create',
    'tax:view',
    'master:create',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;

    try {
      const body = req.body || {};
      const code = String(body.code || '').trim().toUpperCase();
      const name = String(body.name || '').trim();
      const nameAr = body.name_ar ? String(body.name_ar).trim() : null;
      const description = body.description ? String(body.description).trim() : null;
      const appliesTo = normalizeAppliesTo(body.applies_to) || 'both';
      const vatRate = toNumber(body.vat_rate, 0);
      const customsRate = toNumber(body.customs_rate, 0);
      const exciseRate = toNumber(body.excise_rate, 0);
      const withholdingRate = toNumber(body.withholding_rate, 0);
      const isZeroRated = Boolean(body.is_zero_rated);
      const isExempt = Boolean(body.is_exempt);
      const isReverseCharge = Boolean(body.is_reverse_charge);
      const zatcaCode = body.zatca_code ? String(body.zatca_code).trim().toUpperCase() : null;
      const effectiveFrom = body.effective_from;
      const effectiveTo = body.effective_to || null;
      const isActive = body.is_active === undefined ? true : Boolean(body.is_active);

      if (!code) return res.status(400).json({ success: false, error: 'code is required' });
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      if (!effectiveFrom) return res.status(400).json({ success: false, error: 'effective_from is required' });

      const inserted = await pool.query(
        `INSERT INTO tax_codes (
          company_id, code, name, name_ar, description,
          applies_to, vat_rate, customs_rate, excise_rate, withholding_rate,
          is_zero_rated, is_exempt, is_reverse_charge,
          zatca_code, effective_from, effective_to,
          is_active, created_by, updated_by
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,
          $14,$15,$16,
          $17,$18,$19
        )
        RETURNING *`,
        [
          companyId,
          code,
          name,
          nameAr,
          description,
          appliesTo,
          vatRate,
          customsRate,
          exciseRate,
          withholdingRate,
          isZeroRated,
          isExempt,
          isReverseCharge,
          zatcaCode,
          effectiveFrom,
          effectiveTo,
          isActive,
          userId ?? null,
          userId ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.status(503).json({ success: false, error: 'Tax codes table not ready (migration not applied yet)' });
      }
      if (error?.code === '23505') {
        return res.status(400).json({ success: false, error: 'Tax code already exists' });
      }
      console.error('Error creating tax code:', error);
      return res.status(500).json({ success: false, error: 'Failed to create tax code' });
    }
  }
);

// =====================================================
// PUT /api/tax-codes/:id - update
// =====================================================
router.put(
  '/:id',
  requireAnyPermission([
    'master:tax:update',
    'tax:codes:edit',
    'master:edit',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;
    const id = Number(req.params.id);

    try {
      const existing = await pool.query(
        'SELECT * FROM tax_codes WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tax code not found' });
      }

      const body = req.body || {};

      const code = body.code !== undefined ? String(body.code || '').trim().toUpperCase() : existing.rows[0].code;
      const name = body.name !== undefined ? String(body.name || '').trim() : existing.rows[0].name;
      const nameAr = body.name_ar !== undefined ? (body.name_ar ? String(body.name_ar).trim() : null) : existing.rows[0].name_ar;
      const description = body.description !== undefined ? (body.description ? String(body.description).trim() : null) : existing.rows[0].description;
      const appliesTo = body.applies_to !== undefined ? (normalizeAppliesTo(body.applies_to) || 'both') : existing.rows[0].applies_to;
      const vatRate = body.vat_rate !== undefined ? toNumber(body.vat_rate, 0) : toNumber(existing.rows[0].vat_rate, 0);
      const customsRate = body.customs_rate !== undefined ? toNumber(body.customs_rate, 0) : toNumber(existing.rows[0].customs_rate, 0);
      const exciseRate = body.excise_rate !== undefined ? toNumber(body.excise_rate, 0) : toNumber(existing.rows[0].excise_rate, 0);
      const withholdingRate = body.withholding_rate !== undefined ? toNumber(body.withholding_rate, 0) : toNumber(existing.rows[0].withholding_rate, 0);
      const isZeroRated = body.is_zero_rated !== undefined ? Boolean(body.is_zero_rated) : Boolean(existing.rows[0].is_zero_rated);
      const isExempt = body.is_exempt !== undefined ? Boolean(body.is_exempt) : Boolean(existing.rows[0].is_exempt);
      const isReverseCharge = body.is_reverse_charge !== undefined ? Boolean(body.is_reverse_charge) : Boolean(existing.rows[0].is_reverse_charge);
      const zatcaCode = body.zatca_code !== undefined ? (body.zatca_code ? String(body.zatca_code).trim().toUpperCase() : null) : existing.rows[0].zatca_code;
      const effectiveFrom = body.effective_from !== undefined ? body.effective_from : existing.rows[0].effective_from;
      const effectiveTo = body.effective_to !== undefined ? (body.effective_to || null) : existing.rows[0].effective_to;
      const isActive = body.is_active !== undefined ? Boolean(body.is_active) : Boolean(existing.rows[0].is_active);

      if (!code) return res.status(400).json({ success: false, error: 'code is required' });
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      if (!effectiveFrom) return res.status(400).json({ success: false, error: 'effective_from is required' });

      const result = await pool.query(
        `UPDATE tax_codes
         SET
           code = $3,
           name = $4,
           name_ar = $5,
           description = $6,
           applies_to = $7,
           vat_rate = $8,
           customs_rate = $9,
           excise_rate = $10,
           withholding_rate = $11,
           is_zero_rated = $12,
           is_exempt = $13,
           is_reverse_charge = $14,
           zatca_code = $15,
           effective_from = $16,
           effective_to = $17,
           is_active = $18,
           updated_by = $19,
           updated_at = NOW()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [
          id,
          companyId,
          code,
          name,
          nameAr,
          description,
          appliesTo,
          vatRate,
          customsRate,
          exciseRate,
          withholdingRate,
          isZeroRated,
          isExempt,
          isReverseCharge,
          zatcaCode,
          effectiveFrom,
          effectiveTo,
          isActive,
          userId ?? null,
        ]
      );

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.status(503).json({ success: false, error: 'Tax codes table not ready (migration not applied yet)' });
      }
      if (error?.code === '23505') {
        return res.status(400).json({ success: false, error: 'Tax code already exists' });
      }
      console.error('Error updating tax code:', error);
      return res.status(500).json({ success: false, error: 'Failed to update tax code' });
    }
  }
);

// =====================================================
// DELETE /api/tax-codes/:id - soft delete
// =====================================================
router.delete(
  '/:id',
  requireAnyPermission([
    'master:tax:delete',
    'tax:codes:delete',
    'master:delete',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;
    const id = Number(req.params.id);

    try {
      const result = await pool.query(
        `UPDATE tax_codes
         SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId, userId ?? null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tax code not found' });
      }

      return res.json({ success: true, message: 'Tax code deleted' });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.status(503).json({ success: false, error: 'Tax codes table not ready (migration not applied yet)' });
      }
      console.error('Error deleting tax code:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete tax code' });
    }
  }
);

export default router;
