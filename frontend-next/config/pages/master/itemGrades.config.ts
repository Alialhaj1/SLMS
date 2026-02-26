/**
 * Item Grades Master Data — Page Configuration
 * Auto-generated governance config for Item Grades CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ItemGrade {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  sort_order?: number;
  description?: string;
  is_active: boolean;
}

export type { ItemGrade as ItemGradeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ItemGrade>[] = [
  { key: 'code',       label: 'Code',       sortable: true,  width: 100 },
  { key: 'name_en',    label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)',  sortable: true               },
  { key: 'sort_order', label: 'Sort Order', sortable: true,  width: 110, align: 'center', format: 'number' },
  { key: 'is_active',  label: 'Active',     sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Grade code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Item grade name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم درجة الصنف بالعربية' },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'sort_order',  label: 'Sort Order',  type: 'number',   required: 'optional', placeholder: '0', helperText: 'Display order (lower = first)', colSpan: 4 },
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Description of this grade', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:item_grades:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:item_grades:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:item_grades:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:item_grades:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const itemGradesConfig: PageConfig<ItemGrade> = {
  title: 'Item Grades',
  titleKey: 'pages.master.itemGrades.title',
  subtitle: 'Manage quality grades for items',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Item Grades' },
  ],
  apiEndpoint: '/api/master/item-grades',
  resourceName: 'item-grades',
  permissionPrefix: 'master:item_grades',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'item-grades',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
