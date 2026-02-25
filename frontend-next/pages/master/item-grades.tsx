/**
 * Item Grades Page (Enterprise Edition)
 * ======================================
 * Phase D — Screen 15: Item Grades (درجات الأصناف)
 * Quality grades — affects pricing, acceptance criteria, inspections.
 *
 * Uses EnterpriseMasterPage + itemGradeConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { itemGradeConfig, type ItemGrade } from '@/config/pages/master/itemGrades.config';

function ItemGradesPage() {
  return (
    <EnterpriseMasterPage<ItemGrade>
      config={itemGradeConfig}
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
          title: 'Classification',
          fields: [
            { label: 'Item Type', value: record.type_name_en || 'Applies to all types' },
          ],
        },
        {
          title: 'Quality & Pricing',
          fields: [
            { label: 'Quality Score', value: record.quality_score != null ? `${record.quality_score}%` : '\u2014' },
            { label: 'Price Adjustment', value: record.price_adjustment_pct != null ? `${record.price_adjustment_pct > 0 ? '+' : ''}${record.price_adjustment_pct}%` : '\u2014' },
          ],
        },
        {
          title: 'Acceptance Rules',
          fields: [
            { label: 'Sellable', value: record.is_sellable ? '✔ Yes' : '— No' },
            { label: 'Inspection Required', value: record.inspection_required ? '✔ Required' : '— Not required' },
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
            { label: 'Items Using', value: (record.usage_count || 0).toString() },
            { label: 'Sort Order', value: record.sort_order?.toString() || '\u2014' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.ItemGrades.View, ItemGradesPage);
