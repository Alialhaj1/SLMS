/**
 * Group Levels Master Data — Page Configuration
 * Config for Group Levels CRUD (stored in reference_data table).
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface GroupLevel {
  id: number;
  code?: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  is_active: boolean;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<GroupLevel>[] = [
  { key: 'code',           label: 'Code',             sortable: true,  width: 120 },
  { key: 'name_en',        label: 'Name (EN)',        sortable: true               },
  { key: 'name_ar',        label: 'Name (AR)',        sortable: true               },
  { key: 'description_en', label: 'Description',      sortable: false              },
  { key: 'is_active',      label: 'Active',           sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',           label: 'Code',               type: 'code',     required: 'optional',    placeholder: 'Level code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',        label: 'Name (English)',      type: 'text',     required: 'required',    placeholder: 'Level name in English' },
      { key: 'name_ar',        label: 'Name (Arabic)',       type: 'text',     required: 'recommended', placeholder: 'اسم المستوى بالعربية' },
      { key: 'description_en', label: 'Description (EN)',    type: 'textarea', required: 'optional',    placeholder: 'Description in English', colSpan: 'full' as any },
      { key: 'description_ar', label: 'Description (AR)',    type: 'textarea', required: 'optional',    placeholder: 'الوصف بالعربية', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'group_levels:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'group_levels:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'group_levels:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'group_levels:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const groupLevelConfig: PageConfig<GroupLevel> = {
  title: 'Group Levels',
  titleKey: 'pages.master.groupLevels.title',
  subtitle: 'Define hierarchical coding level definitions',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Group Levels' },
  ],
  apiEndpoint: '/api/master/group-levels',
  resourceName: 'group_levels',
  permissionPrefix: 'group_levels',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'group_levels',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: false,
};
