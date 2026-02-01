import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

const shipmentLifecycleStatusSchema = z.object({
  code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  is_active: z.boolean().optional().default(true),
});

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * @route   GET /api/shipment-lifecycle-statuses
 * @desc    List shipment lifecycle statuses
 * @access  Private (logistics:shipment_lifecycle_statuses:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_lifecycle_statuses:view'),
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

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM shipment_lifecycle_statuses ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, code, name_en, name_ar, is_active, created_at, updated_at
         FROM shipment_lifecycle_statuses
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
      console.error('Error fetching shipment lifecycle statuses:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch shipment lifecycle statuses' },
      });
    }
  }
);

/**
 * @route   GET /api/shipment-lifecycle-statuses/:id
 * @desc    Get shipment lifecycle status by ID
 * @access  Private (logistics:shipment_lifecycle_statuses:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_lifecycle_statuses:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT id, company_id, code, name_en, name_ar, is_active, created_at, updated_at
         FROM shipment_lifecycle_statuses
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment lifecycle status not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching shipment lifecycle status:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch shipment lifecycle status' },
      });
    }
  }
);

/**
 * @route   POST /api/shipment-lifecycle-statuses
 * @desc    Create shipment lifecycle status
 * @access  Private (logistics:shipment_lifecycle_statuses:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_lifecycle_statuses:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = shipmentLifecycleStatusSchema.parse(req.body);

      const insertResult = await pool.query(
        `INSERT INTO shipment_lifecycle_statuses (company_id, code, name_en, name_ar, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, company_id, code, name_en, name_ar, is_active, created_at, updated_at`,
        [companyId, payload.code, payload.name_en, payload.name_ar, payload.is_active ?? true]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'shipment_lifecycle_statuses',
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
          error: { message: 'Shipment lifecycle status code already exists' },
        });
      }

      console.error('Error creating shipment lifecycle status:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to create shipment lifecycle status' },
      });
    }
  }
);

/**
 * @route   PUT /api/shipment-lifecycle-statuses/:id
 * @desc    Update shipment lifecycle status
 * @access  Private (logistics:shipment_lifecycle_statuses:edit)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_lifecycle_statuses:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_lifecycle_statuses', id);

      const payload = shipmentLifecycleStatusSchema.partial().parse(req.body);

      const result = await pool.query(
        `UPDATE shipment_lifecycle_statuses
         SET code = COALESCE($1, code),
             name_en = COALESCE($2, name_en),
             name_ar = COALESCE($3, name_ar),
             is_active = COALESCE($4, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND company_id = $6 AND deleted_at IS NULL
         RETURNING id, company_id, code, name_en, name_ar, is_active, created_at, updated_at`,
        [payload.code, payload.name_en, payload.name_ar, payload.is_active, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment lifecycle status not found' } });
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
          error: { message: 'Shipment lifecycle status code already exists' },
        });
      }

      console.error('Error updating shipment lifecycle status:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to update shipment lifecycle status' },
      });
    }
  }
);

/**
 * @route   DELETE /api/shipment-lifecycle-statuses/:id
 * @desc    Soft delete shipment lifecycle status
 * @access  Private (logistics:shipment_lifecycle_statuses:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_lifecycle_statuses:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_lifecycle_statuses', id);

      const result = await pool.query(
        `UPDATE shipment_lifecycle_statuses
         SET deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment lifecycle status not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: { deleted_at: new Date().toISOString() },
      };

      return res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Error deleting shipment lifecycle status:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete shipment lifecycle status' },
      });
    }
  }
);

export default router;
