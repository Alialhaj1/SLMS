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
  notes_en: z.string().optional(),
  notes_ar: z.string().optional(),
  is_active: z.boolean().optional().default(true),
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
        `SELECT id, company_id, code, name_en, name_ar, notes_en, notes_ar, is_active, created_at, updated_at
         FROM customs_exemptions
         ${whereSql}
         ORDER BY code ASC
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
        `SELECT id, company_id, code, name_en, name_ar, notes_en, notes_ar, is_active, created_at, updated_at
         FROM customs_exemptions
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
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
        `INSERT INTO customs_exemptions (company_id, code, name_en, name_ar, notes_en, notes_ar, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, company_id, code, name_en, name_ar, notes_en, notes_ar, is_active, created_at, updated_at`,
        [companyId, payload.code, payload.name_en, payload.name_ar, payload.notes_en ?? null, payload.notes_ar ?? null, payload.is_active ?? true]
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
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND company_id = $8 AND deleted_at IS NULL
         RETURNING id, company_id, code, name_en, name_ar, notes_en, notes_ar, is_active, created_at, updated_at`,
        [payload.code, payload.name_en, payload.name_ar, payload.notes_en, payload.notes_ar, payload.is_active, id, companyId]
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
