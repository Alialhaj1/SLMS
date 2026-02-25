/**
 * Group Types Page (Enterprise Edition)
 * ======================================
 * Phase D - Group Types: Hierarchical group classification.
 * Main -> Sub -> Detail -> Partial
 *
 * Uses EnterpriseMasterPage + groupTypeConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { groupTypeConfig, type GroupType } from '@/config/pages/master/groupTypes.config';

const LEVEL_LABELS: Record<number, string> = {
  1: 'Main Type',
  2: 'Sub Type',
  3: 'Detail Type',
  4: 'Partial',
};

function GroupTypesPage() {
  return (
    <EnterpriseMasterPage<GroupType>
      config={groupTypeConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Icon', value: record.icon || '\u2014' },
            { label: 'Code', value: record.code || '\u2014' },
            { label: 'Name (English)', value: record.name_en || '\u2014' },
            { label: 'Name (Arabic)', value: record.name_ar || '\u2014' },
            { label: 'Description (EN)', value: record.description_en || '\u2014' },
            { label: 'Description (AR)', value: record.description_ar || '\u2014' },
          ],
        },
        {
          title: 'Hierarchy',
          fields: [
            { label: 'Level', value: LEVEL_LABELS[record.hierarchy_level] || `Level ${record.hierarchy_level}` },
            { label: 'Parent', value: record.parent_name_en || 'None (root)' },
            { label: 'Children Count', value: (record.children_count || 0).toString() },
            { label: 'Usage in Item Groups', value: (record.usage_count || 0).toString() },
          ],
        },
        {
          title: 'Transaction Permissions',
          fields: [
            { label: 'Behavior', value: record.behavior || '—' },
            { label: 'Allows Inventory', value: record.allows_inventory ? '✅ Yes' : '❌ No' },
            { label: 'Allows Sales', value: record.allows_sales ? '✅ Yes' : '❌ No' },
            { label: 'Allows Purchase', value: record.allows_purchase ? '✅ Yes' : '❌ No' },
            { label: 'Allows Manufacturing', value: record.allows_manufacturing ? '✅ Yes' : '❌ No' },
          ],
        },
        {
          title: 'Visual',
          fields: [
            { label: 'Color', value: record.color || '\u2014' },
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

export default withPermission(MenuPermissions.MasterData.GroupTypes.View, GroupTypesPage);
