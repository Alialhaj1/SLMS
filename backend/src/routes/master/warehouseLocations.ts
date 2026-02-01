import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// Note: `warehouse_locations` (migration 018) does NOT include soft delete columns.
// We therefore block delete when in use and hard-delete otherwise.

router.get(
  '/',
  requirePermission('master:warehouses:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { warehouse_id, search, location_type, is_active } = req.query;

      const params: any[] = [companyId];
      let paramCount = 1;

      let query = `
        SELECT
          wl.id,
          wl.warehouse_id,
          w.code AS warehouse_code,
          w.name AS warehouse_name,
          wl.code,
          wl.name,
          wl.name_ar,
          wl.zone,
          wl.aisle,
          wl.rack,
          wl.shelf,
          wl.bin,
          wl.is_default,
          wl.is_active,
          wl.location_type,
          wl.capacity,
          wl.max_weight,
          wl.max_volume,
          wl.notes,
          wl.created_at,
          wl.updated_at
        FROM warehouse_locations wl
        INNER JOIN warehouses w ON wl.warehouse_id = w.id
        WHERE w.company_id = $1 AND w.deleted_at IS NULL
      `;

      if (warehouse_id) {
        paramCount++;
        query += ` AND wl.warehouse_id = $${paramCount}`;
        params.push(warehouse_id);
      }

      if (location_type) {
        paramCount++;
        query += ` AND wl.location_type = $${paramCount}`;
        params.push(location_type);
      }

      if (typeof is_active === 'string') {
        paramCount++;
        query += ` AND wl.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (search) {
        paramCount++;
        query += ` AND (
          wl.code ILIKE $${paramCount}
          OR wl.name ILIKE $${paramCount}
          OR COALESCE(wl.zone,'') ILIKE $${paramCount}
          OR COALESCE(wl.aisle,'') ILIKE $${paramCount}
          OR COALESCE(wl.rack,'') ILIKE $${paramCount}
          OR COALESCE(wl.shelf,'') ILIKE $${paramCount}
          OR COALESCE(wl.bin,'') ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY w.code, wl.code';

      const result = await pool.query(query, params);
      return res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      console.error('Error fetching warehouse locations:', error);
      return res
        .status(500)
        .json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch warehouse locations' } });
    }
  }
);

router.post(
  '/',
  requirePermission('master:warehouses:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        warehouse_id,
        code,
        name,
        name_ar,
        zone,
        aisle,
        rack,
        shelf,
        bin,
        is_default = false,
        is_active = true,
        location_type = 'storage',
        capacity,
        max_weight,
        max_volume,
        notes,
      } = req.body;

      if (!warehouse_id || !code || !name) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'warehouse_id, code and name are required' } });
      }

      // Ensure warehouse belongs to company
      const wh = await pool.query(
        'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [warehouse_id, companyId]
      );
      if (wh.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: { code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' } });
      }

      const dup = await pool.query(
        'SELECT id FROM warehouse_locations WHERE warehouse_id = $1 AND code = $2',
        [warehouse_id, String(code).toUpperCase()]
      );
      if (dup.rows.length > 0) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Location code already exists in this warehouse' } });
      }

      const result = await pool.query(
        `INSERT INTO warehouse_locations (
          warehouse_id,
          code,
          name,
          name_ar,
          zone,
          aisle,
          rack,
          shelf,
          bin,
          is_default,
          is_active,
          location_type,
          capacity,
          max_weight,
          max_volume,
          notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING *`,
        [
          warehouse_id,
          String(code).toUpperCase(),
          name,
          name_ar || null,
          zone || null,
          aisle || null,
          rack || null,
          shelf || null,
          bin || null,
          !!is_default,
          !!is_active,
          location_type,
          capacity ?? null,
          max_weight ?? null,
          max_volume ?? null,
          notes || null,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0], message: 'Location created successfully' });
    } catch (error: any) {
      console.error('Error creating warehouse location:', error);
      return res
        .status(500)
        .json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create warehouse location' } });
    }
  }
);

router.put(
  '/:id',
  requirePermission('master:warehouses:edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { id } = req.params;

      const existing = await pool.query(
        `SELECT wl.*
         FROM warehouse_locations wl
         INNER JOIN warehouses w ON wl.warehouse_id = w.id
         WHERE wl.id = $1 AND w.company_id = $2 AND w.deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
      }

      const {
        code,
        name,
        name_ar,
        zone,
        aisle,
        rack,
        shelf,
        bin,
        is_default,
        is_active,
        location_type,
        capacity,
        max_weight,
        max_volume,
        notes,
      } = req.body;

      if (code) {
        const dup = await pool.query(
          'SELECT id FROM warehouse_locations WHERE warehouse_id = $1 AND code = $2 AND id <> $3',
          [existing.rows[0].warehouse_id, String(code).toUpperCase(), id]
        );
        if (dup.rows.length > 0) {
          return res
            .status(400)
            .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Location code already exists in this warehouse' } });
        }
      }

      const result = await pool.query(
        `UPDATE warehouse_locations
         SET
           code = COALESCE($1, code),
           name = COALESCE($2, name),
           name_ar = COALESCE($3, name_ar),
           zone = COALESCE($4, zone),
           aisle = COALESCE($5, aisle),
           rack = COALESCE($6, rack),
           shelf = COALESCE($7, shelf),
           bin = COALESCE($8, bin),
           is_default = COALESCE($9, is_default),
           is_active = COALESCE($10, is_active),
           location_type = COALESCE($11, location_type),
           capacity = COALESCE($12, capacity),
           max_weight = COALESCE($13, max_weight),
           max_volume = COALESCE($14, max_volume),
           notes = COALESCE($15, notes),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $16
         RETURNING *`,
        [
          code ? String(code).toUpperCase() : null,
          name,
          name_ar,
          zone,
          aisle,
          rack,
          shelf,
          bin,
          typeof is_default === 'boolean' ? is_default : null,
          typeof is_active === 'boolean' ? is_active : null,
          location_type,
          capacity ?? null,
          max_weight ?? null,
          max_volume ?? null,
          notes,
          id,
        ]
      );

      return res.json({ success: true, data: result.rows[0], message: 'Location updated successfully' });
    } catch (error: any) {
      console.error('Error updating warehouse location:', error);
      return res
        .status(500)
        .json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update warehouse location' } });
    }
  }
);

router.delete(
  '/:id',
  requirePermission('master:warehouses:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { id } = req.params;

      const existing = await pool.query(
        `SELECT wl.id, wl.warehouse_id
         FROM warehouse_locations wl
         INNER JOIN warehouses w ON wl.warehouse_id = w.id
         WHERE wl.id = $1 AND w.company_id = $2 AND w.deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } });
      }

      const usage = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM item_warehouse WHERE location_id = $1',
        [id]
      );
      if ((usage.rows[0]?.cnt ?? 0) > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'IN_USE', message: 'Cannot delete location because it is referenced by item stock records' },
        });
      }

      await pool.query('DELETE FROM warehouse_locations WHERE id = $1', [id]);

      return res.json({ success: true, message: 'Location deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting warehouse location:', error);
      return res
        .status(500)
        .json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete warehouse location' } });
    }
  }
);

export default router;
