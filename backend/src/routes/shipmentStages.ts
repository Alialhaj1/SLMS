import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

const shipmentStageSchema = z.object({
  code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  sort_order: z.number().int().min(0).max(100000).optional().default(10),
});

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * @route   GET /api/shipment-stages
 * @desc    List shipment stages
 * @access  Private (logistics:shipment_stages:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_stages:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const search = (req.query.search as string | undefined)?.trim();

      const where: string[] = ['deleted_at IS NULL', 'company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (search) {
        where.push(`(
          code ILIKE $${paramCount}
          OR name_en ILIKE $${paramCount}
          OR name_ar ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM shipment_stages ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, code, name_en, name_ar, sort_order, created_at, updated_at
         FROM shipment_stages
         ${whereSql}
         ORDER BY sort_order ASC, code ASC
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
      console.error('Error fetching shipment stages:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch shipment stages' },
      });
    }
  }
);

/**
 * @route   GET /api/shipment-stages/:id
 * @desc    Get shipment stage by ID
 * @access  Private (logistics:shipment_stages:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_stages:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT id, company_id, code, name_en, name_ar, sort_order, created_at, updated_at
         FROM shipment_stages
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment stage not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching shipment stage:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch shipment stage' },
      });
    }
  }
);

/**
 * @route   POST /api/shipment-stages
 * @desc    Create shipment stage
 * @access  Private (logistics:shipment_stages:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_stages:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const parsedBody = z
        .object({
          code: z.string(),
          name_en: z.string(),
          name_ar: z.string(),
          sort_order: z.union([z.number().int(), z.string()]).optional(),
        })
        .parse(req.body);

      const payload = shipmentStageSchema.parse({
        ...parsedBody,
        sort_order:
          parsedBody.sort_order === undefined
            ? undefined
            : typeof parsedBody.sort_order === 'string'
              ? Number(parsedBody.sort_order)
              : parsedBody.sort_order,
      });

      const insertResult = await pool.query(
        `INSERT INTO shipment_stages (company_id, code, name_en, name_ar, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, company_id, code, name_en, name_ar, sort_order, created_at, updated_at`,
        [companyId, payload.code, payload.name_en, payload.name_ar, payload.sort_order ?? 10]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'shipment_stages',
        resourceId: insertResult.rows[0].id,
        after: insertResult.rows[0],
      };

      return res.status(201).json({ success: true, data: insertResult.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: error.errors },
        });
      }

      if (error?.code === '23505') {
        return res.status(409).json({
          success: false,
          error: { message: 'Shipment stage code already exists' },
        });
      }

      console.error('Error creating shipment stage:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to create shipment stage' },
      });
    }
  }
);

/**
 * @route   PUT /api/shipment-stages/:id
 * @desc    Update shipment stage
 * @access  Private (logistics:shipment_stages:edit)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_stages:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_stages', id);

      const parsedBody = z
        .object({
          code: z.string().optional(),
          name_en: z.string().optional(),
          name_ar: z.string().optional(),
          sort_order: z.union([z.number().int(), z.string()]).optional(),
        })
        .parse(req.body);

      const payload = shipmentStageSchema.partial().parse({
        ...parsedBody,
        sort_order:
          parsedBody.sort_order === undefined
            ? undefined
            : typeof parsedBody.sort_order === 'string'
              ? Number(parsedBody.sort_order)
              : parsedBody.sort_order,
      });

      const result = await pool.query(
        `UPDATE shipment_stages
         SET code = COALESCE($1, code),
             name_en = COALESCE($2, name_en),
             name_ar = COALESCE($3, name_ar),
             sort_order = COALESCE($4, sort_order),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND company_id = $6 AND deleted_at IS NULL
         RETURNING id, company_id, code, name_en, name_ar, sort_order, created_at, updated_at`,
        [payload.code, payload.name_en, payload.name_ar, payload.sort_order, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment stage not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: result.rows[0],
      };

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: error.errors },
        });
      }

      if (error?.code === '23505') {
        return res.status(409).json({
          success: false,
          error: { message: 'Shipment stage code already exists' },
        });
      }

      console.error('Error updating shipment stage:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to update shipment stage' },
      });
    }
  }
);

/**
 * @route   DELETE /api/shipment-stages/:id
 * @desc    Soft delete shipment stage
 * @access  Private (logistics:shipment_stages:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_stages:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_stages', id);

      const result = await pool.query(
        `UPDATE shipment_stages
         SET deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment stage not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: { deleted_at: new Date().toISOString() },
      };

      return res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Error deleting shipment stage:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete shipment stage' },
      });
    }
  }
);

export default router;
