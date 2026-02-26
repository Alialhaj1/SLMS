import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface WarehouseLocation {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  warehouse_id?: number;
  location_type_id?: number;
  parent_location_id?: number;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  is_active: boolean;
}

const warehouseLocationsConfig: PageConfig = {
  pageKey: 'master:warehouse_locations',
  title: 'Warehouse Locations',
  description: 'Manage warehouse locations, aisles, racks, shelves and bins',
  apiEndpoint: '/api/master/warehouse-locations',
  permissionPrefix: 'master:warehouse_locations',

  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Warehouse Locations' },
  ],

  columns: [
    { key: 'code', label: 'Code', type: 'text', sortable: true, filterable: true, width: 120 },
    { key: 'name_en', label: 'Name (EN)', type: 'text', sortable: true, filterable: true, width: 200 },
    { key: 'warehouse_id', label: 'Warehouse', type: 'lookup', sortable: true, filterable: true, width: 180, lookup: { endpoint: '/api/master/warehouses', labelKey: 'name_en', valueKey: 'id' } },
    { key: 'location_type_id', label: 'Location Type', type: 'lookup', sortable: true, filterable: true, width: 160, lookup: { endpoint: '/api/master/bin-types', labelKey: 'name_en', valueKey: 'id' } },
    { key: 'aisle', label: 'Aisle', type: 'text', sortable: true, filterable: true, width: 100 },
    { key: 'rack', label: 'Rack', type: 'text', sortable: true, filterable: true, width: 100 },
    { key: 'shelf', label: 'Shelf', type: 'text', sortable: true, filterable: true, width: 100 },
    { key: 'bin', label: 'Bin', type: 'text', sortable: true, filterable: true, width: 100 },
    { key: 'is_active', label: 'Active', type: 'boolean', sortable: true, filterable: true, width: 100 },
  ] as ColumnMeta[],

  actions: [
    { key: 'create', label: 'Create New', icon: 'PlusIcon', variant: 'primary', permission: 'master:warehouse_locations:create', position: ['toolbar'] as any },
    { key: 'edit', label: 'Edit', icon: 'PencilSquareIcon', variant: 'secondary', permission: 'master:warehouse_locations:edit', position: ['row'] as any },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', variant: 'danger', permission: 'master:warehouse_locations:delete', position: ['row', 'bulk'] as any, requireConfirmation: true, isDangerous: true },
    { key: 'export', label: 'Export', icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:warehouse_locations:view', position: ['toolbar'] as any },
  ] as ActionMeta[],

  formSections: [
    {
      key: 'identity',
      title: 'Identity',
      columns: 2,
      fields: [
        { key: 'code', label: 'Code', type: 'code', required: true, placeholder: 'e.g. WL-001' },
        { key: 'name_en', label: 'Name (EN)', type: 'text', required: true, placeholder: 'Location name in English' },
        { key: 'name_ar', label: 'Name (AR)', type: 'text', recommended: true, placeholder: 'Location name in Arabic' },
      ],
    },
    {
      key: 'classification',
      title: 'Classification',
      columns: 2,
      fields: [
        { key: 'warehouse_id', label: 'Warehouse', type: 'searchable-select', endpoint: '/api/master/warehouses', labelKey: 'name_en', valueKey: 'id' },
        { key: 'location_type_id', label: 'Location Type', type: 'searchable-select', endpoint: '/api/master/bin-types', labelKey: 'name_en', valueKey: 'id' },
        { key: 'parent_location_id', label: 'Parent Location', type: 'searchable-select', endpoint: '/api/master/warehouse-locations', labelKey: 'name_en', valueKey: 'id' },
      ],
    },
    {
      key: 'position',
      title: 'Position',
      columns: 3,
      fields: [
        { key: 'aisle', label: 'Aisle', type: 'text', placeholder: 'e.g. A1' },
        { key: 'rack', label: 'Rack', type: 'text', placeholder: 'e.g. R01' },
        { key: 'shelf', label: 'Shelf', type: 'text', placeholder: 'e.g. S03' },
        { key: 'bin', label: 'Bin', type: 'text', placeholder: 'e.g. B12' },
        { key: 'capacity', label: 'Capacity', type: 'number', placeholder: '0' },
        { key: 'is_active', label: 'Active', type: 'toggle', defaultValue: true },
      ],
    },
  ] as PageSection[],
};

export default warehouseLocationsConfig;
