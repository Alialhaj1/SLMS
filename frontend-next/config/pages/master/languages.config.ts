/**
 * Languages Master Data — Page Configuration
 * Auto-generated governance config for Languages CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Language {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  native_name?: string;
  direction?: string;
  is_active: boolean;
}

export type { Language as LanguageType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Language>[] = [
  { key: 'code',        label: 'Code',        sortable: true,  width: 90  },
  { key: 'name',        label: 'Name',        sortable: true               },
  { key: 'native_name', label: 'Native Name', sortable: true               },
  { key: 'direction',   label: 'Direction',   sortable: true,  width: 100, align: 'center' },
  { key: 'is_active',   label: 'Active',      sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const DIRECTION_OPTIONS = [
  { value: 'ltr', label: 'Left to Right (LTR)', labelAr: 'من اليسار إلى اليمين' },
  { value: 'rtl', label: 'Right to Left (RTL)', labelAr: 'من اليمين إلى اليسار' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',        label: 'Language Code',   type: 'code', required: 'required',    placeholder: 'e.g. en', autoUppercase: false, validation: [{ type: 'maxLength', value: 5 }], colSpan: 4 },
      { key: 'name',        label: 'Name (English)',   type: 'text', required: 'required',    placeholder: 'Language name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',    type: 'text', required: 'recommended', placeholder: 'اسم اللغة بالعربية' },
      { key: 'native_name', label: 'Native Name',      type: 'text', required: 'optional',    placeholder: 'Name in native script' },
    ],
  },
  {
    key: 'display',
    label: 'Display',
    fields: [
      {
        key: 'direction',
        label: 'Text Direction',
        type: 'select',
        required: 'optional',
        defaultValue: 'ltr',
        options: DIRECTION_OPTIONS,
        dataSource: { type: 'static', options: DIRECTION_OPTIONS },
        colSpan: 6,
      },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:languages:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:languages:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:languages:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:languages:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const languagesConfig: PageConfig<Language> = {
  title: 'Languages',
  titleKey: 'pages.master.languages.title',
  subtitle: 'Manage supported languages and text directions',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Languages' },
  ],
  apiEndpoint: '/api/master/languages',
  resourceName: 'languages',
  permissionPrefix: 'master:languages',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'languages',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
