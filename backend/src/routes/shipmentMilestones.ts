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

const milestoneSchema = z.object({
  shipment_reference: z.string().min(1).max(100),
  origin: z.string().max(255).optional().nullable(),
  destination: z.string().max(255).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  etd_planned: z.string().optional().nullable(),
  eta_planned: z.string().optional().nullable(),
  atd_actual: z.string().optional().nullable(),
  ata_actual: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

function toDateOrNull(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @route   GET /api/shipment-milestones
 * @desc    List shipment milestones
 * @access  Private (logistics:shipment_milestones:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_milestones:view'),
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
        where.push(`shipment_reference ILIKE $${paramCount}`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM shipment_milestones ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, shipment_reference, origin, destination, status, etd_planned, eta_planned, atd_actual, ata_actual, notes, created_at, updated_at
         FROM shipment_milestones
         ${whereSql}
         ORDER BY updated_at DESC, id DESC
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
      console.error('Error fetching shipment milestones:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch shipment milestones' } });
    }
  }
);

/**
 * @route   GET /api/shipment-milestones/:id
 * @desc    Get shipment milestone by ID
 * @access  Private (logistics:shipment_milestones:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_milestones:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      const result = await pool.query(
        `SELECT id, company_id, shipment_reference, origin, destination, status, etd_planned, eta_planned, atd_actual, ata_actual, notes, created_at, updated_at
         FROM shipment_milestones
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment milestone not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching shipment milestone:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch shipment milestone' } });
    }
  }
);

/**
 * @route   POST /api/shipment-milestones
 * @desc    Create shipment milestone (upsert by shipment_reference)
 * @access  Private (logistics:shipment_milestones:manage)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_milestones:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = milestoneSchema.parse(req.body);

      const insertResult = await pool.query(
        `INSERT INTO shipment_milestones (
          company_id, shipment_reference, origin, destination, status, etd_planned, eta_planned, atd_actual, ata_actual, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (company_id, shipment_reference)
        DO UPDATE SET
          origin = EXCLUDED.origin,
          destination = EXCLUDED.destination,
          status = EXCLUDED.status,
          etd_planned = EXCLUDED.etd_planned,
          eta_planned = EXCLUDED.eta_planned,
          atd_actual = EXCLUDED.atd_actual,
          ata_actual = EXCLUDED.ata_actual,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP,
          deleted_at = NULL
        RETURNING id, company_id, shipment_reference, origin, destination, status, etd_planned, eta_planned, atd_actual, ata_actual, notes, created_at, updated_at`,
        [
          companyId,
          payload.shipment_reference.trim(),
          payload.origin?.trim() || null,
          payload.destination?.trim() || null,
          payload.status?.trim() || 'created',
          toDateOrNull(payload.etd_planned),
          toDateOrNull(payload.eta_planned),
          toDateOrNull(payload.atd_actual),
          toDateOrNull(payload.ata_actual),
          payload.notes ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: insertResult.rows[0] });
    } catch (error: any) {
      console.error('Error creating shipment milestone:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create shipment milestone' } });
    }
  }
);

/**
 * @route   PUT /api/shipment-milestones/:id
 * @desc    Update shipment milestone
 * @access  Private (logistics:shipment_milestones:manage)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_milestones:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_milestones', id);
      const payload = milestoneSchema.partial().parse(req.body);

      const updateResult = await pool.query(
        `UPDATE shipment_milestones
         SET
           shipment_reference = COALESCE($1, shipment_reference),
           origin = COALESCE($2, origin),
           destination = COALESCE($3, destination),
           status = COALESCE($4, status),
           etd_planned = COALESCE($5, etd_planned),
           eta_planned = COALESCE($6, eta_planned),
           atd_actual = COALESCE($7, atd_actual),
           ata_actual = COALESCE($8, ata_actual),
           notes = COALESCE($9, notes),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $10 AND company_id = $11 AND deleted_at IS NULL
         RETURNING id, company_id, shipment_reference, origin, destination, status, etd_planned, eta_planned, atd_actual, ata_actual, notes, created_at, updated_at`,
        [
          payload.shipment_reference ? payload.shipment_reference.trim() : null,
          payload.origin !== undefined ? payload.origin?.trim() || null : null,
          payload.destination !== undefined ? payload.destination?.trim() || null : null,
          payload.status !== undefined ? payload.status?.trim() || null : null,
          payload.etd_planned !== undefined ? toDateOrNull(payload.etd_planned) : null,
          payload.eta_planned !== undefined ? toDateOrNull(payload.eta_planned) : null,
          payload.atd_actual !== undefined ? toDateOrNull(payload.atd_actual) : null,
          payload.ata_actual !== undefined ? toDateOrNull(payload.ata_actual) : null,
          payload.notes !== undefined ? payload.notes : null,
          id,
          companyId,
        ]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment milestone not found' } });
      }

      return res.json({ success: true, data: updateResult.rows[0] });
    } catch (error) {
      console.error('Error updating shipment milestone:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update shipment milestone' } });
    }
  }
);

/**
 * @route   DELETE /api/shipment-milestones/:id
 * @desc    Soft delete shipment milestone
 * @access  Private (logistics:shipment_milestones:manage)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_milestones:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_milestones', id);

      const result = await pool.query(
        `UPDATE shipment_milestones
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment milestone not found' } });
      }

      return res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Error deleting shipment milestone:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete shipment milestone' } });
    }
  }
);

export default router;
