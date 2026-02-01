import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
};

// Accept both legacy frontend names and migration 034 names.
const reorderRuleSchema = z
  .object({
    item_id: z.preprocess(toNumber, z.number().int().positive()),
    warehouse_id: z.preprocess(toNumber, z.number().int().positive()).optional().nullable(),

    // Preferred names (migration 034)
    min_qty: z.preprocess(toNumber, z.number().min(0)).optional(),
    max_qty: z.preprocess(toNumber, z.number().min(0)).optional(),
    reorder_qty: z.preprocess(toNumber, z.number().min(0)).optional(),
    reorder_level: z.preprocess(toNumber, z.number().min(0)).optional(),

    // Legacy names (frontend page)
    minimum_qty: z.preprocess(toNumber, z.number().min(0)).optional(),
    maximum_qty: z.preprocess(toNumber, z.number().min(0)).optional(),
    reorder_point: z.preprocess(toNumber, z.number().min(0)).optional(),

    lead_time_days: z.preprocess(toNumber, z.number().int().min(0).max(365)).optional(),
    preferred_supplier_id: z.preprocess(toNumber, z.number().int().positive()).optional().nullable(),
    auto_create_purchase_order: z.boolean().optional(),
    auto_generate_po: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

function normalizeQuantities(input: z.infer<typeof reorderRuleSchema>) {
  const minQty = input.min_qty ?? input.minimum_qty;
  const maxQty = input.max_qty ?? input.maximum_qty;
  const reorderQty = input.reorder_qty ?? input.reorder_qty; // same name in UI
  const reorderLevel = input.reorder_level ?? input.reorder_point;
  const autoCreate =
    typeof input.auto_create_purchase_order === 'boolean'
      ? input.auto_create_purchase_order
      : typeof input.auto_generate_po === 'boolean'
        ? input.auto_generate_po
        : undefined;

  return {
    minQty,
    maxQty,
    reorderQty,
    reorderLevel,
    leadTimeDays: input.lead_time_days,
    preferredSupplierId: input.preferred_supplier_id ?? null,
    autoCreatePurchaseOrder: autoCreate,
    isActive: input.is_active,
  };
}

/**
 * @route   GET /api/reorder-rules
 * @desc    List reorder rules (min/max) per item/warehouse
 * @access  Private (reorder_rules:view)
 */
router.get(
  '/',
  requirePermission('reorder_rules:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const { item_id, warehouse_id, below_min, is_active, search } = req.query;

      const params: any[] = [companyId];
      let paramCount = 1;

      let query = `
        SELECT
          rr.id,
          rr.item_id,
          i.code AS item_code,
          i.name AS item_name,
          i.name_ar AS item_name_ar,
          rr.warehouse_id,
          w.code AS warehouse_code,
          w.name AS warehouse_name,
          w.name_ar AS warehouse_name_ar,
          rr.min_qty AS minimum_qty,
          rr.max_qty AS maximum_qty,
          rr.reorder_level AS reorder_point,
          rr.reorder_qty,
          rr.lead_time_days,
          rr.preferred_supplier_id,
          v.name AS supplier_name,
          v.name_ar AS supplier_name_ar,
          rr.auto_create_purchase_order,
          rr.is_active,
          rr.created_at,
          rr.updated_at,
          COALESCE(
            (
              SELECT SUM(iw.qty_on_hand)
              FROM item_warehouse iw
              WHERE iw.item_id = rr.item_id
                AND iw.warehouse_id = rr.warehouse_id
            ),
            0
          )::numeric AS current_qty,
          CASE
            WHEN COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) > rr.max_qty THEN 'overstock'
            WHEN COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) < rr.min_qty THEN 'critical'
            WHEN COALESCE((SELECT SUM(iw.qty_on_hand) FROM item_warehouse iw WHERE iw.item_id = rr.item_id AND iw.warehouse_id = rr.warehouse_id),0) < rr.reorder_level THEN 'low'
            ELSE 'normal'
          END AS status
        FROM reorder_rules rr
        INNER JOIN items i ON rr.item_id = i.id AND i.deleted_at IS NULL
        LEFT JOIN warehouses w ON rr.warehouse_id = w.id AND w.deleted_at IS NULL
        LEFT JOIN vendors v ON rr.preferred_supplier_id = v.id AND v.deleted_at IS NULL
        WHERE rr.company_id = $1 AND rr.deleted_at IS NULL
      `;

      if (item_id) {
        paramCount++;
        query += ` AND rr.item_id = $${paramCount}`;
        params.push(Number(item_id));
      }

      if (warehouse_id) {
        paramCount++;
        query += ` AND rr.warehouse_id = $${paramCount}`;
        params.push(Number(warehouse_id));
      }

      if (typeof is_active === 'string') {
        paramCount++;
        query += ` AND rr.is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (search) {
        paramCount++;
        query += ` AND (
          i.name ILIKE $${paramCount}
          OR i.code ILIKE $${paramCount}
          OR w.name ILIKE $${paramCount}
          OR w.code ILIKE $${paramCount}
        )`;
        params.push(`%${String(search)}%`);
      }

      query += ' ORDER BY i.name ASC, w.name ASC';

      const result = await pool.query(query, params);

      let rows = result.rows;
      if (below_min === 'true') {
        rows = rows.filter((r) => Number(r.current_qty) < Number(r.minimum_qty));
      }

      return res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      console.error('Error fetching reorder rules:', error);
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch reorder rules' } });
    }
  }
);

/**
 * @route   GET /api/reorder-rules/:id
 * @desc    Get reorder rule by ID
 * @access  Private (reorder_rules:view)
 */
router.get(
  '/:id',
  requirePermission('reorder_rules:view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const result = await pool.query(
        `
        SELECT
          rr.id,
          rr.item_id,
          i.code AS item_code,
          i.name AS item_name,
          i.name_ar AS item_name_ar,
          rr.warehouse_id,
          w.code AS warehouse_code,
          w.name AS warehouse_name,
          w.name_ar AS warehouse_name_ar,
          rr.min_qty AS minimum_qty,
          rr.max_qty AS maximum_qty,
          rr.reorder_level AS reorder_point,
          rr.reorder_qty,
          rr.lead_time_days,
          rr.preferred_supplier_id,
          rr.auto_create_purchase_order,
          rr.is_active,
          rr.created_at,
          rr.updated_at,
          COALESCE(
            (
              SELECT SUM(iw.qty_on_hand)
              FROM item_warehouse iw
              WHERE iw.item_id = rr.item_id
                AND iw.warehouse_id = rr.warehouse_id
            ),
            0
          )::numeric AS current_qty
        FROM reorder_rules rr
        INNER JOIN items i ON rr.item_id = i.id AND i.deleted_at IS NULL
        LEFT JOIN warehouses w ON rr.warehouse_id = w.id AND w.deleted_at IS NULL
        WHERE rr.id = $1 AND rr.company_id = $2 AND rr.deleted_at IS NULL
        `,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Reorder rule not found',
          },
        });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching reorder rule:', error);
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch reorder rule' } });
    }
  }
);

/**
 * @route   POST /api/reorder-rules
 * @desc    Create new reorder rule
 * @access  Private (reorder_rules:create)
 */
router.post(
  '/',
  requirePermission('reorder_rules:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const validated = reorderRuleSchema.parse(req.body);
      const normalized = normalizeQuantities(validated);

      if (
        normalized.minQty === undefined ||
        normalized.maxQty === undefined ||
        normalized.reorderQty === undefined ||
        normalized.reorderLevel === undefined
      ) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'min/max/reorder point/reorder qty are required' },
        });
      }

      if (normalized.maxQty < normalized.minQty) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maximum quantity must be >= minimum quantity' },
        });
      }

      if (normalized.reorderLevel < normalized.minQty) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Reorder point must be >= minimum quantity' },
        });
      }

      // Ensure item exists
      const itemCheck = await pool.query('SELECT id FROM items WHERE id = $1 AND deleted_at IS NULL', [validated.item_id]);
      if (itemCheck.rows.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' } });
      }

      // Ensure warehouse exists
      if (validated.warehouse_id) {
        const wh = await pool.query('SELECT id FROM warehouses WHERE id = $1 AND deleted_at IS NULL', [validated.warehouse_id]);
        if (wh.rows.length === 0) {
          return res
            .status(400)
            .json({ success: false, error: { code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' } });
        }
      }

      // Unique per company+item+warehouse
      const dup = await pool.query(
        `SELECT id FROM reorder_rules
         WHERE company_id = $1 AND item_id = $2 AND warehouse_id IS NOT DISTINCT FROM $3 AND deleted_at IS NULL`,
        [companyId, validated.item_id, validated.warehouse_id ?? null]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Rule already exists for this item and warehouse' },
        });
      }

      const result = await pool.query(
        `INSERT INTO reorder_rules (
          company_id,
          item_id,
          warehouse_id,
          min_qty,
          max_qty,
          reorder_qty,
          reorder_level,
          lead_time_days,
          preferred_supplier_id,
          auto_create_purchase_order,
          is_active,
          created_by,
          updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id`,
        [
          companyId,
          validated.item_id,
          validated.warehouse_id ?? null,
          normalized.minQty,
          normalized.maxQty,
          normalized.reorderQty,
          normalized.reorderLevel,
          normalized.leadTimeDays ?? null,
          normalized.preferredSupplierId,
          normalized.autoCreatePurchaseOrder ?? false,
          typeof normalized.isActive === 'boolean' ? normalized.isActive : true,
          userId,
          userId,
        ]
      );

      const created = await pool.query('SELECT * FROM reorder_rules WHERE id = $1', [result.rows[0].id]);
      return res.status(201).json({ success: true, data: created.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
      }

      console.error('Error creating reorder rule:', error);
      return res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create reorder rule' } });
    }
  }
);

/**
 * @route   PUT /api/reorder-rules/:id
 * @desc    Update reorder rule
 * @access  Private (reorder_rules:edit)
 */
router.put(
  '/:id',
  requirePermission('reorder_rules:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const existing = await pool.query(
        'SELECT * FROM reorder_rules WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reorder rule not found' } });
      }

      const validated = reorderRuleSchema.partial().parse(req.body);
      const normalized = normalizeQuantities(validated as any);

      const finalMin = normalized.minQty ?? existing.rows[0].min_qty;
      const finalMax = normalized.maxQty ?? existing.rows[0].max_qty;
      const finalReorderLevel = normalized.reorderLevel ?? existing.rows[0].reorder_level;

      if (Number(finalMax) < Number(finalMin)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maximum quantity must be >= minimum quantity' },
        });
      }
      if (Number(finalReorderLevel) < Number(finalMin)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Reorder point must be >= minimum quantity' },
        });
      }

      // Optional uniqueness check if item/warehouse changed
      const nextItemId = validated.item_id ?? existing.rows[0].item_id;
      const nextWarehouseId =
        validated.warehouse_id === undefined ? existing.rows[0].warehouse_id : validated.warehouse_id;
      const dup = await pool.query(
        `SELECT id FROM reorder_rules
         WHERE company_id = $1 AND item_id = $2 AND warehouse_id IS NOT DISTINCT FROM $3 AND deleted_at IS NULL AND id <> $4`,
        [companyId, nextItemId, nextWarehouseId ?? null, id]
      );
      if (dup.rows.length > 0) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'DUPLICATE', message: 'Rule already exists for this item and warehouse' } });
      }

      const result = await pool.query(
        `UPDATE reorder_rules
         SET
           item_id = COALESCE($1, item_id),
           warehouse_id = COALESCE($2, warehouse_id),
           min_qty = COALESCE($3, min_qty),
           max_qty = COALESCE($4, max_qty),
           reorder_qty = COALESCE($5, reorder_qty),
           reorder_level = COALESCE($6, reorder_level),
           lead_time_days = COALESCE($7, lead_time_days),
           preferred_supplier_id = COALESCE($8, preferred_supplier_id),
           auto_create_purchase_order = COALESCE($9, auto_create_purchase_order),
           is_active = COALESCE($10, is_active),
           updated_by = $11,
           updated_at = NOW()
         WHERE id = $12 AND company_id = $13 AND deleted_at IS NULL
         RETURNING *`,
        [
          validated.item_id ?? null,
          validated.warehouse_id ?? null,
          normalized.minQty ?? null,
          normalized.maxQty ?? null,
          normalized.reorderQty ?? null,
          normalized.reorderLevel ?? null,
          normalized.leadTimeDays ?? null,
          normalized.preferredSupplierId ?? null,
          typeof normalized.autoCreatePurchaseOrder === 'boolean' ? normalized.autoCreatePurchaseOrder : null,
          typeof normalized.isActive === 'boolean' ? normalized.isActive : null,
          userId,
          id,
          companyId,
        ]
      );

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors,
          },
        });
      }

      console.error('Error updating reorder rule:', error);
      return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update reorder rule' } });
    }
  }
);

/**
 * @route   DELETE /api/reorder-rules/:id
 * @desc    Soft delete reorder rule
 * @access  Private (reorder_rules:delete)
 */
router.delete(
  '/:id',
  requirePermission('reorder_rules:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const existing = await pool.query(
        'SELECT id FROM reorder_rules WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reorder rule not found' } });
      }

      await pool.query('UPDATE reorder_rules SET deleted_at = NOW(), updated_by = $1 WHERE id = $2', [userId, id]);
      return res.json({ success: true, message: 'Reorder rule deleted successfully' });
    } catch (error) {
      console.error('Error deleting reorder rule:', error);
      return res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete reorder rule' } });
    }
  }
);

export default router;
