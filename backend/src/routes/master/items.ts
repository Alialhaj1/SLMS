import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { ErrorFactory } from '../../types/errors';
import logger from '../../utils/logger';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// GET /api/master/items - List all items
router.get(
  '/',
  requirePermission('master:items:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { search, item_type, is_active, category_id } = req.query;
      const params: any[] = [companyId];
      let paramIndex = 2;

      let query = `
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
          it.code as item_type_code,
          it.name_en as item_type_name,
          it.name_ar as item_type_name_ar,
          v.code as default_vendor_code,
          v.name as default_vendor_name,
          v.name_ar as default_vendor_name_ar,
          co.code as country_code,
          co.name_en as country_name,
          co.name_ar as country_name_ar,
          hs.code as harvest_schedule_code,
          hs.name as harvest_schedule_name,
          hs.name_ar as harvest_schedule_name_ar,
          item_has_movement(i.id) as has_movement
        FROM items i
        LEFT JOIN item_categories cat ON i.category_id = cat.id
        LEFT JOIN item_groups grp ON i.group_id = grp.id AND grp.deleted_at IS NULL
        LEFT JOIN units_of_measure uom ON i.base_uom_id = uom.id AND uom.deleted_at IS NULL
        LEFT JOIN reference_data it ON i.item_type_id = it.id AND it.deleted_at IS NULL
        LEFT JOIN vendors v ON i.default_vendor_id = v.id AND v.deleted_at IS NULL
        LEFT JOIN countries co ON i.country_of_origin = co.id
        LEFT JOIN harvest_schedules hs ON i.harvest_schedule_id = hs.id AND hs.deleted_at IS NULL
        WHERE i.company_id = $1 AND i.deleted_at IS NULL
      `;

      if (search) {
        query += ` AND (i.code ILIKE $${paramIndex} OR i.name ILIKE $${paramIndex} OR i.name_ar ILIKE $${paramIndex} OR i.barcode ILIKE $${paramIndex})`;
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

      if (category_id) {
        query += ` AND i.category_id = $${paramIndex}`;
        params.push(category_id);
        paramIndex++;
      }

      query += ` ORDER BY i.code`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
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

        if (r.conversion_factor === 1) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Additional unit conversion_factor cannot equal 1' },
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
      const companyId = (req as any).companyContext?.companyId;
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          i.*,
          slms_format_sequence(i.numbering_series_id, i.sequence_no) as sequence_display,
          cat.name as category_name,
          grp.name as group_name,
          brand.name as brand_name,
          uom.code as base_uom_code,
          uom.name as base_uom_name,
          uom.name_ar as base_uom_name_ar,
          it.code as item_type_code,
          it.name_en as item_type_name,
          it.name_ar as item_type_name_ar,
          v.code as default_vendor_code,
          v.name as default_vendor_name,
          v.name_ar as default_vendor_name_ar,
          co.code as country_code,
          co.name_en as country_name,
          co.name_ar as country_name_ar,
          hs.code as harvest_schedule_code,
          hs.name as harvest_schedule_name,
          hs.name_ar as harvest_schedule_name_ar,
          hs.season as harvest_season,
          hs.start_month as harvest_start_month,
          hs.end_month as harvest_end_month
        FROM items i
        LEFT JOIN item_categories cat ON i.category_id = cat.id
        LEFT JOIN item_groups grp ON i.group_id = grp.id
        LEFT JOIN brands brand ON i.brand_id = brand.id
        LEFT JOIN units_of_measure uom ON i.base_uom_id = uom.id AND uom.deleted_at IS NULL
        LEFT JOIN reference_data it ON i.item_type_id = it.id AND it.deleted_at IS NULL
        LEFT JOIN vendors v ON i.default_vendor_id = v.id AND v.deleted_at IS NULL
        LEFT JOIN countries co ON i.country_of_origin = co.id
        LEFT JOIN harvest_schedules hs ON i.harvest_schedule_id = hs.id AND hs.deleted_at IS NULL
        WHERE i.id = $1 AND i.company_id = $2 AND i.deleted_at IS NULL`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
      }

      res.json({ success: true, data: result.rows[0] });
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
        code, barcode, name, name_ar, description,
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
        warranty_months, additional_images, specifications, tags
      } = req.body;

      // Validate required fields
      if (!code || !name || !base_uom_id) {
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
          company_id, code, barcode, name, name_ar, description,
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
          created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
          $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
          $42, $43, $44, $45, $46, $47, $48, $49, $50, $51,
          $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, NOW()
        ) RETURNING *`,
        [
          companyId, code, barcode, name, name_ar, description,
          category_id, group_id, brand_id, item_type || 'trading_goods', item_type_id,
          is_purchasable ?? true, is_sellable ?? true, is_stockable ?? true,
          base_uom_id, sales_uom_id, purchase_uom_id,
          track_inventory ?? true, allow_negative_stock ?? false,
          min_stock_level || 0, max_stock_level, reorder_level, reorder_qty, lead_time_days || 0,
          costing_method || 'average', standard_cost || 0, last_purchase_cost || 0, average_cost || 0,
          base_selling_price || 0, min_selling_price, max_discount_percent,
          weight, weight_uom_id, length, width, height, dimension_uom_id, volume,
          hs_code, country_of_origin,
          sales_account_id, cogs_account_id, inventory_account_id, purchase_account_id,
          revenue_account_id, adjustment_account_id,
          tax_type_id, is_tax_inclusive ?? false, image_url, is_active ?? true,
          default_vendor_id, harvest_schedule_id, expected_harvest_date,
          shelf_life_days, min_order_qty, manufacturer, manufacturer_part_no,
          warranty_months, additional_images || '[]', specifications || '{}', tags,
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
        code, barcode, name, name_ar, description,
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
        tracking_policy, valuation_method, is_composite
      } = req.body;

      // Validate required fields
      if (!code || !name || !base_uom_id) {
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
      const nameArParam = has('name_ar') ? name_ar : current.name_ar;
      const descriptionParam = has('description') ? description : current.description;
      const categoryIdParam = has('category_id') ? category_id : current.category_id;
      const groupIdParam = has('group_id') ? group_id : current.group_id;
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
          code = $1, barcode = $2, name = $3, name_ar = $4, description = $5,
          category_id = $6, group_id = $7, brand_id = $8, item_type = $9, item_type_id = $10,
          is_purchasable = $11, is_sellable = $12, is_stockable = $13,
          base_uom_id = $14, sales_uom_id = $15, purchase_uom_id = $16,
          track_inventory = $17, allow_negative_stock = $18,
          min_stock_level = $19, max_stock_level = $20, reorder_level = $21, reorder_qty = $22, lead_time_days = $23,
          costing_method = $24, standard_cost = $25, last_purchase_cost = $26, average_cost = $27,
          base_selling_price = $28, min_selling_price = $29, max_discount_percent = $30,
          weight = $31, weight_uom_id = $32, length = $33, width = $34, height = $35, dimension_uom_id = $36, volume = $37,
          hs_code = $38, country_of_origin = $39,
          sales_account_id = $40, cogs_account_id = $41, inventory_account_id = $42, purchase_account_id = $43,
          revenue_account_id = $44, adjustment_account_id = $45,
          tax_type_id = $46, is_tax_inclusive = $47, image_url = $48, is_active = $49,
          default_vendor_id = $50, harvest_schedule_id = $51, expected_harvest_date = $52,
          shelf_life_days = $53, min_order_qty = $54, manufacturer = $55, manufacturer_part_no = $56,
          warranty_months = $57, additional_images = $58, specifications = $59, tags = $60,
          updated_by = $61, updated_at = NOW()
        WHERE id = $62 AND company_id = $63 AND deleted_at IS NULL
        RETURNING *`,
        [
          code, barcodeParam, name, nameArParam, descriptionParam,
          categoryIdParam, groupIdParam, brandIdParam, itemTypeParam, itemTypeIdParam,
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
          shelfLifeDaysParam, minOrderQtyParam, manufacturerParam, manufacturerPartNoParam,
          warrantyMonthsParam, additionalImagesParam, specificationsParam, tagsParam,
          userId, id, companyId
        ]
      );

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

      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete item' } });
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
