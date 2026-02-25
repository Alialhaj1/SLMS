/**
 * 🏭 WAREHOUSE TYPES PAGE (Enterprise Edition)
 * ================================================
 *
 * Master data page for managing warehouse type classifications.
 * Defines types like Main, Branch, Cold Storage, Transit, External,
 * Hazmat, Bonded with temperature control, license, and access flags.
 *
 * Uses EnterpriseMasterPage with warehouseTypeConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { warehouseTypeConfig, type WarehouseType } from '@/config/pages/master/warehouseTypes.config';

function WarehouseTypesPage() {
  return (
    <EnterpriseMasterPage<WarehouseType>
      config={warehouseTypeConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
            { label: 'Icon', value: record.icon || '—' },
          ],
        },
        {
          title: 'Warehouse Properties / خصائص المستودع',
          fields: [
            { label: 'Temp Control', value: record.requires_temperature_control ? '❄️ Yes' : 'No' },
            { label: 'Min Temp (°C)', value: record.min_temp_celsius != null ? `${record.min_temp_celsius}°C` : '—' },
            { label: 'Max Temp (°C)', value: record.max_temp_celsius != null ? `${record.max_temp_celsius}°C` : '—' },
            { label: 'External', value: record.is_external ? '🌐 Yes' : 'No' },
            { label: 'Public Access', value: record.allows_public_access ? '✅ Yes' : 'No' },
            { label: 'Special License', value: record.requires_special_license ? '📜 Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.WarehouseTypes.View, WarehouseTypesPage);