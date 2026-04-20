/**
 * 🔄 REORDER RULES ROUTE — Enterprise Edition
 * ================================================
 *
 * Full CRUD + /stats + /filters for the `reorder_rules` table.
 * Determines when and how to auto-create purchase orders per item/warehouse.
 *
 * Mounted at:
 *   /api/reorder-rules
 *   /api/stock-limits   (legacy alias)
 *
 * Permissions: reorder_rules:view / create / edit / delete
 */
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ─── Helper: get company ID ────────────────────────────────────────────────
function getCompanyId(req: Request): number | null {
  return (req as any).companyId
    ?? (req as any).companyContext?.companyId
    ?? (req as any).companyContext?.id
    ?? null;
}

// ─── Shared SELECT template ────────────────────────────────────────────────
const RULE_SELECT = `
  SELECT
    rr.id,
    rr.company_id,
    rr.item_id,
    i.code              AS item_code,
    COALESCE(i.name_en, i.name) AS item_name,
    i.name_ar           AS item_name_ar,
    rr.warehouse_id,
    w.code              AS warehouse_code,
    COALESCE(w.name, w.name) AS warehouse_name,
    w.name_ar           AS warehouse_name_ar,
    rr.preferred_supplier_id,
    COALESCE(v.name, v.name) AS supplier_name,
    v.name_ar           AS supplier_name_ar,
    v.code              AS supplier_code,
    rr.reorder_level    AS reorder_point,
    rr.reorder_qty,
    rr.min_qty,
    rr.max_qty,
    0 AS safety_stock,
    rr.lead_time_days,
    rr.auto_create_purchase_order,
    true AS po_approval_required,
    rr.is_active,
    rr.created_by,
    uc.email            AS created_by_name,
    rr.updated_by,
    uu.email            AS updated_by_name,
    rr.created_at,
    rr.updated_at,
    rr.deleted_at,
    COALESCE(
      (SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw
       WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),
      0
    )::numeric AS current_qty,
    CASE
      WHEN COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) > rr.max_qty THEN 'overstock'
      WHEN COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) < rr.min_qty THEN 'critical'
      WHEN COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) <= rr.reorder_level THEN 'low'
      ELSE 'normal'
    END AS stock_status
  FROM reorder_rules rr
  INNER JOIN items i       ON rr.item_id = i.id AND i.deleted_at IS NULL
  LEFT  JOIN warehouses w  ON rr.warehouse_id = w.id AND w.deleted_at IS NULL
  LEFT  JOIN vendors v     ON rr.preferred_supplier_id = v.id AND v.deleted_at IS NULL
  LEFT  JOIN users uc      ON rr.created_by = uc.id
  LEFT  JOIN users uu      ON rr.updated_by = uu.id
`;

// ═══════════════════════════════════════════════════════════════════════════
// GET /stats
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/stats',
  requirePermission('reorder_rules:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const stats = await pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE rr.is_active = true)::int AS active,
          COUNT(*) FILTER (WHERE rr.is_active = false)::int AS inactive,
          COUNT(*) FILTER (WHERE rr.auto_create_purchase_order = true)::int AS auto_po,
          COUNT(DISTINCT rr.item_id)::int AS items_covered,
          COUNT(DISTINCT rr.warehouse_id)::int AS warehouses_covered
        FROM reorder_rules rr
        INNER JOIN items i ON rr.item_id = i.id AND i.deleted_at IS NULL
        WHERE rr.company_id = $1 AND rr.deleted_at IS NULL
      `, [companyId]);

      // Count stock status breakdown
      const statusBreakdown = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE
            COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) < rr.min_qty
          )::int AS critical_count,
          COUNT(*) FILTER (WHERE
            COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) <= rr.reorder_level
            AND COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) >= rr.min_qty
          )::int AS low_count,
          COUNT(*) FILTER (WHERE
            COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) > rr.max_qty
          )::int AS overstock_count
        FROM reorder_rules rr
        INNER JOIN items i ON rr.item_id = i.id AND i.deleted_at IS NULL
        WHERE rr.company_id = $1 AND rr.deleted_at IS NULL AND rr.is_active = true
      `, [companyId]);

      return res.json({
        success: true,
        data: {
          ...stats.rows[0],
          ...statusBreakdown.rows[0],
        },
      });
    } catch (error: any) {
      console.error('Error fetching reorder rule stats:', error);
      return res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: 'Failed to fetch stats' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /filters
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/filters',
  requirePermission('reorder_rules:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const [items, warehouses, suppliers] = await Promise.all([
        pool.query(
          `SELECT id, code, COALESCE(name_en, name) AS name_en, name_ar
           FROM items
           WHERE company_id = $1 AND deleted_at IS NULL
           ORDER BY code`,
          [companyId]
        ),
        pool.query(
          `SELECT id, code, name AS name_en, name_ar
           FROM warehouses
           WHERE company_id = $1 AND deleted_at IS NULL
           ORDER BY code`,
          [companyId]
        ),
        pool.query(
          `SELECT id, code, name AS name_en, name_ar
           FROM vendors
           WHERE company_id = $1 AND deleted_at IS NULL
           ORDER BY code`,
          [companyId]
        ),
      ]);

      return res.json({
        success: true,
        data: {
          items: items.rows,
          warehouses: warehouses.rows,
          suppliers: suppliers.rows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching reorder rule filters:', error);
      return res.status(500).json({ success: false, error: { code: 'FILTERS_ERROR', message: 'Failed to fetch filters' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET / — List all reorder rules (with pagination)
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/',
  requirePermission('reorder_rules:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        item_id,
        warehouse_id,
        preferred_supplier_id,
        is_active,
        stock_status,
        search,
        sort = 'item_code',
        order = 'asc',
        page = '1',
        limit = '50',
      } = req.query;

      const params: any[] = [companyId];
      let paramCount = 1;

      let where = ` WHERE rr.company_id = $1 AND rr.deleted_at IS NULL AND i.deleted_at IS NULL`;

      if (item_id) {
        paramCount++;
        where += ` AND rr.item_id = $${paramCount}`;
        params.push(item_id);
      }

      if (warehouse_id) {
        paramCount++;
        where += ` AND rr.warehouse_id = $${paramCount}`;
        params.push(warehouse_id);
      }

      if (preferred_supplier_id) {
        paramCount++;
        where += ` AND rr.preferred_supplier_id = $${paramCount}`;
        params.push(preferred_supplier_id);
      }

      if (typeof is_active === 'string') {
        paramCount++;
        where += ` AND rr.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (search) {
        paramCount++;
        where += ` AND (
          COALESCE(i.name_en, i.name, '') ILIKE $${paramCount}
          OR COALESCE(i.name_ar, '') ILIKE $${paramCount}
          OR COALESCE(i.code, '') ILIKE $${paramCount}
          OR COALESCE(w.name, '') ILIKE $${paramCount}
          OR COALESCE(w.code, '') ILIKE $${paramCount}
          OR COALESCE(v.name, '') ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Sorting
      const sortableFields: Record<string, string> = {
        item_code: 'i.code',
        item_name: 'i.name',
        warehouse_code: 'w.code',
        warehouse_name: 'w.name',
        supplier_name: 'v.name',
        reorder_point: 'rr.reorder_level',
        reorder_qty: 'rr.reorder_qty',
        min_qty: 'rr.min_qty',
        max_qty: 'rr.max_qty',
        safety_stock: 'rr.min_qty',
        lead_time_days: 'rr.lead_time_days',
        is_active: 'rr.is_active',
        created_at: 'rr.created_at',
      };
      const sortCol = sortableFields[sort as string] || 'i.code';
      const sortDir = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Pagination
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));

      // Count
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM reorder_rules rr
         INNER JOIN items i ON rr.item_id = i.id AND i.deleted_at IS NULL
         LEFT JOIN warehouses w ON rr.warehouse_id = w.id AND w.deleted_at IS NULL
         LEFT JOIN vendors v ON rr.preferred_supplier_id = v.id AND v.deleted_at IS NULL
         ${where}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;

      // Data
      const dataResult = await pool.query(
        `${RULE_SELECT} ${where}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, pageSize, (pageNum - 1) * pageSize]
      );

      let rows = dataResult.rows;

      // Post-filter by stock_status if requested
      if (stock_status && typeof stock_status === 'string') {
        rows = rows.filter((r: any) => r.stock_status === stock_status);
      }

      return res.json({
        success: true,
        data: rows,
        total,
        page: pageNum,
        limit: pageSize,
      });
    } catch (error: any) {
      console.error('Error fetching reorder rules:', error);
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch reorder rules' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /:id — Single rule
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/:id',
  requirePermission('reorder_rules:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { id } = req.params;
      const result = await pool.query(
        `${RULE_SELECT}
         WHERE rr.id = $1 AND rr.company_id = $2 AND rr.deleted_at IS NULL AND i.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reorder rule not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching reorder rule:', error);
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch reorder rule' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// POST / — Create
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  '/',
  requirePermission('reorder_rules:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const userId = (req as any).user?.id ?? null;

      const {
        item_id,
        warehouse_id,
        preferred_supplier_id,
        reorder_point,
        reorder_level,
        reorder_qty,
        min_qty,
        max_qty,
        safety_stock = 0,
        lead_time_days,
        auto_create_purchase_order = false,
        auto_generate_po,
        po_approval_required = true,
        is_active = true,
        // Legacy field name support
        minimum_qty,
        maximum_qty,
      } = req.body;

      // Normalize field names
      const finalMinQty = min_qty ?? minimum_qty;
      const finalMaxQty = max_qty ?? maximum_qty;
      const finalReorderPoint = reorder_point ?? reorder_level;
      const finalAutoCreate = auto_create_purchase_order ?? auto_generate_po ?? false;

      // Validate required
      if (!item_id || finalReorderPoint == null || !reorder_qty || finalMinQty == null || finalMaxQty == null) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'item_id, reorder_point, reorder_qty, min_qty and max_qty are required' },
        });
      }

      // Business logic validations
      if (Number(finalMaxQty) < Number(finalMinQty)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maximum quantity must be >= minimum quantity' },
        });
      }

      if (Number(finalReorderPoint) < Number(finalMinQty)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Reorder point must be >= minimum quantity' },
        });
      }

      // Ensure item belongs to company
      const itemCheck = await pool.query(
        'SELECT id FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [item_id, companyId]
      );
      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' } });
      }

      // Ensure warehouse belongs to company
      if (warehouse_id) {
        const whCheck = await pool.query(
          'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [warehouse_id, companyId]
        );
        if (whCheck.rows.length === 0) {
          return res.status(404).json({ success: false, error: { code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' } });
        }
      }

      // Ensure supplier belongs to company
      if (preferred_supplier_id) {
        const supCheck = await pool.query(
          'SELECT id FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [preferred_supplier_id, companyId]
        );
        if (supCheck.rows.length === 0) {
          return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } });
        }
      }

      // Unique per company+item+warehouse
      const dup = await pool.query(
        `SELECT id FROM reorder_rules
         WHERE company_id = $1 AND item_id = $2 AND warehouse_id IS NOT DISTINCT FROM $3 AND deleted_at IS NULL`,
        [companyId, item_id, warehouse_id ?? null]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Rule already exists for this item and warehouse' },
        });
      }

      const result = await pool.query(
        `INSERT INTO reorder_rules (
          company_id, item_id, warehouse_id, preferred_supplier_id,
          reorder_level, reorder_qty, min_qty, max_qty,
          lead_time_days, auto_create_purchase_order,
          is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10,
          $11, $12, $12
        ) RETURNING *`,
        [
          companyId, item_id, warehouse_id || null, preferred_supplier_id || null,
          finalReorderPoint, reorder_qty, finalMinQty, finalMaxQty,
          lead_time_days ?? null, !!finalAutoCreate,
          typeof is_active === 'boolean' ? is_active : true, userId,
        ]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Reorder rule created successfully',
      });
    } catch (error: any) {
      console.error('Error creating reorder rule:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Rule already exists for this item and warehouse' },
        });
      }
      return res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create reorder rule' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PUT /:id — Update
// ═══════════════════════════════════════════════════════════════════════════
router.put(
  '/:id',
  requirePermission('reorder_rules:edit'),
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
        `SELECT rr.* FROM reorder_rules rr
         INNER JOIN items i ON rr.item_id = i.id AND i.deleted_at IS NULL
         WHERE rr.id = $1 AND rr.company_id = $2 AND rr.deleted_at IS NULL`,
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reorder rule not found' } });
      }

      const {
        warehouse_id,
        preferred_supplier_id,
        reorder_point,
        reorder_level,
        reorder_qty,
        min_qty,
        max_qty,
        safety_stock,
        lead_time_days,
        auto_create_purchase_order,
        auto_generate_po,
        po_approval_required,
        is_active,
        minimum_qty,
        maximum_qty,
      } = req.body;

      // Normalize
      const finalMinQty = min_qty ?? minimum_qty;
      const finalMaxQty = max_qty ?? maximum_qty;
      const finalReorderPoint = reorder_point ?? reorder_level;
      const finalAutoCreate = auto_create_purchase_order ?? auto_generate_po;

      // Business logic validations
      const effectiveMin = finalMinQty ?? existing.rows[0].min_qty;
      const effectiveMax = finalMaxQty ?? existing.rows[0].max_qty;
      const effectiveReorder = finalReorderPoint ?? existing.rows[0].reorder_level;

      if (Number(effectiveMax) < Number(effectiveMin)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maximum quantity must be >= minimum quantity' },
        });
      }

      if (Number(effectiveReorder) < Number(effectiveMin)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Reorder point must be >= minimum quantity' },
        });
      }

      // Supplier validation if changed
      if (preferred_supplier_id) {
        const supCheck = await pool.query(
          'SELECT id FROM vendors WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [preferred_supplier_id, companyId]
        );
        if (supCheck.rows.length === 0) {
          return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } });
        }
      }

      // Uniqueness check if warehouse changed
      const nextItemId = existing.rows[0].item_id; // item_id is immutable after create
      const nextWarehouseId = warehouse_id !== undefined ? (warehouse_id || null) : existing.rows[0].warehouse_id;
      const dup = await pool.query(
        `SELECT id FROM reorder_rules
         WHERE company_id = $1 AND item_id = $2 AND warehouse_id IS NOT DISTINCT FROM $3 AND deleted_at IS NULL AND id <> $4`,
        [companyId, nextItemId, nextWarehouseId, id]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Rule already exists for this item and warehouse' },
        });
      }

      const result = await pool.query(
        `UPDATE reorder_rules
         SET
           warehouse_id                = COALESCE($1, warehouse_id),
           preferred_supplier_id       = $2,
           reorder_level               = COALESCE($3, reorder_level),
           reorder_qty                 = COALESCE($4, reorder_qty),
           min_qty                     = COALESCE($5, min_qty),
           max_qty                     = COALESCE($6, max_qty),
           lead_time_days              = COALESCE($7, lead_time_days),
           auto_create_purchase_order  = COALESCE($8, auto_create_purchase_order),
           is_active                   = COALESCE($9, is_active),
           updated_by                  = $10,
           updated_at                  = CURRENT_TIMESTAMP
         WHERE id = $11 AND company_id = $12 AND deleted_at IS NULL
         RETURNING *`,
        [
          warehouse_id !== undefined ? (warehouse_id || null) : null,
          preferred_supplier_id !== undefined ? (preferred_supplier_id || null) : existing.rows[0].preferred_supplier_id,
          finalReorderPoint ?? null,
          reorder_qty ?? null,
          finalMinQty ?? null,
          finalMaxQty ?? null,
          lead_time_days !== undefined ? lead_time_days : null,
          typeof finalAutoCreate === 'boolean' ? finalAutoCreate : null,
          typeof is_active === 'boolean' ? is_active : null,
          userId,
          id,
          companyId,
        ]
      );

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Reorder rule updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating reorder rule:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Rule already exists for this item and warehouse' },
        });
      }
      return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update reorder rule' } });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /:id — Soft delete
// ═══════════════════════════════════════════════════════════════════════════
router.delete(
  '/:id',
  requirePermission('reorder_rules:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const { id } = req.params;

      const existing = await pool.query(
        'SELECT id FROM reorder_rules WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reorder rule not found' } });
      }

      await pool.query(
        `UPDATE reorder_rules SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2`,
        [(req as any).user?.id, id]
      );

      return res.json({ success: true, message: 'Reorder rule deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting reorder rule:', error);
      return res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete reorder rule' } });
    }
  }
);

export default router;
