/**
 * Vehicle Types Page (Enterprise Edition)
 * Uses EnterpriseMasterPage with vehicleTypesConfig.
 */
import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { vehicleTypeConfig, type VehicleType } from '@/config/pages/master/vehicleTypes.config';

function VehicleTypesPage() {
  return (
    <EnterpriseMasterPage<VehicleType>
      config={vehicleTypeConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (EN)', value: record.name_en || '—' },
            { label: 'Name (AR)', value: record.name_ar || '—' },
            { label: 'Category', value: record.category || '—' },
            { label: 'Icon', value: record.icon || '—' },
          ],
        },
        {
          title: 'Specifications',
          fields: [
            { label: 'Max Weight', value: record.max_weight_tons ? record.max_weight_tons + ' tons' : '—' },
            { label: 'Max Volume', value: record.max_volume_cbm ? record.max_volume_cbm + ' m³' : '—' },
            { label: 'Dimensions', value: (record.length_m && record.width_m && record.height_m) ? record.length_m + ' × ' + record.width_m + ' × ' + record.height_m + ' m' : '—' },
            { label: 'Fuel Type', value: record.fuel_type || '—' },
            { label: 'Axle Count', value: record.axle_count?.toString() || '—' },
          ],
        },
        {
          title: 'Refrigeration',
          fields: [
            { label: 'Refrigerated', value: record.is_refrigerated ? '❄️ Yes' : 'No' },
            { label: 'Temp Range', value: (record.temperature_range_min != null && record.temperature_range_max != null) ? record.temperature_range_min + '°C to ' + record.temperature_range_max + '°C' : '—' },
          ],
        },
        {
          title: 'License',
          fields: [
            { label: 'Special License Required', value: record.requires_special_license ? 'Yes' : 'No' },
            { label: 'License Type', value: record.license_type || '—' },
          ],
        },
        {
          title: 'Settings',
          fields: [
            { label: 'Status', value: record.is_active ? 'Active' : 'Inactive', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.VehicleTypes.View, VehicleTypesPage);
