/**
 * Companies Master Data — Page Configuration
 * Auto-generated governance config for Companies CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Company {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  trade_name?: string;
  registration_number?: string;
  tax_number?: string;
  country_id?: number;
  city_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
}

export type { Company as CompanyType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Company>[] = [
  { key: 'code',                label: 'Code',             sortable: true,  width: 100  },
  { key: 'name',                label: 'Name',             sortable: true                },
  { key: 'name_ar',             label: 'Name (AR)',        sortable: true                },
  { key: 'registration_number', label: 'Reg. Number',      sortable: true,  width: 140   },
  { key: 'tax_number',          label: 'Tax Number',       sortable: true,  width: 140   },
  { key: 'phone',               label: 'Phone',            sortable: false, width: 140   },
  { key: 'email',               label: 'Email',            sortable: true,  width: 200   },
  { key: 'is_active',           label: 'Active',           sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',       label: 'Company Code',   type: 'code', required: 'required',    placeholder: 'Unique company code', autoUppercase: true, immutableAfterCreate: true, colSpan: 4 },
      { key: 'name',       label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Official company name' },
      { key: 'name_ar',    label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'الاسم الرسمي للشركة بالعربية' },
      { key: 'trade_name', label: 'Trade Name',      type: 'text', required: 'optional',    placeholder: 'Brand / trade name' },
    ],
  },
  {
    key: 'registration',
    label: 'Registration',
    collapsible: true,
    fields: [
      { key: 'registration_number', label: 'Registration Number', type: 'text', required: 'optional', placeholder: 'Company registration number', colSpan: 6 },
      { key: 'tax_number',          label: 'Tax Number',          type: 'text', required: 'optional', placeholder: 'VAT / tax ID',               colSpan: 6 },
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
      { key: 'address', label: 'Address', type: 'textarea', required: 'optional', placeholder: 'Full mailing address', colSpan: 'full' as any },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    collapsible: true,
    fields: [
      { key: 'phone',   label: 'Phone',   type: 'phone', required: 'optional', placeholder: '+966 XX XXX XXXX', colSpan: 4 },
      { key: 'email',   label: 'Email',   type: 'email', required: 'optional', placeholder: 'info@company.com', validation: [{ type: 'email' }], colSpan: 4 },
      { key: 'website', label: 'Website', type: 'url',   required: 'optional', placeholder: 'https://company.com', validation: [{ type: 'url' }], colSpan: 4 },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:companies:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:companies:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:companies:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:companies:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const companiesConfig: PageConfig<Company> = {
  title: 'Companies',
  titleKey: 'pages.master.companies.title',
  subtitle: 'Manage company profiles, registration, and contact details',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Companies' },
  ],
  apiEndpoint: '/api/master/companies',
  resourceName: 'companies',
  permissionPrefix: 'master:companies',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'companies',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
