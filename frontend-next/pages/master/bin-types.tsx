/**
 * Storage Location Types Page (Enterprise Edition)
 * =================================================
 * Phase D - Screen 12: Hierarchical warehouse location types.
 * Zone -> Aisle -> Rack -> Shelf -> Bin
 *
 * Optional FK: warehouse_type_id -> warehouse_types.
 * Uses EnterpriseMasterPage + storageLocationTypeConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { storageLocationTypeConfig, type StorageLocationType } from '@/config/pages/master/storageLocationTypes.config';

const LEVEL_LABELS: Record<number, string> = {
  1: 'L1 - Top Level',
  2: 'L2',
  3: 'L3',
  4: 'L4',
  5: 'L5 - Leaf',
};

function StorageLocationTypesPage() {
  return (
    <EnterpriseMasterPage<StorageLocationType>
      config={storageLocationTypeConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information',
          fields: [
            { label: 'Icon', value: record.icon || '\u2014' },
            { label: 'Code', value: record.code || '\u2014' },
            { label: 'Name (English)', value: record.name_en || '\u2014' },
            { label: 'Name (Arabic)', value: record.name_ar || '\u2014' },
            { label: 'Description (AR)', value: record.description_ar || '\u2014' },
            { label: 'Warehouse Type', value: record.warehouse_type_name_en || 'All types' },
          ],
        },
        {
          title: 'Hierarchy & Structure',
          fields: [
            { label: 'Hierarchy Level', value: LEVEL_LABELS[record.hierarchy_level] || `Level ${record.hierarchy_level}` },
            { label: 'Parent Type', value: record.parent_type_code || 'None (root)' },
          ],
        },
        {
          title: 'Capabilities',
          fields: [
            { label: 'Can Store Items', value: record.can_store_items ? 'Yes' : 'No' },
            { label: 'Supports Picking', value: record.supports_picking ? 'Yes' : 'No' },
            { label: 'Requires Barcode', value: record.requires_barcode ? 'Yes' : 'No' },
            { label: 'Max Weight (KG)', value: record.max_weight_kg ? `${record.max_weight_kg} kg` : '\u2014' },
            { label: 'Max Volume (m\u00B3)', value: record.max_volume_m3 ? `${record.max_volume_m3} m\u00B3` : '\u2014' },
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

export default withPermission(MenuPermissions.MasterData.StorageLocationTypes.View, StorageLocationTypesPage);
