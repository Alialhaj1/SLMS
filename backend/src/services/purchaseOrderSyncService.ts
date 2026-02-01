/**
 * Purchase Order Sync Service
 * 
 * This service handles synchronization of Purchase Order data to related entities:
 * - Logistics Shipments
 * - Goods Receipts
 * - Purchase Invoices
 * 
 * When a PO is updated, all linked shipments should be updated automatically
 * with the new values for: vendor, project, currency, amounts, ports, etc.
 */

import pool from '../db';
import logger from '../utils/logger';

export interface POSyncResult {
  shipmentsUpdated: number;
  itemsUpdated: number;
  errors: string[];
}

/**
 * Sync a Purchase Order's data to all related shipments
 * This should be called after a PO is updated
 */
export async function syncPurchaseOrderToShipments(
  poId: number,
  companyId: number,
  userId?: number
): Promise<POSyncResult> {
  const result: POSyncResult = {
    shipmentsUpdated: 0,
    itemsUpdated: 0,
    errors: [],
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the updated PO data with all related info
    const poResult = await client.query(
      `
      SELECT 
        po.*,
        v.id AS vendor_id,
        v.name AS vendor_name,
        v.code AS vendor_code,
        v.name_ar AS vendor_name_ar,
        c.id AS currency_id,
        c.code AS currency_code,
        c.symbol AS currency_symbol,
        dt.id AS delivery_terms_id,
        dt.incoterm_code AS incoterm,
        dt.name AS delivery_terms_name,
        pm.code AS payment_method_code,
        pm.name AS payment_method_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN currencies c ON po.currency_id = c.id
      LEFT JOIN delivery_terms dt ON po.delivery_terms_id = dt.id
      LEFT JOIN payment_methods pm ON po.payment_method_id = pm.id
      WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
    `,
      [poId, companyId]
    );

    if (poResult.rows.length === 0) {
      result.errors.push(`Purchase Order ${poId} not found`);
      await client.query('ROLLBACK');
      return result;
    }

    const po = poResult.rows[0];

    // 2. Find all shipments linked to this PO
    const shipmentsResult = await client.query(
      `
      SELECT id, shipment_number
      FROM logistics_shipments
      WHERE purchase_order_id = $1 AND company_id = $2 AND deleted_at IS NULL
    `,
      [poId, companyId]
    );

    if (shipmentsResult.rows.length === 0) {
      logger.info(`No shipments linked to PO ${poId}, nothing to sync`);
      await client.query('COMMIT');
      return result;
    }

    logger.info(`Syncing PO ${poId} to ${shipmentsResult.rows.length} shipments`);

    // 3. Update each shipment with the new PO data
    for (const shipment of shipmentsResult.rows) {
      try {
        // Update shipment header with PO data
        // Fields synced: vendor, project, ports, payment info, incoterm, total_amount
        // Note: Always update with PO values when they are set, otherwise keep current values
        // Note: lc_number is not in purchase_orders, so we don't sync it
        await client.query(
          `
          UPDATE logistics_shipments
          SET
            vendor_id = COALESCE($1, vendor_id),
            project_id = COALESCE($2, project_id),
            origin_location_id = COALESCE($3, origin_location_id),
            destination_location_id = COALESCE($4, destination_location_id),
            port_of_loading_id = COALESCE($5, port_of_loading_id),
            port_of_loading_text = COALESCE($6, port_of_loading_text),
            port_of_discharge_id = COALESCE($7, port_of_discharge_id),
            payment_method = COALESCE($8, payment_method),
            total_amount = COALESCE($9, total_amount),
            incoterm = COALESCE($10, incoterm),
            updated_by = $11,
            updated_at = NOW()
          WHERE id = $12 AND company_id = $13
        `,
          [
            po.vendor_id,
            po.project_id,
            po.origin_city_id,
            po.destination_city_id,
            po.port_of_loading_id,
            po.port_of_loading_text,
            po.port_of_discharge_id,
            po.payment_method_code || po.payment_method_name,
            po.total_amount,
            po.incoterm, // This comes from delivery_terms.incoterm_code
            userId,
            shipment.id,
            companyId,
          ]
        );

        result.shipmentsUpdated++;
        logger.info(`Synced PO ${poId} to shipment ${shipment.shipment_number}`);
      } catch (shipmentError: any) {
        const errorMsg = `Failed to sync shipment ${shipment.id}: ${shipmentError.message}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    // 4. Sync PO items to shipment items (update unit prices, quantities, and UOM)
    // Get current PO items
    const poItemsResult = await client.query(
      `
      SELECT item_id, unit_price, ordered_qty, uom_id, item_name, item_name_ar
      FROM purchase_order_items
      WHERE order_id = $1
    `,
      [poId]
    );

    // For each shipment, update the items' unit_cost, quantity, and uom_id from PO
    for (const shipment of shipmentsResult.rows) {
      try {
        for (const poItem of poItemsResult.rows) {
          // Update shipment item with new PO price, quantity, and UOM
          const updateItemResult = await client.query(
            `
            UPDATE logistics_shipment_items
            SET
              unit_cost = $1,
              quantity = $2,
              uom_id = COALESCE($3, uom_id),
              updated_by = $4,
              updated_at = NOW()
            WHERE shipment_id = $5 AND item_id = $6 AND company_id = $7 AND deleted_at IS NULL
          `,
            [
              poItem.unit_price,
              poItem.ordered_qty,
              poItem.uom_id,
              userId,
              shipment.id,
              poItem.item_id,
              companyId,
            ]
          );

          if (updateItemResult.rowCount && updateItemResult.rowCount > 0) {
            result.itemsUpdated++;
          }
        }

        // Auto-delete items that are in shipment but removed from PO
        const orphanCheck = await client.query(
          `
          SELECT si.id, i.code as item_code, i.name as item_name
          FROM logistics_shipment_items si
          JOIN items i ON i.id = si.item_id
          WHERE si.shipment_id = $1 
            AND si.company_id = $2 
            AND si.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM purchase_order_items poi 
              WHERE poi.order_id = $3 AND poi.item_id = si.item_id
            )
        `,
          [shipment.id, companyId, poId]
        );

        if (orphanCheck.rows.length > 0) {
          const orphanCodes = orphanCheck.rows.map(r => r.item_code).join(', ');
          const orphanNames = orphanCheck.rows.map(r => r.item_name).join(', ');
          
          // Soft-delete orphan items from shipment
          const orphanIds = orphanCheck.rows.map(r => r.id);
          await client.query(
            `
            UPDATE logistics_shipment_items
            SET 
              deleted_at = NOW(),
              deleted_by = $1,
              updated_at = NOW(),
              updated_by = $1
            WHERE id = ANY($2) AND company_id = $3
          `,
            [userId, orphanIds, companyId]
          );

          logger.info(
            `Auto-deleted ${orphanCheck.rows.length} items from shipment ${shipment.shipment_number} (removed from PO): ${orphanNames}`
          );
          result.itemsUpdated += orphanCheck.rows.length;
        }

        // 5. Sync project_id to shipment expenses
        // When PO project changes, update all expenses for this shipment
        if (po.project_id) {
          const expenseUpdateResult = await client.query(
            `
            UPDATE shipment_expenses
            SET
              project_id = $1,
              updated_by = $2,
              updated_at = NOW()
            WHERE shipment_id = $3 AND company_id = $4 AND deleted_at IS NULL
          `,
            [po.project_id, userId, shipment.id, companyId]
          );
          
          if (expenseUpdateResult.rowCount && expenseUpdateResult.rowCount > 0) {
            logger.info(`Updated ${expenseUpdateResult.rowCount} expenses for shipment ${shipment.shipment_number} with project_id ${po.project_id}`);
          }
        }
      } catch (itemError: any) {
        const errorMsg = `Failed to sync items for shipment ${shipment.id}: ${itemError.message}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    await client.query('COMMIT');

    logger.info(
      `PO Sync complete: ${result.shipmentsUpdated} shipments, ${result.itemsUpdated} items updated, ${result.errors.length} errors`
    );

    return result;
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error(`PO Sync failed for PO ${poId}:`, error);
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Get sync status for a PO - shows what would be updated
 */
export async function getPOSyncPreview(poId: number, companyId: number) {
  const shipmentsResult = await pool.query(
    `
    SELECT 
      ls.id,
      ls.shipment_number,
      ls.vendor_id AS current_vendor_id,
      po.vendor_id AS po_vendor_id,
      v.name AS current_vendor_name,
      pv.name AS po_vendor_name,
      ls.currency_id AS current_currency_id,
      po.currency_id AS po_currency_id,
      ls.total_amount AS current_total,
      po.total_amount AS po_total,
      ls.incoterm AS current_incoterm,
      dt.incoterm_code AS po_incoterm
    FROM logistics_shipments ls
    JOIN purchase_orders po ON po.id = ls.purchase_order_id
    LEFT JOIN vendors v ON v.id = ls.vendor_id
    LEFT JOIN vendors pv ON pv.id = po.vendor_id
    LEFT JOIN delivery_terms dt ON dt.id = po.delivery_terms_id
    WHERE ls.purchase_order_id = $1 AND ls.company_id = $2 AND ls.deleted_at IS NULL
  `,
    [poId, companyId]
  );

  return shipmentsResult.rows.map((s) => ({
    shipmentId: s.id,
    shipmentNumber: s.shipment_number,
    changes: {
      vendor: s.current_vendor_id !== s.po_vendor_id,
      currency: s.current_currency_id !== s.po_currency_id,
      totalAmount: s.current_total !== s.po_total,
      incoterm: s.current_incoterm !== s.po_incoterm,
    },
  }));
}

export default {
  syncPurchaseOrderToShipments,
  getPOSyncPreview,
};
