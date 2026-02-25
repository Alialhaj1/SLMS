/**
 * 🚢 SHIPMENT TYPES PAGE (Enterprise Edition)
 * ================================================
 *
 * Master data page for managing shipment type classifications
 * by transport mode: sea, air, land, rail, multimodal, courier.
 *
 * Uses EnterpriseMasterPage with shipmentTypeConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { shipmentTypeConfig, type ShipmentType } from '@/config/pages/master/shipmentTypes.config';

function ShipmentTypesPage() {
  return (
    <EnterpriseMasterPage<ShipmentType>
      config={shipmentTypeConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Icon', value: record.icon || '—' },
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Transport Properties / خصائص النقل',
          fields: [
            { label: 'Avg Transit Days', value: record.avg_transit_days != null ? `${record.avg_transit_days} days` : '—' },
            { label: 'Container', value: record.supports_container ? '📦 Yes' : 'No' },
            { label: 'Bulk', value: record.supports_bulk ? '🏗️ Yes' : 'No' },
            { label: 'International', value: record.is_international ? '🌍 Yes' : '🏠 Local' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'System', value: record.is_system ? '🔒 System' : 'Custom' },
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
          ],
        },
        {
          title: 'Audit Trail / سجل التدقيق',
          fields: [
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.ShipmentTypes.View, ShipmentTypesPage);
