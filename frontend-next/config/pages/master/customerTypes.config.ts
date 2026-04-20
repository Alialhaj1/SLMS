/**
 * Customer Types Master Data — Page Configuration
 * Auto-generated governance config for Customer Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface CustomerType {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

export type { CustomerType as CustomerTypeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<CustomerType>[] = [
  { key: 'code',        label: 'Code',        sortable: true,  width: 100 },
  { key: 'name',        label: 'Name',        sortable: true               },
  { key: 'name_ar',     label: 'Name (AR)',   sortable: true               },
  { key: 'description', label: 'Description', sortable: false              },
  { key: 'is_active',   label: 'Active',      sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',        label: 'Code',           type: 'code',     required: 'optional',    placeholder: 'Customer type code', autoUppercase: true, colSpan: 4 },
      { key: 'name',        label: 'Name (English)',  type: 'text',     required: 'required',    placeholder: 'Customer type name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',   type: 'text',     required: 'recommended', placeholder: 'اسم نوع العميل بالعربية' },
      { key: 'description', label: 'Description',     type: 'textarea', required: 'optional',    placeholder: 'Brief description of this customer type', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:customer_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:customer_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:customer_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:customer_types:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const customerTypesConfig: PageConfig<CustomerType> = {
  title: 'Customer Types',
  titleKey: 'pages.master.customerTypes.title',
  subtitle: 'Manage customer type classifications (individual, corporate, government, etc.)',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Customer Types' },
  ],
  apiEndpoint: '/api/master/customer-types',
  resourceName: 'customer_types',
  permissionPrefix: 'master:customer_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'customer_types',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const customerTypeConfig = customerTypesConfig;
