/**
 * Shipping Bill Sync Service
 * 
 * This service handles synchronization of Shipping Bill data to related shipments:
 * - When a shipping bill is created/updated, sync bl_no/awb_no and eta_date to the shipment
 * - When a shipping bill is deleted, clear the synced fields from the shipment (if no other bills)
 * 
 * Fields synced:
 * - bill_number → logistics_shipments.bl_no (for sea) or awb_no (for air)
 * - eta_date → logistics_shipments.expected_arrival_date
 */

import pool from '../db';
import logger from '../utils/logger';

export interface ShippingBillSyncResult {
  shipmentUpdated: boolean;
  fieldsUpdated: string[];
  errors: string[];
}

/**
 * Sync a Shipping Bill's data to its linked shipment
 * This should be called after a shipping bill is created or updated
 */
export async function syncShippingBillToShipment(
  billId: number,
  companyId: number,
  userId?: number
): Promise<ShippingBillSyncResult> {
  const result: ShippingBillSyncResult = {
    shipmentUpdated: false,
    fieldsUpdated: [],
    errors: [],
  };

  const client = await pool.connect();
  try {
    // Get the shipping bill with type info
    const billResult = await client.query(
      `
      SELECT 
        sb.*,
        bt.code as bill_type_code,
        bt.name_en as bill_type_name
      FROM shipping_bills sb
      LEFT JOIN shipping_bill_types bt ON bt.id = sb.bill_type_id
      WHERE sb.id = $1 AND sb.company_id = $2 AND sb.deleted_at IS NULL
    `,
      [billId, companyId]
    );

    if (billResult.rows.length === 0) {
      result.errors.push(`Shipping bill ${billId} not found`);
      return result;
    }

    const bill = billResult.rows[0];

    if (!bill.shipment_id) {
      logger.info(`Shipping bill ${billId} has no linked shipment, nothing to sync`);
      return result;
    }

    // Determine which field to update based on bill type
    // Sea/Ocean → bl_no, Air → awb_no
    const isAirBill = bill.bill_type_code?.toLowerCase().includes('air') || 
                      bill.bill_type_code?.toLowerCase() === 'awb' ||
                      bill.bill_type_name?.toLowerCase().includes('air');

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (isAirBill) {
      updateFields.push(`awb_no = $${paramIndex++}`);
      updateValues.push(bill.bill_number);
      result.fieldsUpdated.push('awb_no');
    } else {
      updateFields.push(`bl_no = $${paramIndex++}`);
      updateValues.push(bill.bill_number);
      result.fieldsUpdated.push('bl_no');
    }

    // Sync ETA date if available
    if (bill.eta_date) {
      updateFields.push(`expected_arrival_date = $${paramIndex++}`);
      updateValues.push(bill.eta_date);
      result.fieldsUpdated.push('expected_arrival_date');
    }

    // Also sync ports if available in the bill
    if (bill.port_of_loading_id) {
      updateFields.push(`port_of_loading_id = $${paramIndex++}`);
      updateValues.push(bill.port_of_loading_id);
      result.fieldsUpdated.push('port_of_loading_id');
    }
    
    if (bill.port_of_loading_text) {
      updateFields.push(`port_of_loading_text = $${paramIndex++}`);
      updateValues.push(bill.port_of_loading_text);
      result.fieldsUpdated.push('port_of_loading_text');
    }

    if (bill.port_of_discharge_id) {
      updateFields.push(`port_of_discharge_id = $${paramIndex++}`);
      updateValues.push(bill.port_of_discharge_id);
      result.fieldsUpdated.push('port_of_discharge_id');
    }

    // Add updated_by and updated_at
    if (userId) {
      updateFields.push(`updated_by = $${paramIndex++}`);
      updateValues.push(userId);
    }
    updateFields.push(`updated_at = NOW()`);

    // Add shipment_id and company_id for WHERE clause
    updateValues.push(bill.shipment_id);
    updateValues.push(companyId);

    const updateQuery = `
      UPDATE logistics_shipments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND company_id = $${paramIndex++} AND deleted_at IS NULL
    `;

    const updateResult = await client.query(updateQuery, updateValues);

    if (updateResult.rowCount && updateResult.rowCount > 0) {
      result.shipmentUpdated = true;
      logger.info(
        `Synced shipping bill ${bill.bill_number} to shipment ${bill.shipment_id}: ${result.fieldsUpdated.join(', ')}`
      );
    }

    return result;
  } catch (error: any) {
    logger.error(`Shipping bill sync failed for bill ${billId}:`, error);
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Clear synced fields from a shipment when a shipping bill is deleted
 * Only clears if there are no other active shipping bills for this shipment
 */
export async function clearShipmentBillData(
  shipmentId: number,
  companyId: number,
  deletedBillType: 'sea' | 'air',
  userId?: number
): Promise<ShippingBillSyncResult> {
  const result: ShippingBillSyncResult = {
    shipmentUpdated: false,
    fieldsUpdated: [],
    errors: [],
  };

  const client = await pool.connect();
  try {
    // Check if there are other active shipping bills for this shipment
    const otherBillsResult = await client.query(
      `
      SELECT COUNT(*) as count
      FROM shipping_bills
      WHERE shipment_id = $1 AND company_id = $2 AND deleted_at IS NULL
    `,
      [shipmentId, companyId]
    );

    const otherBillsCount = parseInt(otherBillsResult.rows[0]?.count || '0', 10);

    if (otherBillsCount > 0) {
      // There are other bills, trigger a re-sync from the remaining bill
      const remainingBillResult = await client.query(
        `
        SELECT id FROM shipping_bills
        WHERE shipment_id = $1 AND company_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [shipmentId, companyId]
      );

      if (remainingBillResult.rows.length > 0) {
        return syncShippingBillToShipment(remainingBillResult.rows[0].id, companyId, userId);
      }
    }

    // No other bills, clear the fields
    const fieldToClear = deletedBillType === 'air' ? 'awb_no' : 'bl_no';
    
    const updateResult = await client.query(
      `
      UPDATE logistics_shipments
      SET 
        ${fieldToClear} = NULL,
        expected_arrival_date = NULL,
        updated_by = $1,
        updated_at = NOW()
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
    `,
      [userId, shipmentId, companyId]
    );

    if (updateResult.rowCount && updateResult.rowCount > 0) {
      result.shipmentUpdated = true;
      result.fieldsUpdated.push(fieldToClear, 'expected_arrival_date');
      logger.info(`Cleared ${fieldToClear} and expected_arrival_date from shipment ${shipmentId}`);
    }

    return result;
  } catch (error: any) {
    logger.error(`Failed to clear shipment bill data for shipment ${shipmentId}:`, error);
    result.errors.push(`Clear failed: ${error.message}`);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Sync all shipping bills to their shipments (for bulk re-sync)
 */
export async function syncAllBillsToShipments(companyId: number, userId?: number): Promise<{
  totalBills: number;
  shipmentsUpdated: number;
  errors: string[];
}> {
  const result = {
    totalBills: 0,
    shipmentsUpdated: 0,
    errors: [] as string[],
  };

  try {
    const billsResult = await pool.query(
      `
      SELECT id FROM shipping_bills
      WHERE company_id = $1 AND shipment_id IS NOT NULL AND deleted_at IS NULL
    `,
      [companyId]
    );

    result.totalBills = billsResult.rows.length;

    for (const bill of billsResult.rows) {
      const syncResult = await syncShippingBillToShipment(bill.id, companyId, userId);
      if (syncResult.shipmentUpdated) {
        result.shipmentsUpdated++;
      }
      if (syncResult.errors.length > 0) {
        result.errors.push(...syncResult.errors);
      }
    }

    logger.info(
      `Bulk sync complete: ${result.shipmentsUpdated}/${result.totalBills} bills synced, ${result.errors.length} errors`
    );

    return result;
  } catch (error: any) {
    logger.error('Bulk shipping bill sync failed:', error);
    result.errors.push(`Bulk sync failed: ${error.message}`);
    return result;
  }
}

export default {
  syncShippingBillToShipment,
  clearShipmentBillData,
  syncAllBillsToShipments,
};
