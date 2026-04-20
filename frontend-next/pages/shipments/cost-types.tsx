/**
 * Shipment Cost Types Page (Enterprise Edition)
 * Manages shipment expense/cost type definitions.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { shipmentExpenseTypesConfig, type ShipmentExpenseType } from '@/config/pages/shipments/costTypes.config';

function ShipmentCostTypesPage() {
  return (
    <EnterpriseMasterPage<ShipmentExpenseType>
      config={shipmentExpenseTypesConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Code', value: record.code || '\u2014' },
            { label: 'Name (EN)', value: record.name || '\u2014' },
            { label: 'Name (AR)', value: record.name_ar || '\u2014' },
            { label: 'Category', value: record.category || '\u2014' },
          ],
        },
        {
          title: 'Accounting',
          fields: [
            { label: 'VAT Rate', value: record.default_vat_rate != null ? record.default_vat_rate + '%' : '\u2014' },
            { label: 'VAT Exempt', value: record.is_vat_exempt ? 'Yes' : 'No' },
            { label: 'Linked Account', value: record.linked_account_code ? record.linked_account_code + ' - ' + (record.linked_account_name || '') : '\u2014' },
          ],
        },
        {
          title: 'Required Associations',
          fields: [
            { label: 'Clearance Office', value: record.requires_clearance_office ? 'Required' : 'Not Required' },
            { label: 'Customs Declaration', value: record.requires_customs_declaration ? 'Required' : 'Not Required' },
            { label: 'Insurance Company', value: record.requires_insurance_company ? 'Required' : 'Not Required' },
            { label: 'Laboratory', value: record.requires_laboratory ? 'Required' : 'Not Required' },
            { label: 'Letter of Credit', value: record.requires_lc ? 'Required' : 'Not Required' },
            { label: 'Port', value: record.requires_port ? 'Required' : 'Not Required' },
            { label: 'Shipping Agent', value: record.requires_shipping_agent ? 'Required' : 'Not Required' },
          ],
        },
        {
          title: 'Status',
          fields: [
            { label: 'Active', value: record.is_active ? 'Yes' : 'No' },
            { label: 'Display Order', value: record.display_order?.toString() || '\u2014' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.Logistics.ShipmentCostTypes.View, ShipmentCostTypesPage);
