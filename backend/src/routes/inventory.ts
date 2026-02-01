/**
 * INVENTORY API
 * - Balances (from item_warehouse)
 * - Unified movement ledger (inventory_movements)
 * - Adjustments CRUD (legacy endpoint path, new ledger backing)
 *
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC
 * Soft Delete: ✅ inventory_movements.deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission, requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function getCompanyId(req: Request) {
  return (req as any).companyContext?.companyId as number | undefined;
}

function companyRequired(res: Response) {
  return res
    .status(400)
    .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
}

function invalidInput(res: Response, message: string, code = 'INVALID_INPUT') {
  return res.status(400).json({ success: false, error: { code, message } });
}

function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// GET /api/inventory
// Returns current on-hand balances per item+warehouse.
router.get(
  '/',
  requireAnyPermission(['inventory:balances:view', 'warehouses:view', 'master:warehouses:view']),
  async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  try {
    const { warehouse_id, item_id, search } = req.query as any;

    const params: any[] = [companyId];
    let paramCount = 1;

    let where = `WHERE i.company_id = $1 AND i.deleted_at IS NULL AND w.company_id = $1 AND w.deleted_at IS NULL`;

    if (warehouse_id) {
      paramCount++;
      where += ` AND w.id = $${paramCount}`;
      params.push(Number(warehouse_id));
    }

    if (item_id) {
      paramCount++;
      where += ` AND i.id = $${paramCount}`;
      params.push(Number(item_id));
    }

    if (search) {
      paramCount++;
      where += ` AND (i.code ILIKE $${paramCount} OR i.name ILIKE $${paramCount} OR COALESCE(i.name_ar,'') ILIKE $${paramCount})`;
      params.push(`%${String(search)}%`);
    }

    const query = `
      SELECT
        MIN(iw.id) AS id,
        i.code AS item_code,
        i.name AS item_name,
        COALESCE(i.name_ar, '') AS item_name_ar,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COALESCE(SUM(iw.qty_on_hand), 0)::numeric AS quantity,
        COALESCE(uom.code, '') AS unit,
        COALESCE(MAX(iw.average_cost), 0)::numeric AS average_cost,
        COALESCE(MAX(iw.last_cost), 0)::numeric AS last_cost,
        COALESCE(MAX(iw.selling_price), 0)::numeric AS selling_price,
        COALESCE(i.min_stock_level, 0)::numeric AS min_stock,
        COALESCE(i.max_stock_level, 0)::numeric AS max_stock,
        COALESCE(
          (
            SELECT MAX(im.occurred_at)::date
            FROM inventory_movements im
            WHERE im.company_id = $1
              AND im.item_id = i.id
              AND im.warehouse_id = w.id
              AND im.deleted_at IS NULL
          ),
          MAX(iw.last_stock_date)::date
        )::text AS last_movement,
        CASE
          WHEN COALESCE(SUM(iw.qty_on_hand), 0) <= 0 THEN 'out_of_stock'
          WHEN i.min_stock_level IS NOT NULL AND COALESCE(SUM(iw.qty_on_hand), 0) < i.min_stock_level THEN 'low_stock'
          ELSE 'in_stock'
        END AS status
      FROM item_warehouse iw
      JOIN items i ON i.id = iw.item_id
      JOIN warehouses w ON w.id = iw.warehouse_id
      LEFT JOIN units_of_measure uom ON uom.id = i.base_uom_id
      ${where}
        AND iw.variant_id IS NULL
        AND iw.location_id IS NULL
      GROUP BY i.id, i.code, i.name, i.name_ar, i.min_stock_level, i.max_stock_level, w.id, w.name, uom.code
      ORDER BY w.name, i.code;
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Inventory balances error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch inventory balances' } });
  }
  }
);

// GET /api/inventory/ledger
// Returns movement ledger entries (partitioned running balance per item+warehouse).
router.get('/ledger', requirePermission('accounting:inventory_ledger:view'), async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  try {
    const { warehouse_id, item_id, from, to } = req.query as any;

    const params: any[] = [companyId];
    let paramCount = 1;

    let where = `WHERE im.company_id = $1 AND im.deleted_at IS NULL`;

    if (warehouse_id) {
      paramCount++;
      where += ` AND im.warehouse_id = $${paramCount}`;
      params.push(Number(warehouse_id));
    }

    if (item_id) {
      paramCount++;
      where += ` AND im.item_id = $${paramCount}`;
      params.push(Number(item_id));
    }

    if (from) {
      paramCount++;
      where += ` AND im.occurred_at >= $${paramCount}`;
      params.push(new Date(String(from)));
    }

    if (to) {
      paramCount++;
      where += ` AND im.occurred_at <= $${paramCount}`;
      params.push(new Date(String(to)));
    }

    const query = `
      SELECT
        im.id,
        i.id AS item_id,
        i.code AS item_code,
        i.name AS item_name,
        COALESCE(i.name_ar, '') AS item_name_ar,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COALESCE(cc.code, '') AS cost_center_code,
        COALESCE(cc.name, '') AS cost_center_name,
        COALESCE(cc.name_ar, '') AS cost_center_name_ar,
        im.occurred_at::date::text AS date,
        COALESCE(
          im.ref_no,
          (
            CASE WHEN im.txn_type = 'adjustment' THEN 'ADJ' ELSE UPPER(im.txn_type) END
            || '-' || LPAD(im.id::text, 6, '0')
          )
        ) AS ref,
        CASE WHEN im.qty_delta >= 0 THEN 'in' ELSE 'out' END AS type,
        CASE WHEN im.qty_delta >= 0 THEN im.qty_delta ELSE 0 END AS qty_in,
        CASE WHEN im.qty_delta < 0 THEN ABS(im.qty_delta) ELSE 0 END AS qty_out,
        SUM(im.qty_delta) OVER (
          PARTITION BY im.item_id, im.warehouse_id
          ORDER BY im.occurred_at, im.id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS balance_qty,
        COALESCE(im.unit_cost, 0) AS unit_cost,
        'SAR' AS currency,
        COALESCE(im.notes, '') AS notes
      FROM inventory_movements im
      JOIN items i
        ON i.id = im.item_id
        AND i.company_id = im.company_id
        AND i.deleted_at IS NULL
      JOIN warehouses w
        ON w.id = im.warehouse_id
        AND w.company_id = im.company_id
        AND w.deleted_at IS NULL
      LEFT JOIN cost_centers cc
        ON cc.id = im.cost_center_id
        AND cc.company_id = im.company_id
        AND cc.deleted_at IS NULL
      ${where}
      ORDER BY im.occurred_at DESC, im.id DESC
      LIMIT 500;
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Inventory ledger error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch inventory ledger' } });
  }
});

async function requireWarehouseAndItemCompanyScoped(
  client: any,
  companyId: number,
  warehouseId: number,
  itemId: number
) {
  const whRes = await client.query(
    `SELECT id, company_id, cost_center_id FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [warehouseId, companyId]
  );
  if (whRes.rowCount === 0) throw new Error('WAREHOUSE_NOT_FOUND');

  const itemRes = await client.query(
    `SELECT id, company_id, allow_negative_stock, track_inventory FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [itemId, companyId]
  );
  if (itemRes.rowCount === 0) throw new Error('ITEM_NOT_FOUND');

  return {
    warehouse: whRes.rows[0] as { id: number; cost_center_id: number | null },
    item: itemRes.rows[0] as { id: number; allow_negative_stock: boolean; track_inventory: boolean },
  };
}

async function ensureItemWarehouseRow(client: any, itemId: number, warehouseId: number) {
  await client.query(
    `INSERT INTO item_warehouse (
       item_id, warehouse_id, variant_id, location_id,
       qty_on_hand, last_stock_date,
       average_cost, last_cost, selling_price
     )
     SELECT
       $1, $2, NULL, NULL,
       0, CURRENT_TIMESTAMP,
       COALESCE(i.average_cost, 0), COALESCE(i.last_purchase_cost, 0), COALESCE(i.base_selling_price, 0)
     FROM items i
     WHERE i.id = $1 AND i.deleted_at IS NULL
     ON CONFLICT (item_id, warehouse_id)
     WHERE variant_id IS NULL AND location_id IS NULL
     DO NOTHING`,
    [itemId, warehouseId]
  );
}

async function applyDeltaToOnHand(
  client: any,
  companyId: number,
  itemId: number,
  warehouseId: number,
  delta: number,
  allowNegative: boolean,
  opts?: { unitCost?: number | null; sellingPrice?: number | null }
) {
  // Ensure row exists and lock it.
  await ensureItemWarehouseRow(client, itemId, warehouseId);

  const rowRes = await client.query(
    `SELECT qty_on_hand, average_cost, last_cost, selling_price
     FROM item_warehouse
     WHERE item_id = $1 AND warehouse_id = $2 AND variant_id IS NULL AND location_id IS NULL
     FOR UPDATE`,
    [itemId, warehouseId]
  );

  const currentQty = Number(rowRes.rows[0]?.qty_on_hand ?? 0);
  const currentAvgCost = Number(rowRes.rows[0]?.average_cost ?? 0);
  const currentLastCost = Number(rowRes.rows[0]?.last_cost ?? 0);
  const currentSellingPrice = Number(rowRes.rows[0]?.selling_price ?? 0);

  const nextQty = currentQty + delta;

  if (!allowNegative && nextQty < 0) {
    throw new Error('NEGATIVE_STOCK_NOT_ALLOWED');
  }

  let nextAvgCost = currentAvgCost;
  let nextLastCost = currentLastCost;
  if (delta > 0 && opts?.unitCost !== undefined && opts?.unitCost !== null && Number.isFinite(opts.unitCost)) {
    const unitCost = Number(opts.unitCost);
    const totalCost = currentQty * currentAvgCost + delta * unitCost;
    nextAvgCost = nextQty > 0 ? totalCost / nextQty : unitCost;
    nextLastCost = unitCost;
  }

  let nextSellingPrice = currentSellingPrice;
  if (opts?.sellingPrice !== undefined && opts?.sellingPrice !== null && Number.isFinite(opts.sellingPrice)) {
    nextSellingPrice = Number(opts.sellingPrice);
  }

  await client.query(
    `UPDATE item_warehouse
     SET qty_on_hand = $3,
         average_cost = $4,
         last_cost = $5,
         selling_price = $6,
         last_stock_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE item_id = $1 AND warehouse_id = $2 AND variant_id IS NULL AND location_id IS NULL`,
    [itemId, warehouseId, nextQty, nextAvgCost, nextLastCost, nextSellingPrice]
  );
}

async function insertMovement(
  client: any,
  payload: {
    companyId: number;
    warehouseId: number;
    itemId: number;
    costCenterId: number | null;
    txnType: string;
    qtyDelta: number;
    unitCost: number | null;
    unitPrice?: number | null;
    refType?: string | null;
    refId?: number | null;
    refNo?: string | null;
    notes: string | null;
    occurredAt: Date | null;
    userId: number | null;
  }
) {
  const insertRes = await client.query(
    `INSERT INTO inventory_movements (
       company_id, warehouse_id, item_id, variant_id, location_id,
       cost_center_id,
       txn_type, qty_delta,
       unit_cost,
       unit_price,
       ref_type, ref_id, ref_no,
       notes, occurred_at,
       created_by, updated_by,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, NULL, NULL,
       $4,
       $5, $6,
       $7,
       $8,
       $9, $10, $11,
       $12, COALESCE($13, CURRENT_TIMESTAMP),
       $14, $14,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     ) RETURNING id`,
    [
      payload.companyId,
      payload.warehouseId,
      payload.itemId,
      payload.costCenterId,
      payload.txnType,
      payload.qtyDelta,
      payload.unitCost,
      payload.unitPrice ?? null,
      payload.refType ?? null,
      payload.refId ?? null,
      payload.refNo ?? null,
      payload.notes,
      payload.occurredAt,
      payload.userId,
    ]
  );

  return Number(insertRes.rows[0]?.id);
}

// POST /api/inventory/adjustments
router.post(
  '/adjustments',
  requireAnyPermission(['warehouses:edit', 'master:warehouses:edit']),
  async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  const userId = (req as any).user?.id as number | undefined;

  const warehouseId = toNumber(req.body?.warehouse_id);
  const itemId = toNumber(req.body?.item_id);
  const quantityDelta = toNumber(req.body?.quantity_delta);
  const unitCost = req.body?.unit_cost !== undefined && req.body?.unit_cost !== null ? toNumber(req.body.unit_cost) : null;
  const sellingPrice = req.body?.selling_price !== undefined && req.body?.selling_price !== null ? toNumber(req.body.selling_price) : null;
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
  const occurredAt = req.body?.occurred_at ? new Date(String(req.body.occurred_at)) : null;

  if (!Number.isFinite(warehouseId) || !Number.isFinite(itemId) || Number.isNaN(quantityDelta) || quantityDelta === 0) {
    return invalidInput(res, 'warehouse_id, item_id, and non-zero quantity_delta are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { warehouse, item } = await requireWarehouseAndItemCompanyScoped(client, companyId, warehouseId, itemId);

    if (!item.track_inventory) {
      return invalidInput(res, 'Item does not track inventory', 'ITEM_NOT_TRACKING');
    }

    await applyDeltaToOnHand(client, companyId, itemId, warehouseId, quantityDelta, !!item.allow_negative_stock, {
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      sellingPrice: Number.isFinite(sellingPrice as any) ? sellingPrice : null,
    });

    const movementId = await insertMovement(client, {
      companyId,
      warehouseId,
      itemId,
      costCenterId: warehouse.cost_center_id,
      txnType: 'adjustment',
      qtyDelta: quantityDelta,
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      unitPrice: null,
      refType: null,
      refId: null,
      refNo: null,
      notes,
      occurredAt,
      userId: userId ?? null,
    });

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { id: movementId } });
  } catch (err: any) {
    await client.query('ROLLBACK');

    const msg = String(err?.message || err);
    if (msg === 'WAREHOUSE_NOT_FOUND') return invalidInput(res, 'Warehouse not found', 'WAREHOUSE_NOT_FOUND');
    if (msg === 'ITEM_NOT_FOUND') return invalidInput(res, 'Item not found', 'ITEM_NOT_FOUND');
    if (msg === 'NEGATIVE_STOCK_NOT_ALLOWED') return invalidInput(res, 'Negative stock not allowed for this item', 'NEGATIVE_STOCK_NOT_ALLOWED');

    console.error('Create adjustment error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create inventory adjustment' } });
  } finally {
    client.release();
  }
  }
);

// PUT /api/inventory/adjustments/:id
router.put(
  '/adjustments/:id',
  requireAnyPermission(['warehouses:edit', 'master:warehouses:edit']),
  async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  const adjustmentId = Number(req.params.id);
  if (!adjustmentId) return invalidInput(res, 'Invalid adjustment id');

  const userId = (req as any).user?.id as number | undefined;

  const warehouseId = toNumber(req.body?.warehouse_id);
  const itemId = toNumber(req.body?.item_id);
  const quantityDelta = toNumber(req.body?.quantity_delta);
  const unitCost = req.body?.unit_cost !== undefined && req.body?.unit_cost !== null ? toNumber(req.body.unit_cost) : null;
  const sellingPrice = req.body?.selling_price !== undefined && req.body?.selling_price !== null ? toNumber(req.body.selling_price) : null;
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
  const occurredAt = req.body?.occurred_at ? new Date(String(req.body.occurred_at)) : null;

  if (!Number.isFinite(warehouseId) || !Number.isFinite(itemId) || Number.isNaN(quantityDelta) || quantityDelta === 0) {
    return invalidInput(res, 'warehouse_id, item_id, and non-zero quantity_delta are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT id, warehouse_id, item_id, qty_delta
       FROM inventory_movements
       WHERE id = $1 AND company_id = $2 AND txn_type = 'adjustment' AND deleted_at IS NULL
       FOR UPDATE`,
      [adjustmentId, companyId]
    );

    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Adjustment not found' } });
    }

    const existing = existingRes.rows[0] as { warehouse_id: number; item_id: number; qty_delta: string };
    const oldWarehouseId = Number(existing.warehouse_id);
    const oldItemId = Number(existing.item_id);
    const oldDelta = Number(existing.qty_delta);

    // Validate new warehouse/item
    const { warehouse, item } = await requireWarehouseAndItemCompanyScoped(client, companyId, warehouseId, itemId);

    if (!item.track_inventory) {
      return invalidInput(res, 'Item does not track inventory', 'ITEM_NOT_TRACKING');
    }

    // Reverse old
    {
      const oldItemRes = await client.query(
        `SELECT allow_negative_stock FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [oldItemId, companyId]
      );
      const allowNegativeOld = !!oldItemRes.rows[0]?.allow_negative_stock;
      await applyDeltaToOnHand(client, companyId, oldItemId, oldWarehouseId, -oldDelta, allowNegativeOld);
    }

    // Apply new
    await applyDeltaToOnHand(client, companyId, itemId, warehouseId, quantityDelta, !!item.allow_negative_stock, {
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      sellingPrice: Number.isFinite(sellingPrice as any) ? sellingPrice : null,
    });

    await client.query(
      `UPDATE inventory_movements
       SET warehouse_id = $3,
           item_id = $4,
           cost_center_id = $5,
           qty_delta = $6,
           unit_cost = $7,
           notes = $8,
           occurred_at = COALESCE($9, occurred_at),
           updated_by = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2 AND txn_type = 'adjustment'`,
      [
        adjustmentId,
        companyId,
        warehouseId,
        itemId,
        warehouse.cost_center_id,
        quantityDelta,
        Number.isFinite(unitCost as any) ? unitCost : null,
        notes,
        occurredAt,
        userId ?? null,
      ]
    );

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');

    const msg = String(err?.message || err);
    if (msg === 'WAREHOUSE_NOT_FOUND') return invalidInput(res, 'Warehouse not found', 'WAREHOUSE_NOT_FOUND');
    if (msg === 'ITEM_NOT_FOUND') return invalidInput(res, 'Item not found', 'ITEM_NOT_FOUND');
    if (msg === 'NEGATIVE_STOCK_NOT_ALLOWED') return invalidInput(res, 'Negative stock not allowed for this item', 'NEGATIVE_STOCK_NOT_ALLOWED');

    console.error('Update adjustment error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update inventory adjustment' } });
  } finally {
    client.release();
  }
  }
);

// DELETE /api/inventory/adjustments/:id
router.delete(
  '/adjustments/:id',
  requireAnyPermission(['warehouses:edit', 'master:warehouses:edit']),
  async (req: Request, res: Response) => {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  const adjustmentId = Number(req.params.id);
  if (!adjustmentId) return invalidInput(res, 'Invalid adjustment id');

  const userId = (req as any).user?.id as number | undefined;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT id, warehouse_id, item_id, qty_delta
       FROM inventory_movements
       WHERE id = $1 AND company_id = $2 AND txn_type = 'adjustment' AND deleted_at IS NULL
       FOR UPDATE`,
      [adjustmentId, companyId]
    );

    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Adjustment not found' } });
    }

    const existing = existingRes.rows[0] as { warehouse_id: number; item_id: number; qty_delta: string };
    const warehouseId = Number(existing.warehouse_id);
    const itemId = Number(existing.item_id);
    const delta = Number(existing.qty_delta);

    const itemRes = await client.query(
      `SELECT allow_negative_stock FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [itemId, companyId]
    );
    const allowNegative = !!itemRes.rows[0]?.allow_negative_stock;

    // Reverse
    await applyDeltaToOnHand(client, companyId, itemId, warehouseId, -delta, allowNegative);

    await client.query(
      `UPDATE inventory_movements
       SET deleted_at = CURRENT_TIMESTAMP,
           updated_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2 AND txn_type = 'adjustment'`,
      [adjustmentId, companyId, userId ?? null]
    );

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');

    const msg = String(err?.message || err);
    if (msg === 'NEGATIVE_STOCK_NOT_ALLOWED') return invalidInput(res, 'Negative stock not allowed for this item', 'NEGATIVE_STOCK_NOT_ALLOWED');

    console.error('Delete adjustment error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete inventory adjustment' } });
  } finally {
    client.release();
  }
  }
);

function makeRefNo(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

async function listMovements(
  req: Request,
  res: Response,
  txnTypes: string[],
  limit = 200
) {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  try {
    const params: any[] = [companyId, txnTypes, limit];
    const query = `
      SELECT
        im.id,
        im.txn_type,
        im.occurred_at::date::text AS date,
        COALESCE(im.ref_no, (UPPER(im.txn_type) || '-' || LPAD(im.id::text, 6, '0'))) AS ref,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        i.id AS item_id,
        i.code AS item_code,
        i.name AS item_name,
        COALESCE(i.name_ar, '') AS item_name_ar,
        im.qty_delta,
        COALESCE(im.unit_cost, 0) AS unit_cost,
        COALESCE(im.unit_price, 0) AS unit_price,
        COALESCE(im.notes, '') AS notes
      FROM inventory_movements im
      JOIN warehouses w
        ON w.id = im.warehouse_id
        AND w.company_id = im.company_id
        AND w.deleted_at IS NULL
      JOIN items i
        ON i.id = im.item_id
        AND i.company_id = im.company_id
        AND i.deleted_at IS NULL
      WHERE im.company_id = $1
        AND im.deleted_at IS NULL
        AND im.txn_type = ANY($2)
      ORDER BY im.occurred_at DESC, im.id DESC
      LIMIT $3;
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('List movements error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch inventory movements' } });
  }
}

async function createSingleMovement(
  req: Request,
  res: Response,
  opts: { txnType: string; qtyDelta: number; refNo?: string | null }
) {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  const userId = (req as any).user?.id as number | undefined;

  const warehouseId = toNumber(req.body?.warehouse_id);
  const itemId = toNumber(req.body?.item_id);
  const unitCost = req.body?.unit_cost !== undefined && req.body?.unit_cost !== null ? toNumber(req.body.unit_cost) : null;
  const unitPrice = req.body?.unit_price !== undefined && req.body?.unit_price !== null ? toNumber(req.body.unit_price) : null;
  const sellingPrice = req.body?.selling_price !== undefined && req.body?.selling_price !== null ? toNumber(req.body.selling_price) : null;
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
  const occurredAt = req.body?.occurred_at ? new Date(String(req.body.occurred_at)) : null;
  const refNo = typeof req.body?.ref_no === 'string' ? req.body.ref_no.trim() : (opts.refNo ?? null);

  if (!Number.isFinite(warehouseId) || !Number.isFinite(itemId) || !Number.isFinite(opts.qtyDelta) || opts.qtyDelta === 0) {
    return invalidInput(res, 'warehouse_id, item_id, and non-zero quantity are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { warehouse, item } = await requireWarehouseAndItemCompanyScoped(client, companyId, warehouseId, itemId);
    if (!item.track_inventory) {
      return invalidInput(res, 'Item does not track inventory', 'ITEM_NOT_TRACKING');
    }

    await applyDeltaToOnHand(client, companyId, itemId, warehouseId, opts.qtyDelta, !!item.allow_negative_stock, {
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      sellingPrice: Number.isFinite(sellingPrice as any) ? sellingPrice : null,
    });

    const movementId = await insertMovement(client, {
      companyId,
      warehouseId,
      itemId,
      costCenterId: warehouse.cost_center_id,
      txnType: opts.txnType,
      qtyDelta: opts.qtyDelta,
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      unitPrice: Number.isFinite(unitPrice as any) ? unitPrice : null,
      refType: null,
      refId: null,
      refNo,
      notes,
      occurredAt,
      userId: userId ?? null,
    });

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { id: movementId } });
  } catch (err: any) {
    await client.query('ROLLBACK');

    const msg = String(err?.message || err);
    if (msg === 'WAREHOUSE_NOT_FOUND') return invalidInput(res, 'Warehouse not found', 'WAREHOUSE_NOT_FOUND');
    if (msg === 'ITEM_NOT_FOUND') return invalidInput(res, 'Item not found', 'ITEM_NOT_FOUND');
    if (msg === 'NEGATIVE_STOCK_NOT_ALLOWED') return invalidInput(res, 'Negative stock not allowed for this item', 'NEGATIVE_STOCK_NOT_ALLOWED');

    console.error('Create movement error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create inventory movement' } });
  } finally {
    client.release();
  }
}

// Receipts
router.get('/receipts', requirePermission('inventory:receipts:view'), async (req, res) => {
  return listMovements(req, res, ['receipt']);
});

router.post('/receipts', requirePermission('inventory:receipts:create'), async (req, res) => {
  const qty = toNumber(req.body?.quantity ?? req.body?.qty ?? req.body?.quantity_delta);
  if (!Number.isFinite(qty) || qty <= 0) return invalidInput(res, 'Positive quantity is required');
  return createSingleMovement(req, res, { txnType: 'receipt', qtyDelta: qty, refNo: makeRefNo('RCV') });
});

// Issues
router.get('/issues', requirePermission('inventory:issues:view'), async (req, res) => {
  return listMovements(req, res, ['issue']);
});

router.post('/issues', requirePermission('inventory:issues:create'), async (req, res) => {
  const qty = toNumber(req.body?.quantity ?? req.body?.qty ?? req.body?.quantity_delta);
  if (!Number.isFinite(qty) || qty <= 0) return invalidInput(res, 'Positive quantity is required');
  return createSingleMovement(req, res, { txnType: 'issue', qtyDelta: -qty, refNo: makeRefNo('ISS') });
});

// Returns (supports direction: 'in' | 'out')
router.get('/returns', requirePermission('inventory:returns:view'), async (req, res) => {
  return listMovements(req, res, ['return_in', 'return_out']);
});

router.post('/returns', requirePermission('inventory:returns:create'), async (req, res) => {
  const qty = toNumber(req.body?.quantity ?? req.body?.qty ?? req.body?.quantity_delta);
  if (!Number.isFinite(qty) || qty <= 0) return invalidInput(res, 'Positive quantity is required');
  const direction = String(req.body?.direction ?? 'in').toLowerCase();
  const isOut = direction === 'out';
  return createSingleMovement(req, res, {
    txnType: isOut ? 'return_out' : 'return_in',
    qtyDelta: isOut ? -qty : qty,
    refNo: makeRefNo('RTN'),
  });
});

// Transfers
router.get('/transfers', requirePermission('inventory:transfers:view'), async (req, res) => {
  return listMovements(req, res, ['transfer_in', 'transfer_out']);
});

router.post('/transfers', requirePermission('inventory:transfers:create'), async (req, res) => {
  const companyId = getCompanyId(req);
  if (!companyId) return companyRequired(res);

  const userId = (req as any).user?.id as number | undefined;

  const fromWarehouseId = toNumber(req.body?.from_warehouse_id);
  const toWarehouseId = toNumber(req.body?.to_warehouse_id);
  const itemId = toNumber(req.body?.item_id);
  const qty = toNumber(req.body?.quantity ?? req.body?.qty);
  const unitCost = req.body?.unit_cost !== undefined && req.body?.unit_cost !== null ? toNumber(req.body.unit_cost) : null;
  const sellingPrice = req.body?.selling_price !== undefined && req.body?.selling_price !== null ? toNumber(req.body.selling_price) : null;
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
  const occurredAt = req.body?.occurred_at ? new Date(String(req.body.occurred_at)) : null;
  const refNo = typeof req.body?.ref_no === 'string' ? req.body.ref_no.trim() : makeRefNo('TRF');

  if (!Number.isFinite(fromWarehouseId) || !Number.isFinite(toWarehouseId) || fromWarehouseId === toWarehouseId) {
    return invalidInput(res, 'from_warehouse_id and to_warehouse_id are required and must be different');
  }
  if (!Number.isFinite(itemId) || !Number.isFinite(qty) || qty <= 0) {
    return invalidInput(res, 'item_id and positive quantity are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { warehouse: fromWh, item } = await requireWarehouseAndItemCompanyScoped(client, companyId, fromWarehouseId, itemId);
    const { warehouse: toWh } = await requireWarehouseAndItemCompanyScoped(client, companyId, toWarehouseId, itemId);

    if (!item.track_inventory) {
      return invalidInput(res, 'Item does not track inventory', 'ITEM_NOT_TRACKING');
    }

    // Outbound (lock and validate negative stock first)
    await applyDeltaToOnHand(client, companyId, itemId, fromWarehouseId, -qty, !!item.allow_negative_stock);

    // Inbound
    await applyDeltaToOnHand(client, companyId, itemId, toWarehouseId, qty, !!item.allow_negative_stock, {
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      sellingPrice: Number.isFinite(sellingPrice as any) ? sellingPrice : null,
    });

    const outId = await insertMovement(client, {
      companyId,
      warehouseId: fromWarehouseId,
      itemId,
      costCenterId: fromWh.cost_center_id,
      txnType: 'transfer_out',
      qtyDelta: -qty,
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      unitPrice: null,
      refType: null,
      refId: null,
      refNo,
      notes,
      occurredAt,
      userId: userId ?? null,
    });

    const inId = await insertMovement(client, {
      companyId,
      warehouseId: toWarehouseId,
      itemId,
      costCenterId: toWh.cost_center_id,
      txnType: 'transfer_in',
      qtyDelta: qty,
      unitCost: Number.isFinite(unitCost as any) ? unitCost : null,
      unitPrice: null,
      refType: null,
      refId: null,
      refNo,
      notes,
      occurredAt,
      userId: userId ?? null,
    });

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: { out_id: outId, in_id: inId, ref_no: refNo } });
  } catch (err: any) {
    await client.query('ROLLBACK');

    const msg = String(err?.message || err);
    if (msg === 'WAREHOUSE_NOT_FOUND') return invalidInput(res, 'Warehouse not found', 'WAREHOUSE_NOT_FOUND');
    if (msg === 'ITEM_NOT_FOUND') return invalidInput(res, 'Item not found', 'ITEM_NOT_FOUND');
    if (msg === 'NEGATIVE_STOCK_NOT_ALLOWED') return invalidInput(res, 'Negative stock not allowed for this item', 'NEGATIVE_STOCK_NOT_ALLOWED');

    console.error('Create transfer error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create stock transfer' } });
  } finally {
    client.release();
  }
});

export default router;
