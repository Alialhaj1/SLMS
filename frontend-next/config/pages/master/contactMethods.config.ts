/**
 * Contact Methods Master Data — Page Configuration
 * Screen A-14 — طرق الاتصال
 * Enterprise governance config for Contact Methods CRUD.
 */
import React from 'react';
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ContactMethod {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  icon?: string;
  icon_color?: string;
  input_type?: string;
  input_format?: string;
  validation_regex?: string;
  placeholder_en?: string;
  placeholder_ar?: string;
  is_primary?: boolean;
  is_notification_channel?: boolean;
  is_system?: boolean;
  is_active: boolean;
  status?: string;
  sort_order?: number;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}

export type { ContactMethod as ContactMethodType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ContactMethod>[] = [
  { key: 'code',       label: 'Code',       sortable: true,  width: 100 },
  {
    key: 'icon',
    label: 'Icon',
    sortable: false,
    width: 60,
    align: 'center',
    render: (value: any, row: ContactMethod) => {
      return React.createElement('span', {
        style: { fontSize: '20px', color: row.icon_color || '#6B7280' },
      }, row.icon || '—');
    },
  },
  { key: 'name_en',    label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)',  sortable: true               },
  { key: 'input_type', label: 'Input Type', sortable: true,  width: 90  },
  {
    key: 'is_primary',
    label: 'Primary',
    sortable: true,
    width: 80,
    align: 'center',
    render: (value: any) => value ? '⭐' : '—',
  },
  {
    key: 'is_notification_channel',
    label: 'Notify',
    sortable: true,
    width: 70,
    align: 'center',
    render: (value: any) => value ? '🔔' : '—',
  },
  {
    key: 'is_system',
    label: 'System',
    sortable: true,
    width: 70,
    align: 'center',
    render: (value: any) => value ? '🔒' : '—',
  },
  { key: 'sort_order', label: 'Order',      sortable: true,  width: 70,  align: 'center' },
  { key: 'is_active',  label: 'Active',     sortable: true,  width: 80,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity / الهوية',
    fields: [
      { key: 'code',    label: 'Code / الرمز',            type: 'code', required: 'required',    placeholder: 'e.g. email, phone, whatsapp', autoUppercase: false, validation: [{ type: 'maxLength', value: 30 }], colSpan: 4,
        helperText: 'Unique lowercase identifier' },
      { key: 'name_en', label: 'Name (English)',           type: 'text', required: 'required',    placeholder: 'Contact method name in English' },
      { key: 'name_ar', label: 'الاسم بالعربية',           type: 'text', required: 'required',    placeholder: 'اسم طريقة الاتصال بالعربية' },
      { key: 'description_en', label: 'Description (EN)',  type: 'textarea', required: 'optional', placeholder: 'What this method is for...' },
      { key: 'description_ar', label: 'الوصف بالعربية',    type: 'textarea', required: 'optional', placeholder: 'وصف طريقة الاتصال...' },
    ],
  },
  {
    key: 'appearance',
    label: 'Icon & Appearance / الأيقونة والمظهر',
    fields: [
      { key: 'icon',       label: 'Icon / الأيقونة',        type: 'text',  required: 'optional', placeholder: '📧 📞 📱 💬 🌐', colSpan: 4,
        helperText: 'Emoji icon for this method' },
      { key: 'icon_color', label: 'Icon Color / لون الأيقونة', type: 'color', required: 'optional', placeholder: '#3B82F6', colSpan: 4 },
      { key: 'sort_order', label: 'Sort Order / ترتيب',     type: 'number', required: 'optional', placeholder: '1, 2, 3...' },
    ],
  },
  {
    key: 'input',
    label: 'Input & Validation / التنسيق والتحقق',
    fields: [
      { key: 'input_type', label: 'Input Type / نوع الإدخال',  type: 'select', required: 'optional',
        options: [
          { value: 'text', label: 'Text' },
          { value: 'email', label: 'Email' },
          { value: 'tel', label: 'Telephone' },
          { value: 'url', label: 'URL' },
          { value: 'number', label: 'Number' },
        ],
        defaultValue: 'text' },
      { key: 'input_format',     label: 'Input Format / تنسيق',       type: 'text', required: 'optional', placeholder: '+XXX XX XXX XXXX' },
      { key: 'validation_regex', label: 'Validation Regex / تعبير نمطي', type: 'text', required: 'optional', placeholder: '^[a-zA-Z0-9._%+-]+@...',
        helperText: 'Regular expression for validating user input' },
      { key: 'placeholder_en',   label: 'Placeholder (EN)',            type: 'text', required: 'optional', placeholder: 'example@company.com' },
      { key: 'placeholder_ar',   label: 'Placeholder (AR)',            type: 'text', required: 'optional', placeholder: 'مثال@شركة.كوم' },
    ],
  },
  {
    key: 'behavior',
    label: 'Behavior & Flags / السلوك',
    fields: [
      { key: 'is_primary',              label: 'Primary / أساسي',                 type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Is this a primary contact method?' },
      { key: 'is_notification_channel', label: 'Notification Channel / قناة إشعار', type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Can send notifications via this method?' },
      { key: 'is_system',               label: 'System Protected / محمي',         type: 'toggle', required: 'optional', defaultValue: false },
    ],
  },
  {
    key: 'settings',
    label: 'Settings / الإعدادات',
    fields: [
      { key: 'is_active', label: 'Active / مفعّل', type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:contact_methods:create', position: ['toolbar'], shortcut: 'N' },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:contact_methods:edit',   position: ['row'], shortcut: 'E' },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:contact_methods:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true, shortcut: 'Delete' },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:contact_methods:view',   position: ['toolbar'] },
];

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const statsConfig = {
  cards: [
    { key: 'total',                  label: 'Total',                labelKey: 'stats.total',                color: 'blue'   as const, valueKey: 'total' },
    { key: 'active',                 label: 'Active',               labelKey: 'stats.active',               color: 'green'  as const, valueKey: 'active' },
    { key: 'inactive',               label: 'Inactive',             labelKey: 'stats.inactive',             color: 'gray'   as const, valueKey: 'inactive' },
    { key: 'primary_count',          label: 'Primary',              labelKey: 'stats.primary',              color: 'yellow' as const, valueKey: 'primary_count' },
    { key: 'notification_channels',  label: 'Notification Channels', labelKey: 'stats.notificationChannels', color: 'purple' as const, valueKey: 'notification_channels' },
  ],
};

// ─── Page Config ──────────────────────────────────────────────────────────────

export const contactMethodsConfig: PageConfig<ContactMethod> = {
  title: 'Contact Methods / طرق الاتصال',
  titleKey: 'pages.master.contactMethods.title',
  subtitle: 'Manage communication channel types (phone, email, fax, etc.)',
  subtitleKey: 'pages.master.contactMethods.subtitle',
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
  statsConfig,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'contact_methods',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  detailPanelEnabled: true,
  bulkOperationsEnabled: true,
  cardsConfig: {
    titleField: 'name_en',
    subtitleField: 'name_ar',
    bodyFields: ['code', 'input_type', 'icon'],
    statusField: 'is_active',
  },
};
