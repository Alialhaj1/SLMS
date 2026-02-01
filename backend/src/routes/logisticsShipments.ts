import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import multer from 'multer';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { DocumentNumberService } from '../services/documentNumberService';

// Configure multer for file uploads (memory storage)
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const shipmentBaseSchema = z.object({
    shipment_number: z.string().min(1).max(60),
    shipment_type_id: z.number().int().positive(),
    project_id: z.number().int().positive(), // MANDATORY: shipment-centric architecture
    incoterm: z.string().min(1).max(20),

    bl_no: z.string().max(60).optional().nullable(),
    awb_no: z.string().max(60).optional().nullable(),

    origin_location_id: z.number().int().positive(),
    destination_location_id: z.number().int().positive(),
    expected_arrival_date: z.string().optional().nullable(), // ISO date - optional

    // Port and payment information (Migration 130)
    port_of_loading_id: z.number().int().positive().optional().nullable(), // Optional - can use text instead
    port_of_loading_text: z.string().max(200).optional().nullable(), // Free text for loading port
    port_of_discharge_id: z.number().int().positive(),
    payment_method: z.string().max(100).optional().nullable(),
    lc_number: z.string().max(100).optional().nullable(),
    total_amount: z.number().optional().nullable(),

    warehouse_id: z.number().int().positive().optional().nullable(),
    vendor_id: z.number().int().positive().optional().nullable(),
    purchase_order_id: z.number().int().positive().optional().nullable(),

    stage_code: z.string().max(50).optional().nullable(),
    status_code: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
});

const shipmentCreateSchema = shipmentBaseSchema.refine(
  (v) => {
    const bl = (v.bl_no ?? '').trim();
    const awb = (v.awb_no ?? '').trim();
    return bl.length > 0 || awb.length > 0;
  },
  { message: 'Either bl_no or awb_no must be provided' }
);

const shipmentUpdateSchema = shipmentBaseSchema.partial();

const itemUpsertSchema = z.object({
  item_id: z.number().int().positive(),
  quantity: z.number().positive(),
  unit_cost: z.number().nonnegative().optional(),
});

const receiveSchema = z.object({
  warehouse_id: z.number().int().positive(),
  receipt_no: z.string().min(1).max(60).optional(),
  received_at: z.string().optional(),
  notes: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        shipment_item_id: z.number().int().positive().optional(),
        item_id: z.number().int().positive().optional(),
        qty: z.number().positive(),
        unit_cost: z.number().nonnegative().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional(),
});

const costCreateSchema = z.object({
  cost_type_code: z.string().min(1).max(30),
  amount: z.number().positive(),
  currency_id: z.number().int().positive(),
  description: z.string().optional().nullable(),
});

async function ensureShipmentCompany(companyId: number, shipmentId: number) {
  const result = await pool.query(
    `SELECT id, company_id, locked_at, locked_by, deleted_at
     FROM logistics_shipments
     WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [shipmentId, companyId]
  );
  return result.rows[0] as
    | { id: number; company_id: number; locked_at: string | null; locked_by: number | null; deleted_at: string | null }
    | undefined;
}

/**
 * @route   GET /api/logistics-shipments/preview-number
 * @desc    Preview next shipment number (auto-generate)
 * @access  Private
 */
router.get(
  '/preview-number',
  authenticate,
  loadCompanyContext,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId!;
      
      // Try to use document number service, fallback to manual format
      let number: string;
      try {
        number = await DocumentNumberService.previewNextNumber(companyId, 'shipment' as any);
      } catch (e) {
        // Fallback: generate simple format
        const result = await pool.query(
          `SELECT shipment_number FROM logistics_shipments 
           WHERE company_id = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC LIMIT 1`,
          [companyId]
        );
        
        const lastNumber = result.rows[0]?.shipment_number;
        const year = new Date().getFullYear();
        
        if (lastNumber) {
          const match = lastNumber.match(/(\d+)$/);
          if (match) {
            const nextSeq = parseInt(match[1], 10) + 1;
            number = `SHP-${year}-${nextSeq.toString().padStart(4, '0')}`;
          } else {
            number = `SHP-${year}-0001`;
          }
        } else {
          number = `SHP-${year}-0001`;
        }
      }

      return res.json({ success: true, number });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
);

/**
 * @route   GET /api/logistics-shipments/summary
 * @desc    Get shipments summary statistics with filters
 * @access  Private (logistics:shipments:view)
 */
router.get(
  '/summary',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const year = req.query.year ? parseInt(String(req.query.year), 10) : null;
      const month = req.query.month ? parseInt(String(req.query.month), 10) : null;

      let dateFilter = '';
      const params: any[] = [companyId];
      let paramCount = 2;

      if (year) {
        dateFilter += ` AND EXTRACT(YEAR FROM s.created_at) = $${paramCount}`;
        params.push(year);
        paramCount++;
      }
      if (month) {
        dateFilter += ` AND EXTRACT(MONTH FROM s.created_at) = $${paramCount}`;
        params.push(month);
        paramCount++;
      }

      // Get counts by status
      const countsQuery = await pool.query(
        `SELECT
           COUNT(*)::int AS total_shipments,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(s.status_code, '')) NOT IN ('delivered', 'received', 'completed', 'cancelled', 'canceled'))::int AS active_shipments,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(s.status_code, '')) IN ('delivered', 'received', 'completed'))::int AS received_shipments,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(s.status_code, '')) IN ('cancelled', 'canceled'))::int AS cancelled_shipments
         FROM logistics_shipments s
         WHERE s.company_id = $1 AND s.deleted_at IS NULL${dateFilter}`,
        params
      );

      // Get financial summary (from purchase orders and letters of credit)
      const financialQuery = await pool.query(
        `WITH payment_totals AS (
           SELECT 
             s.id AS shipment_id,
             po.id AS po_id,
             po.total_amount,
             po.currency_id,
             s.project_id,
             COALESCE(
               (SELECT SUM(vp.base_amount)
                FROM vendor_payments vp
                WHERE (vp.purchase_order_id = po.id 
                       OR vp.shipment_id = s.id 
                       OR (vp.project_id = s.project_id AND vp.purchase_order_id IS NULL AND vp.shipment_id IS NULL))
                  AND vp.deleted_at IS NULL
                  AND vp.status IN ('posted', 'draft')),
               0
             ) AS po_paid_base,
             COALESCE(
               (SELECT SUM(vp.payment_amount)
                FROM vendor_payments vp
                WHERE (vp.purchase_order_id = po.id 
                       OR vp.shipment_id = s.id 
                       OR (vp.project_id = s.project_id AND vp.purchase_order_id IS NULL AND vp.shipment_id IS NULL))
                  AND vp.deleted_at IS NULL
                  AND vp.status IN ('posted', 'draft')),
               0
             ) AS po_paid_amount,
             0 AS lc_paid_base,
             0 AS lc_paid_amount,
             COALESCE(
               (SELECT er.rate FROM exchange_rates er
                JOIN currencies base_curr ON base_curr.id = er.to_currency_id AND base_curr.is_base_currency = true
                WHERE er.from_currency_id = po.currency_id 
                  AND er.deleted_at IS NULL 
                  AND er.is_active = true
                ORDER BY er.rate_date DESC LIMIT 1),
               po.exchange_rate,
               1
             ) AS exchange_rate
           FROM logistics_shipments s
           LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id AND po.deleted_at IS NULL
           WHERE s.company_id = $1 AND s.deleted_at IS NULL
             AND LOWER(COALESCE(s.status_code, '')) NOT IN ('delivered', 'received', 'completed', 'cancelled', 'canceled')${dateFilter}
         )
         SELECT
           COALESCE(SUM(total_amount * exchange_rate), 0) AS total_po_value_base,
           COALESCE(SUM(po_paid_base + lc_paid_base), 0) AS total_paid_base
         FROM payment_totals`,
        params
      );

      // Get amounts by currency
      let amountsByCurrency = {};
      try {
        const currencyQuery = await pool.query(
          `WITH payment_totals AS (
             SELECT 
               po.currency_id,
               curr.code AS currency_code,
               curr.symbol AS currency_symbol,
               po.total_amount,
               s.project_id,
               COALESCE(
                 (SELECT SUM(vp.payment_amount)
                  FROM vendor_payments vp
                  WHERE (vp.purchase_order_id = po.id 
                         OR vp.shipment_id = s.id 
                         OR (vp.project_id = s.project_id AND vp.purchase_order_id IS NULL AND vp.shipment_id IS NULL))
                    AND vp.deleted_at IS NULL
                    AND vp.status IN ('posted', 'draft')),
                 0
               ) AS po_paid_amount,
               0 AS lc_paid_amount
             FROM logistics_shipments s
             LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id AND po.deleted_at IS NULL
             LEFT JOIN currencies curr ON curr.id = po.currency_id AND curr.deleted_at IS NULL
             WHERE s.company_id = $1 AND s.deleted_at IS NULL
               AND LOWER(COALESCE(s.status_code, '')) NOT IN ('delivered', 'received', 'completed', 'cancelled', 'canceled')${dateFilter}
               AND curr.code IS NOT NULL
           )
           SELECT
             currency_code,
             currency_symbol,
             COALESCE(SUM(total_amount), 0) AS total,
             COALESCE(SUM(po_paid_amount + lc_paid_amount), 0) AS paid
           FROM payment_totals
           GROUP BY currency_code, currency_symbol`,
          params
        );
        
        currencyQuery.rows.forEach((row: any) => {
          amountsByCurrency[row.currency_code] = {
            total: Number(row.total),
            paid: Number(row.paid),
            symbol: row.currency_symbol
          };
        });
      } catch (e) {
        console.error('Error fetching amounts by currency:', e);
      }

      // Get total expenses in SAR
      let totalExpensesSAR = 0;
      try {
        const expensesQuery = await pool.query(
          `SELECT COALESCE(SUM(se.amount_in_base_currency), 0) AS total_expenses
           FROM shipment_expenses se
           JOIN logistics_shipments s ON s.id = se.shipment_id
           WHERE s.company_id = $1 AND s.deleted_at IS NULL AND se.deleted_at IS NULL
             AND LOWER(COALESCE(s.status_code, '')) NOT IN ('delivered', 'received', 'completed', 'cancelled', 'canceled')${dateFilter}`,
          params
        );
        totalExpensesSAR = Number(expensesQuery.rows[0]?.total_expenses || 0);
      } catch (e) {
        // shipment_expenses table might not exist
      }

      // Get container counts from shipping bills
      let containerSummary: { container_type: string; count: number }[] = [];
      let totalContainersCount = 0;
      try {
        const containerQuery = await pool.query(
          `SELECT 
             COALESCE(sb.container_type, 'Unknown') AS container_type,
             SUM(sb.containers_count)::int AS count
           FROM shipping_bills sb
           JOIN logistics_shipments s ON s.id = sb.shipment_id
           WHERE s.company_id = $1 AND s.deleted_at IS NULL AND sb.deleted_at IS NULL${dateFilter}
             AND sb.containers_count > 0
           GROUP BY sb.container_type
           ORDER BY count DESC`,
          params
        );
        containerSummary = containerQuery.rows;
        totalContainersCount = containerQuery.rows.reduce((sum: number, row: any) => sum + row.count, 0);
      } catch (e) {
        // Container tables might not exist
      }

      const counts = countsQuery.rows[0] || {};
      const financial = financialQuery.rows[0] || {};

      return res.json({
        success: true,
        data: {
          total_shipments: counts.total_shipments || 0,
          active_shipments: counts.active_shipments || 0,
          received_shipments: counts.received_shipments || 0,
          cancelled_shipments: counts.cancelled_shipments || 0,
          total_po_value: Number(financial.total_po_value_base || 0),
          total_paid: Number(financial.total_paid_base || 0),
          total_remaining: Number(financial.total_po_value_base || 0) - Number(financial.total_paid_base || 0),
          total_expenses_sar: totalExpensesSAR,
          total_containers: totalContainersCount,
          containers: containerSummary,
          amounts_by_currency: amountsByCurrency,
          currency: 'SAR'
        }
      });
    } catch (error) {
      console.error('Error fetching shipments summary:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch summary' } });
    }
  }
);

/**
 * @route   GET /api/logistics-shipments
 * @access  Private (logistics:shipments:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const search = (req.query.search as string | undefined)?.trim();
      const status = (req.query.status as string | undefined)?.trim()?.toLowerCase();
      const year = req.query.year ? parseInt(String(req.query.year), 10) : null;
      const month = req.query.month ? parseInt(String(req.query.month), 10) : null;

      const where: string[] = ['s.deleted_at IS NULL', 's.company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (search) {
        where.push(`(s.shipment_number ILIKE $${paramCount} OR s.bl_no ILIKE $${paramCount} OR s.awb_no ILIKE $${paramCount} OR v.name ILIKE $${paramCount})`);
        params.push(`%${search}%`);
        paramCount++;
      }

      // Status filter: active, received, cancelled
      if (status === 'active') {
        where.push(`LOWER(COALESCE(s.status_code, '')) NOT IN ('delivered', 'received', 'completed', 'cancelled', 'canceled')`);
      } else if (status === 'received') {
        where.push(`LOWER(COALESCE(s.status_code, '')) IN ('delivered', 'received', 'completed')`);
      } else if (status === 'cancelled') {
        where.push(`LOWER(COALESCE(s.status_code, '')) IN ('cancelled', 'canceled')`);
      }

      // Date filters
      if (year) {
        where.push(`EXTRACT(YEAR FROM s.created_at) = $${paramCount}`);
        params.push(year);
        paramCount++;
      }
      if (month) {
        where.push(`EXTRACT(MONTH FROM s.created_at) = $${paramCount}`);
        params.push(month);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      const count = await pool.query(`SELECT COUNT(*)::int AS total FROM logistics_shipments s LEFT JOIN vendors v ON v.id = s.vendor_id ${whereSql}`, params);
      const totalItems = count.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      // Enhanced query with all required columns
      const list = await pool.query(
        `SELECT
           s.id,
           s.shipment_number,
           s.project_id,
           s.incoterm,
           s.bl_no,
           s.awb_no,
           s.expected_arrival_date,
           s.locked_at,
           s.created_at,
           s.status_code,
           s.stage_code,
           st.name_en AS shipment_type_name_en,
           st.name_ar AS shipment_type_name_ar,
           v.id AS vendor_id,
           v.name AS vendor_name,
           v.code AS vendor_code,
           po.id AS purchase_order_id,
           po.order_number AS po_number,
           po.total_amount AS po_total_amount,
           COALESCE(
             (SELECT SUM(vp.payment_amount)
              FROM vendor_payments vp
              WHERE (vp.purchase_order_id = po.id 
                     OR vp.shipment_id = s.id 
                     OR (vp.project_id = s.project_id AND vp.purchase_order_id IS NULL AND vp.shipment_id IS NULL))
                AND vp.deleted_at IS NULL
                AND vp.status IN ('posted', 'draft')),
             0
           ) AS po_paid_amount,
           po.total_amount - COALESCE(
             (SELECT SUM(vp.payment_amount)
              FROM vendor_payments vp
              WHERE (vp.purchase_order_id = po.id 
                     OR vp.shipment_id = s.id 
                     OR (vp.project_id = s.project_id AND vp.purchase_order_id IS NULL AND vp.shipment_id IS NULL))
                AND vp.deleted_at IS NULL
                AND vp.status IN ('posted', 'draft')),
             0
           ) AS po_remaining_amount,
           po_curr.code AS po_currency_code,
           po_curr.symbol AS po_currency_symbol,
           po_curr.code AS actual_currency_code,
           po_curr.symbol AS actual_currency_symbol,
           COALESCE(
             (SELECT er.rate FROM exchange_rates er
              JOIN currencies base_curr ON base_curr.id = er.to_currency_id AND base_curr.is_base_currency = true
              WHERE er.from_currency_id = po.currency_id 
                AND er.deleted_at IS NULL 
                AND er.is_active = true
              ORDER BY er.rate_date DESC LIMIT 1),
             po.exchange_rate,
             1
           ) AS exchange_rate,
           (SELECT COALESCE(SUM(se.amount_in_base_currency), 0) 
            FROM shipment_expenses se 
            WHERE se.shipment_id = s.id AND se.deleted_at IS NULL) AS total_expenses_sar,
           (SELECT json_agg(json_build_object(
             'item_name', i.name,
             'item_name_ar', i.name_ar,
             'quantity', si.quantity,
             'unit_code', u.code
           ))
            FROM logistics_shipment_items si
            JOIN items i ON i.id = si.item_id
            LEFT JOIN units_of_measure u ON u.id = COALESCE(si.uom_id, i.base_uom_id)
            WHERE si.shipment_id = s.id AND si.deleted_at IS NULL
            LIMIT 3) AS items_preview,
           (SELECT COUNT(*)::int FROM logistics_shipment_items si WHERE si.shipment_id = s.id AND si.deleted_at IS NULL) AS items_count,
           cd.declaration_number AS customs_declaration_number,
           cds.code AS customs_status_code,
           s.lc_number,
           COALESCE(
             (SELECT lc.original_amount
              FROM letters_of_credit lc
              WHERE lc.lc_number = s.lc_number
                AND lc.deleted_at IS NULL
              LIMIT 1),
             0
           ) AS lc_amount,
           (SELECT json_agg(json_build_object(
             'bill_number', sb.bill_number,
             'container_type', sb.container_type,
             'containers_count', sb.containers_count,
             'container_numbers', sb.container_numbers
           ))
            FROM shipping_bills sb
            WHERE sb.shipment_id = s.id AND sb.deleted_at IS NULL) AS containers,
           (SELECT COALESCE(SUM(sb.containers_count), 0)::int
            FROM shipping_bills sb
            WHERE sb.shipment_id = s.id AND sb.deleted_at IS NULL) AS containers_count
         FROM logistics_shipments s
         LEFT JOIN logistics_shipment_types st ON st.id = s.shipment_type_id
         LEFT JOIN vendors v ON v.id = s.vendor_id AND v.deleted_at IS NULL
         LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id AND po.deleted_at IS NULL
         LEFT JOIN currencies po_curr ON po_curr.id = po.currency_id AND po_curr.deleted_at IS NULL
         LEFT JOIN customs_declarations cd ON cd.shipment_id = s.id AND cd.deleted_at IS NULL
         LEFT JOIN customs_declaration_statuses cds ON cds.id = cd.status_id AND cds.deleted_at IS NULL
         ${whereSql}
         ORDER BY 
           CASE WHEN s.expected_arrival_date IS NOT NULL AND s.expected_arrival_date >= CURRENT_DATE THEN 0 ELSE 1 END,
           s.expected_arrival_date ASC NULLS LAST,
           s.created_at DESC
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
      console.error('Error fetching logistics shipments:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch shipments' } });
    }
  }
);

/**
 * @route   GET /api/logistics-shipments/export-excel
 * @desc    Export all shipments with comprehensive data to Excel (MUST be before /:id)
 * @access  Private (logistics:shipments:view)
 */
router.get(
  '/export-excel',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;

      // Fetch comprehensive shipment data with all related information
      const shipmentsQuery = await pool.query(
        `SELECT
           s.id,
           s.shipment_number,
           s.bl_no,
           s.awb_no,
           s.incoterm,
           s.notes,
           s.expected_arrival_date,
           s.stage_code,
           s.status_code,
           s.total_amount,
           s.lc_number,
           s.payment_method,
           s.port_of_loading_text,
           s.created_at,
           st.name_en AS shipment_type_name_en,
           st.name_ar AS shipment_type_name_ar,
           v.id AS vendor_id,
           v.code AS vendor_code,
           v.name AS vendor_name,
           proj.id AS project_id,
           proj.code AS project_code,
           proj.name AS project_name,
           po.id AS purchase_order_id,
           po.order_number AS po_number,
           po.vendor_contract_number,
           po.total_amount AS po_total_amount,
           po_curr.code AS po_currency_code,
           po_curr.symbol AS po_currency_symbol,
           COALESCE(
             (SELECT er.rate FROM exchange_rates er
              JOIN currencies base_curr ON base_curr.id = er.to_currency_id AND base_curr.is_base_currency = true
              WHERE er.from_currency_id = po.currency_id 
                AND er.deleted_at IS NULL 
                AND er.is_active = true
              ORDER BY er.rate_date DESC LIMIT 1),
             po.exchange_rate,
             1
           ) AS po_exchange_rate,
           pol.name_en AS port_of_loading_name,
           pol.name_ar AS port_of_loading_name_ar,
           pod.name_en AS port_of_discharge_name,
           pod.name_ar AS port_of_discharge_name_ar,
           dest.name_en AS destination_name,
           dest.name_ar AS destination_name_ar,
           wh.name AS warehouse_name
         FROM logistics_shipments s
         LEFT JOIN logistics_shipment_types st ON st.id = s.shipment_type_id
         LEFT JOIN vendors v ON v.id = s.vendor_id AND v.deleted_at IS NULL
         LEFT JOIN projects proj ON proj.id = s.project_id AND proj.deleted_at IS NULL
         LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id AND po.deleted_at IS NULL
         LEFT JOIN currencies po_curr ON po_curr.id = po.currency_id AND po_curr.deleted_at IS NULL
         LEFT JOIN ports pol ON pol.id = s.port_of_loading_id AND pol.deleted_at IS NULL
         LEFT JOIN ports pod ON pod.id = s.port_of_discharge_id AND pod.deleted_at IS NULL
         LEFT JOIN cities dest ON dest.id = s.destination_location_id AND dest.deleted_at IS NULL
         LEFT JOIN warehouses wh ON wh.id = s.warehouse_id AND wh.deleted_at IS NULL
         WHERE s.company_id = $1 AND s.deleted_at IS NULL
         ORDER BY s.created_at DESC`,
        [companyId]
      );

      // Fetch items for all shipments
      const itemsQuery = await pool.query(
        `SELECT
           si.shipment_id,
           i.code AS item_code,
           i.name AS item_name,
           i.name_ar AS item_name_ar,
           si.quantity,
           u.code AS unit_code,
           u.name_en AS unit_name,
           si.unit_cost,
           si.received_qty,
           (si.quantity * COALESCE(si.unit_cost, 0)) AS line_total
         FROM logistics_shipment_items si
         JOIN items i ON i.id = si.item_id AND i.deleted_at IS NULL
         JOIN logistics_shipments s ON s.id = si.shipment_id
         LEFT JOIN units_of_measure u ON u.id = COALESCE(si.uom_id, i.base_uom_id) AND u.deleted_at IS NULL
         WHERE s.company_id = $1 AND s.deleted_at IS NULL AND si.deleted_at IS NULL
         ORDER BY si.shipment_id, i.code`,
        [companyId]
      );

      // Fetch expenses for all shipments (V2 system)
      let expenseRows: any[] = [];
      try {
        const expensesQuery = await pool.query(
          `SELECT
             se.shipment_id,
             et.code AS expense_type_code,
             et.name AS expense_type_name,
             et.name_ar AS expense_type_name_ar,
             se.amount_before_vat,
             se.vat_amount,
             se.total_amount,
             se.amount_in_base_currency,
             c.code AS currency_code
           FROM shipment_expenses se
           JOIN logistics_shipments s ON s.id = se.shipment_id
           LEFT JOIN shipment_expense_types et ON et.id = se.expense_type_id
           LEFT JOIN currencies c ON c.id = se.currency_id AND c.deleted_at IS NULL
           WHERE s.company_id = $1 AND s.deleted_at IS NULL AND se.deleted_at IS NULL
           ORDER BY se.shipment_id, et.display_order`,
          [companyId]
        );
        expenseRows = expensesQuery.rows;
      } catch (e) {
        // shipment_expenses table might not exist
      }

      // Group items by shipment
      const itemsByShipment: Record<number, any[]> = {};
      for (const item of itemsQuery.rows) {
        if (!itemsByShipment[item.shipment_id]) {
          itemsByShipment[item.shipment_id] = [];
        }
        itemsByShipment[item.shipment_id].push(item);
      }

      // Group expenses by shipment and type
      const expensesByShipment: Record<number, Record<string, number>> = {};
      for (const exp of expenseRows) {
        if (!expensesByShipment[exp.shipment_id]) {
          expensesByShipment[exp.shipment_id] = {};
        }
        expensesByShipment[exp.shipment_id][exp.expense_type_code] = 
          (expensesByShipment[exp.shipment_id][exp.expense_type_code] || 0) + 
          Number(exp.amount_in_base_currency || exp.total_amount || 0);
      }

      // Expense type codes for columns
      const expenseTypes = [
        { code: '8001', name_en: 'LC Fees', name_ar: 'رسوم اعتماد' },
        { code: '8002', name_en: 'Cargo Insurance', name_ar: 'تأمين حمولة' },
        { code: '8003', name_en: 'Sea Freight', name_ar: 'شحن بحري' },
        { code: '8004', name_en: 'Delivery Order', name_ar: 'إذن تسليم' },
        { code: '8005', name_en: 'Customs Declaration', name_ar: 'بيان جمركي' },
        { code: '8006', name_en: 'Storage', name_ar: 'أرضيات' },
        { code: '8007', name_en: 'Port Charges', name_ar: 'رسوم موانئ' },
        { code: '8008', name_en: 'Unloading', name_ar: 'تفريغ' },
        { code: '8009', name_en: 'Customs Inspection', name_ar: 'معاينة جمركية' },
        { code: '8010', name_en: 'Container Delay Pickup', name_ar: 'تأخير استلام حاويات' },
        { code: '8011', name_en: 'Customs Clearance', name_ar: 'تخليص جمركي' },
        { code: '8012', name_en: 'Transport', name_ar: 'نقل' },
        { code: '8013', name_en: 'Loading/Unloading', name_ar: 'تحميل وتنزيل' },
        { code: '8014', name_en: 'Sample Testing', name_ar: 'فحص عينات' },
        { code: '8015', name_en: 'SABER Certificate', name_ar: 'شهادة سابر' },
        { code: '8016', name_en: 'Container Return Delay', name_ar: 'تأخير إعادة حاويات' },
        { code: '8017', name_en: 'Pallet Fines', name_ar: 'غرامات طبليات' },
      ];

      // Build Excel rows
      const excelRows: any[] = [];

      for (const shipment of shipmentsQuery.rows) {
        const items = itemsByShipment[shipment.id] || [];
        const expenses = expensesByShipment[shipment.id] || {};

        // Calculate totals
        const totalLineCost = items.reduce((sum: number, i: any) => sum + Number(i.line_total || 0), 0);
        const totalExpenses = Object.values(expenses).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
        const poTotalBase = Number(shipment.po_total_amount || 0) * Number(shipment.po_exchange_rate || 1);

        // Create one row per item, or one row for shipment if no items
        if (items.length > 0) {
          for (const item of items) {
            const row: any = {
              'رقم الشحنة / Shipment Number': shipment.shipment_number,
              'نوع الشحنة / Shipment Type': `${shipment.shipment_type_name_ar || ''} / ${shipment.shipment_type_name_en || ''}`,
              'المورد / Vendor': shipment.vendor_name || '',
              'رقم المورد / Vendor Code': shipment.vendor_code || '',
              'رقم المشروع / Project Code': shipment.project_code || '',
              'اسم المشروع / Project Name': shipment.project_name || '',
              'رقم أمر الشراء / PO Number': shipment.po_number || '',
              'كود الصنف / Item Code': item.item_code || '',
              'اسم الصنف / Item Name': `${item.item_name_ar || ''} / ${item.item_name || ''}`,
              'الكمية / Quantity': item.quantity || 0,
              'الوحدة / Unit': item.unit_code || item.unit_name || '',
              'سعر الوحدة / Unit Price': item.unit_cost || 0,
              'إجمالي السطر / Line Total': item.line_total || 0,
              'الكمية المستلمة / Received Qty': item.received_qty || 0,
              'إجمالي أمر الشراء / PO Total': shipment.po_total_amount || 0,
              'العملة / Currency': shipment.po_currency_code || 'SAR',
              'سعر الصرف / Exchange Rate': shipment.po_exchange_rate || 1,
              'إجمالي أ.ش بالعملة الأساسية / PO Total Base': poTotalBase,
              'رقم البوليصة / BL Number': shipment.bl_no || '',
              'رقم AWB / AWB Number': shipment.awb_no || '',
              'الانكوترم / Incoterm': shipment.incoterm || '',
              'ميناء الشحن / Port of Loading': shipment.port_of_loading_name || shipment.port_of_loading_text || '',
              'ميناء الوصول / Port of Discharge': shipment.port_of_discharge_name || '',
              'الوجهة / Destination': shipment.destination_name || '',
              'تاريخ الوصول المتوقع / Expected Arrival': shipment.expected_arrival_date || '',
              'المرحلة / Stage': shipment.stage_code || '',
              'الحالة / Status': shipment.status_code || '',
              'المستودع / Warehouse': shipment.warehouse_name || '',
              'رقم الاعتماد / LC Number': shipment.lc_number || '',
              'طريقة الدفع / Payment Method': shipment.payment_method || '',
              'ملاحظات / Notes': shipment.notes || '',
            };

            // Add expense columns
            for (const et of expenseTypes) {
              row[`${et.name_ar} / ${et.name_en}`] = expenses[et.code] || 0;
            }

            row['إجمالي المصاريف / Total Expenses'] = totalExpenses;
            row['إجمالي تكلفة الشحنة / Total Shipment Cost'] = totalLineCost + totalExpenses;
            row['تاريخ الإنشاء / Created At'] = shipment.created_at || '';

            excelRows.push(row);
          }
        } else {
          // Shipment with no items
          const row: any = {
            'رقم الشحنة / Shipment Number': shipment.shipment_number,
            'نوع الشحنة / Shipment Type': `${shipment.shipment_type_name_ar || ''} / ${shipment.shipment_type_name_en || ''}`,
            'المورد / Vendor': shipment.vendor_name || '',
            'رقم المورد / Vendor Code': shipment.vendor_code || '',
            'رقم المشروع / Project Code': shipment.project_code || '',
            'اسم المشروع / Project Name': shipment.project_name || '',
            'رقم أمر الشراء / PO Number': shipment.po_number || '',
            'كود الصنف / Item Code': '',
            'اسم الصنف / Item Name': '',
            'الكمية / Quantity': 0,
            'الوحدة / Unit': '',
            'سعر الوحدة / Unit Price': 0,
            'إجمالي السطر / Line Total': 0,
            'الكمية المستلمة / Received Qty': 0,
            'إجمالي أمر الشراء / PO Total': shipment.po_total_amount || 0,
            'العملة / Currency': shipment.po_currency_code || 'SAR',
            'سعر الصرف / Exchange Rate': shipment.po_exchange_rate || 1,
            'إجمالي أ.ش بالعملة الأساسية / PO Total Base': poTotalBase,
            'رقم البوليصة / BL Number': shipment.bl_no || '',
            'رقم AWB / AWB Number': shipment.awb_no || '',
            'الانكوترم / Incoterm': shipment.incoterm || '',
            'ميناء الشحن / Port of Loading': shipment.port_of_loading_name || shipment.port_of_loading_text || '',
            'ميناء الوصول / Port of Discharge': shipment.port_of_discharge_name || '',
            'الوجهة / Destination': shipment.destination_name || '',
            'تاريخ الوصول المتوقع / Expected Arrival': shipment.expected_arrival_date || '',
            'المرحلة / Stage': shipment.stage_code || '',
            'الحالة / Status': shipment.status_code || '',
            'المستودع / Warehouse': shipment.warehouse_name || '',
            'رقم الاعتماد / LC Number': shipment.lc_number || '',
            'طريقة الدفع / Payment Method': shipment.payment_method || '',
            'ملاحظات / Notes': shipment.notes || '',
          };

          for (const et of expenseTypes) {
            row[`${et.name_ar} / ${et.name_en}`] = expenses[et.code] || 0;
          }

          row['إجمالي المصاريف / Total Expenses'] = totalExpenses;
          row['إجمالي تكلفة الشحنة / Total Shipment Cost'] = totalExpenses;
          row['تاريخ الإنشاء / Created At'] = shipment.created_at || '';

          excelRows.push(row);
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows.length > 0 ? excelRows : [{}]);

      // Set column widths
      if (excelRows.length > 0) {
        const colWidths = Object.keys(excelRows[0]).map(() => ({ wch: 20 }));
        ws['!cols'] = colWidths;
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Shipments');

      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Send file
      const filename = `shipments_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);

    } catch (error) {
      console.error('Error exporting shipments to Excel:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to export shipments' } });
    }
  }
);

/**
 * @route   GET /api/logistics-shipments/export-template
 * @desc    Download import template for shipments (MUST be before /:id)
 * @access  Private (logistics:shipments:view)
 */
router.get(
  '/export-template',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:view'),
  async (req: Request, res: Response) => {
    try {
      // Create template with headers only
      const templateHeaders = [
        'رقم الشحنة / Shipment Number',
        'نوع الشحنة (sea/air/land) / Shipment Type',
        'رقم المورد / Vendor Code',
        'رقم المشروع / Project Code',
        'رقم أمر الشراء / PO Number',
        'كود الصنف / Item Code',
        'الكمية / Quantity',
        'سعر الوحدة / Unit Price',
        'رقم البوليصة / BL Number',
        'رقم AWB / AWB Number',
        'الانكوترم / Incoterm',
        'ميناء الشحن (نص) / Port of Loading',
        'ميناء الوصول (رقم) / Port of Discharge ID',
        'تاريخ الوصول المتوقع (YYYY-MM-DD) / Expected Arrival',
        'ملاحظات / Notes',
        'رسوم اعتماد / LC Fees',
        'تأمين حمولة / Cargo Insurance',
        'شحن بحري / Sea Freight',
        'إذن تسليم / Delivery Order',
        'بيان جمركي / Customs Declaration',
        'أرضيات / Storage',
        'رسوم موانئ / Port Charges',
        'تفريغ / Unloading',
        'معاينة جمركية / Customs Inspection',
        'تخليص جمركي / Customs Clearance',
        'نقل / Transport',
        'تحميل وتنزيل / Loading/Unloading',
        'فحص عينات / Sample Testing',
        'رسوم أخرى / Other Fees',
      ];

      const exampleRow: any = {};
      templateHeaders.forEach(h => {
        exampleRow[h] = h.includes('Quantity') ? 100 : 
                        h.includes('Price') ? 50 :
                        h.includes('Fees') || h.includes('رسوم') || h.includes('تأمين') || h.includes('شحن') || h.includes('تخليص') || h.includes('نقل') || h.includes('أرضيات') || h.includes('تفريغ') ? 0 :
                        h.includes('Date') || h.includes('تاريخ') ? '2026-01-01' :
                        h.includes('Type') || h.includes('نوع') ? 'sea' :
                        '';
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([exampleRow]);
      
      const colWidths = templateHeaders.map(() => ({ wch: 25 }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Import Template');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const filename = `shipments_import_template.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);

    } catch (error) {
      console.error('Error generating template:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to generate template' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/import-excel
 * @desc    Import shipments from Excel file (MUST be before /:id)
 * @access  Private (logistics:shipments:create)
 */
router.post(
  '/import-excel',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:create'),
  multerUpload.single('file'),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId!;
      const userId = req.user!.id;
      const dryRun = req.query.dryRun === 'true';

      if (!req.file) {
        return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Excel file is empty' } });
      }

      const results = {
        total: rows.length,
        created: 0,
        updated: 0,
        errors: [] as { row: number; message: string }[],
        shipments: [] as { shipment_number: string; id?: number; action: string }[]
      };

      // Group rows by shipment number (for multi-item shipments)
      const shipmentGroups: Record<string, any[]> = {};
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const shipmentNumber = row['رقم الشحنة / Shipment Number'] || row['Shipment Number'] || row['shipment_number'];
        if (!shipmentNumber) {
          results.errors.push({ row: i + 2, message: 'Missing shipment number' });
          continue;
        }
        if (!shipmentGroups[shipmentNumber]) {
          shipmentGroups[shipmentNumber] = [];
        }
        shipmentGroups[shipmentNumber].push({ ...row, _rowIndex: i + 2 });
      }

      if (dryRun) {
        // Validate only, don't insert
        for (const [shipmentNumber, groupRows] of Object.entries(shipmentGroups)) {
          // Check if shipment exists
          const existing = await pool.query(
            `SELECT id FROM logistics_shipments WHERE shipment_number = $1 AND company_id = $2 AND deleted_at IS NULL`,
            [shipmentNumber, companyId]
          );

          if (existing.rows.length > 0) {
            results.shipments.push({ shipment_number: shipmentNumber, id: existing.rows[0].id, action: 'update' });
            results.updated++;
          } else {
            results.shipments.push({ shipment_number: shipmentNumber, action: 'create' });
            results.created++;
          }

          // Validate items
          for (const row of groupRows) {
            const itemCode = row['كود الصنف / Item Code'] || row['Item Code'] || row['item_code'];
            if (itemCode) {
              const item = await pool.query(
                `SELECT id FROM items WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`,
                [itemCode, companyId]
              );
              if (item.rows.length === 0) {
                results.errors.push({ row: row._rowIndex, message: `Item not found: ${itemCode}` });
              }
            }
          }
        }

        return res.json({
          success: true,
          message: 'Dry run completed',
          dryRun: true,
          data: results
        });
      }

      // Actual import
      await client.query('BEGIN');

      // Get defaults
      const defaultType = await client.query(`SELECT id FROM logistics_shipment_types WHERE code = 'sea' LIMIT 1`);
      const defaultTypeId = defaultType.rows[0]?.id || 1;
      const defaultPort = await client.query(`SELECT id FROM ports WHERE deleted_at IS NULL LIMIT 1`);
      const defaultPortId = defaultPort.rows[0]?.id || 1;
      const defaultLocation = await client.query(`SELECT id FROM locations WHERE company_id = $1 AND deleted_at IS NULL LIMIT 1`, [companyId]);
      const defaultLocationId = defaultLocation.rows[0]?.id || 1;

      for (const [shipmentNumber, groupRows] of Object.entries(shipmentGroups)) {
        try {
          const firstRow = groupRows[0];

          // Parse shipment type
          const typeStr = (firstRow['نوع الشحنة (sea/air/land) / Shipment Type'] || firstRow['Shipment Type'] || 'sea').toLowerCase();
          const typeQuery = await client.query(`SELECT id FROM logistics_shipment_types WHERE LOWER(code) = $1 LIMIT 1`, [typeStr]);
          const shipmentTypeId = typeQuery.rows[0]?.id || defaultTypeId;

          // Lookup vendor
          const vendorCode = firstRow['رقم المورد / Vendor Code'] || firstRow['Vendor Code'];
          let vendorId: number | null = null;
          if (vendorCode) {
            const vendorQ = await client.query(`SELECT id FROM vendors WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [vendorCode, companyId]);
            vendorId = vendorQ.rows[0]?.id || null;
          }

          // Lookup project (required)
          const projectCode = firstRow['رقم المشروع / Project Code'] || firstRow['Project Code'];
          let projectId: number | null = null;
          if (projectCode) {
            const projectQ = await client.query(`SELECT id FROM projects WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [projectCode, companyId]);
            projectId = projectQ.rows[0]?.id || null;
            if (!projectId) {
              results.errors.push({ row: firstRow._rowIndex, message: `Project not found: ${projectCode}` });
              continue;
            }
          } else {
            results.errors.push({ row: firstRow._rowIndex, message: 'Project code is required' });
            continue;
          }

          // Lookup purchase order
          const poNumber = firstRow['رقم أمر الشراء / PO Number'] || firstRow['PO Number'];
          let poId: number | null = null;
          if (poNumber) {
            const poQ = await client.query(`SELECT id FROM purchase_orders WHERE order_number = $1 AND company_id = $2 AND deleted_at IS NULL`, [poNumber, companyId]);
            poId = poQ.rows[0]?.id || null;
          }

          // Parse other fields
          const blNo = firstRow['رقم البوليصة / BL Number'] || firstRow['BL Number'] || '';
          const awbNo = firstRow['رقم AWB / AWB Number'] || firstRow['AWB Number'] || '';
          const incoterm = firstRow['الانكوترم / Incoterm'] || firstRow['Incoterm'] || 'FOB';
          const portOfLoadingText = firstRow['ميناء الشحن (نص) / Port of Loading'] || firstRow['Port of Loading'] || '';
          const portOfDischargeId = parseInt(firstRow['ميناء الوصول (رقم) / Port of Discharge ID'] || firstRow['Port of Discharge ID']) || defaultPortId;
          const expectedArrival = firstRow['تاريخ الوصول المتوقع (YYYY-MM-DD) / Expected Arrival'] || firstRow['Expected Arrival'] || null;
          const notes = firstRow['ملاحظات / Notes'] || firstRow['Notes'] || '';

          if (!blNo && !awbNo) {
            results.errors.push({ row: firstRow._rowIndex, message: 'Either BL Number or AWB Number is required' });
            continue;
          }

          // Check if shipment exists
          const existing = await client.query(`SELECT id FROM logistics_shipments WHERE shipment_number = $1 AND company_id = $2 AND deleted_at IS NULL`, [shipmentNumber, companyId]);
          let shipmentId: number;

          if (existing.rows.length > 0) {
            shipmentId = existing.rows[0].id;
            await client.query(
              `UPDATE logistics_shipments SET shipment_type_id=$1, vendor_id=$2, project_id=$3, purchase_order_id=$4, bl_no=$5, awb_no=$6, incoterm=$7, port_of_loading_text=$8, port_of_discharge_id=$9, expected_arrival_date=$10, notes=$11, updated_at=CURRENT_TIMESTAMP, updated_by=$12 WHERE id=$13`,
              [shipmentTypeId, vendorId, projectId, poId, blNo || null, awbNo || null, incoterm, portOfLoadingText || null, portOfDischargeId, expectedArrival || null, notes || null, userId, shipmentId]
            );
            results.updated++;
            results.shipments.push({ shipment_number: shipmentNumber, id: shipmentId, action: 'updated' });
          } else {
            const insertResult = await client.query(
              `INSERT INTO logistics_shipments (company_id, shipment_number, shipment_type_id, vendor_id, project_id, purchase_order_id, bl_no, awb_no, incoterm, port_of_loading_text, port_of_discharge_id, origin_location_id, destination_location_id, expected_arrival_date, notes, stage_code, status_code, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
              [companyId, shipmentNumber, shipmentTypeId, vendorId, projectId, poId, blNo || null, awbNo || null, incoterm, portOfLoadingText || null, portOfDischargeId, defaultLocationId, defaultLocationId, expectedArrival || null, notes || null, 'created', 'pending', userId]
            );
            shipmentId = insertResult.rows[0].id;
            results.created++;
            results.shipments.push({ shipment_number: shipmentNumber, id: shipmentId, action: 'created' });
          }

          // Process items
          for (const row of groupRows) {
            const itemCode = row['كود الصنف / Item Code'] || row['Item Code'] || row['item_code'];
            if (!itemCode) continue;

            const itemQ = await client.query(`SELECT id, base_uom_id FROM items WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [itemCode, companyId]);
            if (itemQ.rows.length === 0) {
              results.errors.push({ row: row._rowIndex, message: `Item not found: ${itemCode}` });
              continue;
            }

            const itemId = itemQ.rows[0].id;
            const uomId = itemQ.rows[0].base_uom_id;
            const quantity = parseFloat(row['الكمية / Quantity'] || row['Quantity'] || 0);
            const unitPrice = parseFloat(row['سعر الوحدة / Unit Price'] || row['Unit Price'] || 0);

            if (quantity <= 0) {
              results.errors.push({ row: row._rowIndex, message: `Invalid quantity for item ${itemCode}` });
              continue;
            }

            const existingItem = await client.query(`SELECT id FROM logistics_shipment_items WHERE shipment_id = $1 AND item_id = $2 AND deleted_at IS NULL`, [shipmentId, itemId]);
            if (existingItem.rows.length > 0) {
              await client.query(`UPDATE logistics_shipment_items SET quantity = $1, unit_cost = $2, uom_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`, [quantity, unitPrice, uomId, existingItem.rows[0].id]);
            } else {
              await client.query(`INSERT INTO logistics_shipment_items (company_id, shipment_id, item_id, quantity, unit_cost, uom_id, received_qty) VALUES ($1, $2, $3, $4, $5, $6, 0)`, [companyId, shipmentId, itemId, quantity, unitPrice, uomId]);
            }
          }

        } catch (rowError: any) {
          results.errors.push({ row: groupRows[0]?._rowIndex || 0, message: rowError.message });
        }
      }

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
        data: results
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error importing shipments:', error);
      return res.status(500).json({ success: false, error: { message: error.message || 'Failed to import shipments' } });
    } finally {
      client.release();
    }
  }
);

/**
 * @route   GET /api/logistics-shipments/:id
 * @access  Private (logistics:shipments:view)
 */
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      const header = await pool.query(
        `SELECT
           s.*,
           st.code AS shipment_type_code,
           st.name_en AS shipment_type_name_en,
           st.name_ar AS shipment_type_name_ar,
           v.name AS vendor_name,
           v.code AS vendor_code,
           po.order_number AS purchase_order_number,
           po.vendor_contract_number AS vendor_contract_number,
           po.currency_id AS po_currency_id,
           po_curr.code AS po_currency_code,
           po_curr.symbol AS po_currency_symbol,
           -- Get exchange rate from exchange_rates table (PO currency to SAR)
           -- Fallback to PO stored rate, then to 1
           COALESCE(
             (SELECT er.rate FROM exchange_rates er
              JOIN currencies base_curr ON base_curr.id = er.to_currency_id AND base_curr.is_base_currency = true
              WHERE er.from_currency_id = po.currency_id 
                AND er.deleted_at IS NULL 
                AND er.is_active = true
              ORDER BY er.rate_date DESC LIMIT 1),
             po.exchange_rate,
             1
           ) AS po_exchange_rate,
           po.total_amount AS po_total_amount,
           proj.id AS project_id_resolved,
           proj.code AS project_code,
           proj.name AS project_name,
           proj.name_ar AS project_name_ar,
           pod.name_en AS port_of_discharge_name,
           pol.name_en AS port_of_loading_name,
           po_curr.id AS shipment_currency_id,
           po_curr.code AS shipment_currency_code,
           po_curr.symbol AS shipment_currency_symbol
         FROM logistics_shipments s
         LEFT JOIN logistics_shipment_types st ON st.id = s.shipment_type_id
         LEFT JOIN vendors v ON v.id = s.vendor_id AND v.deleted_at IS NULL
         LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id AND po.deleted_at IS NULL
         LEFT JOIN currencies po_curr ON po_curr.id = po.currency_id AND po_curr.deleted_at IS NULL
         LEFT JOIN projects proj ON proj.id = COALESCE(s.project_id, po.project_id) AND proj.deleted_at IS NULL
         LEFT JOIN ports pod ON pod.id = s.port_of_discharge_id AND pod.deleted_at IS NULL
         LEFT JOIN ports pol ON pol.id = s.port_of_loading_id AND pol.deleted_at IS NULL
         WHERE s.id = $1 AND s.company_id = $2 AND s.deleted_at IS NULL`,
        [shipmentId, companyId]
      );

      if (header.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      }

      const items = await pool.query(
        `SELECT
           si.id,
           si.shipment_id,
           si.item_id,
           i.code AS sku,
           i.code AS item_code,
           i.name,
           i.name_ar,
           i.hs_code,
           si.quantity,
           COALESCE(u.code, base_u.code) AS unit_code,
           COALESCE(u.name_en, base_u.name_en) AS unit_name,
           si.unit_cost,
           poi.unit_price AS po_unit_price,
           poi.uom_id AS po_uom_id,
           c.code AS currency_code,
           c.symbol AS currency_symbol,
           (si.quantity * COALESCE(si.unit_cost, 0)) AS total_cost,
           (si.quantity * COALESCE(poi.unit_price, si.unit_cost, 0)) AS po_total_cost,
           si.received_qty,
           (si.quantity - si.received_qty) AS remaining_qty,
           si.created_at,
           si.updated_at
         FROM logistics_shipment_items si
         JOIN items i ON i.id = si.item_id AND i.deleted_at IS NULL
         JOIN logistics_shipments s ON s.id = si.shipment_id
         LEFT JOIN purchase_order_items poi ON poi.order_id = s.purchase_order_id AND poi.item_id = si.item_id
         LEFT JOIN units_of_measure u ON u.id = COALESCE(si.uom_id, poi.uom_id) AND u.deleted_at IS NULL
         LEFT JOIN units_of_measure base_u ON base_u.id = i.base_uom_id AND base_u.deleted_at IS NULL
         LEFT JOIN currencies c ON c.id = i.currency_id AND c.deleted_at IS NULL
         WHERE si.shipment_id = $1 AND si.company_id = $2 AND si.deleted_at IS NULL
         ORDER BY i.code ASC`,
        [shipmentId, companyId]
      );

      const costs = await pool.query(
        `SELECT 
           lsc.id, 
           lsc.shipment_id, 
           lsc.cost_type_code, 
           lsc.amount, 
           lsc.currency_id, 
           lsc.description, 
           lsc.journal_entry_id,
           lsc.created_at,
           c.code AS currency_code,
           c.symbol AS currency_symbol,
           lsc.cost_type_code AS cost_type_name,
           'legacy' AS source,
           NULL AS distribution_method,
           NULL AS exchange_rate,
           NULL AS amount_in_base_currency
         FROM logistics_shipment_costs lsc
         LEFT JOIN currencies c ON c.id = lsc.currency_id AND c.deleted_at IS NULL
         WHERE lsc.shipment_id = $1 AND lsc.company_id = $2 AND lsc.deleted_at IS NULL
         ORDER BY lsc.created_at DESC`,
        [shipmentId, companyId]
      );

      // Also fetch from shipment_expenses (V2 expenses system) - wrapped in try-catch as table may not exist
      let expensesV2Rows: any[] = [];
      try {
        const expensesV2 = await pool.query(
          `SELECT 
             se.id,
             se.shipment_id,
             et.code AS cost_type_code,
             et.name AS cost_type_name,
             et.name_ar AS cost_type_name_ar,
             se.amount_before_vat,
             se.vat_amount,
             se.total_amount AS amount,
             se.currency_id,
             c.code AS currency_code,
             c.symbol AS currency_symbol,
             se.description,
             se.journal_entry_id,
             se.distribution_method,
             se.exchange_rate,
             se.amount_in_base_currency,
             se.is_distributed,
             se.created_at,
             'expense_v2' AS source
           FROM shipment_expenses se
           LEFT JOIN shipment_expense_types et ON et.id = se.expense_type_id
           LEFT JOIN currencies c ON c.id = se.currency_id AND c.deleted_at IS NULL
           WHERE se.shipment_id = $1 AND se.company_id = $2 AND se.deleted_at IS NULL
           ORDER BY se.created_at DESC`,
          [shipmentId, companyId]
        );
        expensesV2Rows = expensesV2.rows;
      } catch (expError) {
        // Table might not exist or have different structure - ignore
        console.warn('Could not fetch shipment_expenses (V2):', expError);
      }

      // Combine both cost sources
      const allCosts = [...costs.rows, ...expensesV2Rows];

      return res.json({ success: true, data: { shipment: header.rows[0], items: items.rows, costs: allCosts } });
    } catch (error) {
      console.error('Error fetching logistics shipment:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch shipment' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipments
 * @access  Private (logistics:shipments:create)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = shipmentCreateSchema.parse(req.body);
      const userId = (req as any).user?.id ?? null;

      // Ensure shipment type belongs to company
      const st = await pool.query(
        `SELECT id FROM logistics_shipment_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [payload.shipment_type_id, companyId]
      );
      if (st.rows.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Invalid shipment_type_id' } });
      }

      const inserted = await pool.query(
        `INSERT INTO logistics_shipments (
           company_id,
           shipment_number,
           shipment_type_id,
           project_id,
           incoterm,
           bl_no,
           awb_no,
           origin_location_id,
           destination_location_id,
           expected_arrival_date,
           port_of_loading_id,
           port_of_loading_text,
           port_of_discharge_id,
           payment_method,
           lc_number,
           total_amount,
           warehouse_id,
           vendor_id,
           purchase_order_id,
           stage_code,
           status_code,
           notes,
           created_by,
           updated_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$23)
         RETURNING id, company_id, shipment_number, shipment_type_id, project_id, incoterm, bl_no, awb_no,
                   origin_location_id, destination_location_id, expected_arrival_date,
                   port_of_loading_id, port_of_loading_text, port_of_discharge_id, payment_method, lc_number, total_amount,
                   warehouse_id, vendor_id, purchase_order_id, stage_code, status_code, notes,
                   locked_at, locked_by, created_at, updated_at`,
        [
          companyId,
          payload.shipment_number.trim(),
          payload.shipment_type_id,
          payload.project_id,
          payload.incoterm.trim().toUpperCase(),
          payload.bl_no ? payload.bl_no.trim() : null,
          payload.awb_no ? payload.awb_no.trim() : null,
          payload.origin_location_id,
          payload.destination_location_id,
          payload.expected_arrival_date,
          payload.port_of_loading_id ?? null,
          payload.port_of_loading_text ? payload.port_of_loading_text.trim() : null,
          payload.port_of_discharge_id,
          payload.payment_method ? payload.payment_method.trim() : null,
          payload.lc_number ? payload.lc_number.trim() : null,
          payload.total_amount ?? null,
          payload.warehouse_id ?? null,
          payload.vendor_id ?? null,
          payload.purchase_order_id ?? null,
          payload.stage_code ?? null,
          payload.status_code ?? null,
          payload.notes ?? null,
          userId,
        ]
      );

      (req as any).auditContext = {
        action: 'create',
        resource: 'logistics_shipments',
        resourceId: inserted.rows[0].id,
        after: inserted.rows[0],
      };

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Shipment number already exists' } });
      }
      console.error('Error creating logistics shipment:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create shipment' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/from-purchase-order/:poId
 * @desc    Create a shipment from an existing purchase order (auto-populate all fields)
 *          Accepts body params as overrides if PO doesn't have the fields filled
 * @access  Private (logistics:shipments:create)
 */
router.post(
  '/from-purchase-order/:poId',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:create'),
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId;
      const poId = parseInt(req.params.poId, 10);
      if (Number.isNaN(poId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid purchase order ID' } });
      }

      const userId = (req as any).user?.id ?? null;
      
      // Get override values from request body
      const overrides = req.body || {};

      await client.query('BEGIN');

      // Fetch purchase order with all details
      const poResult = await client.query(
        `
        SELECT po.*, 
               v.name as vendor_name, v.name_ar as vendor_name_ar,
               pm.code as payment_method_code, pm.name as payment_method_name,
               c.id as currency_id_from_po, c.code as currency_code,
               dt.incoterm_code as delivery_incoterm
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN payment_methods pm ON po.payment_method_id = pm.id
        LEFT JOIN currencies c ON po.currency_id = c.id
        LEFT JOIN delivery_terms dt ON po.delivery_terms_id = dt.id
        WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
      `,
        [poId, companyId]
      );

      if (poResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { message: 'Purchase order not found' } });
      }

      const po = poResult.rows[0];

      // Use override values if provided, otherwise fall back to PO values
      const originCityId = overrides.origin_location_id || po.origin_city_id;
      const destinationCityId = overrides.destination_location_id || po.destination_city_id;
      const portOfDischargeId = overrides.port_of_discharge_id || po.port_of_discharge_id;
      const portOfLoadingId = overrides.port_of_loading_id || po.port_of_loading_id || null;
      const portOfLoadingText = overrides.port_of_loading_text || po.port_of_loading_text || null;
      const projectId = overrides.project_id || po.project_id;
      const shipmentTypeIdOverride = overrides.shipment_type_id;
      const currencyId = overrides.currency_id || po.currency_id_from_po || null;

      // Validate required fields for shipment creation (using override or PO values)
      if (!destinationCityId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Destination city is required. Please set it in the form or update the purchase order.' } 
        });
      }

      if (!portOfDischargeId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Port of discharge is required. Please set it in the form or update the purchase order.' } 
        });
      }

      if (!originCityId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Origin city is required. Please set it in the form or update the purchase order.' } 
        });
      }

      // Get shipment type (use override or default first active)
      let shipmentTypeId: number;
      if (shipmentTypeIdOverride) {
        const stCheck = await client.query(
          `SELECT id FROM logistics_shipment_types WHERE id = $1 AND company_id = $2 AND is_active = true AND deleted_at IS NULL`,
          [shipmentTypeIdOverride, companyId]
        );
        if (stCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: { message: 'Invalid shipment type' } });
        }
        shipmentTypeId = shipmentTypeIdOverride;
      } else {
        const shipmentTypeResult = await client.query(
          `SELECT id FROM logistics_shipment_types WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL LIMIT 1`,
          [companyId]
        );

        if (shipmentTypeResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            error: { message: 'No active shipment type found for this company' } 
          });
        }
        shipmentTypeId = shipmentTypeResult.rows[0].id;
      }

      // Always generate a new unique shipment number for from-PO creation
      const shipmentNumber = (await DocumentNumberService.generateNumber(companyId, 'logistics_shipment')).number;

      // Determine incoterm (override > delivery_terms > default)
      const incoterm = overrides.incoterm?.trim() || po.delivery_incoterm || po.delivery_terms_code || 'FOB';

      // Determine document number (prefer provided, then BL from PO, fallback to AWB-prefixed PO number)
      const blNo = overrides.bl_no?.trim() || po.bl_number || po.tracking_number || null;
      const awbNo = overrides.awb_no?.trim() || (blNo ? null : `AWB-${po.order_number}`);
      
      // At least one of bl_no or awb_no must exist
      if (!blNo && !awbNo) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: { message: 'Either BL Number or AWB Number is required' } 
        });
      }

      // Create shipment
      const shipmentInsert = await client.query(
        `
        INSERT INTO logistics_shipments (
          company_id, shipment_number, shipment_type_id, project_id,
          incoterm, bl_no, awb_no,
          origin_location_id, destination_location_id, expected_arrival_date,
          port_of_loading_id, port_of_loading_text, port_of_discharge_id,
          payment_method, lc_number, total_amount,
          warehouse_id, vendor_id, purchase_order_id,
          status_code, stage_code,
          notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING *
      `,
        [
          companyId,
          shipmentNumber,
          shipmentTypeId,
          projectId,
          incoterm.substring(0, 20),
          blNo,
          awbNo,
          originCityId,
          destinationCityId,
          overrides.expected_arrival_date || po.expected_date || null,
          portOfLoadingId,
          portOfLoadingText,
          portOfDischargeId,
          overrides.payment_method || po.payment_method_name || null,
          overrides.lc_number || po.lc_number || null,
          overrides.total_amount ?? po.total_amount ?? null,
          overrides.warehouse_id || po.warehouse_id || null,
          po.vendor_id || null,
          po.id,
          overrides.status_code || null,
          overrides.stage_code || null,
          overrides.notes || `Created from Purchase Order ${po.order_number}`,
          userId,
        ]
      );

      const shipmentId = shipmentInsert.rows[0].id;

      // Fetch PO items and copy to shipment
      const poItems = await client.query(
        `
        SELECT poi.item_id, poi.ordered_qty, poi.unit_price, poi.uom_id, poi.item_name, poi.item_name_ar
        FROM purchase_order_items poi
        WHERE poi.order_id = $1
        ORDER BY poi.line_number
      `,
        [poId]
      );

      for (const item of poItems.rows) {
        await client.query(
          `
          INSERT INTO logistics_shipment_items (
            company_id, shipment_id, item_id, quantity, unit_cost, uom_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [companyId, shipmentId, item.item_id, item.ordered_qty, item.unit_price || 0, item.uom_id, userId]
        );
      }

      await client.query('COMMIT');

      (req as any).auditContext = {
        action: 'create_from_po',
        resource: 'logistics_shipments',
        resourceId: shipmentId,
        after: shipmentInsert.rows[0],
        metadata: { purchase_order_id: poId, purchase_order_number: po.order_number },
      };

      return res.status(201).json({
        success: true,
        data: {
          shipment: shipmentInsert.rows[0],
          items_count: poItems.rows.length,
          message: `Shipment ${shipmentNumber} created from PO ${po.order_number}`,
        },
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating shipment from PO:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create shipment from purchase order' } });
    } finally {
      client.release();
    }
  }
);

/**
 * @route   PUT /api/logistics-shipments/:id
 * @access  Private (logistics:shipments:edit)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      const shipment = await ensureShipmentCompany(companyId, shipmentId);
      if (!shipment) return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      if (shipment.locked_at) return res.status(409).json({ success: false, error: { message: 'Shipment is locked' } });

      const existingHeader = await pool.query(
        `SELECT bl_no, awb_no FROM logistics_shipments WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [shipmentId, companyId]
      );
      if (existingHeader.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      }

      await captureBeforeState(req as any, 'logistics_shipments', shipmentId);

      const payload = shipmentUpdateSchema.parse(req.body);
      const userId = (req as any).user?.id ?? null;

      // Validate that at least one of BL/AWB exists after merge
      const mergedBlNo = payload.bl_no !== undefined ? (payload.bl_no ? payload.bl_no.trim() : null) : existingHeader.rows[0].bl_no;
      const mergedAwbNo = payload.awb_no !== undefined ? (payload.awb_no ? payload.awb_no.trim() : null) : existingHeader.rows[0].awb_no;
      if (!String(mergedBlNo ?? '').trim() && !String(mergedAwbNo ?? '').trim()) {
        return res.status(400).json({ success: false, error: { message: 'Either bl_no or awb_no must be provided' } });
      }

      if (payload.shipment_type_id !== undefined) {
        const st = await pool.query(
          `SELECT id FROM logistics_shipment_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
          [payload.shipment_type_id, companyId]
        );
        if (st.rows.length === 0) {
          return res.status(400).json({ success: false, error: { message: 'Invalid shipment_type_id' } });
        }
      }

      const updated = await pool.query(
        `UPDATE logistics_shipments
         SET shipment_number = COALESCE($1, shipment_number),
             shipment_type_id = COALESCE($2, shipment_type_id),
             incoterm = COALESCE($3, incoterm),
             bl_no = COALESCE($4, bl_no),
             awb_no = COALESCE($5, awb_no),
             origin_location_id = COALESCE($6, origin_location_id),
             destination_location_id = COALESCE($7, destination_location_id),
             expected_arrival_date = COALESCE($8::date, expected_arrival_date),
             warehouse_id = COALESCE($9, warehouse_id),
             stage_code = COALESCE($10, stage_code),
             status_code = COALESCE($11, status_code),
             notes = COALESCE($12, notes),
             updated_by = COALESCE($13, updated_by),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $14 AND company_id = $15 AND deleted_at IS NULL
         RETURNING id, company_id, shipment_number, shipment_type_id, incoterm, bl_no, awb_no,
                   origin_location_id, destination_location_id, expected_arrival_date, warehouse_id,
                   stage_code, status_code, notes, locked_at, locked_by, created_at, updated_at`,
        [
          payload.shipment_number !== undefined ? payload.shipment_number.trim() : null,
          payload.shipment_type_id ?? null,
          payload.incoterm !== undefined ? payload.incoterm.trim().toUpperCase() : null,
          payload.bl_no !== undefined ? (payload.bl_no ? payload.bl_no.trim() : null) : null,
          payload.awb_no !== undefined ? (payload.awb_no ? payload.awb_no.trim() : null) : null,
          payload.origin_location_id ?? null,
          payload.destination_location_id ?? null,
          payload.expected_arrival_date ?? null,
          payload.warehouse_id ?? null,
          payload.stage_code ?? null,
          payload.status_code ?? null,
          payload.notes ?? null,
          userId,
          shipmentId,
          companyId,
        ]
      );

      if (updated.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      }

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: updated.rows[0],
      };

      return res.json({ success: true, data: updated.rows[0] });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { message: 'Shipment number already exists' } });
      }
      console.error('Error updating logistics shipment:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update shipment' } });
    }
  }
);

/**
 * @route   DELETE /api/logistics-shipments/:id
 * @access  Private (logistics:shipments:delete)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      const shipment = await ensureShipmentCompany(companyId, shipmentId);
      if (!shipment) return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      if (shipment.locked_at) return res.status(409).json({ success: false, error: { message: 'Shipment is locked' } });

      await captureBeforeState(req as any, 'logistics_shipments', shipmentId);

      const deleted = await pool.query(
        `UPDATE logistics_shipments
         SET deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [shipmentId, companyId]
      );

      if (deleted.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      }

      return res.json({ success: true, data: { id: shipmentId } });
    } catch (error) {
      console.error('Error deleting logistics shipment:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete shipment' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/:id/items
 * @desc    Add or update shipment items (upsert by item_id)
 * @access  Private (logistics:shipments:edit)
 */
router.post(
  '/:id/items',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      const shipment = await ensureShipmentCompany(companyId, shipmentId);
      if (!shipment) return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      if (shipment.locked_at) return res.status(409).json({ success: false, error: { message: 'Shipment is locked' } });

      const payload = z.array(itemUpsertSchema).min(1).parse(req.body);
      const userId = (req as any).user?.id ?? null;

      await client.query('BEGIN');

      const results: any[] = [];
      for (const line of payload) {
        // Ensure item belongs to company
        const item = await client.query(
          `SELECT id FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
          [line.item_id, companyId]
        );
        if (item.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: { message: `Invalid item_id ${line.item_id}` } });
        }

        const existing = await client.query(
          `SELECT id
           FROM logistics_shipment_items
           WHERE shipment_id = $1 AND item_id = $2 AND deleted_at IS NULL
           LIMIT 1`,
          [shipmentId, line.item_id]
        );

        if (existing.rows.length > 0) {
          const id = existing.rows[0].id;
          await captureBeforeState(req as any, 'logistics_shipment_items', id);

          const updated = await client.query(
            `UPDATE logistics_shipment_items
             SET quantity = $1,
                 unit_cost = COALESCE($2, unit_cost),
                 updated_by = COALESCE($3, updated_by),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND company_id = $5 AND deleted_at IS NULL
             RETURNING id, shipment_id, item_id, quantity, unit_cost, received_qty, created_at, updated_at`,
            [line.quantity, line.unit_cost ?? null, userId, id, companyId]
          );

          results.push(updated.rows[0]);
          continue;
        }

        const inserted = await client.query(
          `INSERT INTO logistics_shipment_items (
             company_id, shipment_id, item_id, quantity, unit_cost, created_by, updated_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$6)
           RETURNING id, shipment_id, item_id, quantity, unit_cost, received_qty, created_at, updated_at`,
          [companyId, shipmentId, line.item_id, line.quantity, line.unit_cost ?? 0, userId]
        );
        results.push(inserted.rows[0]);
      }

      await client.query('COMMIT');

      (req as any).auditContext = {
        action: 'upsert',
        resource: 'logistics_shipment_items',
        resourceId: shipmentId,
      };

      return res.status(201).json({ success: true, data: results });
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      console.error('Error upserting logistics shipment items:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to save shipment items' } });
    } finally {
      client.release();
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/:id/receive
 * @desc    Receive shipment items into inventory via inventory_movements
 * @access  Private (logistics:shipment_receiving:receive)
 */
router.post(
  '/:id/receive',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_receiving:receive'),
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      const shipment = await ensureShipmentCompany(companyId, shipmentId);
      if (!shipment) return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      if (shipment.locked_at) return res.status(409).json({ success: false, error: { message: 'Shipment is locked' } });

      const payload = receiveSchema.parse(req.body);
      const userId = (req as any).user?.id ?? null;

      // Ensure warehouse belongs to company
      const wh = await client.query(`SELECT id FROM warehouses WHERE id = $1 AND company_id = $2`, [payload.warehouse_id, companyId]);
      if (wh.rows.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Invalid warehouse_id' } });
      }

      await client.query('BEGIN');

      // Create receipt header
      const receiptNo = payload.receipt_no?.trim() || `RCV-${shipmentId}-${Date.now()}`;
      const receipt = await client.query(
        `INSERT INTO logistics_shipment_receipts (company_id, shipment_id, warehouse_id, receipt_no, received_at, notes, created_by)
         VALUES ($1,$2,$3,$4,COALESCE($5::timestamp, CURRENT_TIMESTAMP),$6,$7)
         RETURNING id, receipt_no, received_at`,
        [companyId, shipmentId, payload.warehouse_id, receiptNo, payload.received_at ?? null, payload.notes ?? null, userId]
      );
      const receiptId = receipt.rows[0].id;

      // Load shipment items
      const shipmentItems = await client.query(
        `SELECT id, item_id, quantity, received_qty, unit_cost
         FROM logistics_shipment_items
         WHERE shipment_id = $1 AND company_id = $2 AND deleted_at IS NULL
         ORDER BY id ASC`,
        [shipmentId, companyId]
      );

      if (shipmentItems.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: { message: 'Cannot receive a shipment with no items' } });
      }

      const byItemId = new Map<number, any>();
      for (const row of shipmentItems.rows) byItemId.set(row.item_id, row);
      const byShipmentItemId = new Map<number, any>();
      for (const row of shipmentItems.rows) byShipmentItemId.set(row.id, row);

      type ReceiveLine = {
        shipment_item_id?: number;
        item_id?: number;
        qty: number;
        unit_cost?: number;
        notes?: string | null;
      };

      const lines: ReceiveLine[] = payload.lines?.length
        ? (payload.lines as ReceiveLine[])
        : (shipmentItems.rows
            .map((row: any) => ({ shipment_item_id: row.id, qty: Number(row.quantity) - Number(row.received_qty) }))
            .filter((l: any) => l.qty > 0) as ReceiveLine[]);

      if (!lines.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: { message: 'No remaining quantity to receive' } });
      }

      const receiptLinesOut: any[] = [];
      for (const line of lines) {
        const shipmentItem = line.shipment_item_id
          ? byShipmentItemId.get(line.shipment_item_id)
          : line.item_id
            ? byItemId.get(line.item_id)
            : null;

        if (!shipmentItem) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: { message: 'Invalid receipt line (unknown shipment item)' } });
        }

        const remaining = Number(shipmentItem.quantity) - Number(shipmentItem.received_qty);
        if (line.qty > remaining + 1e-9) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, error: { message: 'Received qty exceeds remaining qty' } });
        }

        const unitCost = line.unit_cost ?? Number(shipmentItem.unit_cost) ?? 0;

        const rl = await client.query(
          `INSERT INTO logistics_shipment_receipt_lines (company_id, receipt_id, item_id, qty_received, unit_cost, notes)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id`,
          [companyId, receiptId, shipmentItem.item_id, line.qty, unitCost, line.notes ?? null]
        );

        // inventory_movements: one row per receipt line
        await client.query(
          `INSERT INTO inventory_movements (
             company_id,
             warehouse_id,
             item_id,
             txn_type,
             qty_delta,
             unit_cost,
             ref_type,
             ref_id,
             ref_no,
             created_by,
             updated_by,
             created_at,
             updated_at
           ) VALUES ($1,$2,$3,'receipt',$4,$5,'shipment_receipt_line',$6,$7,$8,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          [companyId, payload.warehouse_id, shipmentItem.item_id, line.qty, unitCost, rl.rows[0].id, receiptNo, userId]
        );

        // Update item_warehouse on-hand
        // item_warehouse is scoped by (item_id, warehouse_id) in this codebase
        await client.query(
          `INSERT INTO item_warehouse (item_id, warehouse_id, qty_on_hand)
           VALUES ($1,$2,$3)
           ON CONFLICT (item_id, warehouse_id)
           DO UPDATE SET qty_on_hand = item_warehouse.qty_on_hand + EXCLUDED.qty_on_hand,
                         updated_at = CURRENT_TIMESTAMP`,
          [shipmentItem.item_id, payload.warehouse_id, line.qty]
        );

        // Update received qty on shipment item
        await client.query(
          `UPDATE logistics_shipment_items
           SET received_qty = received_qty + $1,
               updated_by = COALESCE($2, updated_by),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND company_id = $4`,
          [line.qty, userId, shipmentItem.id, companyId]
        );

        receiptLinesOut.push({
          receipt_line_id: rl.rows[0].id,
          shipment_item_id: shipmentItem.id,
          item_id: shipmentItem.item_id,
          qty_received: line.qty,
          unit_cost: unitCost,
        });
      }

      await client.query('COMMIT');

      (req as any).auditContext = {
        action: 'receive',
        resource: 'logistics_shipments',
        resourceId: shipmentId,
        after: { receipt_id: receiptId, receipt_no: receiptNo, lines: receiptLinesOut },
      };

      return res.status(201).json({
        success: true,
        data: { shipment_id: shipmentId, receipt_id: receiptId, receipt_no: receiptNo, lines: receiptLinesOut },
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      console.error('Error receiving logistics shipment:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to receive shipment' } });
    } finally {
      client.release();
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/:id/costs
 * @desc    Add shipment cost and (optionally) create a draft journal
 * @access  Private (logistics:shipment_accounting_bridge:manage)
 */
router.post(
  '/:id/costs',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_accounting_bridge:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      const shipment = await ensureShipmentCompany(companyId, shipmentId);
      if (!shipment) return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      if (shipment.locked_at) return res.status(409).json({ success: false, error: { message: 'Shipment is locked' } });

      const payload = costCreateSchema.parse(req.body);
      const userId = (req as any).user?.id ?? null;

      await client.query('BEGIN');

      const costTypeCode = payload.cost_type_code.trim().toUpperCase();
      const defaults = await client.query(
        `SELECT debit_account_id, credit_account_id
         FROM logistics_shipment_cost_default_accounts
         WHERE company_id = $1 AND cost_type_code = $2 AND deleted_at IS NULL AND is_active = TRUE
         LIMIT 1`,
        [companyId, costTypeCode]
      );

      // Create shipment_cost row first
      const costRow = await client.query(
        `INSERT INTO logistics_shipment_costs (company_id, shipment_id, cost_type_code, amount, currency_id, description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, shipment_id, cost_type_code, amount, currency_id, description, journal_entry_id, created_at`,
        [companyId, shipmentId, costTypeCode, payload.amount, payload.currency_id, payload.description ?? null, userId]
      );

      // Create draft journal if defaults exist
      if (defaults.rows.length > 0) {
        const debitAccountId = defaults.rows[0].debit_account_id;
        const creditAccountId = defaults.rows[0].credit_account_id;

        // Minimal journal entry creation (draft)
        const jeDescription =
          'Shipment cost (' + costTypeCode + ') for shipment #' + shipmentId;

        const je = await client.query(
          `INSERT INTO journal_entries (
             company_id,
             entry_date,
             description,
             status,
             source_document_type,
             source_document_id,
             created_by,
             created_at,
             updated_at
           ) VALUES ($1, CURRENT_DATE, $2, 'draft', 'logistics_shipment', $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [companyId, jeDescription, shipmentId, userId]
        );

        const journalEntryId = je.rows[0].id;

        const lineDescription =
          payload.description || 'Shipment cost (' + costTypeCode + ')';

        await client.query(
          `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
           VALUES ($1,$2,$3,0,$4), ($1,$5,0,$3,$4)`,
          [journalEntryId, debitAccountId, payload.amount, lineDescription, creditAccountId]
        );

        await client.query(
          `UPDATE logistics_shipment_costs
           SET journal_entry_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND company_id = $3`,
          [journalEntryId, costRow.rows[0].id, companyId]
        );

        costRow.rows[0].journal_entry_id = journalEntryId;
      }

      await client.query('COMMIT');

      (req as any).auditContext = {
        action: 'create_cost',
        resource: 'logistics_shipment_costs',
        resourceId: costRow.rows[0].id,
        after: costRow.rows[0],
      };

      return res.status(201).json({ success: true, data: costRow.rows[0] });
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }
      console.error('Error creating logistics shipment cost:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create shipment cost' } });
    } finally {
      client.release();
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/:id/lock
 * @access  Private (logistics:shipment_accounting_bridge:close)
 */
router.post(
  '/:id/lock',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_accounting_bridge:close'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      const userId = (req as any).user?.id ?? null;
      await captureBeforeState(req as any, 'logistics_shipments', shipmentId);

      const locked = await pool.query(
        `UPDATE logistics_shipments
         SET locked_at = CURRENT_TIMESTAMP,
             locked_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL AND locked_at IS NULL
         RETURNING id, locked_at, locked_by`,
        [userId, shipmentId, companyId]
      );

      if (locked.rows.length === 0) {
        return res.status(409).json({ success: false, error: { message: 'Shipment not found or already locked' } });
      }

      (req as any).auditContext = { ...(req as any).auditContext, after: locked.rows[0] };
      return res.json({ success: true, data: locked.rows[0] });
    } catch (error) {
      console.error('Error locking logistics shipment:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to lock shipment' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/:id/unlock
 * @desc    Unlock a shipment to allow editing again
 * @access  Private (logistics:shipment_accounting_bridge:close)
 */
router.post(
  '/:id/unlock',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_accounting_bridge:close'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      await captureBeforeState(req as any, 'logistics_shipments', shipmentId);

      const unlocked = await pool.query(
        `UPDATE logistics_shipments
         SET locked_at = NULL,
             locked_by = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND locked_at IS NOT NULL
         RETURNING id, locked_at, locked_by`,
        [shipmentId, companyId]
      );

      if (unlocked.rows.length === 0) {
        return res.status(409).json({ success: false, error: { message: 'Shipment not found or not locked' } });
      }

      (req as any).auditContext = { ...(req as any).auditContext, after: unlocked.rows[0] };
      return res.json({ success: true, data: unlocked.rows[0], message: 'Shipment unlocked successfully' });
    } catch (error) {
      console.error('Error unlocking logistics shipment:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to unlock shipment' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/:id/distribute-costs
 * @desc    Distribute selected expenses to selected items
 * @access  Private (logistics:shipments:update)
 */
router.post(
  '/:id/distribute-costs',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:update'),
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid shipment id' } });
      }

      const { expense_ids, item_ids, distribution_method, manual_percentages } = req.body;

      if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'expense_ids required' } });
      }
      if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'item_ids required' } });
      }

      const validMethods = ['VALUE', 'QTY', 'WEIGHT', 'EQUAL', 'MANUAL'];
      const method = validMethods.includes(distribution_method) ? distribution_method : 'VALUE';

      // Validate manual percentages if MANUAL method
      let manualPercentMap: Record<number, number> = {};
      if (method === 'MANUAL') {
        if (!manual_percentages || !Array.isArray(manual_percentages)) {
          return res.status(400).json({ success: false, error: { message: 'manual_percentages required for MANUAL method' } });
        }
        
        const totalPercent = manual_percentages.reduce((sum: number, mp: any) => sum + Number(mp.percentage || 0), 0);
        if (Math.abs(totalPercent - 1) >= 0.001) {
          return res.status(400).json({ 
            success: false, 
            error: { message: `Manual percentages must sum to 100% (current: ${(totalPercent * 100).toFixed(2)}%)` } 
          });
        }
        
        for (const mp of manual_percentages) {
          manualPercentMap[mp.item_id] = Number(mp.percentage);
        }
      }

      await client.query('BEGIN');

      // Fetch the selected expenses (amount_before_vat - VAT is NOT included in item cost)
      const expensesResult = await client.query(
        `SELECT id, amount_before_vat, exchange_rate, currency_id
         FROM shipment_expenses
         WHERE id = ANY($1) AND shipment_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [expense_ids, shipmentId, companyId]
      );

      if (expensesResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { message: 'No valid expenses found' } });
      }

      // Calculate total expenses in base currency (using amount_before_vat only)
      const totalExpensesBase = expensesResult.rows.reduce((sum: number, exp: any) => {
        const amount = Number(exp.amount_before_vat || 0);
        const rate = Number(exp.exchange_rate || 1);
        return sum + (amount * rate);
      }, 0);

      // Fetch the selected items
      const itemsResult = await client.query(
        `SELECT si.id, si.item_id, si.quantity, si.unit_cost
         FROM logistics_shipment_items si
         WHERE si.id = ANY($1) AND si.shipment_id = $2 AND si.company_id = $3 AND si.deleted_at IS NULL`,
        [item_ids, shipmentId, companyId]
      );

      if (itemsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { message: 'No valid items found' } });
      }

      const items = itemsResult.rows;

      // Calculate distribution base
      const totalValue = items.reduce((sum: number, item: any) => 
        sum + (Number(item.quantity) * Number(item.unit_cost || 0)), 0);
      const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);

      // Distribute costs to each item
      const distributions: { item_id: number; cost_share: number; new_unit_cost: number }[] = [];

      for (const item of items) {
        const itemValue = Number(item.quantity) * Number(item.unit_cost || 0);
        const itemQty = Number(item.quantity);
        
        let sharePercent = 0;
        if (method === 'MANUAL') {
          // Use manual percentage for this item
          sharePercent = manualPercentMap[item.id] || 0;
        } else if (method === 'VALUE' && totalValue > 0) {
          sharePercent = itemValue / totalValue;
        } else if (method === 'QTY' && totalQty > 0) {
          sharePercent = itemQty / totalQty;
        } else if (method === 'EQUAL') {
          sharePercent = 1 / items.length;
        } else if (method === 'WEIGHT' && totalQty > 0) {
          // Weight-based: use quantity as proxy
          sharePercent = itemQty / totalQty;
        }

        const costShare = totalExpensesBase * sharePercent;
        const costPerUnit = itemQty > 0 ? costShare / itemQty : 0;
        const newUnitCost = Number(item.unit_cost || 0) + costPerUnit;

        // Update item with new unit cost
        await client.query(
          `UPDATE logistics_shipment_items
           SET unit_cost = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [newUnitCost, item.id]
        );

        distributions.push({
          item_id: item.id,
          cost_share: costShare,
          new_unit_cost: newUnitCost
        });
      }

      // Mark expenses as distributed
      await client.query(
        `UPDATE shipment_expenses
         SET is_distributed = true, distribution_method = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2)`,
        [method, expense_ids]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Costs distributed successfully',
        data: {
          total_expenses_distributed: totalExpensesBase,
          distribution_method: method,
          items_updated: distributions.length,
          distributions
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error distributing costs:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to distribute costs' } });
    } finally {
      client.release();
    }
  }
);

/**
 * @route   POST /api/logistics-shipments/:id/sync-items-from-po
 * @desc    Sync shipment items from the linked purchase order
 * @access  Private (logistics:shipments:edit)
 */
router.post(
  '/:id/sync-items-from-po',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipments:edit'),
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId;
      const shipmentId = parseInt(req.params.id, 10);
      if (Number.isNaN(shipmentId)) return res.status(400).json({ success: false, error: { message: 'Invalid id' } });

      // Get shipment with PO
      const shipmentResult = await client.query(
        `SELECT s.id, s.purchase_order_id, s.locked_at
         FROM logistics_shipments s
         WHERE s.id = $1 AND s.company_id = $2 AND s.deleted_at IS NULL`,
        [shipmentId, companyId]
      );

      if (shipmentResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
      }

      const shipment = shipmentResult.rows[0];
      if (shipment.locked_at) {
        return res.status(409).json({ success: false, error: { message: 'Shipment is locked' } });
      }

      if (!shipment.purchase_order_id) {
        return res.status(400).json({ success: false, error: { message: 'Shipment has no linked purchase order' } });
      }

      await client.query('BEGIN');

      // Get PO items
      const poItemsResult = await client.query(
        `SELECT 
           poi.item_id,
           poi.ordered_qty as quantity,
           poi.unit_price as unit_cost,
           poi.uom_id
         FROM purchase_order_items poi
         WHERE poi.order_id = $1`,
        [shipment.purchase_order_id]
      );

      const userId = (req as any).user?.id ?? null;
      const results = { added: 0, updated: 0, removed: 0 };

      // Get existing shipment items
      const existingItemsResult = await client.query(
        `SELECT id, item_id FROM logistics_shipment_items 
         WHERE shipment_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [shipmentId, companyId]
      );
      const existingItemIds = new Set(existingItemsResult.rows.map(r => r.item_id));
      const poItemIds = new Set(poItemsResult.rows.map(r => r.item_id));

      // Add or update items from PO
      for (const poItem of poItemsResult.rows) {
        if (existingItemIds.has(poItem.item_id)) {
          // Update existing
          await client.query(
            `UPDATE logistics_shipment_items
             SET quantity = $1, unit_cost = $2, uom_id = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
             WHERE shipment_id = $5 AND item_id = $6 AND company_id = $7 AND deleted_at IS NULL`,
            [poItem.quantity, poItem.unit_cost, poItem.uom_id, userId, shipmentId, poItem.item_id, companyId]
          );
          results.updated++;
        } else {
          // Insert new
          await client.query(
            `INSERT INTO logistics_shipment_items 
             (company_id, shipment_id, item_id, quantity, unit_cost, uom_id, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
            [companyId, shipmentId, poItem.item_id, poItem.quantity, poItem.unit_cost, poItem.uom_id, userId]
          );
          results.added++;
        }
      }

      // Soft delete items not in PO (optional - could be items added manually)
      // Only remove if user explicitly requests it via query param
      if (req.query.remove_extra === 'true') {
        for (const existing of existingItemsResult.rows) {
          if (!poItemIds.has(existing.item_id)) {
            await client.query(
              `UPDATE logistics_shipment_items 
               SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
               WHERE id = $2`,
              [userId, existing.id]
            );
            results.removed++;
          }
        }
      }

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Items synced from purchase order',
        data: results
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error syncing items from PO:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to sync items' } });
    } finally {
      client.release();
    }
  }
);

export default router;
