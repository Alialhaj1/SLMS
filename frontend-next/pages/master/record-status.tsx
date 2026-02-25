/**
 * 🔖 RECORD STATUS PAGE (Enterprise Edition)
 * =============================================
 *
 * Master data page for managing general-purpose record statuses.
 * Used across all modules (vendors, customers, items, etc.)
 *
 * Uses EnterpriseMasterPage with recordStatusConfig for
 * SAP/Oracle-level governance, validation, and UX.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { recordStatusConfig, type RecordStatus } from '@/config/pages/master/recordStatuses.config';

function RecordStatusPage() {
  return (
    <EnterpriseMasterPage<RecordStatus>
      config={recordStatusConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
          ],
        },
        {
          title: 'Badge Appearance / مظهر الشارة',
          fields: [
            { label: 'Text Color', value: record.color || '—' },
            { label: 'Background Color', value: record.bg_color || '—' },
            { label: 'Icon', value: record.icon || '—' },
          ],
        },
        {
          title: 'Behavior & Flags / السلوك والإعدادات',
          fields: [
            { label: 'Active State', value: record.is_active_state ? '✅ Yes' : 'No' },
            { label: 'Default', value: record.is_default ? '✅ Yes' : 'No' },
            { label: 'System', value: record.is_system ? '🔒 Yes' : 'No' },
            { label: 'Applies To', value: record.applies_to || 'all' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
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

export default withPermission(MenuPermissions.MasterData.RecordStatuses.View, RecordStatusPage);
