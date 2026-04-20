/**
 * Insurance Companies Master Data — Page Configuration
 * Governance config for Insurance Companies CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface InsuranceCompany {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  policy_number_prefix?: string;
  website?: string;
  country_id?: number;
  city_id?: number;
  rating?: number;
  license_number?: string;
  specializations?: string[];
  notes?: string;
  is_active: boolean;
  sort_order?: number;
}

const columns: ColumnMeta<InsuranceCompany>[] = [
  { key: 'code',            label: 'Code',           sortable: true,  width: 100 },
  { key: 'name',            label: 'Name',           sortable: true },
  { key: 'name_en',         label: 'Name (EN)',      sortable: true },
  { key: 'name_ar',         label: 'Name (AR)',      sortable: true },
  { key: 'contact_person',  label: 'Contact',        sortable: true,  width: 140 },
  { key: 'phone',           label: 'Phone',          sortable: false, width: 130 },
  { key: 'email',           label: 'Email',          sortable: true,  width: 180 },
  { key: 'rating',          label: 'Rating',         sortable: true,  width: 80,  format: 'number', align: 'center' },
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
      { key: 'license_number',       label: 'License Number',      type: 'text',   required: 'optional', placeholder: 'Insurance license number' },
      { key: 'policy_number_prefix', label: 'Policy Number Prefix', type: 'text',   required: 'optional', placeholder: 'e.g., INS-' },
      { key: 'rating',               label: 'Rating (1-5)',        type: 'number', required: 'optional', placeholder: 'Company rating' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'master:insurance_companies:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:insurance_companies:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'master:insurance_companies:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:insurance_companies:view',   position: ['toolbar'] },
];

export const insuranceCompaniesConfig: PageConfig<InsuranceCompany> = {
  title: 'Insurance Companies',
  titleKey: 'pages.master.insuranceCompanies.title',
  subtitle: 'Manage insurance companies and policy providers',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Insurance Companies' },
  ],
  apiEndpoint: '/api/master/insurance-companies',
  resourceName: 'insurance_companies',
  permissionPrefix: 'master:insurance_companies',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'insurance_companies',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const insuranceCompanyConfig = insuranceCompaniesConfig;
