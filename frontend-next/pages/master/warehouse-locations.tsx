/**
 * 📍 WAREHOUSE LOCATIONS PAGE (Enterprise Edition)
 * ===================================================
 *
 * Master data page for managing hierarchical storage locations.
 * Uses EnterpriseMasterPage with warehouseLocationsConfig.
 *
 * Hierarchy: Zone → Aisle → Rack → Shelf → Bin
 * Sub-data: children (child locations)
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  warehouseLocationsConfig,
  type StorageLocation,
} from '@/config/pages/master/warehouseLocations.config';

function WarehouseLocationsPage() {
  // ──── TEMPERATURE DISPLAY ──────────────────────────────────────────────
  const tempDisplay = (min?: number, max?: number) => {
    if (min == null && max == null) return null;
    return `${min != null ? min + '°C' : '?'} ~ ${max != null ? max + '°C' : '?'}`;
  };

  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────
  const buildDetailSections = (loc: StorageLocation) => [
    {
      title: 'Identity',
      fields: [
        { label: 'Location Code', value: loc.location_code },
        { label: 'Barcode', value: loc.barcode },
        { label: 'Name (EN)', value: loc.name_en },
        { label: 'Name (AR)', value: loc.name_ar },
      ],
    },
    {
      title: 'Classification',
      fields: [
        { label: 'Warehouse', value: loc.warehouse_name_en || loc.warehouse_name },
        { label: 'Warehouse Code', value: loc.warehouse_code },
        { label: 'Location Type', value: loc.location_type_name },
        { label: 'Hierarchy Level', value: loc.hierarchy_level != null ? String(loc.hierarchy_level) : null },
        { label: 'Parent Location', value: loc.parent_location_code ? `${loc.parent_location_code} — ${loc.parent_location_name}` : null },
        { label: 'Can Store Items', value: loc.can_store_items ? '✔ Yes' : 'No' },
      ],
    },
    {
      title: 'Physical Position',
      fields: [
        { label: 'Row', value: loc.row_number },
        { label: 'Rack', value: loc.rack_number != null ? String(loc.rack_number) : null },
        { label: 'Shelf', value: loc.shelf_number != null ? String(loc.shelf_number) : null },
        { label: 'Bin', value: loc.bin_number },
      ],
    },
    {
      title: 'Capacity & Temperature',
      fields: [
        { label: 'Max Weight', value: loc.max_weight_kg ? `${Number(loc.max_weight_kg).toLocaleString()} kg` : null },
        { label: 'Max Volume', value: loc.max_volume_m3 ? `${Number(loc.max_volume_m3).toLocaleString()} m³` : null },
        { label: 'Temperature Range', value: tempDisplay(loc.min_temp_celsius, loc.max_temp_celsius) },
        { label: 'Current Fill', value: loc.current_fill_pct != null ? `${loc.current_fill_pct}%` : null },
      ],
    },
    {
      title: 'Settings',
      fields: [
        { label: 'Allows Mixed Items', value: loc.allows_mixed_items ? '✔ Yes' : '✖ No' },
        { label: 'Allows Mixed Batches', value: loc.allows_mixed_batches ? '✔ Yes' : '✖ No' },
        { label: 'Pickable', value: loc.is_pickable ? '✔ Yes' : '✖ No' },
        { label: 'Blocked', value: loc.is_blocked ? '🚫 Yes' : 'No' },
        { label: 'Active', value: loc.is_active ? '✔ Active' : '✖ Inactive' },
      ],
    },
    {
      title: 'Notes',
      fields: [
        { label: 'Notes', value: loc.notes },
      ],
    },
    {
      title: 'Metadata',
      fields: [
        { label: 'Created', value: loc.created_at ? new Date(loc.created_at).toLocaleString() : null },
        { label: 'Created By', value: loc.created_by_name },
        { label: 'Updated', value: loc.updated_at ? new Date(loc.updated_at).toLocaleString() : null },
        { label: 'Updated By', value: loc.updated_by_name },
      ],
    },
  ];

  // ──── RELATIONS (Children sub-table) ──────────────────────────────────
  const buildRelations = (loc: StorageLocation) => {
    const relations: any[] = [];

    if (loc.children && loc.children.length > 0) {
      relations.push({
        key: 'children',
        title: 'Child Locations',
        titleKey: 'warehouseLocations.childLocations',
        columns: [
          { key: 'location_code', label: 'Code' },
          { key: 'name_en', label: 'Name' },
          { key: 'is_active', label: 'Active', render: (v: boolean) => (v ? 'Yes' : 'No') },
          { key: 'is_blocked', label: 'Blocked', render: (v: boolean) => (v ? '🚫 Yes' : 'No') },
        ],
        data: loc.children,
      });
    }

    return relations;
  };

  return (
    <EnterpriseMasterPage<StorageLocation>
      config={warehouseLocationsConfig}
      buildDetailSections={buildDetailSections}
      buildRelations={buildRelations}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.Warehouses.View,
  WarehouseLocationsPage
);
