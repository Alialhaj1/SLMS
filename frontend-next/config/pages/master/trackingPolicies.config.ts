/**
 * Tracking Policies Master Data — Page Configuration
 * Auto-generated governance config for Tracking Policies CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface TrackingPolicy {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  tracking_type?: string;
  frequency?: string;
  description?: string;
  is_active: boolean;
}

export type { TrackingPolicy as TrackingPolicyType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<TrackingPolicy>[] = [
  { key: 'code',          label: 'Code',           sortable: true,  width: 100 },
  { key: 'name_en',       label: 'Name (EN)',      sortable: true               },
  { key: 'tracking_type', label: 'Tracking Type',  sortable: true,  width: 140 },
  { key: 'frequency',     label: 'Frequency',      sortable: true,  width: 130 },
  { key: 'is_active',     label: 'Active',         sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Policy code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Tracking policy name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم سياسة التتبع بالعربية' },
    ],
  },
  {
    key: 'tracking',
    label: 'Tracking Configuration',
    fields: [
      {
        key: 'tracking_type',
        label: 'Tracking Type',
        type: 'select',
        required: 'recommended',
        placeholder: 'Select tracking type',
        options: [
          { value: 'GPS',    label: 'GPS' },
          { value: 'RFID',   label: 'RFID' },
          { value: 'Manual', label: 'Manual' },
          { value: 'Barcode', label: 'Barcode' },
          { value: 'IoT',   label: 'IoT' },
        ],
      },
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'select',
        required: 'recommended',
        placeholder: 'Select tracking frequency',
        options: [
          { value: 'Real-time', label: 'Real-time' },
          { value: 'Hourly',    label: 'Hourly' },
          { value: 'Daily',     label: 'Daily' },
          { value: 'Weekly',    label: 'Weekly' },
        ],
      },
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Brief description of this tracking policy', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:tracking_policies:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:tracking_policies:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:tracking_policies:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:tracking_policies:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const trackingPoliciesConfig: PageConfig<TrackingPolicy> = {
  title: 'Tracking Policies',
  titleKey: 'pages.master.trackingPolicies.title',
  subtitle: 'Manage shipment tracking policy definitions and frequencies',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Tracking Policies' },
  ],
  apiEndpoint: '/api/master/tracking-policies',
  resourceName: 'tracking_policies',
  permissionPrefix: 'master:tracking_policies',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'tracking_policies',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const trackingPolicyConfig = trackingPoliciesConfig;
