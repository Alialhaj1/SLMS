/**
 * UI Themes Master Data — Page Configuration
 * Auto-generated governance config for UI Themes CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface UiTheme {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  primary_color?: string;
  secondary_color?: string;
  is_default?: boolean;
  is_active: boolean;
}

export type { UiTheme as UiThemeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<UiTheme>[] = [
  { key: 'code',            label: 'Code',            sortable: true,  width: 100 },
  { key: 'name_en',         label: 'Name (EN)',       sortable: true               },
  { key: 'primary_color',   label: 'Primary Color',   sortable: false, width: 130, format: 'color' },
  { key: 'secondary_color', label: 'Secondary Color', sortable: false, width: 140, format: 'color' },
  { key: 'is_default',      label: 'Default',         sortable: true,  width: 90,  format: 'boolean', align: 'center' },
  { key: 'is_active',       label: 'Active',          sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Theme code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Theme name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم القالب بالعربية' },
    ],
  },
  {
    key: 'colors',
    label: 'Color Scheme',
    fields: [
      { key: 'primary_color',   label: 'Primary Color',   type: 'color', required: 'optional', placeholder: '#3B82F6' },
      { key: 'secondary_color', label: 'Secondary Color', type: 'color', required: 'optional', placeholder: '#64748B' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'is_default', label: 'Default Theme', type: 'checkbox', required: 'optional', defaultValue: false },
      { key: 'is_active',  label: 'Active',        type: 'toggle',   required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:ui_themes:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:ui_themes:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:ui_themes:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:ui_themes:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const uiThemesConfig: PageConfig<UiTheme> = {
  title: 'UI Themes',
  titleKey: 'pages.master.uiThemes.title',
  subtitle: 'Manage user interface theme definitions and color schemes',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'UI Themes' },
  ],
  apiEndpoint: '/api/master/ui-themes',
  resourceName: 'ui_themes',
  permissionPrefix: 'master:ui_themes',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'ui_themes',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
