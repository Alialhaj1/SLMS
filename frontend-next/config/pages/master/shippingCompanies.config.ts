/**
 * Shipping Companies Master Data — Page Configuration
 * Governance config for Shipping Companies CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface ShippingCompany {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  company_type?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  services?: string[];
  license_number?: string;
  tax_number?: string;
  website?: string;
  country_id?: number;
  city_id?: number;
  tracking_url_template?: string;
  api_endpoint?: string;
  integration_enabled?: boolean;
  rating?: number;
  transport_modes?: string[];
  coverage_regions?: string[];
  contract_start?: string;
  contract_end?: string;
  notes?: string;
  is_active: boolean;
  sort_order?: number;
}

const columns: ColumnMeta<ShippingCompany>[] = [
  { key: 'code',            label: 'Code',           sortable: true,  width: 100 },
  { key: 'name',            label: 'Name',           sortable: true },
  { key: 'name_ar',         label: 'Name (AR)',      sortable: true },
  { key: 'company_type',    label: 'Type',           sortable: true,  width: 120 },
  { key: 'contact_person',  label: 'Contact',        sortable: true,  width: 140 },
  { key: 'phone',           label: 'Phone',          sortable: false, width: 130 },
  { key: 'rating',          label: 'Rating',         sortable: true,  width: 80,  format: 'number', align: 'center' },
  { key: 'integration_enabled', label: 'Integration', sortable: true, width: 100, format: 'boolean', align: 'center' },
  { key: 'is_active',       label: 'Active',         sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional', placeholder: 'Company code', autoUppercase: true, colSpan: 4 },
      { key: 'name',    label: 'Name',           type: 'text', required: 'required', placeholder: 'Company name' },
      { key: 'name_en', label: 'Name (English)', type: 'text', required: 'optional', placeholder: 'Name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',  type: 'text', required: 'recommended', placeholder: 'اسم الشركة بالعربية' },
      { key: 'company_type', label: 'Company Type', type: 'select', required: 'recommended', placeholder: 'Select type',
        options: [
          { value: 'shipping_line', label: 'Shipping Line' },
          { value: 'carrier',       label: 'Carrier' },
          { value: 'nvocc',         label: 'NVOCC' },
          { value: 'courier',       label: 'Courier' },
        ],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contact Information',
    fields: [
      { key: 'contact_person', label: 'Contact Person', type: 'text', required: 'optional', placeholder: 'Primary contact' },
      { key: 'phone',          label: 'Phone',          type: 'text', required: 'optional', placeholder: 'Phone number' },
      { key: 'email',          label: 'Email',          type: 'text', required: 'optional', placeholder: 'Email address' },
      { key: 'website',        label: 'Website',        type: 'text', required: 'optional', placeholder: 'Website URL' },
      { key: 'address',        label: 'Address',        type: 'textarea', required: 'optional', placeholder: 'Company address', colSpan: 'full' as any },
    ],
  },
  {
    key: 'business',
    label: 'Business Details',
    fields: [
      { key: 'license_number', label: 'License Number', type: 'text',   required: 'optional', placeholder: 'Operating license number' },
      { key: 'tax_number',     label: 'Tax Number',     type: 'text',   required: 'optional', placeholder: 'Tax registration number' },
      { key: 'rating',         label: 'Rating (1-5)',   type: 'number', required: 'optional', placeholder: 'Company rating' },
      { key: 'contract_start', label: 'Contract Start', type: 'date', required: 'optional' },
      { key: 'contract_end',   label: 'Contract End',   type: 'date', required: 'optional' },
    ],
  },
  {
    key: 'integration',
    label: 'API Integration',
    fields: [
      { key: 'tracking_url_template', label: 'Tracking URL Template', type: 'text',   required: 'optional', placeholder: 'https://track.example.com/{tracking_no}' },
      { key: 'api_endpoint',          label: 'API Endpoint',          type: 'text',   required: 'optional', placeholder: 'API endpoint URL' },
      { key: 'integration_enabled',   label: 'Integration Enabled',   type: 'toggle', required: 'optional', defaultValue: false },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'notes',      label: 'Notes',      type: 'textarea', required: 'optional', placeholder: 'Additional notes', colSpan: 'full' as any },
      { key: 'is_active',  label: 'Active',     type: 'toggle',   required: 'optional', defaultValue: true },
      { key: 'sort_order', label: 'Sort Order', type: 'number',   required: 'optional', placeholder: 'Display order' },
    ],
  },
];

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'shipping_companies:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'shipping_companies:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'shipping_companies:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'shipping_companies:view',   position: ['toolbar'] },
];

export const shippingCompaniesConfig: PageConfig<ShippingCompany> = {
  title: 'Shipping Companies',
  titleKey: 'pages.master.shippingCompanies.title',
  subtitle: 'Manage shipping companies, lines, and carrier integrations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Shipping Companies' },
  ],
  apiEndpoint: '/api/master/shipping-companies',
  resourceName: 'shipping_companies',
  permissionPrefix: 'shipping_companies',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'shipping_companies',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const shippingCompanyConfig = shippingCompaniesConfig;
