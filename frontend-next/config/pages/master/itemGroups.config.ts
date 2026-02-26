/**
 * Item Groups Master Data — Page Configuration
 * Auto-generated governance config for Item Groups CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ItemGroup {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  parent_group_id?: number;
  group_level_id?: number;
  group_type_id?: number;
  description?: string;
  is_active: boolean;
}

export type { ItemGroup as ItemGroupType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ItemGroup>[] = [
  { key: 'code',            label: 'Code',         sortable: true,  width: 100 },
  { key: 'name_en',         label: 'Name (EN)',    sortable: true               },
  { key: 'name_ar',         label: 'Name (AR)',    sortable: true               },
  { key: 'parent_group_id', label: 'Parent Group', sortable: true,  width: 160  },
  { key: 'group_level_id',  label: 'Group Level',  sortable: true,  width: 140  },
  { key: 'is_active',       label: 'Active',       sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Group Code',      type: 'code', required: 'required',    placeholder: 'Unique group code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',   type: 'text', required: 'required',    placeholder: 'Item group name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',    type: 'text', required: 'recommended', placeholder: 'اسم مجموعة الأصناف بالعربية' },
    ],
  },
  {
    key: 'hierarchy',
    label: 'Hierarchy',
    fields: [
      {
        key: 'parent_group_id',
        label: 'Parent Group',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select parent group',
        helperText: 'Leave empty for top-level group',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/item-groups',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'group_level_id',
        label: 'Group Level',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select group level',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/group-levels',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'group_type_id',
        label: 'Group Type',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select group type',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/group-types',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
      },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Description of this item group', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:items:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:items:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:items:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:items:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const itemGroupsConfig: PageConfig<ItemGroup> = {
  title: 'Item Groups',
  titleKey: 'pages.master.itemGroups.title',
  subtitle: 'Manage hierarchical item group classifications',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Item Groups' },
  ],
  apiEndpoint: '/api/master/item-groups',
  resourceName: 'item-groups',
  permissionPrefix: 'master:items',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'item-groups',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
