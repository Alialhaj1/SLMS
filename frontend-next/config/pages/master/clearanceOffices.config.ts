/**
 * Clearance Offices Master Data — Page Configuration
 * Auto-generated governance config for Clearance Offices CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ClearanceOffice {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  customs_office_id?: number;
  country_id?: number;
  city_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  license_number?: string;
  is_active: boolean;
}

export type { ClearanceOffice as ClearanceOfficeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ClearanceOffice>[] = [
  { key: 'code',           label: 'Code',           sortable: true,  width: 100 },
  { key: 'name_en',        label: 'Name (EN)',      sortable: true               },
  { key: 'name_ar',        label: 'Name (AR)',      sortable: true               },
  { key: 'phone',          label: 'Phone',          sortable: false, width: 140 },
  { key: 'license_number', label: 'License No.',    sortable: true,  width: 140 },
  { key: 'is_active',      label: 'Active',         sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',           label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Office code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',        label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Clearance office name in English' },
      { key: 'name_ar',        label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم مكتب التخليص بالعربية' },
      { key: 'license_number', label: 'License Number', type: 'text', required: 'optional',    placeholder: 'Clearance license number', colSpan: 6 },
    ],
  },
  {
    key: 'location',
    label: 'Location',
    collapsible: true,
    fields: [
      {
        key: 'customs_office_id',
        label: 'Customs Office',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select customs office',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/customs-offices',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
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
      { key: 'address', label: 'Address', type: 'textarea', required: 'optional', placeholder: 'Full office address', colSpan: 'full' as any },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    collapsible: true,
    fields: [
      { key: 'phone', label: 'Phone', type: 'phone', required: 'optional', placeholder: '+966 XX XXX XXXX', colSpan: 6 },
      { key: 'email', label: 'Email', type: 'email', required: 'optional', placeholder: 'office@example.com', validation: [{ type: 'email' }], colSpan: 6 },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'clearance_offices:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'clearance_offices:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'clearance_offices:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'clearance_offices:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const clearanceOfficesConfig: PageConfig<ClearanceOffice> = {
  title: 'Clearance Offices',
  titleKey: 'pages.master.clearanceOffices.title',
  subtitle: 'Manage customs clearance office registrations and details',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Clearance Offices' },
  ],
  apiEndpoint: '/api/master/clearance-offices',
  resourceName: 'clearance_offices',
  permissionPrefix: 'clearance_offices',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'clearance_offices',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
