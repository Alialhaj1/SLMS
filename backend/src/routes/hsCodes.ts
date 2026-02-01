import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

const hsCodeSchema = z.object({
  code: z.string().min(1).max(50),
  description_en: z.string().min(1).max(255),
  description_ar: z.string().min(1).max(255),
  is_active: z.boolean().optional().default(true),
});

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  // HS codes can be large datasets (e.g., ~20k). Allow larger page sizes for pickers.
  const limit = Math.min(50000, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * @route   GET /api/hs-codes
 * @desc    List HS codes
 * @access  Private (logistics:hs_codes:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:hs_codes:view'),
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
          OR description_en ILIKE $${paramCount}
          OR description_ar ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM hs_codes ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, code, description_en, description_ar, is_active, created_at, updated_at
         FROM hs_codes
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
      console.error('Error fetching HS codes:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch HS codes' },
      });
    }
  }
);

/**
 * @route   GET /api/hs-codes/:id
 * @desc    Get HS code by ID
 * @access  Private (logistics:hs_codes:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:hs_codes:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT id, company_id, code, description_en, description_ar, is_active, created_at, updated_at
         FROM hs_codes
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'HS code not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching HS code:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch HS code' },
      });
    }
  }
);

/**
 * @route   POST /api/hs-codes
 * @desc    Create HS code
 * @access  Private (logistics:hs_codes:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:hs_codes:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = hsCodeSchema.parse(req.body);

      const insertResult = await pool.query(
        `INSERT INTO hs_codes (company_id, code, description_en, description_ar, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, company_id, code, description_en, description_ar, is_active, created_at, updated_at`,
        [companyId, payload.code, payload.description_en, payload.description_ar, payload.is_active ?? true]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'hs_codes',
        resourceId: insertResult.rows[0].id,
        after: insertResult.rows[0],
      };

      return res.status(201).json({ success: true, data: insertResult.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }

      // Unique constraint
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'HS code already exists' } });
      }

      console.error('Error creating HS code:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create HS code' } });
    }
  }
);

/**
 * @route   PUT /api/hs-codes/:id
 * @desc    Update HS code
 * @access  Private (logistics:hs_codes:edit)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:hs_codes:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'hs_codes', id);

      const payload = hsCodeSchema.partial().parse(req.body);

      const result = await pool.query(
        `UPDATE hs_codes
         SET code = COALESCE($1, code),
             description_en = COALESCE($2, description_en),
             description_ar = COALESCE($3, description_ar),
             is_active = COALESCE($4, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND company_id = $6 AND deleted_at IS NULL
         RETURNING id, company_id, code, description_en, description_ar, is_active, created_at, updated_at`,
        [payload.code, payload.description_en, payload.description_ar, payload.is_active, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'HS code not found' } });
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
        return res.status(409).json({ success: false, error: { message: 'HS code already exists' } });
      }

      console.error('Error updating HS code:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update HS code' } });
    }
  }
);

/**
 * @route   DELETE /api/hs-codes/:id
 * @desc    Soft delete HS code
 * @access  Private (logistics:hs_codes:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:hs_codes:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'hs_codes', id);

      const result = await pool.query(
        `UPDATE hs_codes
         SET deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'HS code not found' } });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting HS code:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete HS code' } });
    }
  }
);

export default router;
