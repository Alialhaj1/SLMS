/**
 * 📍 STORAGE LOCATIONS (Warehouse Locations) ROUTE — Enterprise Edition
 * ======================================================================
 *
 * Full CRUD + /stats + /filters for the `storage_locations` table.
 * Hierarchical: Zone → Aisle → Rack → Shelf → Bin (via parent_location_id).
 * 
 * Mounted at:
 *   /api/master/warehouse-locations
 *   /api/warehouse-locations              (legacy alias)
 *
 * Permissions: master:warehouse_locations:view / create / edit / delete
 * Falls back to master:warehouses:view for read-only if new perms aren't assigned.
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ─── Helper: get company ID ─────────────────────────────────────────────────
function getCompanyId(req: Request): number | null {
  return (req as any).companyId
    ?? (req as any).companyContext?.companyId
    ?? (req as any).companyContext?.id
    ?? null;
}

// ─── Shared SELECT template ─────────────────────────────────────────────────
const LOCATION_SELECT = `
  SELECT
    sl.id,
    sl.company_id,
    sl.warehouse_id,
    w.code           AS warehouse_code,
    w.name           AS warehouse_name,
    COALESCE(w.name_en, w.name) AS warehouse_name_en,
    w.name_ar        AS warehouse_name_ar,
    sl.location_type_id,
    slt.code         AS location_type_code,
    slt.name_en      AS location_type_name,
    slt.name_ar      AS location_type_name_ar,
    slt.hierarchy_level,
    slt.can_store_items,
    sl.parent_location_id,
    p.location_code  AS parent_location_code,
    COALESCE(p.name_en, '') AS parent_location_name,
    sl.location_code,
    sl.barcode,
    sl.name_en,
    sl.name_ar,
    sl.row_number,
    sl.rack_number,
    sl.shelf_number,
    sl.bin_number,
    sl.max_weight_kg,
    sl.max_volume_m3,
    sl.min_temp_celsius,
    sl.max_temp_celsius,
    sl.allows_mixed_items,
    sl.allows_mixed_batches,
    sl.is_pickable,
    sl.is_blocked,
    sl.is_active,
    sl.current_fill_pct,
    sl.notes,
    sl.created_by,
    uc.email         AS created_by_name,
    sl.updated_by,
    uu.email         AS updated_by_name,
    sl.created_at,
    sl.updated_at,
    sl.deleted_at
  FROM storage_locations sl
  INNER JOIN warehouses w             ON sl.warehouse_id = w.id
  LEFT  JOIN storage_location_types slt ON sl.location_type_id = slt.id
  LEFT  JOIN storage_locations p      ON sl.parent_location_id = p.id
  LEFT  JOIN users uc                 ON sl.created_by = uc.id
  LEFT  JOIN users uu                 ON sl.updated_by = uu.id
`;

// ═══════════════════════════════════════════════════════════════════════════
// GET /stats
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/stats',
  requireAnyPermission(['master:warehouse_locations:view', 'master:warehouses:view']),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const stats = await pool.query(`
        SELECT
          COUNT(*)::int                                                       AS total,
          COUNT(*) FILTER (WHERE sl.is_active = true)::int                    AS active,
          COUNT(*) FILTER (WHERE sl.is_active = false)::int                   AS inactive,
          COUNT(*) FILTER (WHERE sl.is_blocked = true)::int                   AS blocked,
          COUNT(*) FILTER (WHERE sl.is_pickable = true)::int                  AS pickable,
          COUNT(DISTINCT sl.warehouse_id)::int                                AS warehouse_count,
          COUNT(DISTINCT sl.location_type_id)::int                            AS type_count,
          ROUND(COALESCE(AVG(sl.current_fill_pct), 0), 1)                    AS avg_fill_pct
        FROM storage_locations sl
        INNER JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE sl.company_id = $1 AND sl.deleted_at IS NULL AND w.deleted_at IS NULL
      `, [companyId]);

      const byType = await pool.query(`
        SELECT
          slt.name_en  AS type_name,
          slt.name_ar  AS type_name_ar,
          COUNT(sl.id)::int AS count
        FROM storage_locations sl
        LEFT JOIN storage_location_types slt ON sl.location_type_id = slt.id
        INNER JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE sl.company_id = $1 AND sl.deleted_at IS NULL AND w.deleted_at IS NULL
        GROUP BY slt.name_en, slt.name_ar
        ORDER BY count DESC
      `, [companyId]);

      return res.json({
        success: true,
        data: {
          ...stats.rows[0],
          by_type: byType.rows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching storage location stats:', error);
      return res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: 'Failed to fetch stats' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /filters
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/filters',
  requireAnyPermission(['master:warehouse_locations:view', 'master:warehouses:view']),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const [warehouses, locationTypes, parentLocations] = await Promise.all([
        pool.query(
          `SELECT id, code, COALESCE(name_en, name) AS name_en, name_ar
           FROM warehouses
           WHERE company_id = $1 AND deleted_at IS NULL
           ORDER BY code`,
          [companyId]
        ),
        pool.query(
          `SELECT id, code, name_en, name_ar, hierarchy_level, can_store_items
           FROM storage_location_types
           WHERE status = 'active'
           ORDER BY sort_order, id`
        ),
        pool.query(
          `SELECT id, location_code, name_en, name_ar, warehouse_id, location_type_id
           FROM storage_locations
           WHERE company_id = $1 AND deleted_at IS NULL
           ORDER BY location_code`,
          [companyId]
        ),
      ]);

      return res.json({
        success: true,
        data: {
          warehouses: warehouses.rows,
          location_types: locationTypes.rows,
          parent_locations: parentLocations.rows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching storage location filters:', error);
      return res.status(500).json({ success: false, error: { code: 'FILTERS_ERROR', message: 'Failed to fetch filters' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET / — List all storage locations
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/',
  requireAnyPermission(['master:warehouse_locations:view', 'master:warehouses:view']),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        warehouse_id,
        location_type_id,
        parent_location_id,
        search,
        is_active,
        is_blocked,
        is_pickable,
        sort = 'location_code',
        order = 'asc',
        page = '1',
        limit = '50',
      } = req.query;

      const params: any[] = [companyId];
      let paramCount = 1;

      let where = ` WHERE sl.company_id = $1 AND sl.deleted_at IS NULL AND w.deleted_at IS NULL`;

      if (warehouse_id) {
        paramCount++;
        where += ` AND sl.warehouse_id = $${paramCount}`;
        params.push(warehouse_id);
      }

      if (location_type_id) {
        paramCount++;
        where += ` AND sl.location_type_id = $${paramCount}`;
        params.push(location_type_id);
      }

      if (parent_location_id) {
        paramCount++;
        where += ` AND sl.parent_location_id = $${paramCount}`;
        params.push(parent_location_id);
      }

      if (typeof is_active === 'string') {
        paramCount++;
        where += ` AND sl.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (typeof is_blocked === 'string') {
        paramCount++;
        where += ` AND sl.is_blocked = $${paramCount}`;
        params.push(is_blocked === 'true');
      }

      if (typeof is_pickable === 'string') {
        paramCount++;
        where += ` AND sl.is_pickable = $${paramCount}`;
        params.push(is_pickable === 'true');
      }

      if (search) {
        paramCount++;
        where += ` AND (
          sl.location_code ILIKE $${paramCount}
          OR sl.name_en ILIKE $${paramCount}
          OR COALESCE(sl.name_ar, '') ILIKE $${paramCount}
          OR COALESCE(sl.barcode, '') ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Sorting
      const sortableFields: Record<string, string> = {
        location_code: 'sl.location_code',
        name_en: 'sl.name_en',
        warehouse_code: 'w.code',
        location_type_name: 'slt.name_en',
        is_active: 'sl.is_active',
        is_blocked: 'sl.is_blocked',
        current_fill_pct: 'sl.current_fill_pct',
        created_at: 'sl.created_at',
      };
      const sortCol = sortableFields[sort as string] || 'sl.location_code';
      const sortDir = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Pagination
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM storage_locations sl
         INNER JOIN warehouses w ON sl.warehouse_id = w.id
         LEFT JOIN storage_location_types slt ON sl.location_type_id = slt.id
         LEFT JOIN storage_locations p ON sl.parent_location_id = p.id
         ${where}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;

      // Data
      const dataResult = await pool.query(
        `${LOCATION_SELECT} ${where}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, pageSize, (pageNum - 1) * pageSize]
      );

      return res.json({
        success: true,
        data: dataResult.rows,
        total,
        page: pageNum,
        limit: pageSize,
      });
    } catch (error: any) {
      console.error('Error fetching storage locations:', error);
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch storage locations' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /:id — Single location
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/:id',
  requireAnyPermission(['master:warehouse_locations:view', 'master:warehouses:view']),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { id } = req.params;
      const result = await pool.query(
        `${LOCATION_SELECT}
         WHERE sl.id = $1 AND sl.company_id = $2 AND sl.deleted_at IS NULL AND w.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Storage location not found' } });
      }

      // Also fetch children
      const children = await pool.query(
        `SELECT id, location_code, name_en, name_ar, location_type_id, is_active, is_blocked
         FROM storage_locations
         WHERE parent_location_id = $1 AND deleted_at IS NULL
         ORDER BY location_code`,
        [id]
      );

      return res.json({
        success: true,
        data: {
          ...result.rows[0],
          children: children.rows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching storage location:', error);
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch storage location' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// POST / — Create
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  '/',
  requireAnyPermission(['master:warehouse_locations:create', 'master:warehouses:create']),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const userId = (req as any).user?.id ?? null;

      const {
        warehouse_id,
        location_type_id,
        parent_location_id,
        location_code,
        barcode,
        name_en,
        name_ar,
        row_number,
        rack_number,
        shelf_number,
        bin_number,
        max_weight_kg,
        max_volume_m3,
        min_temp_celsius,
        max_temp_celsius,
        allows_mixed_items = true,
        allows_mixed_batches = true,
        is_pickable = true,
        is_blocked = false,
        is_active = true,
        current_fill_pct = 0,
        notes,
      } = req.body;

      // Validate required fields
      if (!warehouse_id || !location_code || !name_en) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'warehouse_id, location_code and name_en are required' },
        });
      }

      // Ensure warehouse belongs to company
      const wh = await pool.query(
        'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [warehouse_id, companyId]
      );
      if (wh.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' } });
      }

      // Duplicate check
      const dup = await pool.query(
        `SELECT id FROM storage_locations
         WHERE warehouse_id = $1 AND UPPER(location_code) = UPPER($2) AND deleted_at IS NULL`,
        [warehouse_id, location_code]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: 'Location code already exists in this warehouse' },
        });
      }

      // Barcode duplicate check
      if (barcode) {
        const bdup = await pool.query(
          `SELECT id FROM storage_locations
           WHERE warehouse_id = $1 AND barcode = $2 AND deleted_at IS NULL`,
          [warehouse_id, barcode]
        );
        if (bdup.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'DUPLICATE_BARCODE', message: 'Barcode already exists in this warehouse' },
          });
        }
      }

      // Parent validation
      if (parent_location_id) {
        const parentRow = await pool.query(
          `SELECT id FROM storage_locations
           WHERE id = $1 AND warehouse_id = $2 AND deleted_at IS NULL`,
          [parent_location_id, warehouse_id]
        );
        if (parentRow.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_PARENT', message: 'Parent location not found in this warehouse' },
          });
        }
      }

      const result = await pool.query(
        `INSERT INTO storage_locations (
          company_id, warehouse_id, location_type_id, parent_location_id,
          location_code, barcode, name_en, name_ar,
          row_number, rack_number, shelf_number, bin_number,
          max_weight_kg, max_volume_m3, min_temp_celsius, max_temp_celsius,
          allows_mixed_items, allows_mixed_batches, is_pickable, is_blocked, is_active,
          current_fill_pct, notes, created_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24
        ) RETURNING *`,
        [
          companyId, warehouse_id, location_type_id || null, parent_location_id || null,
          String(location_code).toUpperCase(), barcode || null, name_en, name_ar || null,
          row_number || null, rack_number ?? null, shelf_number ?? null, bin_number || null,
          max_weight_kg ?? null, max_volume_m3 ?? null, min_temp_celsius ?? null, max_temp_celsius ?? null,
          !!allows_mixed_items, !!allows_mixed_batches, !!is_pickable, !!is_blocked, !!is_active,
          current_fill_pct ?? 0, notes || null, userId,
        ]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Storage location created successfully',
      });
    } catch (error: any) {
      console.error('Error creating storage location:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'A location with this code or barcode already exists' },
        });
      }
      return res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create storage location' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PUT /:id — Update
// ═══════════════════════════════════════════════════════════════════════════
router.put(
  '/:id',
  requireAnyPermission(['master:warehouse_locations:edit', 'master:warehouses:edit']),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const userId = (req as any).user?.id ?? null;
      const { id } = req.params;

      // Check existence
      const existing = await pool.query(
        `SELECT sl.*
         FROM storage_locations sl
         INNER JOIN warehouses w ON sl.warehouse_id = w.id
         WHERE sl.id = $1 AND sl.company_id = $2 AND sl.deleted_at IS NULL AND w.deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Storage location not found' } });
      }

      const {
        location_type_id,
        parent_location_id,
        location_code,
        barcode,
        name_en,
        name_ar,
        row_number,
        rack_number,
        shelf_number,
        bin_number,
        max_weight_kg,
        max_volume_m3,
        min_temp_celsius,
        max_temp_celsius,
        allows_mixed_items,
        allows_mixed_batches,
        is_pickable,
        is_blocked,
        is_active,
        current_fill_pct,
        notes,
      } = req.body;

      // Code uniqueness check
      if (location_code) {
        const dup = await pool.query(
          `SELECT id FROM storage_locations
           WHERE warehouse_id = $1 AND UPPER(location_code) = UPPER($2) AND id <> $3 AND deleted_at IS NULL`,
          [existing.rows[0].warehouse_id, location_code, id]
        );
        if (dup.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'DUPLICATE_CODE', message: 'Location code already exists in this warehouse' },
          });
        }
      }

      // Barcode uniqueness check
      if (barcode) {
        const bdup = await pool.query(
          `SELECT id FROM storage_locations
           WHERE warehouse_id = $1 AND barcode = $2 AND id <> $3 AND deleted_at IS NULL`,
          [existing.rows[0].warehouse_id, barcode, id]
        );
        if (bdup.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'DUPLICATE_BARCODE', message: 'Barcode already exists in this warehouse' },
          });
        }
      }

      // Prevent circular parent reference
      if (parent_location_id && String(parent_location_id) === String(id)) {
        return res.status(400).json({
          success: false,
          error: { code: 'CIRCULAR_REF', message: 'A location cannot be its own parent' },
        });
      }

      const result = await pool.query(
        `UPDATE storage_locations
         SET
           location_type_id    = COALESCE($1,  location_type_id),
           parent_location_id  = $2,
           location_code       = COALESCE($3,  location_code),
           barcode             = $4,
           name_en             = COALESCE($5,  name_en),
           name_ar             = COALESCE($6,  name_ar),
           row_number          = COALESCE($7,  row_number),
           rack_number         = COALESCE($8,  rack_number),
           shelf_number        = COALESCE($9,  shelf_number),
           bin_number          = COALESCE($10, bin_number),
           max_weight_kg       = COALESCE($11, max_weight_kg),
           max_volume_m3       = COALESCE($12, max_volume_m3),
           min_temp_celsius    = COALESCE($13, min_temp_celsius),
           max_temp_celsius    = COALESCE($14, max_temp_celsius),
           allows_mixed_items  = COALESCE($15, allows_mixed_items),
           allows_mixed_batches = COALESCE($16, allows_mixed_batches),
           is_pickable         = COALESCE($17, is_pickable),
           is_blocked          = COALESCE($18, is_blocked),
           is_active           = COALESCE($19, is_active),
           current_fill_pct    = COALESCE($20, current_fill_pct),
           notes               = COALESCE($21, notes),
           updated_by          = $22,
           updated_at          = CURRENT_TIMESTAMP
         WHERE id = $23
         RETURNING *`,
        [
          location_type_id ?? null,
          parent_location_id !== undefined ? (parent_location_id || null) : existing.rows[0].parent_location_id,
          location_code ? String(location_code).toUpperCase() : null,
          barcode !== undefined ? (barcode || null) : existing.rows[0].barcode,
          name_en,
          name_ar,
          row_number,
          rack_number !== undefined ? rack_number : null,
          shelf_number !== undefined ? shelf_number : null,
          bin_number,
          max_weight_kg !== undefined ? max_weight_kg : null,
          max_volume_m3 !== undefined ? max_volume_m3 : null,
          min_temp_celsius !== undefined ? min_temp_celsius : null,
          max_temp_celsius !== undefined ? max_temp_celsius : null,
          typeof allows_mixed_items === 'boolean' ? allows_mixed_items : null,
          typeof allows_mixed_batches === 'boolean' ? allows_mixed_batches : null,
          typeof is_pickable === 'boolean' ? is_pickable : null,
          typeof is_blocked === 'boolean' ? is_blocked : null,
          typeof is_active === 'boolean' ? is_active : null,
          current_fill_pct !== undefined ? current_fill_pct : null,
          notes,
          userId,
          id,
        ]
      );

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Storage location updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating storage location:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'A location with this code or barcode already exists' },
        });
      }
      return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update storage location' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /:id — Soft delete
// ═══════════════════════════════════════════════════════════════════════════
router.delete(
  '/:id',
  requireAnyPermission(['master:warehouse_locations:delete', 'master:warehouses:delete']),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const { id } = req.params;

      const existing = await pool.query(
        `SELECT sl.id
         FROM storage_locations sl
         INNER JOIN warehouses w ON sl.warehouse_id = w.id
         WHERE sl.id = $1 AND sl.company_id = $2 AND sl.deleted_at IS NULL AND w.deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Storage location not found' } });
      }

      // Block delete if children exist
      const children = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM storage_locations WHERE parent_location_id = $1 AND deleted_at IS NULL',
        [id]
      );
      if ((children.rows[0]?.cnt ?? 0) > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'HAS_CHILDREN', message: 'Cannot delete location because it has child locations. Delete children first.' },
        });
      }

      // Block delete if referenced by inventory
      try {
        const usage = await pool.query(
          'SELECT COUNT(*)::int AS cnt FROM item_warehouse WHERE location_id = $1',
          [id]
        );
        if ((usage.rows[0]?.cnt ?? 0) > 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'IN_USE', message: 'Cannot delete location because it is referenced by inventory records' },
          });
        }
      } catch {
        // item_warehouse table may not exist yet — skip check
      }

      // Soft delete
      await pool.query(
        `UPDATE storage_locations SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      return res.json({ success: true, message: 'Storage location deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting storage location:', error);
      return res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete storage location' } });
    }
  }
);

export default router;
