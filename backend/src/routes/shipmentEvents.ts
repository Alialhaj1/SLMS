import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const listQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  shipment_id: z.string().optional(),
  shipment_reference: z.string().optional(),
  event_type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const exportQuerySchema = z.object({
  search: z.string().optional(),
  shipment_id: z.string().optional(),
  shipment_reference: z.string().optional(),
  event_type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * @route   GET /api/shipment-events
 * @desc    List shipment events
 * @access  Private (logistics:shipment_events:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_events:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const parsed = listQuerySchema.parse(req.query);
      const { page, limit, offset } = parsePagination(parsed);

      const search = parsed.search?.trim();
      const shipmentIdRaw = parsed.shipment_id?.trim();
      const shipmentReference = parsed.shipment_reference?.trim();
      const eventType = parsed.event_type?.trim();
      const from = parsed.from?.trim();
      const to = parsed.to?.trim();

      const where: string[] = ['deleted_at IS NULL', 'company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (shipmentIdRaw) {
        const shipmentId = Number(shipmentIdRaw);
        if (!Number.isNaN(shipmentId)) {
          where.push(`shipment_id = $${paramCount}`);
          params.push(shipmentId);
          paramCount++;
        }
      }

      if (shipmentReference) {
        where.push(`shipment_reference ILIKE $${paramCount}`);
        params.push(`%${shipmentReference}%`);
        paramCount++;
      }

      if (eventType) {
        where.push(`event_type = $${paramCount}`);
        params.push(eventType);
        paramCount++;
      }

      if (from) {
        where.push(`occurred_at >= $${paramCount}`);
        params.push(new Date(from));
        paramCount++;
      }

      if (to) {
        where.push(`occurred_at <= $${paramCount}`);
        params.push(new Date(to));
        paramCount++;
      }

      if (search) {
        where.push(`(
          COALESCE(shipment_reference, '') ILIKE $${paramCount}
          OR event_type ILIKE $${paramCount}
          OR COALESCE(stage_code, '') ILIKE $${paramCount}
          OR COALESCE(status_code, '') ILIKE $${paramCount}
          OR COALESCE(location, '') ILIKE $${paramCount}
          OR COALESCE(description_en, '') ILIKE $${paramCount}
          OR COALESCE(description_ar, '') ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM shipment_events ${whereSql}`,
        params
      );

      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, shipment_id, shipment_reference, event_type, event_source, stage_code, status_code, location,
          description_en, description_ar, occurred_at, metadata, created_by, created_at, updated_at
         FROM shipment_events
         ${whereSql}
         ORDER BY occurred_at DESC, id DESC
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
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: error.errors },
        });
      }

      console.error('Error fetching shipment events:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch shipment events' },
      });
    }
  }
);

/**
 * @route   GET /api/shipment-events/export
 * @desc    Export shipment events as CSV
 * @access  Private (logistics:shipment_events:export)
 */
router.get(
  '/export',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_events:export'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const parsed = exportQuerySchema.parse(req.query);

      const search = parsed.search?.trim();
      const shipmentIdRaw = parsed.shipment_id?.trim();
      const shipmentReference = parsed.shipment_reference?.trim();
      const eventType = parsed.event_type?.trim();
      const from = parsed.from?.trim();
      const to = parsed.to?.trim();

      const where: string[] = ['deleted_at IS NULL', 'company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (shipmentIdRaw) {
        const shipmentId = Number(shipmentIdRaw);
        if (!Number.isNaN(shipmentId)) {
          where.push(`shipment_id = $${paramCount}`);
          params.push(shipmentId);
          paramCount++;
        }
      }

      if (shipmentReference) {
        where.push(`shipment_reference ILIKE $${paramCount}`);
        params.push(`%${shipmentReference}%`);
        paramCount++;
      }

      if (eventType) {
        where.push(`event_type = $${paramCount}`);
        params.push(eventType);
        paramCount++;
      }

      if (from) {
        where.push(`occurred_at >= $${paramCount}`);
        params.push(new Date(from));
        paramCount++;
      }

      if (to) {
        where.push(`occurred_at <= $${paramCount}`);
        params.push(new Date(to));
        paramCount++;
      }

      if (search) {
        where.push(`(
          COALESCE(shipment_reference, '') ILIKE $${paramCount}
          OR event_type ILIKE $${paramCount}
          OR COALESCE(stage_code, '') ILIKE $${paramCount}
          OR COALESCE(status_code, '') ILIKE $${paramCount}
          OR COALESCE(location, '') ILIKE $${paramCount}
          OR COALESCE(description_en, '') ILIKE $${paramCount}
          OR COALESCE(description_ar, '') ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT id, shipment_id, shipment_reference, event_type, event_source, stage_code, status_code, location,
          description_en, description_ar, occurred_at, created_at
         FROM shipment_events
         ${whereSql}
         ORDER BY occurred_at DESC, id DESC
         LIMIT 5000`,
        params
      );

      const header = [
        'id',
        'shipment_id',
        'shipment_reference',
        'event_type',
        'event_source',
        'stage_code',
        'status_code',
        'location',
        'description_en',
        'description_ar',
        'occurred_at',
        'created_at',
      ];

      const escape = (value: any) => {
        const s = value === null || value === undefined ? '' : String(value);
        if (/[\n\r,\"]/g.test(s)) {
          return `"${s.replace(/\"/g, '""')}"`;
        }
        return s;
      };

      const rows = result.rows.map((r) =>
        header
          .map((h) => escape((r as any)[h]))
          .join(',')
      );

      const csv = [header.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="shipment-events.csv"');
      return res.status(200).send(csv);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: error.errors },
        });
      }

      console.error('Error exporting shipment events:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to export shipment events' },
      });
    }
  }
);

export default router;
