/**
 * Item Groups Page (Enterprise Edition)
 * =======================================
 * Phase D - Screen 13: Item Groups (مجموعات الأصناف)
 * Hierarchical item classification with group_type FK.
 * Implements auto-inheritance: selecting a parent auto-fills level, category, type.
 *
 * Uses EnterpriseMasterPage + itemGroupConfig.
 */

import React, { useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { itemGroupConfig, type ItemGroup } from '@/config/pages/master/itemGroups.config';

const VALUATION_LABELS: Record<string, string> = {
  fifo: 'FIFO (First In First Out)',
  lifo: 'LIFO (Last In First Out)',
  weighted_average: 'Weighted Average',
  standard_cost: 'Standard Cost',
};

function ItemGroupsPage() {
  /**
   * Auto-inheritance logic:
   * When parent_group_id changes, fetch the parent's inheritance data
   * and auto-fill group_level_id, group_category_id, group_type_id
   */
  const handleFieldChange = useCallback(async (
    key: string,
    value: any,
    formData: Record<string, any>,
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  ) => {
    if (key === 'parent_group_id' && value) {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`http://localhost:4000/api/master/item-groups/${value}/inheritance`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-company-id': '1',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const inh = json.data;
            setFormData((prev) => ({
              ...prev,
              // Auto-fill from parent's inheritance
              group_level_id: inh.next_level_id || prev.group_level_id,
              group_category_id: inh.inherited_group_category_id || prev.group_category_id,
              group_type_id: inh.inherited_group_type_id || prev.group_type_id,
              default_valuation_method: inh.inherited_valuation_method || prev.default_valuation_method,
              default_tax_category: inh.inherited_tax_category || prev.default_tax_category,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch inheritance data:', err);
      }
    }
    // When parent is cleared, reset to main level
    if (key === 'parent_group_id' && !value) {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://localhost:4000/api/master/group-levels?status=active&sortBy=level_order&sortOrder=asc&limit=1', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-company-id': '1',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              group_level_id: json.data[0].id,
            }));
          }
        }
      } catch (err) {
        // Ignore
      }
    }
  }, []);

  return (
    <EnterpriseMasterPage<ItemGroup>
      config={itemGroupConfig}
      onFieldChange={handleFieldChange}
      formFooter={(isEditing, formData) => (
        <div className="text-xs text-gray-500 dark:text-gray-400 px-1 pt-2 border-t border-gray-200 dark:border-gray-700">
          {formData.parent_group_id ? (
            <p>📋 Sub-group mode — Level, Category & Type are auto-inherited from parent</p>
          ) : (
            <p>📋 Root group — Select Level, Category & Type manually</p>
          )}
        </div>
      )}
      buildDetailSections={(record) => [
        {
          title: 'Classification',
          fields: [
            { label: 'Group Level', value: record.group_level_name_en || '\u2014' },
            { label: 'Group Category', value: record.group_category_name_en || '\u2014' },
            { label: 'Group Type', value: record.group_type_name_en ? `${record.group_type_icon || ''} ${record.group_type_name_en}`.trim() : '\u2014' },
            { label: 'Parent Group', value: record.parent_name_en || 'None (root)' },
            { label: 'Tree Path', value: record.path || record.code || '\u2014' },
            { label: 'Tree Depth', value: (record.tree_depth || 0).toString() },
          ],
        },
        {
          title: 'Group Definition',
          fields: [
            { label: 'Icon', value: record.icon || record.group_type_icon || '\u2014' },
            { label: 'Code', value: record.code || '\u2014' },
            { label: 'Name (English)', value: record.name_en || '\u2014' },
            { label: 'Name (Arabic)', value: record.name_ar || '\u2014' },
            { label: 'Description (EN)', value: record.description_en || '\u2014' },
            { label: 'Description (AR)', value: record.description_ar || '\u2014' },
          ],
        },
        {
          title: 'System Settings',
          fields: [
            { label: 'Valuation Method', value: VALUATION_LABELS[record.default_valuation_method] || record.default_valuation_method || '\u2014' },
            { label: 'Tax Category', value: record.default_tax_category || '\u2014' },
            { label: 'Items Count', value: (record.item_count || 0).toString() },
            { label: 'Sub Groups', value: (record.children_count || 0).toString() },
          ],
        },
        {
          title: 'Accounting (Deferred)',
          fields: [
            { label: 'Inventory Account', value: record.inventory_account_id ? `#${record.inventory_account_id}` : 'Will be activated after setting up the Chart of Accounts' },
            { label: 'COGS Account', value: record.cogs_account_id ? `#${record.cogs_account_id}` : 'Will be activated after setting up the Chart of Accounts' },
            { label: 'Revenue Account', value: record.revenue_account_id ? `#${record.revenue_account_id}` : 'Will be activated after setting up the Chart of Accounts' },
          ],
        },
        {
          title: 'Audit Trail',
          fields: [
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '\u2014' },
            { label: 'Color', value: record.color || '\u2014' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.ItemGroups.View, ItemGroupsPage);
