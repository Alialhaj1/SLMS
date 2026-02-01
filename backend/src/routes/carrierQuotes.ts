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
  origin: z.string().min(1).max(255),
  destination: z.string().min(1).max(255),
  service_level: z.enum(['standard', 'express']).optional().default('standard'),
  transit_days: z.number().int().min(1).max(3650).optional().default(7),
  amount: z.number().min(0.01).max(9999999999),
  currency: z.string().min(3).max(3).optional().default('SAR'),
  valid_until: z.string().min(1),
  notes: z.string().max(5000).optional().nullable(),
});

function toDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * @route   GET /api/carrier-quotes
 * @desc    List carrier quotes
 * @access  Private (logistics:carrier_quotes:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_quotes:view'),
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
          carrier ILIKE $${paramCount}
          OR origin ILIKE $${paramCount}
          OR destination ILIKE $${paramCount}
          OR service_level ILIKE $${paramCount}
          OR currency ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM carrier_quotes ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, carrier, origin, destination, service_level, transit_days, amount, currency, valid_until, notes, created_at, updated_at
         FROM carrier_quotes
         ${whereSql}
         ORDER BY valid_until DESC, id DESC
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
      console.error('Error fetching carrier quotes:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch carrier quotes' } });
    }
  }
);

/**
 * @route   GET /api/carrier-quotes/:id
 * @desc    Get carrier quote by ID
 * @access  Private (logistics:carrier_quotes:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_quotes:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT id, company_id, carrier, origin, destination, service_level, transit_days, amount, currency, valid_until, notes, created_at, updated_at
         FROM carrier_quotes
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Carrier quote not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching carrier quote:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch carrier quote' } });
    }
  }
);

/**
 * @route   POST /api/carrier-quotes
 * @desc    Create carrier quote
 * @access  Private (logistics:carrier_quotes:manage)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_quotes:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = schema.parse(req.body);

      const validUntil = toDate(payload.valid_until);
      if (!validUntil) {
        return res.status(400).json({ success: false, error: { message: 'Invalid valid_until' } });
      }

      const result = await pool.query(
        `INSERT INTO carrier_quotes (
          company_id, carrier, origin, destination, service_level, transit_days, amount, currency, valid_until, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id, company_id, carrier, origin, destination, service_level, transit_days, amount, currency, valid_until, notes, created_at, updated_at`,
        [
          companyId,
          payload.carrier.trim(),
          payload.origin.trim(),
          payload.destination.trim(),
          payload.service_level,
          payload.transit_days,
          payload.amount,
          payload.currency.toUpperCase(),
          validUntil,
          payload.notes ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating carrier quote:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create carrier quote' } });
    }
  }
);

/**
 * @route   PUT /api/carrier-quotes/:id
 * @desc    Update carrier quote
 * @access  Private (logistics:carrier_quotes:manage)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_quotes:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'carrier_quotes', id);
      const payload = schema.partial().parse(req.body);

      const validUntil = payload.valid_until !== undefined ? toDate(payload.valid_until) : null;
      if (payload.valid_until !== undefined && !validUntil) {
        return res.status(400).json({ success: false, error: { message: 'Invalid valid_until' } });
      }

      const result = await pool.query(
        `UPDATE carrier_quotes
         SET
          carrier = COALESCE($1, carrier),
          origin = COALESCE($2, origin),
          destination = COALESCE($3, destination),
          service_level = COALESCE($4, service_level),
          transit_days = COALESCE($5, transit_days),
          amount = COALESCE($6, amount),
          currency = COALESCE($7, currency),
          valid_until = COALESCE($8, valid_until),
          notes = COALESCE($9, notes),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $10 AND company_id = $11 AND deleted_at IS NULL
         RETURNING id, company_id, carrier, origin, destination, service_level, transit_days, amount, currency, valid_until, notes, created_at, updated_at`,
        [
          payload.carrier !== undefined ? payload.carrier.trim() : null,
          payload.origin !== undefined ? payload.origin.trim() : null,
          payload.destination !== undefined ? payload.destination.trim() : null,
          payload.service_level ?? null,
          payload.transit_days !== undefined ? payload.transit_days : null,
          payload.amount !== undefined ? payload.amount : null,
          payload.currency !== undefined ? payload.currency.toUpperCase() : null,
          validUntil,
          payload.notes !== undefined ? payload.notes : null,
          id,
          companyId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Carrier quote not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating carrier quote:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update carrier quote' } });
    }
  }
);

/**
 * @route   DELETE /api/carrier-quotes/:id
 * @desc    Soft delete carrier quote
 * @access  Private (logistics:carrier_quotes:manage)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:carrier_quotes:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'carrier_quotes', id);

      const result = await pool.query(
        `UPDATE carrier_quotes
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Carrier quote not found' } });
      }

      return res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Error deleting carrier quote:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete carrier quote' } });
    }
  }
);

export default router;
