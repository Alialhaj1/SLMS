/**
 * Cities Master Data — Page Configuration
 * Auto-generated governance config for Cities CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface City {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  country_id?: number;
  region_id?: number;
  is_active: boolean;
  created_at?: string;
}

export type { City as CityType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<City>[] = [
  { key: 'code',       label: 'Code',      sortable: true,  width: 100 },
  { key: 'name',       label: 'Name',      sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)', sortable: true               },
  { key: 'country_id', label: 'Country',   sortable: true,  width: 160  },
  { key: 'region_id',  label: 'Region',    sortable: true,  width: 160  },
  { key: 'is_active',  label: 'Active',    sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'City code', autoUppercase: true, colSpan: 4 },
      { key: 'name',    label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'City name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم المدينة بالعربية' },
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
      {
        key: 'region_id',
        label: 'Region',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select region',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/regions',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
          parentField: 'country_id',
          filterParam: 'country_id',
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:cities:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:cities:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:cities:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:cities:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const citiesConfig: PageConfig<City> = {
  title: 'Cities',
  titleKey: 'pages.master.cities.title',
  subtitle: 'Manage city definitions and associations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Cities' },
  ],
  apiEndpoint: '/api/master/cities',
  resourceName: 'cities',
  permissionPrefix: 'master:cities',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'cities',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
