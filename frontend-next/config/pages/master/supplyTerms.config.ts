/**
 * Supply Terms Master Data — Page Configuration
 * Auto-generated governance config for Supply Terms CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface SupplyTerm {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

export type { SupplyTerm as SupplyTermType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<SupplyTerm>[] = [
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
      { key: 'code',        label: 'Code',           type: 'code',     required: 'optional',    placeholder: 'Term code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',     label: 'Name (English)',  type: 'text',     required: 'required',    placeholder: 'Supply term name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',   type: 'text',     required: 'recommended', placeholder: 'اسم شرط التوريد بالعربية' },
      { key: 'description', label: 'Description',     type: 'textarea', required: 'optional',    placeholder: 'Brief description of this supply term', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:supply_terms:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:supply_terms:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:supply_terms:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:supply_terms:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const supplyTermsConfig: PageConfig<SupplyTerm> = {
  title: 'Supply Terms',
  titleKey: 'pages.master.supplyTerms.title',
  subtitle: 'Manage supply term definitions for vendor agreements',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Supply Terms' },
  ],
  apiEndpoint: '/api/master/supply-terms',
  resourceName: 'supply_terms',
  permissionPrefix: 'master:supply_terms',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'supply_terms',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
