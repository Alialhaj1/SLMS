import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

const tariffSchema = z.object({
  hs_code: z.string().min(1).max(50),
  country_code: z.string().min(1).max(10),
  duty_rate_percent: z.number().min(0).max(100),
  effective_from: z.string().min(1), // ISO date
  effective_to: z.string().optional(),
  notes_en: z.string().optional(),
  notes_ar: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  // Allow larger page sizes for master-data browsing (HS/tariffs can be ~20k rows).
  // Frontend still paginates; this simply enables 20/50/100/all options.
  const limit = Math.min(50000, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * @route   GET /api/customs-tariffs
 * @desc    List customs tariffs
 * @access  Private (logistics:customs_tariffs:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_tariffs:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const search = (req.query.search as string | undefined)?.trim();
      const is_active = req.query.is_active as string | undefined;
      const hs_code = req.query.hs_code as string | undefined;
      const country_code = req.query.country_code as string | undefined;

      const where: string[] = ['ct.deleted_at IS NULL', 'ct.company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (is_active !== undefined) {
        where.push(`ct.is_active = $${paramCount}`);
        params.push(is_active === 'true');
        paramCount++;
      }

      if (hs_code) {
        where.push(`ct.hs_code = $${paramCount}`);
        params.push(hs_code);
        paramCount++;
      }

      if (country_code) {
        where.push(`ct.country_code = $${paramCount}`);
        params.push(country_code);
        paramCount++;
      }

      if (search) {
        where.push(`(
          ct.hs_code ILIKE $${paramCount}
          OR ct.country_code ILIKE $${paramCount}
          OR hs.description_en ILIKE $${paramCount}
          OR hs.description_ar ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM customs_tariffs ct
         LEFT JOIN hs_codes hs
           ON hs.company_id = ct.company_id
          AND hs.code = ct.hs_code
          AND hs.deleted_at IS NULL
         ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT
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
           CASE
             WHEN COALESCE(ct.notes_en, '') ILIKE '%prohibited%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%ممنوع%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%محظور%'
               THEN 'PROHIBITED'
             WHEN COALESCE(ct.notes_en, '') ILIKE '%exempt%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%معف%'
               THEN 'EXEMPT'
             ELSE 'DUTY'
           END AS rule_type,
           ct.created_at,
           ct.updated_at
         FROM customs_tariffs ct
         LEFT JOIN hs_codes hs
           ON hs.company_id = ct.company_id
          AND hs.code = ct.hs_code
          AND hs.deleted_at IS NULL
         ${whereSql}
         ORDER BY ct.hs_code ASC, ct.country_code ASC, ct.effective_from DESC
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
      console.error('Error fetching customs tariffs:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch customs tariffs' },
      });
    }
  }
);

/**
 * @route   GET /api/customs-tariffs/:id
 * @desc    Get customs tariff by ID
 * @access  Private (logistics:customs_tariffs:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_tariffs:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT
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
           CASE
             WHEN COALESCE(ct.notes_en, '') ILIKE '%prohibited%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%ممنوع%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%محظور%'
               THEN 'PROHIBITED'
             WHEN COALESCE(ct.notes_en, '') ILIKE '%exempt%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%معف%'
               THEN 'EXEMPT'
             ELSE 'DUTY'
           END AS rule_type,
           ct.created_at,
           ct.updated_at
         FROM customs_tariffs ct
         LEFT JOIN hs_codes hs
           ON hs.company_id = ct.company_id
          AND hs.code = ct.hs_code
          AND hs.deleted_at IS NULL
         WHERE ct.id = $1 AND ct.company_id = $2 AND ct.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Customs tariff not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching customs tariff:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch customs tariff' },
      });
    }
  }
);

/**
 * @route   POST /api/customs-tariffs
 * @desc    Create customs tariff
 * @access  Private (logistics:customs_tariffs:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_tariffs:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = tariffSchema.parse(req.body);

      const insertResult = await pool.query(
        `INSERT INTO customs_tariffs (
          company_id, hs_code, country_code, duty_rate_percent, effective_from, effective_to, notes_en, notes_ar, is_active
        ) VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9)
         RETURNING id, company_id, hs_code, country_code, duty_rate_percent, effective_from, effective_to, notes_en, notes_ar, is_active, created_at, updated_at`,
        [
          companyId,
          payload.hs_code,
          payload.country_code,
          payload.duty_rate_percent,
          payload.effective_from,
          payload.effective_to ?? null,
          payload.notes_en ?? null,
          payload.notes_ar ?? null,
          payload.is_active ?? true,
        ]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'customs_tariffs',
        resourceId: insertResult.rows[0].id,
        after: insertResult.rows[0],
      };

      return res.status(201).json({ success: true, data: insertResult.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Tariff already exists for this HS/country/effective date' } });
      }

      console.error('Error creating customs tariff:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create customs tariff' } });
    }
  }
);

/**
 * @route   PUT /api/customs-tariffs/:id
 * @desc    Update customs tariff
 * @access  Private (logistics:customs_tariffs:edit)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_tariffs:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'customs_tariffs', id);

      const payload = tariffSchema.partial().parse(req.body);

      const result = await pool.query(
        `UPDATE customs_tariffs
         SET hs_code = COALESCE($1, hs_code),
             country_code = COALESCE($2, country_code),
             duty_rate_percent = COALESCE($3, duty_rate_percent),
             effective_from = COALESCE($4::date, effective_from),
             effective_to = COALESCE($5::date, effective_to),
             notes_en = COALESCE($6, notes_en),
             notes_ar = COALESCE($7, notes_ar),
             is_active = COALESCE($8, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND company_id = $10 AND deleted_at IS NULL
         RETURNING id, company_id, hs_code, country_code, duty_rate_percent, effective_from, effective_to, notes_en, notes_ar, is_active, created_at, updated_at`,
        [
          payload.hs_code,
          payload.country_code,
          payload.duty_rate_percent,
          payload.effective_from,
          payload.effective_to,
          payload.notes_en,
          payload.notes_ar,
          payload.is_active,
          id,
          companyId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Customs tariff not found' } });
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
        return res.status(409).json({ success: false, error: { message: 'Tariff already exists for this HS/country/effective date' } });
      }

      console.error('Error updating customs tariff:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update customs tariff' } });
    }
  }
);

/**
 * @route   DELETE /api/customs-tariffs/:id
 * @desc    Soft delete customs tariff
 * @access  Private (logistics:customs_tariffs:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_tariffs:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'customs_tariffs', id);

      const result = await pool.query(
        `UPDATE customs_tariffs
         SET deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Customs tariff not found' } });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting customs tariff:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete customs tariff' } });
    }
  }
);

export default router;
