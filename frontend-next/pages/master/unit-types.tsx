/**
 * 📐 UNIT TYPES PAGE (Enterprise Edition)
 * ==========================================
 *
 * Master data page for managing measurement type categories.
 * Defines types like Weight, Volume, Count, Length, Area, Time, Energy
 * with base unit codes, decimal/countable flags.
 *
 * Uses EnterpriseMasterPage with unitTypeConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { unitTypeConfig, type UnitType } from '@/config/pages/master/unitTypes.config';

function UnitTypesPage() {
  return (
    <EnterpriseMasterPage<UnitType>
      config={unitTypeConfig}
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
          title: 'Measurement Properties / خصائص القياس',
          fields: [
            { label: 'Base Unit Code', value: record.base_unit_code || '—' },
            { label: 'Allows Decimals', value: record.allows_decimals ? '✅ Yes' : 'No' },
            { label: 'Is Countable', value: record.is_countable ? '✅ Yes' : 'No' },
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

export default withPermission(MenuPermissions.MasterData.UnitTypes.View, UnitTypesPage);
