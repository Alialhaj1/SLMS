/**
 * Group Categories Master Data — Page Configuration
 * Config for Group Categories CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface GroupCategory {
  id: number;
  code?: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  sort_order?: number;
  is_active: boolean;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<GroupCategory>[] = [
  { key: 'code',           label: 'Code',         sortable: true,  width: 120 },
  { key: 'name_en',        label: 'Name (EN)',     sortable: true               },
  { key: 'name_ar',        label: 'Name (AR)',     sortable: true               },
  { key: 'description_en', label: 'Description',   sortable: false              },
  { key: 'sort_order',     label: 'Sort Order',    sortable: true,  width: 100, align: 'center' },
  { key: 'is_active',      label: 'Active',        sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',           label: 'Code',               type: 'code',     required: 'optional',    placeholder: 'Category code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',        label: 'Name (English)',      type: 'text',     required: 'required',    placeholder: 'Category name in English' },
      { key: 'name_ar',        label: 'Name (Arabic)',       type: 'text',     required: 'recommended', placeholder: 'اسم التصنيف بالعربية' },
      { key: 'description_en', label: 'Description (EN)',    type: 'textarea', required: 'optional',    placeholder: 'Description in English', colSpan: 'full' as any },
      { key: 'description_ar', label: 'Description (AR)',    type: 'textarea', required: 'optional',    placeholder: 'الوصف بالعربية', colSpan: 'full' as any },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'sort_order', label: 'Sort Order', type: 'number', required: 'optional', placeholder: '0' },
      { key: 'is_active',  label: 'Active',     type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'group_categories:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'group_categories:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'group_categories:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'group_categories:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const groupCategoryConfig: PageConfig<GroupCategory> = {
  title: 'Group Categories',
  titleKey: 'pages.master.groupCategories.title',
  subtitle: 'Manage item group categories with tree structure',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Group Categories' },
  ],
  apiEndpoint: '/api/master/group-categories',
  resourceName: 'group_categories',
  permissionPrefix: 'group_categories',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'group_categories',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: false,
};
