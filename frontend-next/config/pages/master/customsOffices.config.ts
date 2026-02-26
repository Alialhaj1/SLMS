/**
 * Customs Offices Master Data — Page Configuration
 * Auto-generated governance config for Customs Offices CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface CustomsOffice {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  country_id?: number;
  city_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  working_hours?: string;
  is_active: boolean;
}

export type { CustomsOffice as CustomsOfficeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<CustomsOffice>[] = [
  { key: 'code',       label: 'Code',       sortable: true,  width: 100 },
  { key: 'name_en',    label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)',  sortable: true               },
  { key: 'country_id', label: 'Country',    sortable: true,  width: 160 },
  { key: 'city_id',    label: 'City',       sortable: true,  width: 160 },
  { key: 'phone',      label: 'Phone',      sortable: false, width: 140 },
  { key: 'is_active',  label: 'Active',     sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Customs office code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Customs office name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم المكتب الجمركي بالعربية' },
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
      },
      { key: 'address', label: 'Address', type: 'textarea', required: 'optional', placeholder: 'Full address of the customs office', colSpan: 'full' as any },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    fields: [
      { key: 'phone',         label: 'Phone',         type: 'text', required: 'optional', placeholder: 'Office phone number' },
      { key: 'email',         label: 'Email',         type: 'email', required: 'optional', placeholder: 'Office email address' },
      { key: 'working_hours', label: 'Working Hours', type: 'text', required: 'optional', placeholder: 'e.g. Sun-Thu 08:00-16:00' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'customs_offices:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'customs_offices:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'customs_offices:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'customs_offices:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const customsOfficesConfig: PageConfig<CustomsOffice> = {
  title: 'Customs Offices',
  titleKey: 'pages.master.customsOffices.title',
  subtitle: 'Manage customs office locations and contact information',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Customs Offices' },
  ],
  apiEndpoint: '/api/master/customs-offices',
  resourceName: 'customs_offices',
  permissionPrefix: 'customs_offices',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'customs_offices',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
