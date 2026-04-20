/**
 * 🏭 WAREHOUSES API — Enterprise Edition
 * ========================================
 * Endpoints: /stats, /filters, GET (list+paginate), GET /:id, POST, PUT /:id, DELETE /:id, POST /:id/restore
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 * Sub-tables: storage_locations (linked via warehouse_id)
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { applyEnhancedAudit } from '../../middleware/enhancedAuditLog';
import { dynamicDeletionProtection } from '../../services/referenceIntegrityEngine';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);
applyEnhancedAudit(router, 'warehouses');

// ─── HELPERS ─────────────────────────────────────────────────────────

async function tableExists(name: string): Promise<boolean> {
  const r = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_name = $1",
    [name]
  );
  return (r.rowCount ?? 0) > 0;
}

async function columnExists(table: string, col: string): Promise<boolean> {
  const r = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2",
    [table, col]
  );
  return (r.rowCount ?? 0) > 0;
}

function addCol(
  cols: string[], vals: any[], key: string, val: any
): void {
  if (val === undefined) return;
  cols.push(key);
  vals.push(val === '' ? null : val);
}

function setCol(
  sets: string[], vals: any[], key: string, val: any, idx: () => number
): void {
  if (val === undefined) return;
  sets.push(`${key} = $${idx()}`);
  vals.push(val === '' ? null : val);
}

// ─── SELECT TEMPLATE ────────────────────────────────────────────────

const WAREHOUSE_SELECT = `
  SELECT
    w.*,
    -- Branch join
    br.name       AS branch_name,
    br.name_en    AS branch_name_en,
    br.name_ar    AS branch_name_ar,
    br.code       AS branch_code,
    -- Warehouse type join
    wt.name       AS warehouse_type_name,
    wt.name_ar    AS warehouse_type_name_ar,
    wt.code       AS warehouse_type_code,
    wt.warehouse_category AS warehouse_type_category,
    -- Country join
    co.name       AS country_name,
    co.code       AS country_code,
    co.flag_emoji AS country_flag,
    -- City join
    ci.name       AS city_name,
    ci.code       AS city_code,
    -- Cost center join
    cc.code       AS cost_center_code,
    cc.name       AS cost_center_name,
    cc.name_ar    AS cost_center_name_ar,
    -- Created by user
    uc.email      AS created_by_name
  FROM warehouses w
  LEFT JOIN branches br       ON br.id = w.branch_id      AND br.deleted_at IS NULL
  LEFT JOIN warehouse_types wt ON wt.id = w.warehouse_type_id AND wt.deleted_at IS NULL
  LEFT JOIN countries co      ON co.id = w.country_id     AND co.deleted_at IS NULL
  LEFT JOIN cities ci         ON ci.id = w.city_id        AND ci.deleted_at IS NULL
  LEFT JOIN cost_centers cc   ON cc.id = w.cost_center_id AND cc.deleted_at IS NULL
  LEFT JOIN users uc          ON uc.id = w.created_by
`;

// ─── GET /stats ─────────────────────────────────────────────────────

router.get(
  '/stats',
  requirePermission('master:warehouses:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;

      const hasCapacity = await columnExists('warehouses', 'capacity_m3');
      const hasNegStock = await columnExists('warehouses', 'allow_negative_stock');
      const hasBranch = await columnExists('warehouses', 'branch_id');

      const stats = await pool.query(`
        SELECT
          COUNT(*)::int                                         AS total,
          COUNT(*) FILTER (WHERE w.is_active = true)::int       AS active,
          COUNT(*) FILTER (WHERE w.is_active = false)::int      AS inactive,
          COUNT(DISTINCT w.warehouse_type_id) FILTER (WHERE w.warehouse_type_id IS NOT NULL)::int AS type_count,
          ${hasBranch ? "COUNT(DISTINCT w.branch_id) FILTER (WHERE w.branch_id IS NOT NULL)::int" : "0::int"} AS branch_count,
          ${hasCapacity ? "COALESCE(SUM(w.capacity_m3), 0)" : "0"} AS total_capacity_m3,
          ${hasNegStock ? "COUNT(*) FILTER (WHERE w.allow_negative_stock = true)::int" : "0::int"} AS allows_negative_count,
          COUNT(*) FILTER (WHERE w.is_default = true)::int      AS default_count
        FROM warehouses w
        WHERE ${companyId ? 'w.company_id = $1 AND' : ''} w.deleted_at IS NULL
      `, companyId ? [companyId] : []);

      // By type breakdown
      const hasWhTypes = await tableExists('warehouse_types');
      let byType: any[] = [];
      if (hasWhTypes) {
        const bt = await pool.query(`
          SELECT wt.name AS type_name, wt.name_ar AS type_name_ar, COUNT(w.id)::int AS count
          FROM warehouses w
          JOIN warehouse_types wt ON wt.id = w.warehouse_type_id AND wt.deleted_at IS NULL
          WHERE ${companyId ? 'w.company_id = $1 AND' : ''} w.deleted_at IS NULL
          GROUP BY wt.name, wt.name_ar
          ORDER BY count DESC
        `, companyId ? [companyId] : []);
        byType = bt.rows;
      }

      res.json({ success: true, data: { ...stats.rows[0], by_type: byType } });
    } catch (error: any) {
      console.error('Error fetching warehouse stats:', error);
      res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: 'Failed to fetch stats' } });
    }
  }
);

// ─── GET /filters ───────────────────────────────────────────────────

router.get(
  '/filters',
  requirePermission('master:warehouses:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;

      const [whTypes, branches, countries, cities] = await Promise.all([
        pool.query(`
          SELECT id, name AS name, name_ar FROM warehouse_types
          WHERE ${companyId ? 'company_id = $1 AND' : ''} deleted_at IS NULL
          ORDER BY name
        `, companyId ? [companyId] : []),
        pool.query(`
          SELECT id, name_en AS name, name_ar, code FROM branches
          WHERE ${companyId ? 'company_id = $1 AND' : ''} deleted_at IS NULL
          ORDER BY name_en
        `, companyId ? [companyId] : []),
        pool.query(`
          SELECT id, name, name_ar, code, flag_emoji FROM countries
          WHERE deleted_at IS NULL ORDER BY name LIMIT 300
        `),
        pool.query(`
          SELECT id, name, name_ar, code FROM cities
          WHERE deleted_at IS NULL ORDER BY name LIMIT 500
        `),
      ]);

      res.json({
        success: true,
        data: {
          warehouse_types: whTypes.rows,
          branches: branches.rows,
          countries: countries.rows,
          cities: cities.rows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching warehouse filters:', error);
      res.status(500).json({ success: false, error: { code: 'FILTERS_ERROR', message: 'Failed to fetch filters' } });
    }
  }
);

// ─── GET / (list) ───────────────────────────────────────────────────

router.get(
  '/',
  requirePermission('master:warehouses:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;

      const {
        search, is_active, warehouse_type_id, branch_id, country_id, city_id,
        sort = 'code', order = 'asc',
        page = '1', limit = '25',
      } = req.query as Record<string, string>;

      const allowedSort: Record<string, string> = {
        code: 'w.code', name: 'w.name', name_en: 'w.name',
        warehouse_type_name: 'wt.name',
        branch_name: 'br.name_en',
        is_active: 'w.is_active',
        created_at: 'w.created_at',
      };
      const sortCol = allowedSort[sort] || 'w.code';
      const sortDir = order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      let where = 'w.deleted_at IS NULL';
      const params: any[] = [];
      let p = 0;

      if (companyId) {
        where += ` AND w.company_id = $${++p}`;
        params.push(companyId);
      }

      if (search) {
        where += ` AND (w.name ILIKE $${++p} OR w.name_ar ILIKE $${p} OR w.code ILIKE $${p} OR w.address ILIKE $${p} OR w.manager_name ILIKE $${p})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined && is_active !== '') {
        where += ` AND w.is_active = $${++p}`;
        params.push(is_active === 'true');
      }

      if (warehouse_type_id) {
        where += ` AND w.warehouse_type_id = $${++p}`;
        params.push(Number(warehouse_type_id));
      }

      if (branch_id) {
        where += ` AND w.branch_id = $${++p}`;
        params.push(Number(branch_id));
      }

      if (country_id) {
        where += ` AND w.country_id = $${++p}`;
        params.push(Number(country_id));
      }

      if (city_id) {
        where += ` AND w.city_id = $${++p}`;
        params.push(Number(city_id));
      }

      // Count
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM warehouses w WHERE ${where}`, params
      );
      const total = countRes.rows[0].total;

      // Paginate
      const pg = Math.max(1, parseInt(page) || 1);
      const lim = Math.min(200, Math.max(1, parseInt(limit) || 25));
      const offset = (pg - 1) * lim;

      const q = `
        ${WAREHOUSE_SELECT}
        WHERE ${where}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT $${++p} OFFSET $${++p}
      `;
      params.push(lim, offset);

      const result = await pool.query(q, params);

      res.json({
        success: true,
        data: result.rows,
        total,
        page: pg,
        limit: lim,
        totalPages: Math.ceil(total / lim),
      });
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch warehouses' } });
    }
  }
);

// ─── GET /:id (detail) ─────────────────────────────────────────────

router.get(
  '/:id',
  requirePermission('master:warehouses:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;

      let where = 'w.id = $1 AND w.deleted_at IS NULL';
      const params: any[] = [id];
      if (companyId) {
        where += ' AND w.company_id = $2';
        params.push(companyId);
      }

      const result = await pool.query(`${WAREHOUSE_SELECT} WHERE ${where}`, params);

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse not found' } });
      }

      // Include storage locations if table exists
      let storageLocations: any[] = [];
      const hasSL = await tableExists('storage_locations');
      if (hasSL) {
        const slRes = await pool.query(
          `SELECT sl.*, slt.name_en AS location_type_name, slt.name_ar AS location_type_name_ar
           FROM storage_locations sl
           LEFT JOIN storage_location_types slt ON slt.id = sl.storage_location_type_id AND slt.deleted_at IS NULL
           WHERE sl.warehouse_id = $1 AND sl.deleted_at IS NULL
           ORDER BY sl.code`,
          [id]
        );
        storageLocations = slRes.rows;
      }

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          storage_locations: storageLocations,
        },
      });
    } catch (error: any) {
      console.error('Error fetching warehouse detail:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch warehouse' } });
    }
  }
);

// ─── POST / (create) ────────────────────────────────────────────────

router.post(
  '/',
  requirePermission('master:warehouses:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        code,
        name: rawName,
        name_en,
        name_ar,
        short_name,
        branch_id,
        warehouse_type_id,
        cost_center_id,
        country_id,
        city_id,
        address,
        manager_name,
        phone,
        email,
        capacity_m3,
        capacity_tons,
        min_temp_celsius,
        max_temp_celsius,
        inventory_account_id,
        allows_negative_stock,
        is_default,
        is_active,
        latitude,
        longitude,
        warehouse_type,
        notes,
      } = req.body;

      const name = rawName || name_en;

      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Duplicate check
      const dup = await pool.query(
        'SELECT id FROM warehouses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code.toUpperCase()]
      );
      if ((dup.rowCount ?? 0) > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Warehouse code already exists' } });
      }

      // Build dynamic INSERT
      const cols: string[] = ['company_id', 'tenant_id'];
      const vals: any[] = [companyId, (req as any).tenantId ?? companyId];

      addCol(cols, vals, 'code', code.toUpperCase());
      addCol(cols, vals, 'name', name);
      addCol(cols, vals, 'name_ar', name_ar);
      addCol(cols, vals, 'branch_id', branch_id || null);
      addCol(cols, vals, 'warehouse_type_id', warehouse_type_id || null);
      addCol(cols, vals, 'cost_center_id', cost_center_id || null);
      addCol(cols, vals, 'country_id', country_id || null);
      addCol(cols, vals, 'city_id', city_id || null);
      addCol(cols, vals, 'address', address);
      addCol(cols, vals, 'manager_name', manager_name);
      addCol(cols, vals, 'phone', phone);
      addCol(cols, vals, 'email', email);
      addCol(cols, vals, 'inventory_account_id', inventory_account_id || null);
      addCol(cols, vals, 'allow_negative_stock', allows_negative_stock ?? false);
      addCol(cols, vals, 'is_default', is_default ?? false);
      addCol(cols, vals, 'is_active', is_active ?? true);
      addCol(cols, vals, 'warehouse_type', warehouse_type || null);
      addCol(cols, vals, 'created_by', userId);

      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const insertQ = `INSERT INTO warehouses (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;

      const result = await pool.query(insertQ, vals);

      res.status(201).json({ success: true, data: result.rows[0], message: 'Warehouse created successfully' });
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create warehouse' } });
    }
  }
);

// ─── PUT /:id (update) ─────────────────────────────────────────────

router.put(
  '/:id',
  requirePermission('master:warehouses:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      // Confirm exists
      const existing = await pool.query(
        'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rowCount === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse not found' } });
      }

      const {
        code,
        name: rawName,
        name_en,
        name_ar,
        short_name,
        branch_id,
        warehouse_type_id,
        cost_center_id,
        country_id,
        city_id,
        address,
        manager_name,
        phone,
        email,
        capacity_m3,
        capacity_tons,
        min_temp_celsius,
        max_temp_celsius,
        inventory_account_id,
        allows_negative_stock,
        is_default,
        is_active,
        latitude,
        longitude,
        warehouse_type,
        notes,
      } = req.body;

      const name = rawName || name_en;

      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      // Duplicate code check (exclude self)
      const dup = await pool.query(
        'SELECT id FROM warehouses WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
        [companyId, code.toUpperCase(), id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Warehouse code already exists' } });
      }

      // Dynamic SET
      const sets: string[] = [];
      const vals: any[] = [];
      let pi = 0;
      const idx = () => ++pi;

      setCol(sets, vals, 'code', code?.toUpperCase(), idx);
      setCol(sets, vals, 'name', name, idx);
      setCol(sets, vals, 'name_ar', name_ar, idx);
      setCol(sets, vals, 'branch_id', branch_id !== undefined ? (branch_id || null) : undefined, idx);
      setCol(sets, vals, 'warehouse_type_id', warehouse_type_id !== undefined ? (warehouse_type_id || null) : undefined, idx);
      setCol(sets, vals, 'cost_center_id', cost_center_id !== undefined ? (cost_center_id || null) : undefined, idx);
      setCol(sets, vals, 'country_id', country_id !== undefined ? (country_id || null) : undefined, idx);
      setCol(sets, vals, 'city_id', city_id !== undefined ? (city_id || null) : undefined, idx);
      setCol(sets, vals, 'address', address, idx);
      setCol(sets, vals, 'manager_name', manager_name, idx);
      setCol(sets, vals, 'phone', phone, idx);
      setCol(sets, vals, 'email', email, idx);
      setCol(sets, vals, 'inventory_account_id', inventory_account_id !== undefined ? (inventory_account_id || null) : undefined, idx);
      if (allows_negative_stock !== undefined) {
        setCol(sets, vals, 'allow_negative_stock', allows_negative_stock, idx);
      }
      setCol(sets, vals, 'is_default', is_default, idx);
      setCol(sets, vals, 'is_active', is_active, idx);
      setCol(sets, vals, 'warehouse_type', warehouse_type, idx);
      sets.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQ = `UPDATE warehouses SET ${sets.join(', ')} WHERE id = $${idx()} AND company_id = $${idx()} AND deleted_at IS NULL RETURNING *`;
      vals.push(id, companyId);

      const result = await pool.query(updateQ, vals);

      res.json({ success: true, data: result.rows[0], message: 'Warehouse updated successfully' });
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update warehouse' } });
    }
  }
);

// ─── DELETE /:id ────────────────────────────────────────────────────

router.delete(
  '/:id',
  requirePermission('master:warehouses:delete'),
  dynamicDeletionProtection('warehouses'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      const userId = (req as any).user?.id;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const existing = await pool.query(
        'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rowCount === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse not found' } });
      }

      // Check if warehouse has storage locations
      const hasSL = await tableExists('storage_locations');
      if (hasSL) {
        const slCount = await pool.query(
          'SELECT COUNT(*)::int AS cnt FROM storage_locations WHERE warehouse_id = $1 AND deleted_at IS NULL',
          [id]
        );
        if (slCount.rows[0]?.cnt > 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'HAS_LOCATIONS', message: 'Cannot delete warehouse with storage locations. Remove locations first.' },
          });
        }
      }

      await pool.query(
        `UPDATE warehouses
         SET deleted_at = CURRENT_TIMESTAMP,
             is_deleted = TRUE,
             deleted_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $3`,
        [userId, id, companyId]
      );

      res.json({ success: true, message: 'Warehouse deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete warehouse' } });
    }
  }
);

// ─── POST /:id/restore ─────────────────────────────────────────────

router.post(
  '/:id/restore',
  requirePermission('master:warehouses:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId =
        (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;

      const result = await pool.query(
        `UPDATE warehouses
         SET deleted_at = NULL,
             is_deleted = FALSE,
             deleted_by = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id, companyId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deleted warehouse not found' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Warehouse restored successfully' });
    } catch (error: any) {
      console.error('Error restoring warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore warehouse' } });
    }
  }
);

export default router;
