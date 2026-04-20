import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

const exemptionSchema = z.object({
  code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  notes_en: z.string().optional().nullable(),
  notes_ar: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  exemption_type: z.enum(['partial', 'full', 'conditional']).optional().nullable(),
  exemption_number: z.string().max(100).optional().nullable(),
  rate_percent: z.number().min(0).max(100).optional().nullable(),
  exemption_level: z.enum(['national', 'regional', 'bilateral', 'multilateral']).optional().nullable(),
  hs_codes: z.string().optional().nullable(),
  country_id: z.number().int().optional().nullable(),
  fta_agreement: z.string().max(255).optional().nullable(),
  beneficiary: z.string().max(255).optional().nullable(),
  project_id: z.number().int().optional().nullable(),
  effective_from: z.string().optional().nullable(),
  effective_to: z.string().optional().nullable(),
  max_quantity: z.number().optional().nullable(),
  max_value: z.number().optional().nullable(),
  decision_number: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
});

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * @route   GET /api/customs-exemptions
 * @desc    List customs exemptions
 * @access  Private (logistics:customs_exemptions:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_exemptions:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const search = (req.query.search as string | undefined)?.trim();
      const is_active = req.query.is_active as string | undefined;

      const where: string[] = ['deleted_at IS NULL', 'company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        where.push(`is_active = $${paramCount}`);
        params.push(is_active === 'true');
        paramCount++;
      }

      if (search) {
        where.push(`(
          code ILIKE $${paramCount}
          OR name_en ILIKE $${paramCount}
          OR name_ar ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM customs_exemptions ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT ce.id, ce.company_id, ce.code, ce.name_en, ce.name_ar, ce.notes_en, ce.notes_ar, ce.is_active,
                ce.exemption_type, ce.exemption_number, ce.rate_percent, ce.exemption_level, ce.hs_codes,
                ce.country_id, ce.fta_agreement, ce.beneficiary, ce.project_id,
                ce.effective_from, ce.effective_to, ce.max_quantity, ce.max_value,
                ce.decision_number, ce.description, ce.description_ar,
                ce.created_at, ce.updated_at,
                c.name_en AS country_name_en, c.name_ar AS country_name_ar
         FROM customs_exemptions ce
         LEFT JOIN countries c ON c.id = ce.country_id
         ${whereSql.replace(/\b(deleted_at|company_id|is_active|code|name_en|name_ar)\b/g, 'ce.$1')}
         ORDER BY ce.code ASC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      return res.json({
        success: true,
        data: listResult.rows,
        total: totalItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
        },
      });
    } catch (error) {
      console.error('Error fetching customs exemptions:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch customs exemptions' },
      });
    }
  }
);

/**
 * @route   GET /api/customs-exemptions/:id
 * @desc    Get customs exemption by ID
 * @access  Private (logistics:customs_exemptions:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_exemptions:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT ce.id, ce.company_id, ce.code, ce.name_en, ce.name_ar, ce.notes_en, ce.notes_ar, ce.is_active,
                ce.exemption_type, ce.exemption_number, ce.rate_percent, ce.exemption_level, ce.hs_codes,
                ce.country_id, ce.fta_agreement, ce.beneficiary, ce.project_id,
                ce.effective_from, ce.effective_to, ce.max_quantity, ce.max_value,
                ce.decision_number, ce.description, ce.description_ar,
                ce.created_at, ce.updated_at,
                c.name_en AS country_name_en, c.name_ar AS country_name_ar
         FROM customs_exemptions ce
         LEFT JOIN countries c ON c.id = ce.country_id
         WHERE ce.id = $1 AND ce.company_id = $2 AND ce.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Customs exemption not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching customs exemption:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch customs exemption' },
      });
    }
  }
);

/**
 * @route   POST /api/customs-exemptions
 * @desc    Create customs exemption
 * @access  Private (logistics:customs_exemptions:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_exemptions:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = exemptionSchema.parse(req.body);

      const insertResult = await pool.query(
        `INSERT INTO customs_exemptions (
           company_id, code, name_en, name_ar, notes_en, notes_ar, is_active,
           exemption_type, exemption_number, rate_percent, exemption_level, hs_codes,
           country_id, fta_agreement, beneficiary, project_id,
           effective_from, effective_to, max_quantity, max_value,
           decision_number, description, description_ar
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         RETURNING *`,
        [
          companyId, payload.code, payload.name_en, payload.name_ar,
          payload.notes_en ?? null, payload.notes_ar ?? null, payload.is_active ?? true,
          payload.exemption_type ?? null, payload.exemption_number ?? null,
          payload.rate_percent ?? null, payload.exemption_level ?? null, payload.hs_codes ?? null,
          payload.country_id ?? null, payload.fta_agreement ?? null, payload.beneficiary ?? null,
          payload.project_id ?? null, payload.effective_from ?? null, payload.effective_to ?? null,
          payload.max_quantity ?? null, payload.max_value ?? null,
          payload.decision_number ?? null, payload.description ?? null, payload.description_ar ?? null
        ]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'customs_exemptions',
        resourceId: insertResult.rows[0].id,
        after: insertResult.rows[0],
      };

      return res.status(201).json({ success: true, data: insertResult.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Exemption code already exists' } });
      }

      console.error('Error creating customs exemption:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create customs exemption' } });
    }
  }
);

/**
 * @route   PUT /api/customs-exemptions/:id
 * @desc    Update customs exemption
 * @access  Private (logistics:customs_exemptions:edit)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_exemptions:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'customs_exemptions', id);

      const payload = exemptionSchema.partial().parse(req.body);

      const result = await pool.query(
        `UPDATE customs_exemptions
         SET code = COALESCE($1, code),
             name_en = COALESCE($2, name_en),
             name_ar = COALESCE($3, name_ar),
             notes_en = COALESCE($4, notes_en),
             notes_ar = COALESCE($5, notes_ar),
             is_active = COALESCE($6, is_active),
             exemption_type = COALESCE($9, exemption_type),
             exemption_number = COALESCE($10, exemption_number),
             rate_percent = COALESCE($11, rate_percent),
             exemption_level = COALESCE($12, exemption_level),
             hs_codes = COALESCE($13, hs_codes),
             country_id = COALESCE($14, country_id),
             fta_agreement = COALESCE($15, fta_agreement),
             beneficiary = COALESCE($16, beneficiary),
             project_id = COALESCE($17, project_id),
             effective_from = COALESCE($18, effective_from),
             effective_to = COALESCE($19, effective_to),
             max_quantity = COALESCE($20, max_quantity),
             max_value = COALESCE($21, max_value),
             decision_number = COALESCE($22, decision_number),
             description = COALESCE($23, description),
             description_ar = COALESCE($24, description_ar),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND company_id = $8 AND deleted_at IS NULL
         RETURNING *`,
        [
          payload.code, payload.name_en, payload.name_ar, payload.notes_en, payload.notes_ar, payload.is_active,
          id, companyId,
          payload.exemption_type, payload.exemption_number, payload.rate_percent, payload.exemption_level,
          payload.hs_codes, payload.country_id, payload.fta_agreement, payload.beneficiary,
          payload.project_id, payload.effective_from, payload.effective_to, payload.max_quantity,
          payload.max_value, payload.decision_number, payload.description, payload.description_ar
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Customs exemption not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: result.rows[0],
      };

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Exemption code already exists' } });
      }

      console.error('Error updating customs exemption:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update customs exemption' } });
    }
  }
);

/**
 * @route   DELETE /api/customs-exemptions/:id
 * @desc    Soft delete customs exemption
 * @access  Private (logistics:customs_exemptions:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_exemptions:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'customs_exemptions', id);

      const result = await pool.query(
        `UPDATE customs_exemptions
         SET deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Customs exemption not found' } });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting customs exemption:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete customs exemption' } });
    }
  }
);

export default router;
