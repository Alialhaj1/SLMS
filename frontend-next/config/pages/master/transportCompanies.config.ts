/**
 * Transport Companies Master Data — Page Configuration
 * Governance config for Transport Companies CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface TransportCompany {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  company_type?: string;
  license_number?: string;
  tax_number?: string;
  contact_person?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
  address_en?: string;
  address_ar?: string;
  city_id?: number;
  country_id?: number;
  fleet_size?: number;
  service_coverage?: string;
  specializations?: string[];
  insurance_provider_id?: number;
  insurance_policy_number?: string;
  insurance_expiry?: string;
  contract_start?: string;
  contract_end?: string;
  payment_terms_days?: number;
  credit_limit?: number;
  rating?: number;
  reliability_score?: number;
  certifications?: string[];
  operating_regions?: string[];
  notes?: string;
  is_active: boolean;
  sort_order?: number;
}

const columns: ColumnMeta<TransportCompany>[] = [
  { key: 'code',              label: 'Code',            sortable: true,  width: 100 },
  { key: 'name_en',           label: 'Name (EN)',       sortable: true },
  { key: 'name_ar',           label: 'Name (AR)',       sortable: true },
  { key: 'company_type',      label: 'Type',            sortable: true,  width: 120 },
  { key: 'contact_person',    label: 'Contact',         sortable: true,  width: 140 },
  { key: 'phone',             label: 'Phone',           sortable: false, width: 130 },
  { key: 'fleet_size',        label: 'Fleet',           sortable: true,  width: 80,  format: 'number', align: 'right' },
  { key: 'rating',            label: 'Rating',          sortable: true,  width: 80,  format: 'number', align: 'center' },
  { key: 'reliability_score', label: 'Reliability',     sortable: true,  width: 100, format: 'number', align: 'center' },
  { key: 'is_active',         label: 'Active',          sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',      label: 'Code',           type: 'code', required: 'optional', placeholder: 'Company code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',   label: 'Name (English)', type: 'text', required: 'required', placeholder: 'Company name in English' },
      { key: 'name_ar',   label: 'Name (Arabic)',  type: 'text', required: 'recommended', placeholder: 'اسم الشركة بالعربية' },
      { key: 'company_type', label: 'Company Type', type: 'select', required: 'recommended', placeholder: 'Select type',
        options: [
          { value: 'carrier',    label: 'Carrier' },
          { value: 'broker',     label: 'Broker' },
          { value: 'forwarder',  label: 'Forwarder' },
          { value: '3pl',        label: '3PL Provider' },
        ],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contact Information',
    fields: [
      { key: 'contact_person', label: 'Contact Person', type: 'text', required: 'optional', placeholder: 'Primary contact name' },
      { key: 'phone',          label: 'Phone',          type: 'text', required: 'optional', placeholder: 'Phone number' },
      { key: 'mobile',         label: 'Mobile',         type: 'text', required: 'optional', placeholder: 'Mobile number' },
      { key: 'fax',            label: 'Fax',            type: 'text', required: 'optional', placeholder: 'Fax number' },
      { key: 'email',          label: 'Email',          type: 'text', required: 'optional', placeholder: 'Email address' },
      { key: 'website',        label: 'Website',        type: 'text', required: 'optional', placeholder: 'Website URL' },
      { key: 'address_en',     label: 'Address (EN)',   type: 'textarea', required: 'optional', placeholder: 'Address in English', colSpan: 'full' as any },
      { key: 'address_ar',     label: 'Address (AR)',   type: 'textarea', required: 'optional', placeholder: 'العنوان بالعربية', colSpan: 'full' as any },
    ],
  },
  {
    key: 'business',
    label: 'Business Details',
    fields: [
      { key: 'license_number',     label: 'License Number',     type: 'text',   required: 'optional', placeholder: 'Operating license number' },
      { key: 'tax_number',         label: 'Tax Number',         type: 'text',   required: 'optional', placeholder: 'Tax registration number' },
      { key: 'fleet_size',         label: 'Fleet Size',         type: 'number', required: 'optional', placeholder: 'Number of vehicles' },
      { key: 'service_coverage',   label: 'Service Coverage',   type: 'select', required: 'optional', placeholder: 'Coverage area',
        options: [
          { value: 'local',         label: 'Local' },
          { value: 'national',      label: 'National' },
          { value: 'regional',      label: 'Regional' },
          { value: 'international', label: 'International' },
        ],
      },
      { key: 'rating',             label: 'Rating (1-5)',       type: 'number', required: 'optional', placeholder: 'Company rating' },
      { key: 'reliability_score',  label: 'Reliability Score',  type: 'number', required: 'optional', placeholder: 'Score 0-100' },
      { key: 'payment_terms_days', label: 'Payment Terms (days)', type: 'number', required: 'optional', placeholder: 'Payment terms in days' },
      { key: 'credit_limit',       label: 'Credit Limit',       type: 'number', required: 'optional', placeholder: 'Credit limit amount' },
    ],
  },
  {
    key: 'contract',
    label: 'Contract & Insurance',
    fields: [
      { key: 'contract_start',          label: 'Contract Start',         type: 'date', required: 'optional' },
      { key: 'contract_end',            label: 'Contract End',           type: 'date', required: 'optional' },
      { key: 'insurance_policy_number', label: 'Insurance Policy No.',   type: 'text', required: 'optional', placeholder: 'Insurance policy number' },
      { key: 'insurance_expiry',        label: 'Insurance Expiry',       type: 'date', required: 'optional' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'notes',      label: 'Notes',      type: 'textarea', required: 'optional', placeholder: 'Additional notes', colSpan: 'full' as any },
      { key: 'is_active',  label: 'Active',      type: 'toggle',   required: 'optional', defaultValue: true },
      { key: 'sort_order', label: 'Sort Order',  type: 'number',   required: 'optional', placeholder: 'Display order' },
    ],
  },
];

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'master:transport_companies:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:transport_companies:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'master:transport_companies:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:transport_companies:view',   position: ['toolbar'] },
];

export const transportCompaniesConfig: PageConfig<TransportCompany> = {
  title: 'Transport Companies',
  titleKey: 'pages.master.transportCompanies.title',
  subtitle: 'Manage transport and logistics companies',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Transport Companies' },
  ],
  apiEndpoint: '/api/master/transport-companies',
  resourceName: 'transport_companies',
  permissionPrefix: 'master:transport_companies',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'transport_companies',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const transportCompanyConfig = transportCompaniesConfig;
