/**
 * Landed Cost Allocation Page (Enterprise Edition)
 * Manages cost allocation across shipment items.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { landedCostAllocationConfig, type ShipmentCostAllocation } from '@/config/pages/shipments/landedCostAllocation.config';

function LandedCostAllocationPage() {
  return (
    <EnterpriseMasterPage<ShipmentCostAllocation>
      config={landedCostAllocationConfig}
      buildDetailSections={(record) => [
        {
          title: 'Allocation Details',
          fields: [
            { label: 'Shipment', value: record.shipment_number || (record.shipment_id ? '#' + record.shipment_id : '\u2014') },
            { label: 'Item', value: record.item_code ? record.item_code + ' - ' + (record.item_name || '') : '\u2014' },
            { label: 'Method', value: record.allocation_method || '\u2014' },
            { label: 'Allocation %', value: record.allocation_percentage != null ? record.allocation_percentage + '%' : '\u2014' },
          ],
        },
        {
          title: 'Financial',
          fields: [
            { label: 'Allocated Amount', value: record.allocated_amount != null ? Number(record.allocated_amount).toLocaleString() : '\u2014' },
            { label: 'Base Currency Amount', value: record.allocated_amount_base != null ? Number(record.allocated_amount_base).toLocaleString() : '\u2014' },
            { label: 'Currency', value: record.currency_code || '\u2014' },
            { label: 'Posted', value: record.is_posted ? 'Yes' : 'No' },
            { label: 'Posted At', value: record.posted_at, type: 'date' as const },
            { label: 'Journal Entry', value: record.journal_entry_id ? '#' + record.journal_entry_id : '\u2014' },
          ],
        },
        {
          title: 'Notes & Audit',
          fields: [
            { label: 'Notes', value: record.notes || '\u2014' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.Logistics.LandedCostAllocation.View, LandedCostAllocationPage);
