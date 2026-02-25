/**
 * Item Types Page (Enterprise Edition)
 * ======================================
 * Phase D — Screen 14: Item Types (أنواع الأصناف)
 * Defines how items are processed in inventory and accounting.
 *
 * Uses EnterpriseMasterPage + itemTypeConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { itemTypeConfig, type ItemType } from '@/config/pages/master/itemTypes.config';

const BOOL_YES = '✔';
const BOOL_NO = '—';

function ItemTypesPage() {
  return (
    <EnterpriseMasterPage<ItemType>
      config={itemTypeConfig}
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
            { label: 'Item Group', value: record.group_name_en || 'Not assigned' },
          ],
        },
        {
          title: 'Item Behavior',
          fields: [
            { label: 'Stockable', value: record.is_stockable ? BOOL_YES : BOOL_NO },
            { label: 'Purchasable', value: record.is_purchasable ? BOOL_YES : BOOL_NO },
            { label: 'Sellable', value: record.is_sellable ? BOOL_YES : BOOL_NO },
            { label: 'Producible (BOM)', value: record.is_producible ? BOOL_YES : BOOL_NO },
            { label: 'Affects Inventory', value: record.affects_inventory ? BOOL_YES : BOOL_NO },
          ],
        },
        {
          title: 'Tracking Requirements',
          fields: [
            { label: 'Requires Serial Number', value: record.requires_serial_number ? BOOL_YES : BOOL_NO },
            { label: 'Requires Expiry Date', value: record.requires_expiry_date ? BOOL_YES : BOOL_NO },
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

export default withPermission(MenuPermissions.MasterData.ItemTypes.View, ItemTypesPage);
