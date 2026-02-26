/**
 * Incoterms Master Data — Page Configuration
 * Auto-generated governance config for Incoterms CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Incoterm {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

export type { Incoterm as IncotermType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Incoterm>[] = [
  { key: 'code',      label: 'Code',       sortable: true,  width: 100 },
  { key: 'name_en',   label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',   label: 'Name (AR)',  sortable: true               },
  { key: 'category',  label: 'Category',   sortable: true,  width: 200  },
  { key: 'is_active', label: 'Active',     sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Incoterm Code',   type: 'code', required: 'required',    placeholder: 'e.g. FOB', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',   type: 'text', required: 'required',    placeholder: 'Incoterm name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',    type: 'text', required: 'recommended', placeholder: 'اسم شرط التجارة بالعربية' },
    ],
  },
  {
    key: 'classification',
    label: 'Classification',
    fields: [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        required: 'optional',
        placeholder: 'Select category',
        options: [
          { value: 'E-Departure',              label: 'E — Departure' },
          { value: 'F-Main Carriage Unpaid',   label: 'F — Main Carriage Unpaid' },
          { value: 'C-Main Carriage Paid',     label: 'C — Main Carriage Paid' },
          { value: 'D-Arrival',                label: 'D — Arrival' },
        ],
      },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Description of this incoterm', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:incoterms:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:incoterms:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:incoterms:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:incoterms:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const incotermsConfig: PageConfig<Incoterm> = {
  title: 'Incoterms',
  titleKey: 'pages.master.incoterms.title',
  subtitle: 'Manage international commercial terms (Incoterms)',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Incoterms' },
  ],
  apiEndpoint: '/api/master/incoterms',
  resourceName: 'incoterms',
  permissionPrefix: 'master:incoterms',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'incoterms',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
