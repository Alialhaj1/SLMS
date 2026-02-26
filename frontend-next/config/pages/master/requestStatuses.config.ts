/**
 * Request Statuses Master Data — Page Configuration
 * Auto-generated governance config for Request Statuses CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface RequestStatus {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  color?: string;
  sort_order?: number;
  is_active: boolean;
}

export type { RequestStatus as RequestStatusType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<RequestStatus>[] = [
  { key: 'code',       label: 'Code',       sortable: true,  width: 100 },
  { key: 'name_en',    label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)',  sortable: true               },
  { key: 'color',      label: 'Color',      sortable: false, width: 100, format: 'color' },
  { key: 'sort_order', label: 'Order',      sortable: true,  width: 80,  align: 'center' },
  { key: 'is_active',  label: 'Active',     sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Status code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Status name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم حالة الطلب بالعربية' },
    ],
  },
  {
    key: 'appearance',
    label: 'Appearance & Ordering',
    fields: [
      { key: 'color',      label: 'Color',      type: 'color',  required: 'optional', placeholder: '#3B82F6' },
      { key: 'sort_order', label: 'Sort Order',  type: 'number', required: 'optional', placeholder: 'Display order (e.g. 1, 2, 3)' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:request_statuses:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:request_statuses:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:request_statuses:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:request_statuses:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const requestStatusesConfig: PageConfig<RequestStatus> = {
  title: 'Request Statuses',
  titleKey: 'pages.master.requestStatuses.title',
  subtitle: 'Manage request lifecycle status definitions and workflow stages',
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
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'request_statuses',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
