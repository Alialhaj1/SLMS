/**
 * Warehouses Master Data — Page Configuration
 * Auto-generated governance config for Warehouses CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Warehouse {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  company_id?: number;
  branch_id?: number;
  warehouse_type_id?: number;
  country_id?: number;
  city_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  capacity?: number;
  temperature_min?: number;
  temperature_max?: number;
  is_active: boolean;
}

export type { Warehouse as WarehouseType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Warehouse>[] = [
  { key: 'code',              label: 'Code',           sortable: true,  width: 100 },
  { key: 'name_en',           label: 'Name (EN)',      sortable: true               },
  { key: 'name_ar',           label: 'Name (AR)',      sortable: true               },
  { key: 'warehouse_type_id', label: 'Type',           sortable: true,  width: 140 },
  { key: 'city_id',           label: 'City',           sortable: true,  width: 140 },
  { key: 'manager_name',      label: 'Manager',        sortable: true,  width: 160 },
  { key: 'is_active',         label: 'Active',         sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Warehouse Code',  type: 'code', required: 'required',    placeholder: 'Unique warehouse code', autoUppercase: true, immutableAfterCreate: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',   type: 'text', required: 'required',    placeholder: 'Warehouse name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',    type: 'text', required: 'recommended', placeholder: 'اسم المستودع بالعربية' },
    ],
  },
  {
    key: 'classification',
    label: 'Classification',
    collapsible: true,
    fields: [
      {
        key: 'company_id',
        label: 'Company',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select company',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/companies',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 4,
      },
      {
        key: 'branch_id',
        label: 'Branch',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select branch',
        dataSource: {
          type: 'api',
          endpoint: '/api/branches',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
          parentField: 'company_id',
          filterParam: 'company_id',
        },
        colSpan: 4,
      },
      {
        key: 'warehouse_type_id',
        label: 'Warehouse Type',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select warehouse type',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/warehouse-types',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 4,
      },
    ],
  },
  {
    key: 'location',
    label: 'Location',
    collapsible: true,
    fields: [
      {
        key: 'country_id',
        label: 'Country',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select country',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/countries',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'city_id',
        label: 'City',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select city',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/cities',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
          parentField: 'country_id',
          filterParam: 'country_id',
        },
        colSpan: 6,
      },
      { key: 'address', label: 'Address', type: 'textarea', required: 'optional', placeholder: 'Full warehouse address', colSpan: 'full' as any },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    collapsible: true,
    fields: [
      { key: 'phone',        label: 'Phone',   type: 'phone', required: 'optional', placeholder: '+966 XX XXX XXXX', colSpan: 4 },
      { key: 'email',        label: 'Email',   type: 'email', required: 'optional', placeholder: 'warehouse@example.com', validation: [{ type: 'email' }], colSpan: 4 },
      { key: 'manager_name', label: 'Manager', type: 'text',  required: 'optional', placeholder: 'Warehouse manager name', colSpan: 4 },
    ],
  },
  {
    key: 'capacity',
    label: 'Capacity & Environment',
    collapsible: true,
    fields: [
      { key: 'capacity',        label: 'Capacity',        type: 'number',  required: 'optional', placeholder: 'Storage capacity (units)',   colSpan: 4 },
      { key: 'temperature_min', label: 'Min Temp (°C)',   type: 'decimal', required: 'optional', placeholder: 'Minimum temperature',        colSpan: 4 },
      { key: 'temperature_max', label: 'Max Temp (°C)',   type: 'decimal', required: 'optional', placeholder: 'Maximum temperature',        colSpan: 4 },
      { key: 'is_active',       label: 'Active',          type: 'toggle',  required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:warehouses:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:warehouses:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:warehouses:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:warehouses:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const warehousesConfig: PageConfig<Warehouse> = {
  title: 'Warehouses',
  titleKey: 'pages.master.warehouses.title',
  subtitle: 'Manage warehouse locations, types, and capacity specifications',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Warehouses' },
  ],
  apiEndpoint: '/api/master/warehouses',
  resourceName: 'warehouses',
  permissionPrefix: 'master:warehouses',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'warehouses',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
