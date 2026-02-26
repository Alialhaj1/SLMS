/**
 * Contact Methods Master Data — Page Configuration
 * Auto-generated governance config for Contact Methods CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ContactMethod {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

export type { ContactMethod as ContactMethodType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ContactMethod>[] = [
  { key: 'code',        label: 'Code',        sortable: true,  width: 100 },
  { key: 'name_en',     label: 'Name (EN)',   sortable: true               },
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
      { key: 'code',        label: 'Code',           type: 'code',     required: 'optional',    placeholder: 'Contact method code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',     label: 'Name (English)',  type: 'text',     required: 'required',    placeholder: 'Contact method name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',   type: 'text',     required: 'recommended', placeholder: 'اسم طريقة الاتصال بالعربية' },
      { key: 'description', label: 'Description',     type: 'textarea', required: 'optional',    placeholder: 'Brief description of this contact method', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:contact_methods:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:contact_methods:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:contact_methods:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:contact_methods:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const contactMethodsConfig: PageConfig<ContactMethod> = {
  title: 'Contact Methods',
  titleKey: 'pages.master.contactMethods.title',
  subtitle: 'Manage communication channel types (phone, email, fax, etc.)',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Contact Methods' },
  ],
  apiEndpoint: '/api/master/contact-methods',
  resourceName: 'contact_methods',
  permissionPrefix: 'master:contact_methods',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'contact_methods',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
