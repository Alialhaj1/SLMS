/**
 * Branches Master Data — Page Configuration
 * Auto-generated governance config for Branches CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Branch {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  company_id?: number;
  country_id?: number;
  city_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  is_active: boolean;
}

export type { Branch as BranchType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Branch>[] = [
  { key: 'code',       label: 'Code',       sortable: true,  width: 100  },
  { key: 'name_en',    label: 'Name (EN)',   sortable: true                },
  { key: 'name_ar',    label: 'Name (AR)',   sortable: true                },
  { key: 'company_id', label: 'Company',     sortable: true,  width: 160   },
  { key: 'city_id',    label: 'City',        sortable: true,  width: 140   },
  { key: 'phone',      label: 'Phone',       sortable: false, width: 140   },
  { key: 'is_active',  label: 'Active',      sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Branch Code',    type: 'code', required: 'optional',    placeholder: 'Branch code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Branch name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم الفرع بالعربية' },
    ],
  },
  {
    key: 'association',
    label: 'Company Association',
    fields: [
      {
        key: 'company_id',
        label: 'Company',
        type: 'searchable-select',
        required: 'required',
        placeholder: 'Select parent company',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/companies',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
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
      { key: 'address', label: 'Address', type: 'textarea', required: 'optional', placeholder: 'Branch address', colSpan: 'full' as any },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    collapsible: true,
    fields: [
      { key: 'phone',        label: 'Phone',        type: 'phone', required: 'optional', placeholder: '+966 XX XXX XXXX', colSpan: 4 },
      { key: 'email',        label: 'Email',        type: 'email', required: 'optional', placeholder: 'branch@company.com', validation: [{ type: 'email' }], colSpan: 4 },
      { key: 'manager_name', label: 'Manager Name', type: 'text',  required: 'optional', placeholder: 'Branch manager', colSpan: 4 },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:branches:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:branches:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:branches:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:branches:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const branchesConfig: PageConfig<Branch> = {
  title: 'Branches',
  titleKey: 'pages.master.branches.title',
  subtitle: 'Manage company branches and office locations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Branches' },
  ],
  apiEndpoint: '/api/branches',
  resourceName: 'branches',
  permissionPrefix: 'master:branches',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'branches',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
