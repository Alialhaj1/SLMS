/**
 * ===============================================
 * Shipping Bills Routes (بوليصات الشحن)
 * ===============================================
 * Manages Bill of Lading (B/L), Air Waybill (AWB), and other shipping documents
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';

const router = Router();

// ============================================================================
// Helpers
// ============================================================================
function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// ============================================================================
// Schemas
// ============================================================================
const shippingBillSchema = z.object({
  bill_number: z.string().min(1).max(60),
  bill_type_id: z.number().int().positive(),
  booking_number: z.string().max(60).optional().nullable(),
  bill_date: z.string().optional().nullable(),
  
  shipment_id: z.number().int().positive().optional().nullable(),
  project_id: z.number().int().positive().optional().nullable(),
  
  carrier_id: z.number().int().positive().optional().nullable(),
  carrier_name: z.string().max(200).optional().nullable(),
  vessel_name: z.string().max(100).optional().nullable(),
  voyage_number: z.string().max(50).optional().nullable(),
  
  port_of_loading_id: z.number().int().positive().optional().nullable(),
  port_of_loading_text: z.string().max(200).optional().nullable(),
  port_of_discharge_id: z.number().int().positive().optional().nullable(),
  port_of_discharge_text: z.string().max(200).optional().nullable(),
  place_of_delivery: z.string().max(200).optional().nullable(),
  destination_location_id: z.number().int().positive().optional().nullable(),
  
  containers_count: z.number().int().nonnegative().optional().default(0),
  container_type: z.string().max(20).optional().nullable(),
  container_numbers: z.array(z.string()).optional().nullable(),
  
  cargo_description: z.string().optional().nullable(),
  gross_weight: z.number().nonnegative().optional().nullable(),
  gross_weight_unit: z.string().max(10).optional().default('KG'),
  net_weight: z.number().nonnegative().optional().nullable(),
  volume: z.number().nonnegative().optional().nullable(),
  volume_unit: z.string().max(10).optional().default('CBM'),
  packages_count: z.number().int().nonnegative().optional().nullable(),
  package_type: z.string().max(50).optional().nullable(),
  
  shipped_on_board_date: z.string().optional().nullable(),
  eta_date: z.string().optional().nullable(),
  ata_date: z.string().optional().nullable(),
  
  tracking_url: z.string().url().optional().nullable().or(z.literal('')),
  tracking_number: z.string().max(100).optional().nullable(),
  
  status: z.enum(['draft', 'issued', 'shipped', 'in_transit', 'arrived', 'delivered', 'completed', 'cancelled']).optional().default('draft'),
  
  is_original: z.boolean().optional().default(true),
  is_freight_prepaid: z.boolean().optional().default(true),
  freight_terms: z.string().max(30).optional().nullable(),
  
  notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
});

const updateSchema = shippingBillSchema.partial();

// ============================================================================
// GET /api/shipping-bills - List with filters
// ============================================================================
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('shipping_bills:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { page, limit, offset } = parsePagination(req.query);
      const { 
        search, 
        status, 
        bill_type_id, 
        carrier_id, 
        shipment_id,
        project_id,
        date_from,
        date_to,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      // Validate sort
      const allowedSorts = ['bill_number', 'bill_date', 'eta_date', 'status', 'created_at'];
      const sortField = allowedSorts.includes(String(sort_by)) ? String(sort_by) : 'created_at';
      const sortDir = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Build WHERE conditions
      const conditions: string[] = ['sb.company_id = $1', 'sb.deleted_at IS NULL'];
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (search) {
        conditions.push(`(
          sb.bill_number ILIKE $${paramIndex} 
          OR sb.booking_number ILIKE $${paramIndex}
          OR sb.vessel_name ILIKE $${paramIndex}
          OR sb.carrier_name ILIKE $${paramIndex}
          OR sb.tracking_number ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        conditions.push(`sb.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (bill_type_id) {
        conditions.push(`sb.bill_type_id = $${paramIndex}`);
        params.push(parseInt(String(bill_type_id)));
        paramIndex++;
      }

      if (carrier_id) {
        conditions.push(`sb.carrier_id = $${paramIndex}`);
        params.push(parseInt(String(carrier_id)));
        paramIndex++;
      }

      if (shipment_id) {
        conditions.push(`sb.shipment_id = $${paramIndex}`);
        params.push(parseInt(String(shipment_id)));
        paramIndex++;
      }

      if (project_id) {
        conditions.push(`sb.project_id = $${paramIndex}`);
        params.push(parseInt(String(project_id)));
        paramIndex++;
      }

      if (date_from) {
        conditions.push(`sb.bill_date >= $${paramIndex}`);
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        conditions.push(`sb.bill_date <= $${paramIndex}`);
        params.push(date_to);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Count total
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM shipping_bills sb WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Fetch data with joins
      const query = `
        SELECT 
          sb.id,
          sb.bill_number,
          sb.booking_number,
          sb.bill_date,
          sb.bill_type_id,
          bt.code AS bill_type_code,
          bt.name AS bill_type_name,
          bt.name_ar AS bill_type_name_ar,
          sb.shipment_id,
          ls.shipment_number,
          sb.project_id,
          p.name AS project_name,
          sb.carrier_id,
          COALESCE(sa.name, sb.carrier_name) AS carrier_name,
          sb.vessel_name,
          sb.voyage_number,
          sb.port_of_loading_id,
          COALESCE(pol.name, sb.port_of_loading_text) AS port_of_loading,
          sb.port_of_discharge_id,
          COALESCE(pod.name, sb.port_of_discharge_text) AS port_of_discharge,
          sb.containers_count,
          sb.container_type,
          sb.gross_weight,
          sb.gross_weight_unit,
          sb.eta_date,
          sb.ata_date,
          sb.status,
          sb.is_original,
          sb.tracking_url,
          sb.created_at,
          sb.updated_at
        FROM shipping_bills sb
        LEFT JOIN bill_types bt ON bt.id = sb.bill_type_id
        LEFT JOIN logistics_shipments ls ON ls.id = sb.shipment_id
        LEFT JOIN projects p ON p.id = sb.project_id
        LEFT JOIN shipping_agents sa ON sa.id = sb.carrier_id
        LEFT JOIN ports pol ON pol.id = sb.port_of_loading_id
        LEFT JOIN ports pod ON pod.id = sb.port_of_discharge_id
        WHERE ${whereClause}
        ORDER BY sb.${sortField} ${sortDir}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await pool.query(query, [...params, limit, offset]);

      res.json({
        data: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching shipping bills:', error);
      res.status(500).json({ error: 'Failed to fetch shipping bills' });
    }
  }
);

// ============================================================================
// GET /api/shipping-bills/:id - Get by ID
// ============================================================================
router.get(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('shipping_bills:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const query = `
        SELECT 
          sb.*,
          bt.code AS bill_type_code,
          bt.name AS bill_type_name,
          bt.name_ar AS bill_type_name_ar,
          bt.category AS bill_type_category,
          ls.shipment_number,
          p.name AS project_name,
          p.code AS project_code,
          COALESCE(sa.name, sb.carrier_name) AS carrier_display_name,
          sa.code AS carrier_code,
          pol.name AS port_of_loading_name,
          pol.code AS port_of_loading_code,
          pod.name AS port_of_discharge_name,
          pod.code AS port_of_discharge_code,
          city.name AS destination_city_name,
          uc.email AS created_by_email,
          uu.email AS updated_by_email
        FROM shipping_bills sb
        LEFT JOIN bill_types bt ON bt.id = sb.bill_type_id
        LEFT JOIN logistics_shipments ls ON ls.id = sb.shipment_id
        LEFT JOIN projects p ON p.id = sb.project_id
        LEFT JOIN shipping_agents sa ON sa.id = sb.carrier_id
        LEFT JOIN ports pol ON pol.id = sb.port_of_loading_id
        LEFT JOIN ports pod ON pod.id = sb.port_of_discharge_id
        LEFT JOIN cities city ON city.id = sb.destination_location_id
        LEFT JOIN users uc ON uc.id = sb.created_by
        LEFT JOIN users uu ON uu.id = sb.updated_by
        WHERE sb.id = $1 AND sb.company_id = $2 AND sb.deleted_at IS NULL
      `;

      const result = await pool.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Shipping bill not found' });
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching shipping bill:', error);
      res.status(500).json({ error: 'Failed to fetch shipping bill' });
    }
  }
);

// ============================================================================
// POST /api/shipping-bills - Create
// ============================================================================
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('shipping_bills:create'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const parsed = shippingBillSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      }

      const data = parsed.data;

      // Check for duplicate bill_number
      const dupCheck = await pool.query(
        `SELECT id FROM shipping_bills 
         WHERE company_id = $1 AND bill_number = $2 AND deleted_at IS NULL`,
        [companyId, data.bill_number]
      );
      
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Bill number already exists' });
      }

      const insertQuery = `
        INSERT INTO shipping_bills (
          company_id, bill_number, bill_type_id, booking_number, bill_date,
          shipment_id, project_id, carrier_id, carrier_name, vessel_name, voyage_number,
          port_of_loading_id, port_of_loading_text, port_of_discharge_id, port_of_discharge_text,
          place_of_delivery, destination_location_id,
          containers_count, container_type, container_numbers,
          cargo_description, gross_weight, gross_weight_unit, net_weight, volume, volume_unit,
          packages_count, package_type,
          shipped_on_board_date, eta_date, ata_date,
          tracking_url, tracking_number,
          status, is_original, is_freight_prepaid, freight_terms,
          notes, internal_notes,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17,
          $18, $19, $20,
          $21, $22, $23, $24, $25, $26,
          $27, $28,
          $29, $30, $31,
          $32, $33,
          $34, $35, $36, $37,
          $38, $39,
          $40, $40
        ) RETURNING id
      `;

      const result = await pool.query(insertQuery, [
        companyId,
        data.bill_number,
        data.bill_type_id,
        data.booking_number || null,
        data.bill_date || null,
        data.shipment_id || null,
        data.project_id || null,
        data.carrier_id || null,
        data.carrier_name || null,
        data.vessel_name || null,
        data.voyage_number || null,
        data.port_of_loading_id || null,
        data.port_of_loading_text || null,
        data.port_of_discharge_id || null,
        data.port_of_discharge_text || null,
        data.place_of_delivery || null,
        data.destination_location_id || null,
        data.containers_count ?? 0,
        data.container_type || null,
        data.container_numbers || null,
        data.cargo_description || null,
        data.gross_weight || null,
        data.gross_weight_unit || 'KG',
        data.net_weight || null,
        data.volume || null,
        data.volume_unit || 'CBM',
        data.packages_count || null,
        data.package_type || null,
        data.shipped_on_board_date || null,
        data.eta_date || null,
        data.ata_date || null,
        data.tracking_url || null,
        data.tracking_number || null,
        data.status || 'draft',
        data.is_original ?? true,
        data.is_freight_prepaid ?? true,
        data.freight_terms || null,
        data.notes || null,
        data.internal_notes || null,
        userId
      ]);

      (req as any).resourceId = result.rows[0].id;

      res.status(201).json({ 
        message: 'Shipping bill created successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      console.error('Error creating shipping bill:', error);
      res.status(500).json({ error: 'Failed to create shipping bill' });
    }
  }
);

// ============================================================================
// PUT /api/shipping-bills/:id - Update
// ============================================================================
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('shipping_bills:update'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Capture before state for audit logging
      await captureBeforeState(req as any, 'shipping_bills', parseInt(id));

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      // Check exists
      const existing = await pool.query(
        `SELECT id FROM shipping_bills WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Shipping bill not found' });
      }

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      }

      const data = parsed.data;

      // Check for duplicate bill_number if changed
      if (data.bill_number) {
        const dupCheck = await pool.query(
          `SELECT id FROM shipping_bills 
           WHERE company_id = $1 AND bill_number = $2 AND id != $3 AND deleted_at IS NULL`,
          [companyId, data.bill_number, id]
        );
        
        if (dupCheck.rows.length > 0) {
          return res.status(409).json({ error: 'Bill number already exists' });
        }
      }

      // Build dynamic update
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fields = [
        'bill_number', 'bill_type_id', 'booking_number', 'bill_date',
        'shipment_id', 'project_id', 'carrier_id', 'carrier_name', 
        'vessel_name', 'voyage_number',
        'port_of_loading_id', 'port_of_loading_text', 
        'port_of_discharge_id', 'port_of_discharge_text',
        'place_of_delivery', 'destination_location_id',
        'containers_count', 'container_type', 'container_numbers',
        'cargo_description', 'gross_weight', 'gross_weight_unit', 
        'net_weight', 'volume', 'volume_unit',
        'packages_count', 'package_type',
        'shipped_on_board_date', 'eta_date', 'ata_date',
        'tracking_url', 'tracking_number',
        'status', 'is_original', 'is_freight_prepaid', 'freight_terms',
        'notes', 'internal_notes'
      ];

      for (const field of fields) {
        if (data[field as keyof typeof data] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(data[field as keyof typeof data]);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      updates.push(`updated_at = NOW()`);

      values.push(id);
      values.push(companyId);

      const updateQuery = `
        UPDATE shipping_bills 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1} AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Shipping bill not found' });
      }

      (req as any).resourceId = id;

      res.json({ 
        message: 'Shipping bill updated successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      console.error('Error updating shipping bill:', error);
      res.status(500).json({ error: 'Failed to update shipping bill' });
    }
  }
);

// ============================================================================
// DELETE /api/shipping-bills/:id - Soft delete
// ============================================================================
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('shipping_bills:delete'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { id } = req.params;

      // Capture before state for audit logging
      await captureBeforeState(req as any, 'shipping_bills', parseInt(id));

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const result = await pool.query(
        `UPDATE shipping_bills 
         SET deleted_at = NOW() 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Shipping bill not found' });
      }

      (req as any).resourceId = id;

      res.json({ message: 'Shipping bill deleted successfully' });
    } catch (error) {
      console.error('Error deleting shipping bill:', error);
      res.status(500).json({ error: 'Failed to delete shipping bill' });
    }
  }
);

// ============================================================================
// PATCH /api/shipping-bills/:id/status - Change status
// ============================================================================
router.patch(
  '/:id/status',
  authenticate,
  loadCompanyContext,
  requirePermission('shipping_bills:change_status'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { status } = req.body;

      // Capture before state for audit logging
      await captureBeforeState(req as any, 'shipping_bills', parseInt(id));

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const validStatuses = ['draft', 'issued', 'shipped', 'in_transit', 'arrived', 'delivered', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const result = await pool.query(
        `UPDATE shipping_bills 
         SET status = $1, updated_by = $2, updated_at = NOW()
         WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
         RETURNING id, status`,
        [status, userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Shipping bill not found' });
      }

      (req as any).resourceId = id;

      res.json({ 
        message: 'Status updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error changing status:', error);
      res.status(500).json({ error: 'Failed to change status' });
    }
  }
);

// ============================================================================
// GET /api/shipping-bills/by-shipment/:shipmentId - Get bills for a shipment
// ============================================================================
router.get(
  '/by-shipment/:shipmentId',
  authenticate,
  loadCompanyContext,
  requirePermission('shipping_bills:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { shipmentId } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const result = await pool.query(
        `SELECT 
          sb.id,
          sb.bill_number,
          sb.bill_type_id,
          bt.code AS bill_type_code,
          bt.name AS bill_type_name,
          bt.name_ar AS bill_type_name_ar,
          sb.booking_number,
          sb.bill_date,
          sb.vessel_name,
          sb.voyage_number,
          sb.eta_date,
          sb.status,
          sb.is_original
        FROM shipping_bills sb
        LEFT JOIN bill_types bt ON bt.id = sb.bill_type_id
        WHERE sb.shipment_id = $1 AND sb.company_id = $2 AND sb.deleted_at IS NULL
        ORDER BY sb.created_at DESC`,
        [shipmentId, companyId]
      );

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching bills by shipment:', error);
      res.status(500).json({ error: 'Failed to fetch shipping bills' });
    }
  }
);

export default router;
