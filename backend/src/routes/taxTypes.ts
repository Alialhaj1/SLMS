import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { z } from 'zod';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

const taxTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional().nullable(),

  // Backward/forward compatible fields (frontend currently sends these)
  category: z.enum(['vat', 'customs', 'excise', 'withholding', 'zakat', 'other']).optional(),
  tax_category: z.enum(['vat', 'customs', 'excise', 'withholding', 'zakat', 'other']).optional(),

  rate: z.coerce.number().min(0).max(100).optional(),
  default_rate: z.coerce.number().min(0).max(100).optional(),

  calculation_method: z.enum(['percentage', 'fixed', 'tiered']).optional(),
  applies_to: z.array(z.string().min(1).max(50)).optional(),
  tax_authority: z.string().max(100).optional().nullable(),
  reporting_frequency: z.enum(['monthly', 'quarterly', 'annually']).optional(),
  is_recoverable: z.boolean().optional(),
  round_method: z.enum(['normal', 'up', 'down']).optional(),
  effective_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),

  is_compound: z.boolean().optional(),
  is_inclusive: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

function isMissingTableOrColumn(error: any): boolean {
  return Boolean(error && (error.code === '42P01' || error.code === '42703'));
}

function toDateOrNull(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  return s ? s : null;
}

// =====================================================
// GET /api/tax-types - list
// =====================================================
router.get(
  '/',
  requireAnyPermission([
    'tax:view',
    'master:tax:view',
    'master:taxes:view',
    'master:view',
  ]),
  requireCompany,
  auditLog,
  async (req: Request, res: Response) => {
    const companyId = req.companyId as number;
    const { search, tax_category, category, is_active } = req.query as any;

    try {
      const params: any[] = [companyId];
      let idx = 1;

      let sql = `
        SELECT *
        FROM tax_types
        WHERE (company_id = $1 OR company_id IS NULL)
      `;

      // Soft delete column is added via migration; tolerate if missing
      sql += ` AND (deleted_at IS NULL OR deleted_at IS NULL)`;

      if (search) {
        idx++;
        sql += ` AND (code ILIKE $${idx} OR name ILIKE $${idx} OR name_ar ILIKE $${idx})`;
        params.push(`%${String(search)}%`);
      }

      const cat = String(tax_category || category || '').trim().toLowerCase();
      if (cat) {
        idx++;
        sql += ` AND tax_category = $${idx}`;
        params.push(cat);
      }

      if (is_active !== undefined) {
        idx++;
        sql += ` AND is_active = $${idx}`;
        params.push(String(is_active) === 'true');
      }

      sql += ` ORDER BY tax_category ASC, code ASC, id DESC`;

      const result = await pool.query(sql, params);
      return res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      if (isMissingTableOrColumn(error)) {
        return res.json({ success: true, data: [], total: 0 });
      }
      console.error('Error fetching tax types:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch tax types' });
    }
  }
);

// =====================================================
// POST /api/tax-types - create
// =====================================================
router.post(
  '/',
  requireAnyPermission([
    'tax:view',
    'master:tax:create',
    'master:taxes:create',
    'master:create',
  ]),
  requireCompany,
  auditLog,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;

    try {
      const payload = taxTypeSchema.parse(req.body || {});
      const code = String(payload.code).trim().toUpperCase();
      const name = String(payload.name).trim();
      const nameAr = payload.name_ar ? String(payload.name_ar).trim() : null;

      const category = String(payload.tax_category || payload.category || '').trim().toLowerCase();
      const taxCategory = category || 'vat';

      const rate = payload.rate ?? payload.default_rate ?? 0;

      const result = await pool.query(
        `INSERT INTO tax_types (
          company_id, code, name, name_ar,
          tax_category, rate,
          is_compound, is_inclusive, is_active,
          calculation_method, default_rate, applies_to, tax_authority, reporting_frequency,
          is_recoverable, round_method, effective_date, expiry_date, description,
          created_by, updated_by
        ) VALUES (
          $1,$2,$3,$4,
          $5,$6,
          COALESCE($7,false), COALESCE($8,false), COALESCE($9,true),
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $20
        )
        RETURNING *`,
        [
          companyId,
          code,
          name,
          nameAr,
          taxCategory,
          rate,
          payload.is_compound ?? false,
          payload.is_inclusive ?? false,
          payload.is_active ?? true,
          payload.calculation_method ?? 'percentage',
          payload.default_rate ?? rate,
          payload.applies_to ?? [],
          payload.tax_authority ?? null,
          payload.reporting_frequency ?? 'monthly',
          payload.is_recoverable ?? true,
          payload.round_method ?? 'normal',
          toDateOrNull(payload.effective_date),
          toDateOrNull(payload.expiry_date),
          payload.description ?? null,
          userId ?? null,
        ]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'tax_types',
        resourceId: result.rows[0].id,
        after: result.rows[0],
      };

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: 'Invalid payload', details: error.errors });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: 'Tax type code already exists' });
      }
      console.error('Error creating tax type:', error);
      return res.status(500).json({ success: false, error: 'Failed to create tax type' });
    }
  }
);

// =====================================================
// PUT /api/tax-types/:id - update
// =====================================================
router.put(
  '/:id',
  requireAnyPermission([
    'tax:view',
    'master:tax:update',
    'master:taxes:edit',
    'master:edit',
  ]),
  requireCompany,
  auditLog,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;
    const id = Number(req.params.id);

    try {
      if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

      await captureBeforeState(req as any, 'tax_types', id);

      const payload = taxTypeSchema.partial().parse(req.body || {});

      const fields: string[] = [];
      const values: any[] = [id, companyId];
      let idx = 3;

      const setField = (col: string, val: any) => {
        fields.push(`${col} = $${idx}`);
        values.push(val);
        idx++;
      };

      if (payload.code !== undefined) setField('code', String(payload.code).trim().toUpperCase());
      if (payload.name !== undefined) setField('name', String(payload.name).trim());
      if (payload.name_ar !== undefined) setField('name_ar', payload.name_ar ? String(payload.name_ar).trim() : null);

      const category = payload.tax_category ?? payload.category;
      if (category !== undefined) setField('tax_category', String(category).trim().toLowerCase());

      if (payload.rate !== undefined) setField('rate', payload.rate);
      if (payload.default_rate !== undefined) setField('default_rate', payload.default_rate);

      if (payload.calculation_method !== undefined) setField('calculation_method', payload.calculation_method);
      if (payload.applies_to !== undefined) setField('applies_to', payload.applies_to);
      if (payload.tax_authority !== undefined) setField('tax_authority', payload.tax_authority ?? null);
      if (payload.reporting_frequency !== undefined) setField('reporting_frequency', payload.reporting_frequency);
      if (payload.is_recoverable !== undefined) setField('is_recoverable', payload.is_recoverable);
      if (payload.round_method !== undefined) setField('round_method', payload.round_method);
      if (payload.effective_date !== undefined) setField('effective_date', toDateOrNull(payload.effective_date));
      if (payload.expiry_date !== undefined) setField('expiry_date', toDateOrNull(payload.expiry_date));
      if (payload.description !== undefined) setField('description', payload.description ?? null);

      if (payload.is_compound !== undefined) setField('is_compound', payload.is_compound);
      if (payload.is_inclusive !== undefined) setField('is_inclusive', payload.is_inclusive);
      if (payload.is_active !== undefined) setField('is_active', payload.is_active);

      setField('updated_by', userId ?? null);
      setField('updated_at', new Date());

      if (fields.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      const sql = `
        UPDATE tax_types
        SET ${fields.join(', ')}
        WHERE id = $1
          AND (company_id = $2 OR company_id IS NULL)
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await pool.query(sql, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tax type not found' });
      }

      (req as any).auditContext = {
        action: 'update',
        resource: 'tax_types',
        resourceId: id,
        before: (req as any).beforeState,
        after: result.rows[0],
      };

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: 'Invalid payload', details: error.errors });
      }
      console.error('Error updating tax type:', error);
      return res.status(500).json({ success: false, error: 'Failed to update tax type' });
    }
  }
);

// =====================================================
// DELETE /api/tax-types/:id - soft delete
// =====================================================
router.delete(
  '/:id',
  requireAnyPermission([
    'tax:view',
    'master:tax:delete',
    'master:taxes:delete',
    'master:delete',
  ]),
  requireCompany,
  auditLog,
  async (req: any, res: Response) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id as number | undefined;
    const id = Number(req.params.id);

    try {
      if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

      await captureBeforeState(req as any, 'tax_types', id);

      const result = await pool.query(
        `UPDATE tax_types
         SET deleted_at = NOW(), updated_by = $3, updated_at = NOW()
         WHERE id = $1 AND (company_id = $2 OR company_id IS NULL) AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId, userId ?? null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tax type not found' });
      }

      (req as any).auditContext = {
        action: 'delete',
        resource: 'tax_types',
        resourceId: id,
        before: (req as any).beforeState,
        after: { id, deleted_at: new Date().toISOString() },
      };

      return res.json({ success: true, message: 'Deleted' });
    } catch (error: any) {
      console.error('Error deleting tax type:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete tax type' });
    }
  }
);

export default router;
