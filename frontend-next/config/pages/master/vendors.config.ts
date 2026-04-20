/**
 * Vendors Master Data — Page Configuration
 * Auto-generated governance config for Vendors CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  company_id?: number;
  supplier_type_id?: number;
  supplier_category_id?: number;
  supplier_status_id?: number;
  country_id?: number;
  city_id?: number;
  address?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  registration_number?: string;
  credit_limit?: number;
  payment_term_id?: number;
  supply_term_id?: number;
  currency_id?: number;
  bank_id?: number;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_iban?: string;
  bank_swift?: string;
  contact_person?: string;
  notes?: string;
  is_active: boolean;
}

export type { Vendor as VendorType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Vendor>[] = [
  { key: 'code',       label: 'Code',       sortable: true,  width: 100 },
  { key: 'name',       label: 'Name',       sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)',  sortable: true               },
  { key: 'phone',      label: 'Phone',      sortable: false, width: 140 },
  { key: 'email',      label: 'Email',      sortable: true,  width: 200 },
  { key: 'tax_number', label: 'Tax Number', sortable: true,  width: 140 },
  { key: 'is_active',  label: 'Active',     sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',           label: 'Vendor Code',     type: 'code', required: 'required',    placeholder: 'Unique vendor code', autoUppercase: true, immutableAfterCreate: true, colSpan: 4 },
      { key: 'name',           label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Vendor name in English' },
      { key: 'name_ar',        label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم المورد بالعربية' },
      { key: 'contact_person', label: 'Contact Person',  type: 'text', required: 'optional',    placeholder: 'Primary contact person name' },
    ],
  },
  {
    key: 'classification',
    label: 'Classification',
    collapsible: true,
    fields: [
      {
        key: 'supplier_type_id',
        label: 'Supplier Type',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select supplier type',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/supplier-types',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'supplier_category_id',
        label: 'Supplier Category',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select supplier category',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/supplier-categories',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'supplier_status_id',
        label: 'Supplier Status',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select supplier status',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/supplier-statuses',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
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
        colSpan: 6,
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
      { key: 'address', label: 'Address', type: 'textarea', required: 'optional', placeholder: 'Full mailing address', colSpan: 'full' as any },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    collapsible: true,
    fields: [
      { key: 'phone',   label: 'Phone',   type: 'phone', required: 'optional', placeholder: '+966 XX XXX XXXX', colSpan: 3 },
      { key: 'mobile',  label: 'Mobile',  type: 'phone', required: 'optional', placeholder: '+966 5X XXX XXXX', colSpan: 3 },
      { key: 'email',   label: 'Email',   type: 'email', required: 'optional', placeholder: 'vendor@example.com', validation: [{ type: 'email' }], colSpan: 3 },
      { key: 'website', label: 'Website', type: 'url',   required: 'optional', placeholder: 'https://vendor.com', validation: [{ type: 'url' }], colSpan: 3 },
    ],
  },
  {
    key: 'financial',
    label: 'Financial',
    collapsible: true,
    fields: [
      { key: 'tax_number',          label: 'Tax Number',          type: 'text',     required: 'optional', placeholder: 'VAT / tax ID',               colSpan: 4 },
      { key: 'registration_number', label: 'Registration Number', type: 'text',     required: 'optional', placeholder: 'Company registration number', colSpan: 4 },
      { key: 'credit_limit',        label: 'Credit Limit',        type: 'currency', required: 'optional', placeholder: '0.00',                       colSpan: 4 },
      {
        key: 'payment_term_id',
        label: 'Payment Term',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select payment term',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/payment-terms',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'supply_term_id',
        label: 'Supply Term',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select supply term',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/supply-terms',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'currency_id',
        label: 'Currency',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select currency',
        dataSource: {
          type: 'api',
          endpoint: '/api/finance/currencies?is_active=true',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    collapsible: true,
    fields: [
      {
        key: 'payable_account_id',
        label: 'Payable Account (AP)',
        type: 'searchable-select',
        required: 'recommended',
        placeholder: 'Select accounts payable GL account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?type=liability&is_group=false',
          valueField: 'id',
          labelField: 'code',
          secondaryLabelField: 'name',
        },
        colSpan: 4,
      },
      {
        key: 'expense_account_id',
        label: 'Default Expense Account',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select default expense GL account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?type=expense&is_group=false',
          valueField: 'id',
          labelField: 'code',
          secondaryLabelField: 'name',
        },
        colSpan: 4,
      },
      {
        key: 'advance_account_id',
        label: 'Advance Payment Account',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select vendor advance GL account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?type=asset&is_group=false',
          valueField: 'id',
          labelField: 'code',
          secondaryLabelField: 'name',
        },
        colSpan: 4,
      },
    ],
  },
  {
    key: 'banking',
    label: 'Banking',
    collapsible: true,
    fields: [
      {
        key: 'bank_id',
        label: 'Bank',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select bank',
        dataSource: {
          type: 'api',
          endpoint: '/api/banks?is_active=true',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 4,
      },
      { key: 'bank_account_name',   label: 'Beneficiary Name',  type: 'text', required: 'optional', placeholder: 'Account holder / beneficiary name', colSpan: 4 },
      { key: 'bank_account_number',  label: 'Account Number',    type: 'text', required: 'optional', placeholder: 'Bank account number',               colSpan: 4 },
      { key: 'bank_iban',            label: 'IBAN',              type: 'text', required: 'optional', placeholder: 'e.g. SA0380000000608010167519',     colSpan: 6 },
      { key: 'bank_swift',           label: 'SWIFT Code',        type: 'text', required: 'optional', placeholder: 'e.g. RJHISARI',                     colSpan: 6 },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'notes',     label: 'Notes',  type: 'textarea', required: 'optional', placeholder: 'Additional notes about this vendor', colSpan: 'full' as any },
      { key: 'is_active', label: 'Active', type: 'toggle',   required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:vendors:create', position: ['toolbar'] },
  { key: 'details', label: 'View Details', icon: 'EyeIcon',          variant: 'secondary', permission: 'master:vendors:view',   position: ['row'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:vendors:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:vendors:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:vendors:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const vendorsConfig: PageConfig<Vendor> = {
  title: 'Vendors',
  titleKey: 'pages.master.vendors.title',
  subtitle: 'Manage vendor profiles, classifications, and financial details',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Vendors' },
  ],
  apiEndpoint: '/api/master/vendors',
  resourceName: 'vendors',
  permissionPrefix: 'master:vendors',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'vendors',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
