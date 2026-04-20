/**
 * Cost Centers Master Data — Page Configuration
 * Governance config for Cost Centers CRUD with hierarchical parent/child support.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface CostCenter {
  id: number;
  company_id?: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  parent_id?: number | null;
  parent_code?: string | null;
  parent_name?: string | null;
  parent_name_ar?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<CostCenter>[] = [
  { key: 'code',        label: 'Code',              sortable: true,  width: 140 },
  { key: 'name',        label: 'Name (EN)',         sortable: true               },
  { key: 'name_ar',     label: 'Name (AR)',         sortable: true               },
  { key: 'parent_name', label: 'Parent Center',     sortable: true,  width: 200  },
  { key: 'description', label: 'Description',       sortable: false, width: 220  },
  { key: 'is_active',   label: 'Active',            sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity / الهوية',
    fields: [
      { key: 'code',    label: 'Cost Center Code',    type: 'code', required: 'required',    placeholder: 'e.g. CC001', autoUppercase: true, validation: [{ type: 'maxLength', value: 30 }], colSpan: 4 },
      { key: 'name',    label: 'Name (English)',       type: 'text', required: 'required',    placeholder: 'Cost center name' },
      { key: 'name_ar', label: 'Name (Arabic)',        type: 'text', required: 'recommended', placeholder: 'اسم مركز التكلفة بالعربية' },
    ],
  },
  {
    key: 'hierarchy',
    label: 'Hierarchy / التسلسل',
    fields: [
      { key: 'parent_id',   label: 'Parent Cost Center', type: 'select', required: 'optional', placeholder: 'None (Top Level)',
        lookupEndpoint: '/api/master/cost-centers?is_active=true&limit=500',
        lookupLabelField: 'name',
        lookupValueField: 'id',
        lookupCodeField: 'code',
        helperText: 'Select a parent to create a sub cost center',
      },
    ],
  },
  {
    key: 'details',
    label: 'Details / التفاصيل',
    collapsible: true,
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Purpose and scope of this cost center' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings / الإعدادات',
    fields: [
      { key: 'is_active', label: 'Active', type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:cost_centers:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:cost_centers:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:cost_centers:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:cost_centers:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const costCentersConfig: PageConfig<CostCenter> = {
  title: 'Cost Centers',
  titleKey: 'pages.master.costCenters.title',
  subtitle: 'Manage cost centers hierarchy for financial tracking, budgeting, and reporting',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Cost Centers' },
  ],
  apiEndpoint: '/api/master/cost-centers',
  resourceName: 'cost-centers',
  permissionPrefix: 'master:cost_centers',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'cost-centers',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
