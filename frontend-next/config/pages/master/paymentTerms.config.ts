/**
 * Payment Terms Master Data — Page Configuration
 * Auto-generated governance config for Payment Terms CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface PaymentTerm {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  days?: number;
  description?: string;
  is_active: boolean;
}

export type { PaymentTerm as PaymentTermType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<PaymentTerm>[] = [
  { key: 'code',      label: 'Code',      sortable: true,  width: 100 },
  { key: 'name_en',   label: 'Name (EN)', sortable: true               },
  { key: 'name_ar',   label: 'Name (AR)', sortable: true               },
  { key: 'days',      label: 'Days',      sortable: true,  width: 90,  format: 'number', align: 'right' },
  { key: 'is_active', label: 'Active',    sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',        label: 'Code',           type: 'code',     required: 'optional',    placeholder: 'Payment term code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',     label: 'Name (English)',  type: 'text',     required: 'required',    placeholder: 'Payment term name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',   type: 'text',     required: 'recommended', placeholder: 'اسم شروط الدفع بالعربية' },
    ],
  },
  {
    key: 'details',
    label: 'Term Details',
    fields: [
      { key: 'days',        label: 'Days',        type: 'number',   required: 'optional', placeholder: 'Number of days (e.g. 30, 60, 90)' },
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Brief description of this payment term', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:payment_terms:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:payment_terms:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:payment_terms:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:payment_terms:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const paymentTermsConfig: PageConfig<PaymentTerm> = {
  title: 'Payment Terms',
  titleKey: 'pages.master.paymentTerms.title',
  subtitle: 'Manage payment term definitions and due-day configurations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Payment Terms' },
  ],
  apiEndpoint: '/api/master/payment-terms',
  resourceName: 'payment_terms',
  permissionPrefix: 'master:payment_terms',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'payment_terms',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
