/**
 * Shipment Expense Types (Cost Types) — Page Configuration
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface ShipmentExpenseType {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  category?: string;
  default_vat_rate?: number;
  is_vat_exempt: boolean;
  is_active: boolean;
  display_order?: number;
  notes?: string;
  linked_account_code?: string;
  linked_account_name?: string;
  requires_clearance_office?: boolean;
  requires_customs_declaration?: boolean;
  requires_insurance_company?: boolean;
  requires_laboratory?: boolean;
  requires_lc?: boolean;
  requires_port?: boolean;
  requires_shipping_agent?: boolean;
  created_at?: string;
  updated_at?: string;
}

const columns: ColumnMeta<ShipmentExpenseType>[] = [
  { key: 'code',              label: 'Code',         sortable: true,  width: 100 },
  { key: 'name',              label: 'Name (EN)',     sortable: true               },
  { key: 'name_ar',           label: 'Name (AR)',     sortable: true               },
  { key: 'category',          label: 'Category',      sortable: true,  width: 130 },
  { key: 'default_vat_rate',  label: 'VAT Rate %',    sortable: true,  width: 100, align: 'right' },
  { key: 'linked_account_code', label: 'Account',     sortable: false, width: 110 },
  { key: 'is_active',         label: 'Active',        sortable: true,  width: 80,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Basic Information',
    fields: [
      { key: 'code',    label: 'Code',          type: 'code', required: 'optional', placeholder: 'e.g. 8001', autoUppercase: true, colSpan: 4 },
      { key: 'name',    label: 'Name (English)', type: 'text', required: 'required', placeholder: 'Expense type name' },
      { key: 'name_ar', label: 'Name (Arabic)',  type: 'text', required: 'recommended', placeholder: 'اسم نوع المصروف' },
      {
        key: 'category', label: 'Category', type: 'select', required: 'recommended',
        options: [
          { value: 'freight',     label: 'Freight' },
          { value: 'insurance',   label: 'Insurance' },
          { value: 'customs',     label: 'Customs' },
          { value: 'port',        label: 'Port Charges' },
          { value: 'clearance',   label: 'Clearance' },
          { value: 'transport',   label: 'Transport' },
          { value: 'inspection',  label: 'Inspection' },
          { value: 'lc',          label: 'Letter of Credit' },
          { value: 'other',       label: 'Other' },
        ],
      },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    fields: [
      { key: 'default_vat_rate', label: 'Default VAT Rate (%)', type: 'number', required: 'optional', placeholder: '0.00' },
      { key: 'is_vat_exempt', label: 'VAT Exempt', type: 'toggle', required: 'optional', defaultValue: false },
      {
        key: 'linked_account_id',
        label: 'Linked Account',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select G/L account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?limit=500',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      { key: 'analytic_account_code', label: 'Analytic Account Code', type: 'text', required: 'optional', colSpan: 6 },
    ],
  },
  {
    key: 'requirements',
    label: 'Required Associations',
    fields: [
      { key: 'requires_clearance_office',    label: 'Requires Clearance Office',    type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'requires_customs_declaration',  label: 'Requires Customs Declaration', type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'requires_insurance_company',   label: 'Requires Insurance Company',   type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'requires_laboratory',          label: 'Requires Laboratory',          type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'requires_lc',                 label: 'Requires Letter of Credit',    type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'requires_port',               label: 'Requires Port',                type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'requires_shipping_agent',      label: 'Requires Shipping Agent',      type: 'toggle', required: 'optional', defaultValue: false },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'display_order', label: 'Display Order', type: 'number', required: 'optional', placeholder: '0' },
      { key: 'notes', label: 'Notes', type: 'textarea', required: 'optional', colSpan: 'full' as any },
      { key: 'is_active', label: 'Active', type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'logistics:shipment_cost_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'logistics:shipment_cost_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'logistics:shipment_cost_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'logistics:shipment_cost_types:view',   position: ['toolbar'] },
];

export const shipmentExpenseTypesConfig: PageConfig<ShipmentExpenseType> = {
  title: 'Shipment Cost Types',
  titleKey: 'pages.shipments.costTypes.title',
  subtitle: 'Manage shipment expense/cost type definitions with accounting links and required associations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Shipments', href: '/shipments' },
    { label: 'Cost Types' },
  ],
  apiEndpoint: '/api/shipment-expense-types',
  resourceName: 'shipment_expense_types',
  permissionPrefix: 'logistics:shipment_cost_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'shipment_cost_types',
  defaultSortField: 'display_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
