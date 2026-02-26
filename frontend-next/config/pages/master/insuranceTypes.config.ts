/**
 * Insurance Types Master Data — Page Configuration
 * Auto-generated governance config for Insurance Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface InsuranceType {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  coverage_type?: string;
  description?: string;
  is_active: boolean;
}

export type { InsuranceType as InsuranceTypeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<InsuranceType>[] = [
  { key: 'code',          label: 'Code',          sortable: true,  width: 100 },
  { key: 'name_en',       label: 'Name (EN)',     sortable: true               },
  { key: 'name_ar',       label: 'Name (AR)',     sortable: true               },
  { key: 'coverage_type', label: 'Coverage Type', sortable: true,  width: 160  },
  { key: 'is_active',     label: 'Active',        sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Insurance type code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Insurance type name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم نوع التأمين بالعربية' },
    ],
  },
  {
    key: 'classification',
    label: 'Classification',
    fields: [
      {
        key: 'coverage_type',
        label: 'Coverage Type',
        type: 'select',
        required: 'optional',
        placeholder: 'Select coverage type',
        options: [
          { value: 'All Risk',   label: 'All Risk' },
          { value: 'FPA',        label: 'FPA (Free of Particular Average)' },
          { value: 'WA',         label: 'WA (With Average)' },
          { value: 'Total Loss', label: 'Total Loss' },
        ],
      },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Description of this insurance type', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:insurance_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:insurance_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:insurance_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:insurance_types:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const insuranceTypesConfig: PageConfig<InsuranceType> = {
  title: 'Insurance Types',
  titleKey: 'pages.master.insuranceTypes.title',
  subtitle: 'Manage cargo insurance types and coverage categories',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Insurance Types' },
  ],
  apiEndpoint: '/api/master/insurance-types',
  resourceName: 'insurance-types',
  permissionPrefix: 'master:insurance_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'insurance-types',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
