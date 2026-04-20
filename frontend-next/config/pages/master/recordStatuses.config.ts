/**
 * Record Statuses Master Data — Page Configuration
 * Screen A-15 — حالة السجلات
 * Enterprise governance config for Record Statuses CRUD.
 */
import React from 'react';
import type { PageConfig, ColumnMeta, ActionMeta, PageSection, StatCardConfig } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface RecordStatus {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  color: string;
  bg_color: string;
  icon?: string;
  is_active_state: boolean;
  is_default: boolean;
  is_system: boolean;
  applies_to?: string;
  sort_order?: number;
  status: string;
  is_active: boolean;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}

export type { RecordStatus as RecordStatusType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<RecordStatus>[] = [
  { key: 'code',            label: 'Code',           sortable: true,  width: 100 },
  { key: 'name_en',         label: 'Name (EN)',      sortable: true               },
  { key: 'name_ar',         label: 'Name (AR)',      sortable: true               },
  {
    key: 'color',
    label: 'Badge',
    sortable: false,
    width: 120,
    align: 'center',
    render: (value: any, row: RecordStatus) => {
      return React.createElement('span', {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 10px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 500,
          color: row.color || '#6B7280',
          backgroundColor: row.bg_color || '#F3F4F6',
        },
      }, row.icon ? `${row.icon} ` : '', row.name_en || '');
    },
  },
  {
    key: 'is_active_state',
    label: 'Active State',
    sortable: true,
    width: 100,
    align: 'center',
    render: (value: any) => value ? '✅' : '—',
  },
  {
    key: 'is_system',
    label: 'System',
    sortable: true,
    width: 80,
    align: 'center',
    render: (value: any) => value ? '🔒' : '—',
  },
  { key: 'sort_order',     label: 'Order',          sortable: true,  width: 80,  align: 'center' },
  { key: 'is_active',      label: 'Active',         sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity / الهوية',
    fields: [
      { key: 'code',    label: 'Code / الرمز',            type: 'code', required: 'required',    placeholder: 'e.g. active, pending', autoUppercase: false, validation: [{ type: 'maxLength', value: 20 }], colSpan: 4,
        helperText: 'Unique identifier used across the system' },
      { key: 'name_en', label: 'Name (English)',           type: 'text', required: 'required',    placeholder: 'Status name in English' },
      { key: 'name_ar', label: 'الاسم بالعربية',           type: 'text', required: 'required',    placeholder: 'اسم الحالة بالعربية' },
      { key: 'description_en', label: 'Description (EN)',  type: 'textarea', required: 'optional', placeholder: 'What this status means...' },
      { key: 'description_ar', label: 'الوصف بالعربية',    type: 'textarea', required: 'optional', placeholder: 'وصف توضيحي للحالة وتأثيرها...' },
    ],
  },
  {
    key: 'appearance',
    label: 'Badge Appearance / مظهر الشارة',
    fields: [
      { key: 'color',      label: 'Text Color / لون النص',           type: 'color',  required: 'required',    placeholder: '#16A34A', colSpan: 4,
        helperText: 'HEX color for badge text' },
      { key: 'bg_color',   label: 'Background Color / لون الخلفية',  type: 'color',  required: 'required',    placeholder: '#DCFCE7', colSpan: 4,
        helperText: 'HEX color for badge background' },
      { key: 'icon',       label: 'Icon / الأيقونة',                type: 'text',   required: 'optional',    placeholder: '✅ or 🚫 or ⏳', colSpan: 4,
        helperText: 'Emoji icon displayed with the badge' },
      { key: 'sort_order', label: 'Sort Order / ترتيب العرض',       type: 'number', required: 'optional',    placeholder: '1, 2, 3...' },
    ],
  },
  {
    key: 'behavior',
    label: 'Behavior & Flags / السلوك',
    fields: [
      { key: 'is_active_state', label: 'Active State / حالة نشطة',                  type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Does this status mean the record is usable in operations?' },
      { key: 'is_default',      label: 'Default / افتراضي',                         type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Auto-assigned to new records' },
      { key: 'is_system',       label: 'System Protected / محمي من الحذف',          type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'System records cannot be deleted' },
      { key: 'applies_to',      label: 'Applies To / ينطبق على',                   type: 'text',   required: 'optional', placeholder: 'all', defaultValue: 'all',
        helperText: 'Which modules use this status (all, suppliers, customers, items...)' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:record_statuses:create', position: ['toolbar'], shortcut: 'N' },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:record_statuses:edit',   position: ['row'], shortcut: 'E' },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:record_statuses:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true, shortcut: 'Delete' },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:record_statuses:view',   position: ['toolbar'] },
];

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const statsConfig = {
  cards: [
    { key: 'total',         label: 'Total',          labelKey: 'stats.total',         color: 'blue'   as const, valueKey: 'total' },
    { key: 'active',        label: 'Active',         labelKey: 'stats.active',        color: 'green'  as const, valueKey: 'active' },
    { key: 'inactive',      label: 'Inactive',       labelKey: 'stats.inactive',      color: 'gray'   as const, valueKey: 'inactive' },
    { key: 'system_count',  label: 'System',         labelKey: 'stats.system',        color: 'purple' as const, valueKey: 'system_count' },
    { key: 'active_states', label: 'Active States',  labelKey: 'stats.activeStates',  color: 'cyan'   as const, valueKey: 'active_states' },
  ],
};

// ─── Page Config ──────────────────────────────────────────────────────────────

export const recordStatusesConfig: PageConfig<RecordStatus> = {
  title: 'Record Statuses / حالة السجلات',
  titleKey: 'pages.master.recordStatuses.title',
  subtitle: 'Manage general record status definitions used across all modules',
  subtitleKey: 'pages.master.recordStatuses.subtitle',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Record Statuses' },
  ],
  apiEndpoint: '/api/master/record-statuses',
  resourceName: 'record_statuses',
  permissionPrefix: 'master:record_statuses',
  columns,
  formSections,
  actions,
  statsConfig,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'record_statuses',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  detailPanelEnabled: true,
  bulkOperationsEnabled: true,
  cardsConfig: {
    titleField: 'name_en',
    subtitleField: 'name_ar',
    bodyFields: ['code', 'description_en'],
    statusField: 'is_active',
  },
};

// Also export with the name the page imports (singular alias)
export const recordStatusConfig = recordStatusesConfig;
