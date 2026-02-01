import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const schema = z.object({
  carrier: z.string().min(1).max(255),
  period_from: z.string().min(1),
  period_to: z.string().min(1),
  on_time_pct: z.number().min(0).max(100).optional().default(0),
  damage_pct: z.number().min(0).max(100).optional().default(0),
  communication_score: z.number().int().min(1).max(5).optional().default(3),
  cost_score: z.number().int().min(1).max(5).optional().default(3),
  notes: z.string().max(5000).optional().nullable(),
});

function toDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * @route   GET /api/carrier-evaluations
 * @desc    List carrier evaluations
 * @access  Private (logistics:carrier_evaluations:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_evaluations:view'),
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
        where.push(`carrier ILIKE $${paramCount}`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM carrier_evaluations ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, carrier, period_from, period_to, on_time_pct, damage_pct, communication_score, cost_score, notes, created_at, updated_at
         FROM carrier_evaluations
         ${whereSql}
         ORDER BY period_to DESC, id DESC
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
      console.error('Error fetching carrier evaluations:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch carrier evaluations' } });
    }
  }
);

/**
 * @route   GET /api/carrier-evaluations/:id
 * @desc    Get carrier evaluation by ID
 * @access  Private (logistics:carrier_evaluations:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_evaluations:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT id, company_id, carrier, period_from, period_to, on_time_pct, damage_pct, communication_score, cost_score, notes, created_at, updated_at
         FROM carrier_evaluations
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Carrier evaluation not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching carrier evaluation:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch carrier evaluation' } });
    }
  }
);

/**
 * @route   POST /api/carrier-evaluations
 * @desc    Create carrier evaluation
 * @access  Private (logistics:carrier_evaluations:manage)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_evaluations:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = schema.parse(req.body);

      const periodFrom = toDate(payload.period_from);
      const periodTo = toDate(payload.period_to);
      if (!periodFrom || !periodTo) {
        return res.status(400).json({ success: false, error: { message: 'Invalid period dates' } });
      }

      const result = await pool.query(
        `INSERT INTO carrier_evaluations (
          company_id, carrier, period_from, period_to, on_time_pct, damage_pct, communication_score, cost_score, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id, company_id, carrier, period_from, period_to, on_time_pct, damage_pct, communication_score, cost_score, notes, created_at, updated_at`,
        [
          companyId,
          payload.carrier.trim(),
          periodFrom,
          periodTo,
          payload.on_time_pct,
          payload.damage_pct,
          payload.communication_score,
          payload.cost_score,
          payload.notes ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating carrier evaluation:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create carrier evaluation' } });
    }
  }
);

/**
 * @route   PUT /api/carrier-evaluations/:id
 * @desc    Update carrier evaluation
 * @access  Private (logistics:carrier_evaluations:manage)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_evaluations:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'carrier_evaluations', id);
      const payload = schema.partial().parse(req.body);

      const periodFrom = payload.period_from !== undefined ? toDate(payload.period_from) : null;
      const periodTo = payload.period_to !== undefined ? toDate(payload.period_to) : null;
      if (payload.period_from !== undefined && !periodFrom) {
        return res.status(400).json({ success: false, error: { message: 'Invalid period_from' } });
      }
      if (payload.period_to !== undefined && !periodTo) {
        return res.status(400).json({ success: false, error: { message: 'Invalid period_to' } });
      }

      const result = await pool.query(
        `UPDATE carrier_evaluations
         SET
          carrier = COALESCE($1, carrier),
          period_from = COALESCE($2, period_from),
          period_to = COALESCE($3, period_to),
          on_time_pct = COALESCE($4, on_time_pct),
          damage_pct = COALESCE($5, damage_pct),
          communication_score = COALESCE($6, communication_score),
          cost_score = COALESCE($7, cost_score),
          notes = COALESCE($8, notes),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND company_id = $10 AND deleted_at IS NULL
         RETURNING id, company_id, carrier, period_from, period_to, on_time_pct, damage_pct, communication_score, cost_score, notes, created_at, updated_at`,
        [
          payload.carrier !== undefined ? payload.carrier.trim() : null,
          periodFrom,
          periodTo,
          payload.on_time_pct !== undefined ? payload.on_time_pct : null,
          payload.damage_pct !== undefined ? payload.damage_pct : null,
          payload.communication_score !== undefined ? payload.communication_score : null,
          payload.cost_score !== undefined ? payload.cost_score : null,
          payload.notes !== undefined ? payload.notes : null,
          id,
          companyId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Carrier evaluation not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating carrier evaluation:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update carrier evaluation' } });
    }
  }
);

/**
 * @route   DELETE /api/carrier-evaluations/:id
 * @desc    Soft delete carrier evaluation
 * @access  Private (logistics:carrier_evaluations:manage)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_evaluations:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'carrier_evaluations', id);

      const result = await pool.query(
        `UPDATE carrier_evaluations
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Carrier evaluation not found' } });
      }

      return res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Error deleting carrier evaluation:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete carrier evaluation' } });
    }
  }
);

export default router;
