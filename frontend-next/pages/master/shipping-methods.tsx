/**
 * Shipping Methods Page (Enterprise Edition)
 * ================================================
 * Phase E - Screen 11: Shipping methods with pricing basis,
 * weight/volume limits, transit times, and capability flags.
 *
 * FK: shipment_type_id -> shipment_types (required).
 * Uses EnterpriseMasterPage + shippingMethodConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { shippingMethodConfig, type ShippingMethod } from '@/config/pages/master/shippingMethods.config';

const PRICING_LABELS: Record<string, string> = {
  per_container: 'Per Container',
  per_cbm: 'Per CBM',
  per_kg: 'Per KG',
  per_shipment: 'Per Shipment',
  per_truck: 'Per Truck',
};

function ShippingMethodsPage() {
  return (
    <EnterpriseMasterPage<ShippingMethod>
      config={shippingMethodConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Code', value: record.code || '\u2014' },
            { label: 'Name (English)', value: record.name_en || '\u2014' },
            { label: 'Name (Arabic)', value: record.name_ar || '\u2014' },
            { label: 'Description (AR)', value: record.description_ar || '\u2014' },
            { label: 'Shipment Type', value: record.shipment_type_name_en || '\u2014' },
            { label: 'Pricing Basis', value: PRICING_LABELS[record.pricing_basis] || record.pricing_basis || '\u2014' },
          ],
        },
        {
          title: 'Weight & Volume',
          fields: [
            { label: 'Min Weight (KG)', value: record.min_weight_kg ? `${record.min_weight_kg} kg` : '\u2014' },
            { label: 'Max Weight (KG)', value: record.max_weight_kg ? `${record.max_weight_kg} kg` : '\u2014' },
            { label: 'Min Volume (CBM)', value: record.min_cbm ? `${record.min_cbm} m\u00B3` : '\u2014' },
            { label: 'Avg Transit (Sea)', value: record.avg_transit_days_sea ? `${record.avg_transit_days_sea} days` : '\u2014' },
            { label: 'Avg Transit (Air)', value: record.avg_transit_days_air ? `${record.avg_transit_days_air} days` : '\u2014' },
          ],
        },
        {
          title: 'Capabilities',
          fields: [
            { label: 'Requires Container', value: record.requires_container ? 'Yes' : 'No' },
            { label: 'Supports DG', value: record.supports_dangerous_goods ? 'Yes' : 'No' },
            { label: 'Express Service', value: record.is_express ? 'Yes - Express' : 'No - Standard' },
          ],
        },
        {
          title: 'Audit Trail',
          fields: [
            { label: 'System', value: record.is_system ? 'System' : 'Custom' },
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '\u2014' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.ShippingMethods.View, ShippingMethodsPage);
