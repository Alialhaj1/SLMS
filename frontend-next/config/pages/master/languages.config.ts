/**
 * Languages Master Data — Page Configuration
 * Screen A-03 — اللغات
 * Enterprise governance config for Languages CRUD.
 */
import React from 'react';
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Language {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  name_native?: string;
  direction?: string;
  date_format?: string;
  time_format?: string;
  number_format?: string;
  currency_position?: string;
  decimal_separator?: string;
  thousands_separator?: string;
  flag_icon?: string;
  is_default?: boolean;
  is_system_language?: boolean;
  is_document_language?: boolean;
  is_protected?: boolean;
  is_system?: boolean;
  is_global?: boolean;
  is_favorite?: boolean;
  is_active: boolean;
  status?: string;
  sort_order?: number;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}

export type { Language as LanguageType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Language>[] = [
  {
    key: 'flag_icon',
    label: 'Flag',
    sortable: false,
    width: 50,
    align: 'center',
    render: (value: any) => value || '🌐',
  },
  { key: 'code',        label: 'Code',        sortable: true,  width: 70  },
  { key: 'name_en',     label: 'Name (EN)',   sortable: true               },
  { key: 'name_ar',     label: 'Name (AR)',   sortable: true               },
  { key: 'name_native', label: 'Native Name', sortable: true               },
  {
    key: 'direction',
    label: 'Dir',
    sortable: true,
    width: 60,
    align: 'center',
    render: (value: any) => {
      return React.createElement('span', {
        style: {
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          color: value === 'rtl' ? '#9333EA' : '#3B82F6',
          backgroundColor: value === 'rtl' ? '#F3E8FF' : '#EFF6FF',
        },
      }, (value || 'ltr').toUpperCase());
    },
  },
  {
    key: 'is_system_language',
    label: 'System',
    sortable: true,
    width: 70,
    align: 'center',
    render: (value: any) => value ? '🖥️' : '—',
  },
  {
    key: 'is_document_language',
    label: 'Docs',
    sortable: true,
    width: 60,
    align: 'center',
    render: (value: any) => value ? '📄' : '—',
  },
  { key: 'sort_order', label: 'Order',      sortable: true,  width: 70,  align: 'center' },
  { key: 'is_active',  label: 'Active',     sortable: true,  width: 80,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const DIRECTION_OPTIONS = [
  { value: 'ltr', label: 'Left to Right (LTR)' },
  { value: 'rtl', label: 'Right to Left (RTL)' },
];

const CURRENCY_POS_OPTIONS = [
  { value: 'before', label: 'Before — $100' },
  { value: 'after',  label: 'After — 100$' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity / الهوية',
    fields: [
      { key: 'code',        label: 'Code (ISO 639) / الرمز',   type: 'code', required: 'required',    placeholder: 'en, ar, fr', autoUppercase: false, validation: [{ type: 'maxLength', value: 10 }], colSpan: 4,
        helperText: 'ISO 639-1 language code (2 letters)' },
      { key: 'name_en',     label: 'Name (English)',            type: 'text', required: 'required',    placeholder: 'Language name in English' },
      { key: 'name_ar',     label: 'الاسم بالعربية',            type: 'text', required: 'required',    placeholder: 'اسم اللغة بالعربية' },
      { key: 'name_native', label: 'Native Name / الاسم المحلي', type: 'text', required: 'optional',    placeholder: 'العربية, English, Français' },
      { key: 'flag_icon',   label: 'Flag / العلم',              type: 'text', required: 'optional',    placeholder: '🇸🇦 🇬🇧 🇫🇷', colSpan: 4 },
    ],
  },
  {
    key: 'display',
    label: 'Display & Direction / عرض الاتجاه',
    fields: [
      { key: 'direction', label: 'Text Direction / اتجاه النص', type: 'select', required: 'optional', defaultValue: 'ltr',
        options: DIRECTION_OPTIONS },
      { key: 'sort_order', label: 'Sort Order / الترتيب',       type: 'number', required: 'optional', placeholder: '1, 2, 3...' },
    ],
  },
  {
    key: 'formats',
    label: 'Date & Number Formats / صيغ التاريخ والأرقام',
    fields: [
      { key: 'date_format',          label: 'Date Format / صيغة التاريخ',        type: 'text',   required: 'optional', placeholder: 'YYYY-MM-DD', defaultValue: 'YYYY-MM-DD' },
      { key: 'time_format',          label: 'Time Format / صيغة الوقت',          type: 'text',   required: 'optional', placeholder: 'HH:mm:ss',   defaultValue: 'HH:mm:ss' },
      { key: 'number_format',        label: 'Number Format / صيغة الأرقام',      type: 'text',   required: 'optional', placeholder: '#,##0.00',    defaultValue: '#,##0.00' },
      { key: 'decimal_separator',    label: 'Decimal Separator / فاصلة عشرية',   type: 'text',   required: 'optional', placeholder: '.', colSpan: 4 },
      { key: 'thousands_separator',  label: 'Thousands Separator / فاصلة آلاف',  type: 'text',   required: 'optional', placeholder: ',', colSpan: 4 },
      { key: 'currency_position',    label: 'Currency Position / موضع العملة',    type: 'select', required: 'optional', defaultValue: 'before',
        options: CURRENCY_POS_OPTIONS },
    ],
  },
  {
    key: 'usage',
    label: 'Usage & Scope / الاستخدام والنطاق',
    fields: [
      { key: 'is_system_language',   label: 'System Language (UI) / لغة النظام',   type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Available as a UI language in the application' },
      { key: 'is_document_language', label: 'Document Language / لغة المستندات',   type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Used for generating PDFs, invoices, reports' },
      { key: 'is_default',           label: 'Default Language / لغة افتراضية',      type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'is_protected',         label: 'Protected / محمي من الحذف',           type: 'toggle', required: 'optional', defaultValue: false },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:languages:create', position: ['toolbar'], shortcut: 'N' },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:languages:edit',   position: ['row'], shortcut: 'E' },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:languages:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true, shortcut: 'Delete' },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:languages:view',   position: ['toolbar'] },
];

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const statsConfig = {
  cards: [
    { key: 'total',              label: 'Total',              labelKey: 'stats.total',             color: 'blue'   as const, valueKey: 'total' },
    { key: 'active',             label: 'Active',             labelKey: 'stats.active',            color: 'green'  as const, valueKey: 'active' },
    { key: 'rtl_count',          label: 'RTL Languages',      labelKey: 'stats.rtlCount',          color: 'purple' as const, valueKey: 'rtl_count' },
    { key: 'system_languages',   label: 'System Languages',   labelKey: 'stats.systemLanguages',   color: 'cyan'   as const, valueKey: 'system_languages' },
    { key: 'document_languages', label: 'Doc Languages',      labelKey: 'stats.documentLanguages', color: 'yellow' as const, valueKey: 'document_languages' },
  ],
};

// ─── Page Config ──────────────────────────────────────────────────────────────

export const languagesConfig: PageConfig<Language> = {
  title: 'Languages / اللغات',
  titleKey: 'pages.master.languages.title',
  subtitle: 'Manage supported languages, text directions, and format settings',
  subtitleKey: 'pages.master.languages.subtitle',
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
  statsConfig,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'languages',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  detailPanelEnabled: true,
  bulkOperationsEnabled: true,
  cardsConfig: {
    titleField: 'name_en',
    subtitleField: 'name_native',
    bodyFields: ['code', 'flag_icon', 'direction'],
    statusField: 'is_active',
  },
};
