/**
 * Customer Categories Master Data — Page Configuration
 * Auto-generated governance config for Customer Categories CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface CustomerCategory {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

export type { CustomerCategory as CustomerCategoryType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<CustomerCategory>[] = [
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
      { key: 'code',        label: 'Code',           type: 'code',     required: 'optional',    placeholder: 'Category code', autoUppercase: true, colSpan: 4 },
      { key: 'name',        label: 'Name (English)',  type: 'text',     required: 'required',    placeholder: 'Category name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',   type: 'text',     required: 'recommended', placeholder: 'اسم فئة العميل بالعربية' },
      { key: 'description', label: 'Description',     type: 'textarea', required: 'optional',    placeholder: 'Brief description of this customer category', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:customer_categories:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:customer_categories:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:customer_categories:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:customer_categories:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const customerCategoriesConfig: PageConfig<CustomerCategory> = {
  title: 'Customer Categories',
  titleKey: 'pages.master.customerCategories.title',
  subtitle: 'Manage customer category classifications (VIP, regular, wholesale, etc.)',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Customer Categories' },
  ],
  apiEndpoint: '/api/master/customer-categories',
  resourceName: 'customer_categories',
  permissionPrefix: 'master:customer_categories',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'customer_categories',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const customerCategoryConfig = customerCategoriesConfig;
