/**
 * 🕐 TIMEZONES PAGE (Enterprise Edition)
 * ========================================
 *
 * Master data page for managing IANA timezones.
 * UTC offsets, DST flags, region grouping, abbreviations.
 *
 * Uses EnterpriseMasterPage with timezonesConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { timezonesConfig, type Timezone } from '@/config/pages/master/timezones.config';

function TimezonesPage() {
  return (
    <EnterpriseMasterPage<Timezone>
      config={timezonesConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'IANA Code', value: record.code || '—' },
            { label: 'Abbreviation', value: record.abbreviation || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Timezone Data / بيانات المنطقة الزمنية',
          fields: [
            { label: 'UTC Offset', value: record.utc_offset ? `UTC${record.utc_offset}` : '—' },
            { label: 'DST Observed', value: record.dst_observed ? '🕐 Yes' : 'No' },
            { label: 'Region', value: record.region || '—' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'Default', value: record.is_default ? '✅ Yes' : 'No' },
            { label: 'System', value: record.is_system ? '🔒 Yes' : 'No' },
            { label: 'Status', value: record.status || (record.is_active ? 'active' : 'inactive'), type: 'badge' as const },
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

export default withPermission(
  MenuPermissions?.MasterData?.Timezones?.View || 'master:timezones:view',
  TimezonesPage,
);
