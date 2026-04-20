/**
 * Customers Master Data — Page Configuration
 * Auto-generated governance config for Customers CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  company_id?: number;
  customer_type_id?: number;
  customer_category_id?: number;
  customer_status_id?: number;
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
  delivery_term_id?: number;
  currency_id?: number;
  language_id?: number;
  contact_person?: string;
  notes?: string;
  is_active: boolean;
}

export type { Customer as CustomerType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Customer>[] = [
  { key: 'code',         label: 'Code',         sortable: true,  width: 100 },
  { key: 'name',         label: 'Name',         sortable: true               },
  { key: 'name_ar',      label: 'Name (AR)',    sortable: true               },
  { key: 'phone',        label: 'Phone',        sortable: false, width: 140 },
  { key: 'email',        label: 'Email',        sortable: true,  width: 200 },
  { key: 'tax_number',   label: 'Tax Number',   sortable: true,  width: 140 },
  { key: 'credit_limit', label: 'Credit Limit', sortable: true,  width: 130, format: 'currency', align: 'right' },
  { key: 'is_active',    label: 'Active',       sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',           label: 'Customer Code',   type: 'code', required: 'required',    placeholder: 'Unique customer code', autoUppercase: true, immutableAfterCreate: true, colSpan: 4 },
      { key: 'name',           label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Customer name in English' },
      { key: 'name_ar',        label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم العميل بالعربية' },
      { key: 'contact_person', label: 'Contact Person',  type: 'text', required: 'optional',    placeholder: 'Primary contact person name' },
    ],
  },
  {
    key: 'classification',
    label: 'Classification',
    collapsible: true,
    fields: [
      {
        key: 'customer_type_id',
        label: 'Customer Type',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select customer type',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/customer-types',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'customer_category_id',
        label: 'Customer Category',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select customer category',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/customer-categories',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'customer_status_id',
        label: 'Customer Status',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select customer status',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/customer-statuses',
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
      { key: 'email',   label: 'Email',   type: 'email', required: 'optional', placeholder: 'customer@example.com', validation: [{ type: 'email' }], colSpan: 3 },
      { key: 'website', label: 'Website', type: 'url',   required: 'optional', placeholder: 'https://customer.com', validation: [{ type: 'url' }], colSpan: 3 },
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
        key: 'delivery_term_id',
        label: 'Delivery Term',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select delivery term',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/delivery-terms',
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
      {
        key: 'language_id',
        label: 'Preferred Language',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select language',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/languages',
          valueField: 'id',
          labelField: 'name_en',
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
        key: 'receivable_account_id',
        label: 'Receivable Account (AR)',
        type: 'searchable-select',
        required: 'recommended',
        placeholder: 'Select accounts receivable GL account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?type=asset&is_group=false',
          valueField: 'id',
          labelField: 'code',
          secondaryLabelField: 'name',
        },
        colSpan: 6,
      },
      {
        key: 'advance_account_id',
        label: 'Advance Receipt Account',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select customer advance GL account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?type=liability&is_group=false',
          valueField: 'id',
          labelField: 'code',
          secondaryLabelField: 'name',
        },
        colSpan: 6,
      },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'notes',     label: 'Notes',  type: 'textarea', required: 'optional', placeholder: 'Additional notes about this customer', colSpan: 'full' as any },
      { key: 'is_active', label: 'Active', type: 'toggle',   required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:customers:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:customers:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:customers:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:customers:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const customersConfig: PageConfig<Customer> = {
  title: 'Customers',
  titleKey: 'pages.master.customers.title',
  subtitle: 'Manage customer profiles, classifications, and financial details',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Customers' },
  ],
  apiEndpoint: '/api/master/customers',
  resourceName: 'customers',
  permissionPrefix: 'master:customers',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'customers',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
