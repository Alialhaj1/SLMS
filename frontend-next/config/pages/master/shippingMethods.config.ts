/**
 * Shipping Methods Master Data — Page Configuration
 * Auto-generated governance config for Shipping Methods CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ShippingMethod {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  transport_mode?: string;
  description?: string;
  is_active: boolean;
}

export type { ShippingMethod as ShippingMethodType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ShippingMethod>[] = [
  { key: 'code',           label: 'Code',           sortable: true,  width: 100 },
  { key: 'name_en',        label: 'Name (EN)',      sortable: true               },
  { key: 'name_ar',        label: 'Name (AR)',      sortable: true               },
  { key: 'transport_mode', label: 'Transport Mode', sortable: true,  width: 140 },
  { key: 'is_active',      label: 'Active',         sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Shipping method code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Shipping method name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم طريقة الشحن بالعربية' },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    fields: [
      {
        key: 'transport_mode',
        label: 'Transport Mode',
        type: 'select',
        required: 'recommended',
        placeholder: 'Select transport mode',
        options: [
          { value: 'FCL',      label: 'FCL (Full Container Load)' },
          { value: 'LCL',      label: 'LCL (Less than Container Load)' },
          { value: 'Bulk',     label: 'Bulk' },
          { value: 'RoRo',     label: 'RoRo (Roll-on/Roll-off)' },
          { value: 'Express',  label: 'Express' },
          { value: 'Standard', label: 'Standard' },
        ],
      },
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Brief description of this shipping method', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:shipping_methods:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:shipping_methods:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:shipping_methods:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:shipping_methods:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const shippingMethodsConfig: PageConfig<ShippingMethod> = {
  title: 'Shipping Methods',
  titleKey: 'pages.master.shippingMethods.title',
  subtitle: 'Manage shipping method definitions (FCL, LCL, bulk, express, etc.)',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Shipping Methods' },
  ],
  apiEndpoint: '/api/master/shipping-methods',
  resourceName: 'shipping_methods',
  permissionPrefix: 'master:shipping_methods',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'shipping_methods',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
