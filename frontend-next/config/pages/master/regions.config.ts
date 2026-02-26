/**
 * Regions Master Data — Page Configuration
 * Auto-generated governance config for Regions CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Region {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  country_id?: number;
  is_active: boolean;
}

export type { Region as RegionType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Region>[] = [
  { key: 'code',       label: 'Code',      sortable: true,  width: 100 },
  { key: 'name',       label: 'Name',      sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)', sortable: true               },
  { key: 'country_id', label: 'Country',   sortable: true,  width: 160  },
  { key: 'is_active',  label: 'Active',    sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Region code', autoUppercase: true, colSpan: 4 },
      { key: 'name',    label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Region name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم المنطقة بالعربية' },
    ],
  },
  {
    key: 'location',
    label: 'Location',
    fields: [
      {
        key: 'country_id',
        label: 'Country',
        type: 'searchable-select',
        required: 'recommended',
        placeholder: 'Select country',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/countries',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
      },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:regions:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:regions:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:regions:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:regions:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const regionsConfig: PageConfig<Region> = {
  title: 'Regions',
  titleKey: 'pages.master.regions.title',
  subtitle: 'Manage region and province definitions',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Regions' },
  ],
  apiEndpoint: '/api/master/regions',
  resourceName: 'regions',
  permissionPrefix: 'master:regions',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'regions',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
