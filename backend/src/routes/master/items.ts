import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { applyEnhancedAudit } from '../../middleware/enhancedAuditLog';
import { ErrorFactory } from '../../types/errors';
import logger from '../../utils/logger';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(loadCompanyContext);
applyEnhancedAudit(router, 'items');

// ─── ITEMS SELECT TEMPLATE ─────────────────────────────────────────

const ITEM_SELECT = `
  SELECT
    i.*,
    slms_format_sequence(i.numbering_series_id, i.sequence_no) as sequence_display,
    cat.name as category_name,
    grp.code as group_code,
    COALESCE(grp.name_en, grp.name) as group_name,
    grp.name_ar as group_name_ar,
    uom.code as base_uom_code,
    uom.name as base_uom_name,
    uom.name_ar as base_uom_name_ar,
    puom.code as purchase_uom_code,
    puom.name as purchase_uom_name,
    suom.code as sales_uom_code,
    suom.name as sales_uom_name,
    it.code as item_type_code,
    it.name_en as item_type_name,
    it.name_ar as item_type_name_ar,
    v.code as default_vendor_code,
    v.name as default_vendor_name,
    v.name_ar as default_vendor_name_ar,
    co.code as country_code,
    COALESCE(co.name_en, co.name) as country_name,
    co.name_ar as country_name_ar,
    co.flag_emoji as country_flag,
    uc.email as created_by_name,
    uu.email as updated_by_name,
    item_has_movement(i.id) as has_movement
  FROM items i
  LEFT JOIN item_categories cat ON i.category_id = cat.id
  LEFT JOIN item_groups grp ON i.group_id = grp.id AND grp.deleted_at IS NULL
  LEFT JOIN units_of_measure uom ON i.base_uom_id = uom.id AND uom.deleted_at IS NULL
  LEFT JOIN units_of_measure puom ON i.purchase_uom_id = puom.id AND puom.deleted_at IS NULL
  LEFT JOIN units_of_measure suom ON i.sales_uom_id = suom.id AND suom.deleted_at IS NULL
  LEFT JOIN reference_data it ON i.item_type_id = it.id AND it.deleted_at IS NULL
  LEFT JOIN vendors v ON i.default_vendor_id = v.id AND v.deleted_at IS NULL
  LEFT JOIN countries co ON i.country_of_origin = co.id
  LEFT JOIN users uc ON i.created_by = uc.id
  LEFT JOIN users uu ON i.updated_by = uu.id
`;

const SORT_WHITELIST: Record<string, string> = {
  code: 'i.code', name: 'i.name', name_en: 'i.name_en', name_ar: 'i.name_ar',
  barcode: 'i.barcode', item_type: 'i.item_type',
  group_name: 'grp.name_en', item_type_name: 'it.name_en',
  base_selling_price: 'i.base_selling_price', standard_cost: 'i.standard_cost',
  is_active: 'i.is_active', created_at: 'i.created_at',
};

// ─── GET /stats ────────────────────────────────────────────────────

router.get(
  '/stats',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      if (!companyId) return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });

      const stats = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = true) AS active,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = false) AS inactive,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_stockable = true) AS stockable,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND item_type = 'service') AS services,
          COUNT(DISTINCT group_id) FILTER (WHERE deleted_at IS NULL) AS group_count
        FROM items WHERE company_id = $1
      `, [companyId]);

      const byType = await pool.query(`
        SELECT i.item_type AS type_code,
               COALESCE(it.name_en, i.item_type) AS type_name,
               COALESCE(it.name_ar, i.item_type) AS type_name_ar,
               COUNT(*) AS count
        FROM items i
        LEFT JOIN reference_data it ON i.item_type_id = it.id
        WHERE i.company_id = $1 AND i.deleted_at IS NULL
        GROUP BY i.item_type, it.name_en, it.name_ar
        ORDER BY count DESC
      `, [companyId]);

      const row = stats.rows[0];
      res.json({
        success: true,
        data: {
          total: Number(row.total),
          active: Number(row.active),
          inactive: Number(row.inactive),
          stockable: Number(row.stockable),
          services: Number(row.services),
          group_count: Number(row.group_count),
          by_type: byType.rows,
        },
      });
    } catch (error) {
      console.error('Error fetching item stats:', error);
      res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: 'Failed to fetch statistics' } });
    }
  }
);

// ─── GET /uom-conversions ──────────────────────────────────────────

router.get(
  '/uom-conversions',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      if (!companyId) return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });

      const result = await pool.query(`
        SELECT iuc.item_id, iuc.uom_id, u.code as uom_code, u.name as uom_name, u.name_ar as uom_name_ar,
               iuc.conversion_factor, COALESCE(iuc.is_base, false) as is_base_uom
        FROM item_uom_conversions iuc
        JOIN units_of_measure u ON u.id = iuc.uom_id AND u.deleted_at IS NULL
        WHERE iuc.company_id = $1 AND iuc.deleted_at IS NULL AND iuc.is_active = true
        ORDER BY iuc.item_id, iuc.is_base DESC, u.code
      `, [companyId]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching item UOM conversions:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch UOM conversions' } });
    }
  }
);

// ─── GET /filters ──────────────────────────────────────────────────

router.get(
  '/filters',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      if (!companyId) return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });

      const [groups, types, policies, units, vendors] = await Promise.all([
        pool.query(`SELECT id, code, COALESCE(name_en, name) AS name_en, name_ar, parent_group_id, level FROM item_groups WHERE deleted_at IS NULL AND (is_deleted = false OR is_deleted IS NULL) ORDER BY COALESCE(name_en, name)`),
        pool.query(`SELECT id, code, name_en, name_ar FROM reference_data WHERE type = 'item_types' AND deleted_at IS NULL ORDER BY name_en`),
        pool.query(`SELECT id, code, name_en, name_ar FROM tracking_policies WHERE deleted_at IS NULL ORDER BY id`),
        pool.query(`SELECT id, code, COALESCE(name_en, name) AS name_en, name_ar, is_base, base_unit_id FROM units_of_measure WHERE deleted_at IS NULL ORDER BY code`),
        pool.query(`SELECT id, code, name, name_ar FROM vendors WHERE deleted_at IS NULL AND (is_deleted = false OR is_deleted IS NULL) ORDER BY name`),
      ]);

      res.json({
        success: true,
        data: {
          item_groups: groups.rows,
          item_types: types.rows,
          item_grades: [],
          tracking_policies: policies.rows,
          units: units.rows,
          base_units: units.rows.filter((u: any) => u.is_base === true),
          group_levels: [],
          vendors: vendors.rows,
        },
      });
    } catch (error) {
      console.error('Error fetching item filters:', error);
      res.status(500).json({ success: false, error: { code: 'FILTERS_ERROR', message: 'Failed to fetch filter options' } });
    }
  }
);

// GET /api/master/items - List all items (enterprise with pagination)
router.get(
  '/',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        search, item_type, is_active, category_id,
        item_group_id, group_id, item_type_id, item_grade_id, tracking_policy_id,
        valuation_method, is_stockable, is_purchasable, is_sellable,
        sort = 'code', order = 'asc',
        page = '1', limit = '25',
      } = req.query as Record<string, string>;

      const params: any[] = [companyId];
      let paramIndex = 2;
      const conditions: string[] = [];

      if (search) {
        conditions.push(`(i.code ILIKE $${paramIndex} OR i.name ILIKE $${paramIndex} OR i.name_en ILIKE $${paramIndex} OR i.name_ar ILIKE $${paramIndex} OR i.barcode ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (item_type) { conditions.push(`i.item_type = $${paramIndex}`); params.push(item_type); paramIndex++; }
      if (is_active !== undefined && is_active !== '') { conditions.push(`i.is_active = $${paramIndex}`); params.push(is_active === 'true'); paramIndex++; }
      if (category_id) { conditions.push(`i.category_id = $${paramIndex}`); params.push(category_id); paramIndex++; }
      const gid = item_group_id || group_id;
      if (gid) { conditions.push(`i.group_id = $${paramIndex}`); params.push(gid); paramIndex++; }
      if (item_type_id) { conditions.push(`i.item_type_id = $${paramIndex}`); params.push(item_type_id); paramIndex++; }
      if (valuation_method) { conditions.push(`i.valuation_method = $${paramIndex}`); params.push(valuation_method); paramIndex++; }
      if (is_stockable !== undefined && is_stockable !== '') { conditions.push(`i.is_stockable = $${paramIndex}`); params.push(is_stockable === 'true'); paramIndex++; }
      if (is_purchasable !== undefined && is_purchasable !== '') { conditions.push(`i.is_purchasable = $${paramIndex}`); params.push(is_purchasable === 'true'); paramIndex++; }
      if (is_sellable !== undefined && is_sellable !== '') { conditions.push(`i.is_sellable = $${paramIndex}`); params.push(is_sellable === 'true'); paramIndex++; }

      const whereClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
      const sortCol = SORT_WHITELIST[sort] || 'i.code';
      const sortDir = order === 'desc' ? 'DESC' : 'ASC';

      const pageNum = Math.max(1, parseInt(page) || 1);
      const pageSize = Math.min(10000, Math.max(1, parseInt(limit) || 25));
      const offset = (pageNum - 1) * pageSize;

      const countQ = `SELECT COUNT(*) FROM items i WHERE i.company_id = $1 AND i.deleted_at IS NULL${whereClause}`;
      const dataQ = `${ITEM_SELECT} WHERE i.company_id = $1 AND i.deleted_at IS NULL${whereClause} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`;

      const [countRes, dataRes] = await Promise.all([
        pool.query(countQ, params),
        pool.query(dataQ, params),
      ]);

      res.json({
        success: true,
        data: dataRes.rows,
        total: Number(countRes.rows[0].count),
        page: pageNum,
        limit: pageSize,
      });
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch items' } });
    }
  }
);

// GET /api/master/items/for-invoice - List items with UOMs for invoice creation
// Returns items with their available UOMs in a single call (optimized for dropdown)
// NOTE: This route MUST be before /:id routes to avoid being caught by them
router.get(
  '/for-invoice',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { search, item_type, is_active = 'true', limit } = req.query;
      const params: any[] = [companyId];
      let paramIndex = 2;

      const requestedLimit = Number(limit);
      const safeLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 5000) : 5000;

      let query = `
        SELECT 
          i.id,
          i.code,
          i.name,
          i.name_ar,
          i.item_type,
          i.category_id,
          cat.name as category_name,
          i.base_uom_id,
          uom.code as base_uom_code,
          uom.name as base_uom_name,
          COALESCE(i.last_purchase_cost, 0) as purchase_price,
          COALESCE(i.base_selling_price, 0) as selling_price,
          i.tax_code,
          COALESCE(tc.vat_rate, i.tax_rate, 0) as default_tax_rate,
          tc.id as tax_rate_id,
          i.is_active,
          COALESCE(
            (SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = i.id),
            0
          ) as stock_quantity
        FROM items i
        LEFT JOIN item_categories cat ON i.category_id = cat.id
        LEFT JOIN units_of_measure uom ON i.base_uom_id = uom.id AND uom.deleted_at IS NULL
        LEFT JOIN tax_codes tc ON i.tax_code = tc.code AND tc.is_active = true
        WHERE i.company_id = $1 AND i.deleted_at IS NULL
      `;

      if (search) {
        query += ` AND (i.code ILIKE $${paramIndex} OR i.name ILIKE $${paramIndex} OR i.name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (item_type) {
        query += ` AND i.item_type = $${paramIndex}`;
        params.push(item_type);
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND i.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      query += ` ORDER BY i.code LIMIT $${paramIndex}`;
      params.push(safeLimit);
      paramIndex++;

      const itemsResult = await pool.query(query, params);
      const items = itemsResult.rows;

      // Fetch UOMs for all items in one query
      const itemIds = items.map(i => i.id);
      if (itemIds.length > 0) {
        const uomsResult = await pool.query(`
          SELECT 
            iuc.item_id,
            iuc.id,
            iuc.uom_id,
            u.code as uom_code,
            u.name as uom_name,
            iuc.conversion_factor,
            COALESCE(iuc.is_base, false) as is_base_uom,
            false as is_purchase_uom,
            0 as default_purchase_price
          FROM item_uom_conversions iuc
          JOIN units_of_measure u ON iuc.uom_id = u.id AND u.deleted_at IS NULL
          WHERE iuc.company_id = $1 
            AND iuc.item_id = ANY($2) 
            AND iuc.deleted_at IS NULL
            AND iuc.is_active = true
          ORDER BY iuc.item_id, iuc.is_base DESC, u.code
        `, [companyId, itemIds]);

        // Group UOMs by item_id
        const uomsByItem: Record<number, any[]> = {};
        for (const uom of uomsResult.rows) {
          if (!uomsByItem[uom.item_id]) {
            uomsByItem[uom.item_id] = [];
          }
          uomsByItem[uom.item_id].push(uom);
        }

        // Attach UOMs to items, adding base UOM if not in conversions
        for (const item of items) {
          const itemUoms = uomsByItem[item.id] || [];
          
          // Check if base UOM is already in the list
          const hasBaseUom = itemUoms.some(u => u.uom_id === item.base_uom_id);
          
          if (!hasBaseUom && item.base_uom_id) {
            // Add base UOM as first entry
            itemUoms.unshift({
              id: null,
              item_id: item.id,
              uom_id: item.base_uom_id,
              uom_code: item.base_uom_code,
              uom_name: item.base_uom_name,
              conversion_factor: 1,
              is_base_uom: true,
              is_purchase_uom: true,
              default_purchase_price: item.purchase_price,
            });
          }
          
          item.uoms = itemUoms;
        }
      }

      res.json({ success: true, data: items, total: items.length });
    } catch (error) {
      console.error('Error fetching items for invoice:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch items' } });
    }
  }
);

// GET /api/master/items/:id/uoms - List item-specific UOM conversions
router.get(
  '/:id/uoms',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const itemRes = await pool.query(
        'SELECT id, base_uom_id FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (itemRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }

      const baseUomId = itemRes.rows[0].base_uom_id;

      // Always return base unit row as factor=1
      const baseRow = await pool.query(
        `SELECT u.id AS uom_id, u.code, u.name, u.name_ar
         FROM units_of_measure u
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [baseUomId]
      );

      const conversionsRes = await pool.query(
        `SELECT c.id, c.uom_id, c.conversion_factor, c.is_base, c.is_active,
                u.code, u.name, u.name_ar
         FROM item_uom_conversions c
         JOIN units_of_measure u ON c.uom_id = u.id AND u.deleted_at IS NULL
         WHERE c.company_id = $1 AND c.item_id = $2 AND c.deleted_at IS NULL
         ORDER BY c.is_base DESC, u.code ASC`,
        [companyId, id]
      );

      const basePayload = baseRow.rows[0]
        ? {
            id: null,
            uom_id: baseRow.rows[0].uom_id,
            code: baseRow.rows[0].code,
            name: baseRow.rows[0].name,
            name_ar: baseRow.rows[0].name_ar,
            conversion_factor: 1,
            is_base: true,
            is_active: true,
          }
        : null;

      const filtered = conversionsRes.rows.filter((r) => Number(r.uom_id) !== Number(baseUomId));
      const data = basePayload ? [basePayload, ...filtered] : filtered;
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching item uoms:', error);
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch item units' } });
    }
  }
);

// PUT /api/master/items/:id/uoms - Replace item additional UOM conversions (base unit stays factor=1)
router.put(
  '/:id/uoms',
  requirePermission('master:items:edit'),
  async (req: Request, res: Response) => {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemRes = await client.query(
        'SELECT id, base_uom_id FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (itemRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }
      const baseUomId = itemRes.rows[0].base_uom_id;

      // Validate payload
      const normalized = rows
        .map((r: any) => ({
          uom_id: Number(r?.uom_id),
          conversion_factor: Number(r?.conversion_factor),
          is_active: r?.is_active === undefined ? true : Boolean(r?.is_active),
        }))
        .filter((r: any) => Number.isFinite(r.uom_id) && r.uom_id > 0);

      // Disallow duplicate units in the same payload
      const uniqueUoms = new Set<number>(normalized.map((r: any) => r.uom_id));
      if (uniqueUoms.size !== normalized.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Duplicate units are not allowed for the same item' },
        });
      }

      for (const r of normalized) {
        if (!Number.isFinite(r.conversion_factor) || r.conversion_factor <= 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'conversion_factor must be > 0' },
          });
        }

        if (Number(r.uom_id) === Number(baseUomId)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Base unit is managed by the item itself' },
          });
        }
      }

      // Ensure all UOM ids exist
      if (normalized.length > 0) {
        const uomIds = [...new Set(normalized.map((r: any) => r.uom_id))];
        const uomRes = await client.query(
          `SELECT id FROM units_of_measure WHERE id = ANY($1::int[]) AND deleted_at IS NULL`,
          [uomIds]
        );
        if (uomRes.rowCount !== uomIds.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'One or more units are invalid' },
          });
        }
      }

      // Upsert base row (factor=1)
      await client.query(
        `INSERT INTO item_uom_conversions (company_id, item_id, uom_id, conversion_factor, is_base, is_active)
         VALUES ($1, $2, $3, 1, TRUE, TRUE)
         ON CONFLICT (item_id, uom_id)
         DO UPDATE SET conversion_factor = 1, is_base = TRUE, is_active = TRUE, deleted_at = NULL, updated_at = NOW()`,
        [companyId, id, baseUomId]
      );

      // Upsert additional rows
      for (const r of normalized) {
        await client.query(
          `INSERT INTO item_uom_conversions (company_id, item_id, uom_id, conversion_factor, is_base, is_active)
           VALUES ($1, $2, $3, $4, FALSE, $5)
           ON CONFLICT (item_id, uom_id)
           DO UPDATE SET conversion_factor = $4, is_base = FALSE, is_active = $5, deleted_at = NULL, updated_at = NOW()`,
          [companyId, id, r.uom_id, r.conversion_factor, r.is_active]
        );
      }

      // Soft-delete any non-base conversions not included
      const keepIds = normalized.map((r: any) => r.uom_id);
      await client.query(
        `UPDATE item_uom_conversions
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE company_id = $1 AND item_id = $2 AND deleted_at IS NULL AND is_base = FALSE
           AND (array_length($3::int[], 1) IS NULL OR uom_id <> ALL($3::int[]))`,
        [companyId, id, keepIds]
      );

      await client.query('COMMIT');
      return res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating item uoms:', error);
      return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update item units' } });
    } finally {
      client.release();
    }
  }
);

// GET /api/master/items/:id - Get single item
router.get(
  '/:id',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyId ?? (req as any).companyContext?.companyId ?? (req as any).companyContext?.id;
      const { id } = req.params;

      const result = await pool.query(
        `${ITEM_SELECT} WHERE i.id = $1 AND i.company_id = $2 AND i.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }

      // Also fetch item_units sub-table
      const unitsRes = await pool.query(
        `SELECT iu.*, u.code as unit_code, u.name as unit_name, u.name_ar as unit_name_ar
         FROM item_units iu
         LEFT JOIN units u ON iu.unit_id = u.id
         WHERE iu.item_id = $1 AND iu.deleted_at IS NULL
         ORDER BY iu.is_base DESC, u.code`,
        [id]
      );

      const item = { ...result.rows[0], item_units: unitsRes.rows };
      res.json({ success: true, data: item });
    } catch (error) {
      console.error('Error fetching item:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch item' } });
    }
  }
);

// POST /api/master/items - Create new item
router.post(
  '/',
  requirePermission('master:items:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;

      const {
        code, barcode, sku, name, name_ar, name_en, short_name, description, description_ar,
        category_id, group_id, item_group_id, brand_id, item_type, item_type_id, item_grade_id,
        is_purchasable, is_sellable, is_stockable,
        base_uom_id, sales_uom_id, purchase_uom_id,
        track_inventory, allow_negative_stock,
        min_stock_level, max_stock_level, reorder_level, reorder_qty, lead_time_days,
        costing_method, standard_cost, last_purchase_cost, average_cost,
        base_selling_price, min_selling_price, max_discount_percent,
        weight, weight_uom_id, length, width, height, dimension_uom_id, volume,
        hs_code, country_of_origin, tax_category,
        sales_account_id, cogs_account_id, inventory_account_id, purchase_account_id,
        revenue_account_id, adjustment_account_id,
        tax_type_id, is_tax_inclusive, image_url, is_active,
        default_vendor_id, harvest_schedule_id, expected_harvest_date,
        shelf_life_days, expiry_alert_days, min_order_qty, manufacturer, manufacturer_part_no,
        warranty_months, additional_images, specifications, tags,
        tracking_policy, tracking_policy_id, valuation_method,
      } = req.body;

      const resolvedName = name || name_en;

      // Validate required fields
      if (!code || !resolvedName || !base_uom_id) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: 'Code, name, and base UOM are required' } 
        });
      }

      // Check for duplicate code
      const duplicate = await pool.query(
        'SELECT id FROM items WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'DUPLICATE_CODE', message: 'Item code already exists' } 
        });
      }

      const result = await pool.query(
        `INSERT INTO items (
          company_id, tenant_id, code, barcode, name, name_en, name_ar,
          description, description_en,
          category_id, group_id, brand_id, item_type, item_type_id,
          is_purchasable, is_sellable, is_stockable,
          base_uom_id, sales_uom_id, purchase_uom_id,
          track_inventory, allow_negative_stock,
          min_stock_level, max_stock_level, reorder_level, reorder_qty, lead_time_days,
          costing_method, standard_cost, last_purchase_cost, average_cost,
          base_selling_price, min_selling_price, max_discount_percent,
          weight, weight_uom_id, length, width, height, dimension_uom_id, volume,
          hs_code, country_of_origin,
          sales_account_id, cogs_account_id, inventory_account_id, purchase_account_id,
          revenue_account_id, adjustment_account_id,
          tax_type_id, is_tax_inclusive, image_url, is_active,
          default_vendor_id, harvest_schedule_id, expected_harvest_date,
          shelf_life_days, min_order_qty, manufacturer, manufacturer_part_no,
          warranty_months, additional_images, specifications, tags,
          tracking_policy, valuation_method,
          created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20,
          $21, $22,
          $23, $24, $25, $26, $27,
          $28, $29, $30, $31,
          $32, $33, $34,
          $35, $36, $37, $38, $39, $40, $41,
          $42, $43,
          $44, $45, $46, $47,
          $48, $49,
          $50, $51, $52, $53,
          $54, $55, $56,
          $57, $58, $59, $60,
          $61, $62, $63, $64,
          $65, $66,
          $67, NOW()
        ) RETURNING *`,
        [
          companyId, (req as any).tenantId ?? companyId,
          code, barcode, resolvedName, name_en || resolvedName, name_ar,
          description, description,
          category_id, group_id || item_group_id, brand_id,
          item_type || 'trading_goods', item_type_id,
          is_purchasable ?? true, is_sellable ?? true, is_stockable ?? true,
          base_uom_id, sales_uom_id, purchase_uom_id,
          track_inventory ?? true, allow_negative_stock ?? false,
          min_stock_level || 0, max_stock_level, reorder_level, reorder_qty, lead_time_days || 0,
          costing_method || 'weighted_average', standard_cost || 0, last_purchase_cost || 0, average_cost || 0,
          base_selling_price || 0, min_selling_price, max_discount_percent,
          weight, weight_uom_id, length, width, height, dimension_uom_id, volume,
          hs_code, country_of_origin,
          sales_account_id, cogs_account_id, inventory_account_id, purchase_account_id,
          revenue_account_id, adjustment_account_id,
          tax_type_id, is_tax_inclusive ?? false, image_url, is_active ?? true,
          default_vendor_id, harvest_schedule_id, expected_harvest_date,
          shelf_life_days, min_order_qty, manufacturer, manufacturer_part_no,
          warranty_months, additional_images || '[]', specifications || '{}', tags,
          tracking_policy, valuation_method || 'fifo',
          userId
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating item:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create item' } });
    }
  }
);

// PUT /api/master/items/:id - Update item
router.put(
  '/:id',
  requirePermission('master:items:edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const {
        code, barcode, sku, name, name_en, name_ar, short_name, description, description_ar,
        category_id, group_id, item_group_id, brand_id, item_type, item_type_id, item_grade_id,
        is_purchasable, is_sellable, is_stockable,
        base_uom_id, sales_uom_id, purchase_uom_id,
        track_inventory, allow_negative_stock,
        min_stock_level, max_stock_level, reorder_level, reorder_qty, lead_time_days,
        costing_method, standard_cost, last_purchase_cost, average_cost,
        base_selling_price, min_selling_price, max_discount_percent,
        weight, weight_uom_id, length, width, height, dimension_uom_id, volume,
        hs_code, country_of_origin, tax_category,
        sales_account_id, cogs_account_id, inventory_account_id, purchase_account_id,
        revenue_account_id, adjustment_account_id,
        tax_type_id, is_tax_inclusive, image_url, is_active,
        default_vendor_id, harvest_schedule_id, expected_harvest_date,
        shelf_life_days, expiry_alert_days, min_order_qty, manufacturer, manufacturer_part_no,
        warranty_months, additional_images, specifications, tags,
        tracking_policy, tracking_policy_id, valuation_method, is_composite
      } = req.body;

      const resolvedName = name || name_en;

      // Validate required fields
      if (!code || !resolvedName || !base_uom_id) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: 'Code, name, and base UOM are required' } 
        });
      }

      // Check if item exists
      const existing = await pool.query(
        'SELECT * FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }

      // 🔒 PHASE 2.1: MOVEMENT LOCK VALIDATION
      // Check if item has any movements (transactions) - uses computed function
      const movementCheck = await pool.query('SELECT item_has_movement($1) as has_movement', [id]);
      const hasMovement = movementCheck.rows[0]?.has_movement || false;

      if (hasMovement) {
        const current = existing.rows[0];
        const lockedFields: string[] = [];
        const body = req.body || {};

        // Check if locked fields are being changed
        if (body.base_uom_id !== undefined && Number(body.base_uom_id) !== Number(current.base_uom_id)) {
          lockedFields.push('base_uom_id');
        }
        if (body.tracking_policy !== undefined && body.tracking_policy !== current.tracking_policy) {
          lockedFields.push('tracking_policy');
        }
        if (body.valuation_method !== undefined && body.valuation_method !== current.valuation_method) {
          lockedFields.push('valuation_method');
        }
        if (body.is_composite !== undefined && Boolean(body.is_composite) !== Boolean(current.is_composite)) {
          lockedFields.push('is_composite');
        }

        // If any locked field changed, reject with clear error
        if (lockedFields.length > 0) {
          const errorResponse = ErrorFactory.itemPolicyLocked(
            Number(id),
            lockedFields
          );
          return res.status(409).json(errorResponse);
        }
      }

      const current = existing.rows[0];
      const body = req.body || {};
      const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

      const normalizeNumberOr = (value: any, fallback: any) => {
        if (value === null || value === undefined) return fallback;
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) ? n : fallback;
      };

      // Preserve existing values for any fields not sent by the UI/client.
      // This avoids accidentally setting NOT NULL columns to NULL.
      const barcodeParam = has('barcode') ? barcode : current.barcode;
      const nameEnParam = has('name_en') ? (name_en || resolvedName) : current.name_en;
      const nameArParam = has('name_ar') ? name_ar : current.name_ar;
      const descriptionParam = has('description') ? description : current.description;
      const categoryIdParam = has('category_id') ? category_id : current.category_id;
      const groupIdParam = has('group_id') ? (group_id || item_group_id) : current.group_id;
      const brandIdParam = has('brand_id') ? brand_id : current.brand_id;
      const itemTypeParam = item_type ?? current.item_type;
      const isPurchasableParam = is_purchasable ?? current.is_purchasable;
      const isSellableParam = is_sellable ?? current.is_sellable;
      const isStockableParam = is_stockable ?? current.is_stockable;
      const baseUomIdParam = has('base_uom_id') ? base_uom_id : current.base_uom_id;
      const salesUomIdParam = has('sales_uom_id') ? sales_uom_id : current.sales_uom_id;
      const purchaseUomIdParam = has('purchase_uom_id') ? purchase_uom_id : current.purchase_uom_id;
      const trackInventoryParam = has('track_inventory') ? track_inventory : current.track_inventory;
      const allowNegativeStockParam = has('allow_negative_stock') ? allow_negative_stock : current.allow_negative_stock;
      const minStockLevelParam = has('min_stock_level') ? min_stock_level : current.min_stock_level;
      const maxStockLevelParam = has('max_stock_level') ? max_stock_level : current.max_stock_level;
      const reorderLevelParam = has('reorder_level') ? reorder_level : current.reorder_level;
      const reorderQtyParam = has('reorder_qty') ? reorder_qty : current.reorder_qty;
      const leadTimeDaysParam = has('lead_time_days') ? lead_time_days : current.lead_time_days;
      const costingMethodParam = costing_method ?? current.costing_method;
      const standardCostParam = has('standard_cost')
        ? normalizeNumberOr(standard_cost, current.standard_cost)
        : current.standard_cost;
      const lastPurchaseCostParam = has('last_purchase_cost') ? last_purchase_cost : current.last_purchase_cost;
      const averageCostParam = has('average_cost') ? average_cost : current.average_cost;
      const baseSellingPriceParam = has('base_selling_price')
        ? normalizeNumberOr(base_selling_price, current.base_selling_price)
        : current.base_selling_price;
      const minSellingPriceParam = has('min_selling_price') ? min_selling_price : current.min_selling_price;
      const maxDiscountPercentParam = has('max_discount_percent') ? max_discount_percent : current.max_discount_percent;
      const weightParam = has('weight') ? weight : current.weight;
      const weightUomIdParam = has('weight_uom_id') ? weight_uom_id : current.weight_uom_id;
      const lengthParam = has('length') ? length : current.length;
      const widthParam = has('width') ? width : current.width;
      const heightParam = has('height') ? height : current.height;
      const dimensionUomIdParam = has('dimension_uom_id') ? dimension_uom_id : current.dimension_uom_id;
      const volumeParam = has('volume') ? volume : current.volume;
      const hsCodeParam = has('hs_code') ? hs_code : current.hs_code;
      const countryOfOriginParam = has('country_of_origin') ? country_of_origin : current.country_of_origin;
      const salesAccountIdParam = has('sales_account_id') ? sales_account_id : current.sales_account_id;
      const cogsAccountIdParam = has('cogs_account_id') ? cogs_account_id : current.cogs_account_id;
      const inventoryAccountIdParam = has('inventory_account_id') ? inventory_account_id : current.inventory_account_id;
      const purchaseAccountIdParam = has('purchase_account_id') ? purchase_account_id : current.purchase_account_id;
      const revenueAccountIdParam = has('revenue_account_id') ? revenue_account_id : current.revenue_account_id;
      const adjustmentAccountIdParam = has('adjustment_account_id') ? adjustment_account_id : current.adjustment_account_id;
      const taxTypeIdParam = has('tax_type_id') ? tax_type_id : current.tax_type_id;
      const isTaxInclusiveParam = has('is_tax_inclusive') ? is_tax_inclusive : current.is_tax_inclusive;
      const imageUrlParam = has('image_url') ? image_url : current.image_url;
      const isActiveParam = has('is_active') ? is_active : current.is_active;
      const itemTypeIdParam = has('item_type_id') ? item_type_id : current.item_type_id;
      const defaultVendorIdParam = has('default_vendor_id') ? default_vendor_id : current.default_vendor_id;
      const harvestScheduleIdParam = has('harvest_schedule_id') ? harvest_schedule_id : current.harvest_schedule_id;
      const expectedHarvestDateParam = has('expected_harvest_date') ? expected_harvest_date : current.expected_harvest_date;
      const shelfLifeDaysParam = has('shelf_life_days') ? shelf_life_days : current.shelf_life_days;
      const minOrderQtyParam = has('min_order_qty') ? min_order_qty : current.min_order_qty;
      const manufacturerParam = has('manufacturer') ? manufacturer : current.manufacturer;
      const manufacturerPartNoParam = has('manufacturer_part_no') ? manufacturer_part_no : current.manufacturer_part_no;
      const warrantyMonthsParam = has('warranty_months') ? warranty_months : current.warranty_months;
      const additionalImagesParam = has('additional_images') ? (additional_images || '[]') : current.additional_images;
      const specificationsParam = has('specifications') ? (specifications || '{}') : current.specifications;
      const tagsParam = has('tags') ? tags : current.tags;
      const trackingPolicyParam = has('tracking_policy') ? tracking_policy : current.tracking_policy;

      // Check for duplicate code (excluding current item)
      const duplicate = await pool.query(
        'SELECT id FROM items WHERE company_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
        [companyId, code, id]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'DUPLICATE_CODE', message: 'Item code already exists' } 
        });
      }

      const result = await pool.query(
        `UPDATE items SET
          code = $1, barcode = $2, name = $3, name_en = $4, name_ar = $5,
          description = $6,
          category_id = $7, group_id = $8, brand_id = $9, item_type = $10,
          item_type_id = $11,
          is_purchasable = $12, is_sellable = $13, is_stockable = $14,
          base_uom_id = $15, sales_uom_id = $16, purchase_uom_id = $17,
          track_inventory = $18, allow_negative_stock = $19,
          min_stock_level = $20, max_stock_level = $21, reorder_level = $22, reorder_qty = $23, lead_time_days = $24,
          costing_method = $25, standard_cost = $26, last_purchase_cost = $27, average_cost = $28,
          base_selling_price = $29, min_selling_price = $30, max_discount_percent = $31,
          weight = $32, weight_uom_id = $33, length = $34, width = $35, height = $36, dimension_uom_id = $37, volume = $38,
          hs_code = $39, country_of_origin = $40,
          sales_account_id = $41, cogs_account_id = $42, inventory_account_id = $43, purchase_account_id = $44,
          revenue_account_id = $45, adjustment_account_id = $46,
          tax_type_id = $47, is_tax_inclusive = $48, image_url = $49, is_active = $50,
          default_vendor_id = $51, harvest_schedule_id = $52, expected_harvest_date = $53,
          shelf_life_days = $54, min_order_qty = $55,
          manufacturer = $56, manufacturer_part_no = $57,
          warranty_months = $58, additional_images = $59, specifications = $60, tags = $61,
          tracking_policy = $62,
          updated_by = $63, updated_at = NOW()
        WHERE id = $64 AND company_id = $65 AND deleted_at IS NULL
        RETURNING *`,
        [
          code, barcodeParam, resolvedName, nameEnParam, nameArParam,
          descriptionParam,
          categoryIdParam, groupIdParam, brandIdParam, itemTypeParam,
          itemTypeIdParam,
          isPurchasableParam, isSellableParam, isStockableParam,
          baseUomIdParam, salesUomIdParam, purchaseUomIdParam,
          trackInventoryParam, allowNegativeStockParam,
          minStockLevelParam, maxStockLevelParam, reorderLevelParam, reorderQtyParam, leadTimeDaysParam,
          costingMethodParam, standardCostParam, lastPurchaseCostParam, averageCostParam,
          baseSellingPriceParam, minSellingPriceParam, maxDiscountPercentParam,
          weightParam, weightUomIdParam, lengthParam, widthParam, heightParam, dimensionUomIdParam, volumeParam,
          hsCodeParam, countryOfOriginParam,
          salesAccountIdParam, cogsAccountIdParam, inventoryAccountIdParam, purchaseAccountIdParam,
          revenueAccountIdParam, adjustmentAccountIdParam,
          taxTypeIdParam, isTaxInclusiveParam, imageUrlParam, isActiveParam,
          defaultVendorIdParam, harvestScheduleIdParam, expectedHarvestDateParam,
          shelfLifeDaysParam, minOrderQtyParam,
          manufacturerParam, manufacturerPartNoParam,
          warrantyMonthsParam, additionalImagesParam, specificationsParam, tagsParam,
          trackingPolicyParam,
          userId, id, companyId
        ]
      );

      // ─── Sync barcode change to item_barcodes table ───────────────────
      if (has('barcode') && barcodeParam !== current.barcode) {
        try {
          if (barcodeParam && barcodeParam.trim()) {
            // Check if old primary barcode exists in item_barcodes
            const existingPrimary = await pool.query(
              `SELECT id, barcode FROM item_barcodes
               WHERE item_id = $1 AND company_id = $2 AND is_primary = true AND deleted_at IS NULL`,
              [id, companyId]
            );
            if (existingPrimary.rows.length > 0) {
              // Update existing primary barcode to new value
              await pool.query(
                `UPDATE item_barcodes SET barcode = $1, updated_at = NOW(), updated_by = $2
                 WHERE id = $3 AND company_id = $4`,
                [barcodeParam.trim(), userId, existingPrimary.rows[0].id, companyId]
              );
            } else {
              // No primary barcode exists — create one
              const detectType = (v: string) => {
                if (/^\d{13}$/.test(v)) return 'EAN-13';
                if (/^\d{12}$/.test(v)) return 'UPC-A';
                if (/^\d{8}$/.test(v)) return 'EAN-8';
                return 'CODE-128';
              };
              await pool.query(
                `INSERT INTO item_barcodes (company_id, item_id, barcode, barcode_type, is_primary, is_active, created_by)
                 VALUES ($1, $2, $3, $4, true, true, $5)
                 ON CONFLICT (company_id, barcode, deleted_at) DO UPDATE SET
                   item_id = EXCLUDED.item_id, is_primary = true, updated_at = NOW()`,
                [companyId, id, barcodeParam.trim(), detectType(barcodeParam.trim()), userId]
              );
            }
          } else if (current.barcode) {
            // Barcode cleared — deactivate primary barcode in item_barcodes
            await pool.query(
              `UPDATE item_barcodes SET is_active = false, updated_at = NOW(), updated_by = $1
               WHERE item_id = $2 AND company_id = $3 AND is_primary = true AND deleted_at IS NULL`,
              [userId, id, companyId]
            );
          }
        } catch (syncErr) {
          // Log but don't fail the item update
          logger.error('Failed to sync barcode to item_barcodes', { itemId: id, error: (syncErr as any)?.message });
        }
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      logger.error('Error updating item', {
        itemId: Number((req as any)?.params?.id) || (req as any)?.params?.id,
        companyId: (req as any)?.companyContext?.companyId,
        userId: (req as any)?.user?.id,
        message: error?.message,
        pgCode: error?.code,
        pgDetail: error?.detail,
        pgConstraint: error?.constraint,
        pgTable: error?.table,
        pgColumn: error?.column,
      });
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update item' } });
    }
  }
);

// DELETE /api/master/items/:id - Soft delete item
router.delete(
  '/:id',
  requirePermission('master:items:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // 🔒 PHASE 2.2: PREVENT DELETION IF HAS MOVEMENTS
      const movementCheck = await pool.query('SELECT item_has_movement($1) as has_movement', [id]);
      const hasMovement = movementCheck.rows[0]?.has_movement || false;

      if (hasMovement) {
        const errorResponse = ErrorFactory.itemHasMovement(Number(id));
        return res.status(409).json(errorResponse);
      }

      const result = await pool.query(
        `UPDATE items SET deleted_at = NOW(), deleted_by = $1
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
        RETURNING id`,
        [userId, id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }

      // Also soft-delete related barcodes
      await pool.query(
        `UPDATE item_barcodes SET deleted_at = NOW(), updated_by = $1
         WHERE item_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [userId, id, companyId]
      ).catch(() => {});

      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete item' } });
    }
  }
);

// POST /api/master/items/bulk/delete - Bulk soft delete items
router.post(
  '/bulk/delete',
  requirePermission('master:items:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'ids array is required' } });
      }

      // Check which items have movements
      const movementCheck = await pool.query(
        `SELECT id FROM items WHERE id = ANY($1) AND company_id = $2 AND deleted_at IS NULL
         AND item_has_movement(id) = true`,
        [ids, companyId]
      );
      const protectedIds = new Set(movementCheck.rows.map((r: any) => r.id));
      const deletableIds = ids.filter((id: number) => !protectedIds.has(id));

      let deleted = 0;
      if (deletableIds.length > 0) {
        const result = await pool.query(
          `UPDATE items SET deleted_at = NOW(), deleted_by = $1
           WHERE id = ANY($2) AND company_id = $3 AND deleted_at IS NULL
           RETURNING id`,
          [userId, deletableIds, companyId]
        );
        deleted = result.rowCount || 0;

        // Also soft-delete related barcodes
        await pool.query(
          `UPDATE item_barcodes SET deleted_at = NOW(), updated_by = $1
           WHERE item_id = ANY($2) AND company_id = $3 AND deleted_at IS NULL`,
          [userId, deletableIds, companyId]
        ).catch(() => {});
      }

      res.json({
        success: true,
        data: { deleted, skipped: protectedIds.size, total: ids.length },
        message: `${deleted} item(s) deleted${protectedIds.size > 0 ? `, ${protectedIds.size} skipped (have movements)` : ''}`
      });
    } catch (error) {
      console.error('Error bulk deleting items:', error);
      res.status(500).json({ success: false, error: { code: 'BULK_DELETE_ERROR', message: 'Failed to bulk delete' } });
    }
  }
);

// POST /api/master/items/:id/restore - Restore soft-deleted item
router.post(
  '/:id/restore',
  requirePermission('master:items:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE items SET deleted_at = NULL, deleted_by = NULL
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
        RETURNING *`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deleted item not found' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Item restored successfully' });
    } catch (error) {
      console.error('Error restoring item:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore item' } });
    }
  }
);

// =====================================================
// ITEM PROFILE 360° APIs
// =====================================================

// GET /api/master/items/:id/full-profile - Get complete item profile
router.get(
  '/:id/full-profile',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      // Get basic item info with computed fields
      const itemResult = await pool.query(`
        SELECT 
          i.*,
          item_has_movement(i.id) as has_movement,
          i.policy_locked_at IS NOT NULL as policies_locked,
          
          -- Stock summary
          iss.total_on_hand,
          iss.quantity_reserved,
          iss.quantity_available,
          iss.warehouses_count,
          
          -- Related data
          cat.name as category_name,
          grp.code as group_code,
          grp.name as group_name,
          grp.name_ar as group_name_ar,
          uom.code as base_uom_code,
          uom.name as base_uom_name,
          it.code as item_type_code,
          it.name_en as item_type_name,
          v.name as default_vendor_name,
          co.name_en as country_name,
          hs.name as harvest_schedule_name
          
        FROM items i
        LEFT JOIN v_items_stock_summary iss ON iss.id = i.id
        LEFT JOIN item_categories cat ON i.category_id = cat.id
        LEFT JOIN item_groups grp ON i.group_id = grp.id AND grp.deleted_at IS NULL
        LEFT JOIN units_of_measure uom ON i.base_uom_id = uom.id AND uom.deleted_at IS NULL
        LEFT JOIN reference_data it ON i.item_type_id = it.id AND it.deleted_at IS NULL
        LEFT JOIN vendors v ON i.default_vendor_id = v.id AND v.deleted_at IS NULL
        LEFT JOIN countries co ON i.country_of_origin = co.id
        LEFT JOIN harvest_schedules hs ON i.harvest_schedule_id = hs.id AND hs.deleted_at IS NULL
        WHERE i.id = $1 AND i.company_id = $2 AND i.deleted_at IS NULL
      `, [id, companyId]);

      if (itemResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }

      const item = itemResult.rows[0];

      // Get secondary groups
      const groupsResult = await pool.query(`
        SELECT 
          iga.id,
          iga.is_primary,
          ig.id as group_id,
          ig.code as group_code,
          ig.name as group_name,
          ig.name_ar as group_name_ar,
          ig.group_type
        FROM item_group_assignments iga
        JOIN item_groups ig ON ig.id = iga.group_id AND ig.deleted_at IS NULL
        WHERE iga.item_id = $1 AND iga.deleted_at IS NULL
        ORDER BY iga.is_primary DESC, ig.name
      `, [id]);

      // Get unit conversions
      const conversionsResult = await pool.query(`
        SELECT 
          iuc.id,
          iuc.from_uom_id,
          iuc.to_uom_id,
          iuc.conversion_factor,
          from_uom.code as from_uom_code,
          from_uom.name as from_uom_name,
          to_uom.code as to_uom_code,
          to_uom.name as to_uom_name
        FROM item_uom_conversions iuc
        JOIN units_of_measure from_uom ON from_uom.id = iuc.from_uom_id AND from_uom.deleted_at IS NULL
        JOIN units_of_measure to_uom ON to_uom.id = iuc.to_uom_id AND to_uom.deleted_at IS NULL
        WHERE iuc.item_id = $1 AND iuc.deleted_at IS NULL
        ORDER BY iuc.conversion_factor DESC
      `, [id]);

      // Get allowed warehouses
      const warehousesResult = await pool.query(`
        SELECT 
          iw.id,
          iw.warehouse_id,
          iw.is_default,
          iw.min_stock,
          iw.max_stock,
          iw.reorder_point,
          iw.default_location,
          iw.default_bin,
          w.code as warehouse_code,
          w.name as warehouse_name,
          w.name_ar as warehouse_name_ar
        FROM item_warehouses iw
        JOIN warehouses w ON w.id = iw.warehouse_id AND w.deleted_at IS NULL
        WHERE iw.item_id = $1 AND iw.deleted_at IS NULL
        ORDER BY iw.is_default DESC, w.name
      `, [id]);

      // Get BOM components (if composite)
      const bomResult = await pool.query(`
        SELECT 
          ib.id,
          ib.component_item_id,
          ib.quantity,
          ib.uom_id,
          ib.is_optional,
          ib.scrap_factor,
          ci.code as component_code,
          ci.name as component_name,
          ci.name_ar as component_name_ar,
          u.code as uom_code
        FROM item_bom ib
        JOIN items ci ON ci.id = ib.component_item_id AND ci.deleted_at IS NULL
        LEFT JOIN units_of_measure u ON u.id = ib.uom_id AND u.deleted_at IS NULL
        WHERE ib.parent_item_id = $1 AND ib.deleted_at IS NULL
        ORDER BY ci.name
      `, [id]);

      // Get recent movements (last 10)
      const movementsResult = await pool.query(`
        SELECT 
          im.id,
          im.occurred_at,
          im.ref_type,
          im.ref_id,
          im.warehouse_id,
          im.qty_delta,
          im.notes,
          w.code as warehouse_code,
          w.name as warehouse_name
        FROM inventory_movements im
        LEFT JOIN warehouses w ON w.id = im.warehouse_id AND w.deleted_at IS NULL
        WHERE im.item_id = $1 AND im.deleted_at IS NULL
        ORDER BY im.occurred_at DESC
        LIMIT 10
      `, [id]);

      res.json({
        success: true,
        data: {
          ...item,
          groups: groupsResult.rows,
          unit_conversions: conversionsResult.rows,
          warehouses: warehousesResult.rows,
          bom_components: bomResult.rows,
          recent_movements: movementsResult.rows
        }
      });
    } catch (error) {
      logger.error('Error fetching item full profile:', error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch item profile' } });
    }
  }
);

// GET /api/master/items/:id/stock-balance - Get stock balance per warehouse
router.get(
  '/:id/stock-balance',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const result = await pool.query(`
        SELECT 
          w.id as warehouse_id,
          w.code as warehouse_code,
          w.name as warehouse_name,
          w.name_ar as warehouse_name_ar,
          COALESCE(SUM(CASE WHEN im.qty_delta > 0 THEN im.qty_delta ELSE 0 END), 0) as quantity_in,
          COALESCE(SUM(CASE WHEN im.qty_delta < 0 THEN ABS(im.qty_delta) ELSE 0 END), 0) as quantity_out,
          COALESCE(SUM(im.qty_delta), 0) as balance,
          COUNT(im.id) as movements_count
        FROM warehouses w
        LEFT JOIN inventory_movements im ON im.warehouse_id = w.id 
          AND im.item_id = $1 
          AND im.deleted_at IS NULL
        WHERE w.company_id = $2 AND w.deleted_at IS NULL
        GROUP BY w.id, w.code, w.name, w.name_ar
        HAVING COALESCE(SUM(im.qty_delta), 0) != 0
        ORDER BY balance DESC
      `, [id, companyId]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Error fetching item stock balance:', error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch stock balance' } });
    }
  }
);

// 🔒 DEPRECATED: Use /full-profile instead - has_movement is included there
// GET /api/master/items/:id/has-movement - Check if item has movement (LEGACY)
// ⚠️ This endpoint is kept for backward compatibility only. New code should use:
//    - GET /items (list) - includes has_movement column
//    - GET /items/:id/full-profile - includes has_movement in response
router.get(
  '/:id/has-movement',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      // Verify item belongs to company
      const itemCheck = await pool.query(
        'SELECT id FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }

      const result = await pool.query('SELECT item_has_movement($1) as has_movement', [id]);
      const hasMovement = result.rows[0].has_movement;

      res.json({ 
        success: true, 
        data: { 
          has_movement: hasMovement,
          locked: hasMovement 
        },
        _deprecated: true,
        _message: 'This endpoint is deprecated. Use GET /items/:id/full-profile instead.'
      });
    } catch (error) {
      logger.error('Error checking item movement:', error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to check movement' } });
    }
  }
);

export default router;
