/**
 * Items Master Data — Page Configuration
 * Auto-generated governance config for Items CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Item {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  item_type_id?: number;
  item_group_id?: number;
  item_grade_id?: number;
  base_unit_id?: number;
  description?: string;
  barcode?: string;
  sku?: string;
  min_stock?: number;
  max_stock?: number;
  reorder_point?: number;
  cost_price?: number;
  selling_price?: number;
  weight?: number;
  volume?: number;
  is_serialized?: boolean;
  is_batch_tracked?: boolean;
  is_active: boolean;
}

export type { Item as ItemType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Item>[] = [
  { key: 'code',          label: 'Code',          sortable: true,  width: 110 },
  { key: 'name_en',       label: 'Name (EN)',     sortable: true               },
  { key: 'name_ar',       label: 'Name (AR)',     sortable: true               },
  { key: 'item_type_id',  label: 'Item Type',     sortable: true,  width: 140  },
  { key: 'barcode',       label: 'Barcode',       sortable: true,  width: 140  },
  { key: 'cost_price',    label: 'Cost Price',    sortable: true,  width: 130, align: 'right', format: 'currency' },
  { key: 'selling_price', label: 'Selling Price', sortable: true,  width: 130, align: 'right', format: 'currency' },
  { key: 'is_active',     label: 'Active',        sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',        label: 'Item Code',       type: 'code',     required: 'required',    placeholder: 'Unique item code', autoUppercase: true, immutableAfterCreate: true, colSpan: 4 },
      { key: 'name_en',     label: 'Name (English)',   type: 'text',     required: 'required',    placeholder: 'Item name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',    type: 'text',     required: 'recommended', placeholder: 'اسم الصنف بالعربية' },
      { key: 'description', label: 'Description',      type: 'textarea', required: 'optional',    placeholder: 'Item description', colSpan: 'full' as any },
      { key: 'barcode',     label: 'Barcode',          type: 'text',     required: 'optional',    placeholder: 'Barcode / EAN', colSpan: 6 },
      { key: 'sku',         label: 'SKU',              type: 'text',     required: 'optional',    placeholder: 'Stock Keeping Unit', colSpan: 6 },
    ],
  },
  {
    key: 'classification',
    label: 'Classification',
    fields: [
      {
        key: 'item_type_id',
        label: 'Item Type',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select item type',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/item-types',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
      },
      {
        key: 'item_group_id',
        label: 'Item Group',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select item group',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/item-groups',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
      },
      {
        key: 'item_grade_id',
        label: 'Item Grade',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select item grade',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/item-grades',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
      },
    ],
  },
  {
    key: 'units',
    label: 'Units',
    fields: [
      {
        key: 'base_unit_id',
        label: 'Base Unit',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select base unit of measure',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/units',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
      },
    ],
  },
  {
    key: 'pricing',
    label: 'Pricing',
    collapsible: true,
    fields: [
      { key: 'cost_price',    label: 'Cost Price',    type: 'currency', required: 'optional', placeholder: '0.00', colSpan: 6 },
      { key: 'selling_price', label: 'Selling Price', type: 'currency', required: 'optional', placeholder: '0.00', colSpan: 6 },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    collapsible: true,
    fields: [
      { key: 'min_stock',        label: 'Min Stock',        type: 'number',   required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'max_stock',        label: 'Max Stock',        type: 'number',   required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'reorder_point',    label: 'Reorder Point',    type: 'number',   required: 'optional', placeholder: '0', colSpan: 4 },
      { key: 'is_serialized',    label: 'Serialized',       type: 'checkbox', required: 'optional', helperText: 'Track individual serial numbers' },
      { key: 'is_batch_tracked', label: 'Batch Tracked',    type: 'checkbox', required: 'optional', helperText: 'Track by batch / lot number' },
    ],
  },
  {
    key: 'physical',
    label: 'Physical',
    collapsible: true,
    fields: [
      { key: 'weight', label: 'Weight', type: 'decimal', required: 'optional', placeholder: '0.000', decimalPrecision: 3, helperText: 'Weight in base unit', colSpan: 6 },
      { key: 'volume', label: 'Volume', type: 'decimal', required: 'optional', placeholder: '0.000', decimalPrecision: 3, helperText: 'Volume in base unit', colSpan: 6 },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'is_active', label: 'Active', type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:items:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:items:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:items:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:items:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const itemsConfig: PageConfig<Item> = {
  title: 'Items',
  titleKey: 'pages.master.items.title',
  subtitle: 'Manage inventory items, pricing, and stock settings',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Items' },
  ],
  apiEndpoint: '/api/master/items',
  resourceName: 'items',
  permissionPrefix: 'master:items',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'items',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
