import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { z } from 'zod';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const schema = z.object({
  code: z.string().min(1).max(30),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  is_active: z.boolean().optional().default(true),
});

/**
 * @route   GET /api/logistics-shipment-types
 * @access  Private (logistics:shipment_types:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_types:view'),
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
        where.push(`(code ILIKE $${paramCount} OR name_en ILIKE $${paramCount} OR name_ar ILIKE $${paramCount})`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      const count = await pool.query(`SELECT COUNT(*)::int AS total FROM logistics_shipment_types ${whereSql}`, params);
      const totalItems = count.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const list = await pool.query(
        `SELECT id, company_id, code, name_en, name_ar, is_active, created_at, updated_at
         FROM logistics_shipment_types
         ${whereSql}
         ORDER BY code ASC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      return res.json({
        success: true,
        data: list.rows,
        total: totalItems,
        pagination: { currentPage: page, totalPages, totalItems, pageSize: limit },
      });
    } catch (error) {
      console.error('Error fetching logistics shipment types:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch shipment types' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipment-types
 * @access  Private (logistics:shipment_types:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_types:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = schema.parse(req.body);
      const userId = (req as any).user?.id ?? null;

      const insert = await pool.query(
        `INSERT INTO logistics_shipment_types (company_id, code, name_en, name_ar, is_active, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$6)
         RETURNING id, company_id, code, name_en, name_ar, is_active, created_at, updated_at`,
        [companyId, payload.code.trim(), payload.name_en.trim(), payload.name_ar.trim(), payload.is_active ?? true, userId]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'logistics_shipment_types',
        resourceId: insert.rows[0].id,
        after: insert.rows[0],
      };

      return res.status(201).json({ success: true, data: insert.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Shipment type code already exists' } });
      }

      console.error('Error creating logistics shipment type:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create shipment type' } });
    }
  }
);

/**
 * @route   PUT /api/logistics-shipment-types/:id
 * @access  Private (logistics:shipment_types:edit)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_types:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      await captureBeforeState(req as any, 'logistics_shipment_types', id);

      const payload = schema.partial().parse(req.body);
      const userId = (req as any).user?.id ?? null;

      const update = await pool.query(
        `UPDATE logistics_shipment_types
         SET code = COALESCE($1, code),
             name_en = COALESCE($2, name_en),
             name_ar = COALESCE($3, name_ar),
             is_active = COALESCE($4, is_active),
             updated_by = COALESCE($5, updated_by),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 AND company_id = $7 AND deleted_at IS NULL
         RETURNING id, company_id, code, name_en, name_ar, is_active, created_at, updated_at`,
        [
          payload.code !== undefined ? payload.code.trim() : null,
          payload.name_en !== undefined ? payload.name_en.trim() : null,
          payload.name_ar !== undefined ? payload.name_ar.trim() : null,
          payload.is_active ?? null,
          userId,
          id,
          companyId,
        ]
      );

      if (update.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment type not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: update.rows[0],
      };

      return res.json({ success: true, data: update.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Shipment type code already exists' } });
      }

      console.error('Error updating logistics shipment type:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update shipment type' } });
    }
  }
);

/**
 * @route   DELETE /api/logistics-shipment-types/:id
 * @access  Private (logistics:shipment_types:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_types:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      await captureBeforeState(req as any, 'logistics_shipment_types', id);

      const result = await pool.query(
        `UPDATE logistics_shipment_types
         SET deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment type not found' } });
      }

      return res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Error deleting logistics shipment type:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete shipment type' } });
    }
  }
);

export default router;
