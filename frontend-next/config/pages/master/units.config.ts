/**
 * Units Master Data — Page Configuration
 * Auto-generated governance config for Units CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Unit {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  unit_type_id?: number;
  base_unit_id?: number;
  conversion_factor?: number;
  is_base_unit?: boolean;
  is_active: boolean;
}

export type { Unit as UnitType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Unit>[] = [
  { key: 'code',              label: 'Code',              sortable: true,  width: 100 },
  { key: 'name_en',           label: 'Name (EN)',         sortable: true               },
  { key: 'name_ar',           label: 'Name (AR)',         sortable: true               },
  { key: 'unit_type_id',      label: 'Unit Type',         sortable: true,  width: 150  },
  { key: 'is_base_unit',      label: 'Base Unit',         sortable: true,  width: 100, format: 'boolean', align: 'center' },
  { key: 'conversion_factor', label: 'Conversion Factor', sortable: true,  width: 150, align: 'right', format: 'number' },
  { key: 'is_active',         label: 'Active',            sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Unit Code',       type: 'code', required: 'required',    placeholder: 'e.g. KG', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',   type: 'text', required: 'required',    placeholder: 'Unit name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',    type: 'text', required: 'recommended', placeholder: 'اسم الوحدة بالعربية' },
    ],
  },
  {
    key: 'classification',
    label: 'Classification',
    fields: [
      {
        key: 'unit_type_id',
        label: 'Unit Type',
        type: 'searchable-select',
        required: 'recommended',
        placeholder: 'Select unit type',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/unit-types',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
      },
    ],
  },
  {
    key: 'conversion',
    label: 'Conversion',
    collapsible: true,
    fields: [
      {
        key: 'base_unit_id',
        label: 'Base Unit',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select base unit for conversion',
        helperText: 'The reference unit this unit converts to',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/units',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      { key: 'conversion_factor', label: 'Conversion Factor', type: 'decimal', required: 'optional', placeholder: '1.000000', decimalPrecision: 6, helperText: 'Multiply by this factor to convert to base unit', colSpan: 6 },
      { key: 'is_base_unit',      label: 'Is Base Unit',      type: 'checkbox', required: 'optional', helperText: 'Mark if this is the base unit for its type' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:units:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:units:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:units:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:units:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const unitsConfig: PageConfig<Unit> = {
  title: 'Units',
  titleKey: 'pages.master.units.title',
  subtitle: 'Manage measurement units and conversion factors',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Units' },
  ],
  apiEndpoint: '/api/master/units',
  resourceName: 'units',
  permissionPrefix: 'master:units',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'units',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
