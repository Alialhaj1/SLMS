/**
 * Request Statuses Master Data — Page Configuration
 * Screen A-16 — حالة الطلبات
 * Enterprise governance config for Request Statuses CRUD.
 */
import React from 'react';
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface RequestStatus {
  id: number;
  code: string;
  name?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  description_en?: string;
  description_ar?: string;
  stage?: string;
  category?: string;
  color: string;
  bg_color?: string;
  icon?: string;
  sort_order?: number;
  allows_edit?: boolean;
  allows_delete?: boolean;
  allows_print?: boolean;
  allows_submit?: boolean;
  allows_approve?: boolean;
  allows_execute?: boolean;
  is_editable?: boolean;
  is_deletable?: boolean;
  is_final?: boolean;
  requires_approval?: boolean;
  applies_to?: string;
  is_active: boolean;
  is_system?: boolean;
  status?: string;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}

export type { RequestStatus as RequestStatusType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<RequestStatus>[] = [
  { key: 'code',       label: 'Code',       sortable: true,  width: 110 },
  { key: 'name_en',    label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)',  sortable: true               },
  {
    key: 'color',
    label: 'Badge',
    sortable: false,
    width: 130,
    align: 'center',
    render: (value: any, row: RequestStatus) => {
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
  { key: 'stage',       label: 'Stage',      sortable: true,  width: 100 },
  { key: 'category',    label: 'Category',   sortable: true,  width: 100 },
  {
    key: 'is_final',
    label: 'Final',
    sortable: true,
    width: 70,
    align: 'center',
    render: (value: any) => value ? '✅' : '—',
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
      { key: 'code',    label: 'Code / الرمز',            type: 'code', required: 'required',    placeholder: 'e.g. DRAFT, APPROVED', autoUppercase: true, validation: [{ type: 'maxLength', value: 30 }], colSpan: 4,
        helperText: 'Unique status code (auto-uppercased)' },
      { key: 'name_en', label: 'Name (English)',           type: 'text', required: 'required',    placeholder: 'Status name in English' },
      { key: 'name_ar', label: 'الاسم بالعربية',           type: 'text', required: 'required',    placeholder: 'اسم الحالة بالعربية' },
      { key: 'description_en', label: 'Description (EN)',  type: 'textarea', required: 'optional', placeholder: 'What this status means...' },
      { key: 'description_ar', label: 'الوصف بالعربية',    type: 'textarea', required: 'optional', placeholder: 'وصف توضيحي للحالة...' },
      { key: 'category', label: 'Category / التصنيف',      type: 'text', required: 'optional', placeholder: 'general, finance, procurement...', defaultValue: 'general' },
    ],
  },
  {
    key: 'appearance',
    label: 'Badge Appearance / مظهر الشارة',
    fields: [
      { key: 'color',      label: 'Text Color / لون النص',           type: 'color',  required: 'required',    placeholder: '#16A34A', colSpan: 4,
        helperText: 'HEX color for badge text' },
      { key: 'bg_color',   label: 'Background Color / لون الخلفية',  type: 'color',  required: 'optional',    placeholder: '#DCFCE7', colSpan: 4,
        helperText: 'HEX color for badge background' },
      { key: 'icon',       label: 'Icon / الأيقونة',                type: 'text',   required: 'optional',    placeholder: 'DocumentIcon, CheckCircleIcon', colSpan: 4 },
      { key: 'sort_order', label: 'Sort Order / ترتيب العرض',       type: 'number', required: 'optional',    placeholder: '1, 2, 3...' },
    ],
  },
  {
    key: 'workflow',
    label: 'Workflow / سير العمل',
    fields: [
      { key: 'stage', label: 'Stage / المرحلة', type: 'select', required: 'optional',
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'submitted', label: 'Submitted' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'executed', label: 'Executed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        defaultValue: 'draft' },
      { key: 'is_editable',       label: 'Editable / قابل للتعديل',   type: 'toggle', required: 'optional', defaultValue: true,
        helperText: 'Can records in this status be edited?' },
      { key: 'is_deletable',      label: 'Deletable / قابل للحذف',    type: 'toggle', required: 'optional', defaultValue: true,
        helperText: 'Can records in this status be deleted?' },
      { key: 'is_final',          label: 'Final State / حالة نهائية', type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Once reached, the record cannot move to another status' },
      { key: 'requires_approval', label: 'Requires Approval / يتطلب موافقة', type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'applies_to',        label: 'Applies To / ينطبق على',    type: 'text',   required: 'optional', placeholder: 'all', defaultValue: 'all' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings / الإعدادات',
    fields: [
      { key: 'is_system', label: 'System Protected / محمي من الحذف', type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'is_active', label: 'Active / مفعّل',                  type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:request_statuses:create', position: ['toolbar'], shortcut: 'N' },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:request_statuses:edit',   position: ['row'], shortcut: 'E' },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:request_statuses:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true, shortcut: 'Delete' },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:request_statuses:view',   position: ['toolbar'] },
];

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const statsConfig = {
  cards: [
    { key: 'total',             label: 'Total',             labelKey: 'stats.total',           color: 'blue'   as const, valueKey: 'total' },
    { key: 'active',            label: 'Active',            labelKey: 'stats.active',          color: 'green'  as const, valueKey: 'active' },
    { key: 'inactive',          label: 'Inactive',          labelKey: 'stats.inactive',        color: 'gray'   as const, valueKey: 'inactive' },
    { key: 'system_count',      label: 'System',            labelKey: 'stats.system',          color: 'purple' as const, valueKey: 'system_count' },
    { key: 'final_states',      label: 'Final States',      labelKey: 'stats.finalStates',     color: 'red'    as const, valueKey: 'final_states' },
  ],
};

// ─── Page Config ──────────────────────────────────────────────────────────────

export const requestStatusesConfig: PageConfig<RequestStatus> = {
  title: 'Request Statuses / حالة الطلبات',
  titleKey: 'pages.master.requestStatuses.title',
  subtitle: 'Manage request lifecycle status definitions and workflow stages',
  subtitleKey: 'pages.master.requestStatuses.subtitle',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Request Statuses' },
  ],
  apiEndpoint: '/api/master/request-statuses',
  resourceName: 'request_statuses',
  permissionPrefix: 'master:request_statuses',
  columns,
  formSections,
  actions,
  statsConfig,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'request_statuses',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  detailPanelEnabled: true,
  bulkOperationsEnabled: true,
  cardsConfig: {
    titleField: 'name_en',
    subtitleField: 'name_ar',
    bodyFields: ['code', 'stage', 'category'],
    statusField: 'is_active',
  },
};

// Alias for page import compatibility
export const requestStatusConfig = requestStatusesConfig;
