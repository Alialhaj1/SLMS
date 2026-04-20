/**
 * Delivery Terms Master Data — Page Configuration
 * Auto-generated governance config for Delivery Terms CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface DeliveryTerm {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

export type { DeliveryTerm as DeliveryTermType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<DeliveryTerm>[] = [
  { key: 'code',      label: 'Code',       sortable: true,  width: 100 },
  { key: 'name_en',   label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',   label: 'Name (AR)',  sortable: true               },
  { key: 'is_active', label: 'Active',     sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Delivery term code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Delivery term name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم شرط التسليم بالعربية' },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Description of this delivery term', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:delivery_terms:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:delivery_terms:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:delivery_terms:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:delivery_terms:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const deliveryTermsConfig: PageConfig<DeliveryTerm> = {
  title: 'Delivery Terms',
  titleKey: 'pages.master.deliveryTerms.title',
  subtitle: 'Manage delivery terms and conditions',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Delivery Terms' },
  ],
  apiEndpoint: '/api/master/delivery-terms',
  resourceName: 'delivery-terms',
  permissionPrefix: 'master:delivery_terms',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'delivery-terms',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const deliveryTermConfig = deliveryTermsConfig;
