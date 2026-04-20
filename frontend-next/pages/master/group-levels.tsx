/**
 * Group Levels Page (Enterprise Edition)
 * Master data page for managing hierarchical coding level definitions.
 * Uses EnterpriseMasterPage with groupLevelConfig.
 */

import React from 'react';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { groupLevelConfig, type GroupLevel } from '@/config/pages/master/groupLevels.config';

export default function GroupLevelsPage() {
  return (
    <EnterpriseMasterPage<GroupLevel>
      config={groupLevelConfig}
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
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'Status', value: record.is_active ? 'active' : 'inactive', type: 'badge' as const },
          ],
        },
      ]}
    />
  );
}
