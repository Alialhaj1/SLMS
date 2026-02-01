import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isMissingTableError(error: any): boolean {
  return Boolean(error && (error.code === '42P01' || error.code === '42703'));
}

// =====================================================
// GET /api/tax-rates - list
// =====================================================
router.get(
  '/',
  requireAnyPermission([
    'master:tax:view',
    'master:taxes:view',
    'tax:rates:view',
    'tax:view',
    'master:view',
  ]),
  requireCompany,
  async (req: Request, res: Response) => {
    const companyId = req.companyId as number;
    const { search, tax_type_id, is_active } = req.query as any;

    try {
      const params: any[] = [companyId];
      let paramCount = 1;

      let query = `
        SELECT
          tr.*,
          tt.code AS tax_type_code
        FROM tax_rates tr
        LEFT JOIN tax_types tt
          ON tt.id = tr.tax_type_id
          AND (tt.company_id = $1 OR tt.company_id IS NULL)
        WHERE tr.company_id = $1
          AND tr.deleted_at IS NULL
      `;

      if (search) {
        paramCount++;
        query += ` AND (tr.code ILIKE $${paramCount} OR tr.name ILIKE $${paramCount} OR tr.name_ar ILIKE $${paramCount})`;
        params.push(`%${String(search)}%`);
      }

      if (tax_type_id) {
        paramCount++;
        query += ` AND tr.tax_type_id = $${paramCount}`;
        params.push(Number(tax_type_id));
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND tr.is_active = $${paramCount}`;
        params.push(String(is_active) === 'true');
      }

      query += ` ORDER BY tr.is_default DESC, tr.code ASC, tr.id DESC`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows,
        total: result.rowCount,
      });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.json({ success: true, data: [], total: 0 });
      }
      console.error('Error fetching tax rates:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch tax rates' });
    }
  }
);

// =====================================================
// POST /api/tax-rates - create
// =====================================================
router.post(
  '/',
  requireAnyPermission([
    'master:tax:create',
    'master:taxes:create',
    'tax:rates:create',
    'tax:rates:edit',
    'tax:view',
    'master:create',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;

    try {
      const {
        code,
        name,
        name_ar,
        tax_type_id,
        rate,
        min_amount,
        max_amount,
        effective_from,
        effective_to,
        region,
        item_category,
        is_default,
        is_active,
        notes,
      } = req.body || {};

      if (!code || !String(code).trim()) {
        return res.status(400).json({ success: false, error: 'code is required' });
      }
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }
      if (!effective_from) {
        return res.status(400).json({ success: false, error: 'effective_from is required' });
      }

      const rateNum = toNumber(rate);
      if (rateNum === null || rateNum < 0) {
        return res.status(400).json({ success: false, error: 'rate must be a positive number' });
      }

      const taxTypeId = tax_type_id ? Number(tax_type_id) : null;
      if (taxTypeId) {
        const taxTypeCheck = await pool.query(
          'SELECT id FROM tax_types WHERE id = $1 AND (company_id = $2 OR company_id IS NULL) AND deleted_at IS NULL',
          [taxTypeId, companyId]
        );
        if (taxTypeCheck.rows.length === 0) {
          return res.status(400).json({ success: false, error: 'Invalid tax_type_id' });
        }
      }

      // Enforce one default per company (simple rule)
      const makeDefault = Boolean(is_default);
      if (makeDefault) {
        await pool.query(
          `UPDATE tax_rates
           SET is_default = false, updated_at = NOW(), updated_by = $2
           WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true`,
          [companyId, userId ?? null]
        );
      }

      const inserted = await pool.query(
        `INSERT INTO tax_rates (
          company_id,
          code,
          name,
          name_ar,
          tax_type_id,
          rate,
          min_amount,
          max_amount,
          effective_from,
          effective_to,
          region,
          item_category,
          is_default,
          is_active,
          notes,
          created_by,
          updated_by
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        )
        RETURNING *`,
        [
          companyId,
          String(code).trim(),
          String(name).trim(),
          name_ar ? String(name_ar).trim() : null,
          taxTypeId,
          rateNum,
          toNumber(min_amount),
          toNumber(max_amount),
          effective_from,
          effective_to || null,
          region ? String(region).trim() : null,
          item_category ? String(item_category).trim() : null,
          makeDefault,
          is_active === undefined ? true : Boolean(is_active),
          notes ? String(notes).trim() : null,
          userId ?? null,
          userId ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.status(503).json({ success: false, error: 'Tax rates table not ready (migration not applied yet)' });
      }
      if (error?.code === '23505') {
        return res.status(400).json({ success: false, error: 'Tax rate code already exists' });
      }
      console.error('Error creating tax rate:', error);
      return res.status(500).json({ success: false, error: 'Failed to create tax rate' });
    }
  }
);

// =====================================================
// PUT /api/tax-rates/:id - update
// =====================================================
router.put(
  '/:id',
  requireAnyPermission([
    'master:tax:update',
    'master:taxes:edit',
    'tax:rates:edit',
    'master:edit',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;
    const id = Number(req.params.id);

    try {
      const existing = await pool.query(
        'SELECT * FROM tax_rates WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tax rate not found' });
      }

      const {
        code,
        name,
        name_ar,
        tax_type_id,
        rate,
        min_amount,
        max_amount,
        effective_from,
        effective_to,
        region,
        item_category,
        is_default,
        is_active,
        notes,
      } = req.body || {};

      const updates = {
        code: code !== undefined ? String(code).trim() : existing.rows[0].code,
        name: name !== undefined ? String(name).trim() : existing.rows[0].name,
        name_ar: name_ar !== undefined ? (name_ar ? String(name_ar).trim() : null) : existing.rows[0].name_ar,
        tax_type_id: tax_type_id !== undefined ? (tax_type_id ? Number(tax_type_id) : null) : existing.rows[0].tax_type_id,
        rate: rate !== undefined ? toNumber(rate) : Number(existing.rows[0].rate),
        min_amount: min_amount !== undefined ? toNumber(min_amount) : existing.rows[0].min_amount,
        max_amount: max_amount !== undefined ? toNumber(max_amount) : existing.rows[0].max_amount,
        effective_from: effective_from !== undefined ? effective_from : existing.rows[0].effective_from,
        effective_to: effective_to !== undefined ? (effective_to || null) : existing.rows[0].effective_to,
        region: region !== undefined ? (region ? String(region).trim() : null) : existing.rows[0].region,
        item_category: item_category !== undefined ? (item_category ? String(item_category).trim() : null) : existing.rows[0].item_category,
        is_default: is_default !== undefined ? Boolean(is_default) : Boolean(existing.rows[0].is_default),
        is_active: is_active !== undefined ? Boolean(is_active) : Boolean(existing.rows[0].is_active),
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.rows[0].notes,
      };

      if (!updates.code) return res.status(400).json({ success: false, error: 'code is required' });
      if (!updates.name) return res.status(400).json({ success: false, error: 'name is required' });
      if (!updates.effective_from) return res.status(400).json({ success: false, error: 'effective_from is required' });
      if (updates.rate === null || updates.rate < 0) {
        return res.status(400).json({ success: false, error: 'rate must be a positive number' });
      }

      if (updates.tax_type_id) {
        const taxTypeCheck = await pool.query(
          'SELECT id FROM tax_types WHERE id = $1 AND (company_id = $2 OR company_id IS NULL) AND deleted_at IS NULL',
          [updates.tax_type_id, companyId]
        );
        if (taxTypeCheck.rows.length === 0) {
          return res.status(400).json({ success: false, error: 'Invalid tax_type_id' });
        }
      }

      if (updates.is_default) {
        await pool.query(
          `UPDATE tax_rates
           SET is_default = false, updated_at = NOW(), updated_by = $2
           WHERE company_id = $1 AND deleted_at IS NULL AND is_default = true AND id <> $3`,
          [companyId, userId ?? null, id]
        );
      }

      const result = await pool.query(
        `UPDATE tax_rates
         SET
           code = $3,
           name = $4,
           name_ar = $5,
           tax_type_id = $6,
           rate = $7,
           min_amount = $8,
           max_amount = $9,
           effective_from = $10,
           effective_to = $11,
           region = $12,
           item_category = $13,
           is_default = $14,
           is_active = $15,
           notes = $16,
           updated_by = $17,
           updated_at = NOW()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [
          id,
          companyId,
          updates.code,
          updates.name,
          updates.name_ar,
          updates.tax_type_id,
          updates.rate,
          updates.min_amount,
          updates.max_amount,
          updates.effective_from,
          updates.effective_to,
          updates.region,
          updates.item_category,
          updates.is_default,
          updates.is_active,
          updates.notes,
          userId ?? null,
        ]
      );

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.status(503).json({ success: false, error: 'Tax rates table not ready (migration not applied yet)' });
      }
      if (error?.code === '23505') {
        return res.status(400).json({ success: false, error: 'Tax rate code already exists' });
      }
      console.error('Error updating tax rate:', error);
      return res.status(500).json({ success: false, error: 'Failed to update tax rate' });
    }
  }
);

// =====================================================
// DELETE /api/tax-rates/:id - soft delete
// =====================================================
router.delete(
  '/:id',
  requireAnyPermission([
    'master:tax:delete',
    'master:taxes:delete',
    'tax:rates:delete',
    'master:delete',
  ]),
  requireCompany,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;
    const id = Number(req.params.id);

    try {
      const result = await pool.query(
        `UPDATE tax_rates
         SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId, userId ?? null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tax rate not found' });
      }

      return res.json({ success: true, message: 'Tax rate deleted' });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.status(503).json({ success: false, error: 'Tax rates table not ready (migration not applied yet)' });
      }
      console.error('Error deleting tax rate:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete tax rate' });
    }
  }
);

export default router;
