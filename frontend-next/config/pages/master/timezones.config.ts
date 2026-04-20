/**
 * Timezones Master Data — Page Configuration
 * Screen A-04 — المناطق الزمنية
 * Enterprise governance config for Timezones CRUD.
 */
import React from 'react';
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Timezone {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  abbreviation?: string;
  utc_offset: string;
  dst_observed?: boolean;
  region?: string;
  is_default?: boolean;
  is_system?: boolean;
  is_active: boolean;
  status?: string;
  sort_order?: number;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}

export type { Timezone as TimezoneType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Timezone>[] = [
  { key: 'code',         label: 'IANA Code',      sortable: true,  width: 180 },
  { key: 'abbreviation', label: 'Abbr',           sortable: true,  width: 70,  align: 'center' },
  { key: 'name_en',      label: 'Name (EN)',      sortable: true               },
  { key: 'name_ar',      label: 'Name (AR)',      sortable: true               },
  {
    key: 'utc_offset',
    label: 'UTC Offset',
    sortable: true,
    width: 100,
    align: 'center',
    render: (value: any) => {
      const color = value?.startsWith('-') ? '#EF4444' : '#16A34A';
      return React.createElement('span', {
        style: { fontFamily: 'monospace', fontWeight: 600, color },
      }, `UTC${value || '+00:00'}`);
    },
  },
  {
    key: 'dst_observed',
    label: 'DST',
    sortable: true,
    width: 60,
    align: 'center',
    render: (value: any) => value ? '🕐' : '—',
  },
  { key: 'region',      label: 'Region',         sortable: true,  width: 90 },
  {
    key: 'is_system',
    label: 'System',
    sortable: true,
    width: 70,
    align: 'center',
    render: (value: any) => value ? '🔒' : '—',
  },
  { key: 'sort_order',  label: 'Order',          sortable: true,  width: 70,  align: 'center' },
  { key: 'is_active',   label: 'Active',         sortable: true,  width: 80,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity / الهوية',
    fields: [
      { key: 'code',         label: 'IANA Code / رمز IANA',       type: 'text', required: 'required',    placeholder: 'Asia/Riyadh, Europe/London',
        helperText: 'IANA timezone identifier (e.g. Asia/Riyadh)' },
      { key: 'abbreviation', label: 'Abbreviation / الاختصار',    type: 'text', required: 'optional',    placeholder: 'AST, GMT, EST', colSpan: 4,
        helperText: 'Short timezone abbreviation' },
      { key: 'name_en',      label: 'Name (English)',              type: 'text', required: 'required',    placeholder: 'Saudi Arabia Time' },
      { key: 'name_ar',      label: 'الاسم بالعربية',              type: 'text', required: 'required',    placeholder: 'توقيت السعودية' },
      { key: 'description_en', label: 'Description (EN)',          type: 'textarea', required: 'optional', placeholder: 'Description in English...' },
      { key: 'description_ar', label: 'الوصف بالعربية',            type: 'textarea', required: 'optional', placeholder: 'وصف مختصر...' },
    ],
  },
  {
    key: 'timezone_data',
    label: 'Timezone Data / بيانات المنطقة الزمنية',
    fields: [
      { key: 'utc_offset',   label: 'UTC Offset / فرق التوقيت',   type: 'text',   required: 'required',    placeholder: '+03:00, -05:00', colSpan: 4,
        helperText: 'Format: +HH:MM or -HH:MM' },
      { key: 'dst_observed', label: 'DST Observed / توقيت صيفي',  type: 'toggle', required: 'optional',    defaultValue: false,
        helperText: 'Does this timezone observe daylight saving time?' },
      { key: 'region',       label: 'Region / المنطقة',            type: 'text',   required: 'optional',    placeholder: 'Asia, Europe, America, Africa',
        helperText: 'Geographic region for grouping' },
      { key: 'sort_order',   label: 'Sort Order / ترتيب',         type: 'number', required: 'optional',    placeholder: '1, 2, 3...' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings / الإعدادات',
    fields: [
      { key: 'is_default', label: 'Default / افتراضي',          type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Default timezone for the system' },
      { key: 'is_system',  label: 'System Protected / محمي',    type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'is_active',  label: 'Active / مفعّل',             type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:timezones:create', position: ['toolbar'], shortcut: 'N' },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:timezones:edit',   position: ['row'], shortcut: 'E' },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:timezones:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true, shortcut: 'Delete' },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:timezones:view',   position: ['toolbar'] },
];

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const statsConfig = {
  cards: [
    { key: 'total',     label: 'Total',       labelKey: 'stats.total',     color: 'blue'   as const, valueKey: 'total' },
    { key: 'active',    label: 'Active',      labelKey: 'stats.active',    color: 'green'  as const, valueKey: 'active' },
    { key: 'inactive',  label: 'Inactive',    labelKey: 'stats.inactive',  color: 'gray'   as const, valueKey: 'inactive' },
    { key: 'dst_count', label: 'DST Observed', labelKey: 'stats.dstCount', color: 'yellow' as const, valueKey: 'dst_count' },
    { key: 'regions',   label: 'Regions',     labelKey: 'stats.regions',   color: 'purple' as const, valueKey: 'regions' },
  ],
};

// ─── Page Config ──────────────────────────────────────────────────────────────

export const timezonesConfig: PageConfig<Timezone> = {
  title: 'Timezones / المناطق الزمنية',
  titleKey: 'pages.master.timezones.title',
  subtitle: 'Manage IANA timezone definitions, UTC offsets, and DST settings',
  subtitleKey: 'pages.master.timezones.subtitle',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Timezones' },
  ],
  apiEndpoint: '/api/master/timezones',
  resourceName: 'timezones',
  permissionPrefix: 'master:timezones',
  columns,
  formSections,
  actions,
  statsConfig,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'timezones',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  detailPanelEnabled: true,
  bulkOperationsEnabled: true,
  cardsConfig: {
    titleField: 'name_en',
    subtitleField: 'code',
    bodyFields: ['utc_offset', 'abbreviation', 'region'],
    statusField: 'is_active',
  },
};
