/**
 * Purchase Order Types Master Data — Page Configuration
 * Governance config for Purchase Order Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface PurchaseOrderType {
  id: number;
  company_id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  affects_inventory: boolean;
  requires_grn: boolean;
  creates_asset: boolean;
  number_series_id?: number | null;
  default_expense_account_id?: number | null;
  default_asset_account_id?: number | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<PurchaseOrderType>[] = [
  { key: 'code',              label: 'Code',              sortable: true,  width: 140 },
  { key: 'name',              label: 'Name (EN)',         sortable: true               },
  { key: 'name_ar',           label: 'Name (AR)',         sortable: true               },
  { key: 'affects_inventory', label: 'Affects Inventory', sortable: true,  width: 130, format: 'boolean', align: 'center' },
  { key: 'requires_grn',     label: 'Requires GRN',      sortable: true,  width: 120, format: 'boolean', align: 'center' },
  { key: 'creates_asset',    label: 'Creates Asset',      sortable: true,  width: 120, format: 'boolean', align: 'center' },
  { key: 'sort_order',       label: 'Sort Order',         sortable: true,  width: 100, align: 'center', format: 'number' },
  { key: 'is_active',        label: 'Active',             sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity / الهوية',
    fields: [
      { key: 'code',    label: 'Type Code',        type: 'code', required: 'required',    placeholder: 'e.g. LOCAL', autoUppercase: true, validation: [{ type: 'maxLength', value: 30 }], colSpan: 4 },
      { key: 'name',    label: 'Name (English)',    type: 'text', required: 'required',    placeholder: 'Purchase order type name' },
      { key: 'name_ar', label: 'Name (Arabic)',     type: 'text', required: 'recommended', placeholder: 'اسم نوع أمر الشراء بالعربية' },
    ],
  },
  {
    key: 'description',
    label: 'Description / الوصف',
    collapsible: true,
    fields: [
      { key: 'description',    label: 'Description (English)', type: 'textarea', required: 'optional', placeholder: 'Description of this PO type' },
      { key: 'description_ar', label: 'Description (Arabic)',  type: 'textarea', required: 'optional', placeholder: 'وصف نوع أمر الشراء بالعربية' },
    ],
  },
  {
    key: 'behavior',
    label: 'Behavior & Rules / السلوك والقواعد',
    fields: [
      { key: 'affects_inventory', label: 'Affects Inventory',           type: 'toggle', required: 'optional', defaultValue: false, helperText: 'Updates stock when goods are received' },
      { key: 'requires_grn',     label: 'Requires Goods Receipt (GRN)', type: 'toggle', required: 'optional', defaultValue: false, helperText: 'Must create GRN before invoice' },
      { key: 'creates_asset',    label: 'Creates Fixed Asset',          type: 'toggle', required: 'optional', defaultValue: false, helperText: 'Automatically creates asset record' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings / الإعدادات',
    fields: [
      { key: 'sort_order', label: 'Sort Order',  type: 'number', required: 'optional', placeholder: '0', defaultValue: 0, colSpan: 4 },
      { key: 'is_active',  label: 'Active',      type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:purchase_order_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:purchase_order_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:purchase_order_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:purchase_order_types:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const purchaseOrderTypesConfig: PageConfig<PurchaseOrderType> = {
  title: 'Purchase Order Types',
  titleKey: 'pages.master.purchaseOrderTypes.title',
  subtitle: 'Manage purchase order type definitions, inventory behavior, and GRN requirements',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Purchase Order Types' },
  ],
  apiEndpoint: '/api/master/purchase-order-types',
  resourceName: 'purchase-order-types',
  permissionPrefix: 'master:purchase_order_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'purchase-order-types',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
