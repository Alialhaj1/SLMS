/**
 * Group Categories Page (Enterprise Edition)
 * Master data page for managing item group categories.
 * Uses EnterpriseMasterPage with groupCategoryConfig.
 */

import React from 'react';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { groupCategoryConfig, type GroupCategory } from '@/config/pages/master/groupCategories.config';

export default function GroupCategoriesPage() {
  return (
    <EnterpriseMasterPage<GroupCategory>
      config={groupCategoryConfig}
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
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
            { label: 'Status', value: record.is_active ? 'active' : 'inactive', type: 'badge' as const },
          ],
        },
      ]}
    />
  );
}
