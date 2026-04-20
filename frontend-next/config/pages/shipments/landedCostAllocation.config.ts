/**
 * Landed Cost Allocation — Page Configuration
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface ShipmentCostAllocation {
  id: number;
  shipment_id?: number;
  shipment_number?: string;
  expense_id?: number;
  cost_id?: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  allocation_method?: string;
  allocation_basis?: number;
  allocation_percentage?: number;
  allocated_amount?: number;
  currency_id?: number;
  currency_code?: string;
  allocated_amount_base?: number;
  is_posted: boolean;
  posted_at?: string;
  journal_entry_id?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const columns: ColumnMeta<ShipmentCostAllocation>[] = [
  { key: 'shipment_number',       label: 'Shipment',        sortable: true,  width: 150 },
  { key: 'item_code',             label: 'Item Code',       sortable: true,  width: 120 },
  { key: 'item_name',             label: 'Item',            sortable: true               },
  { key: 'allocation_method',     label: 'Method',          sortable: true,  width: 120 },
  { key: 'allocation_percentage', label: '%',               sortable: true,  width: 80,  align: 'right' },
  { key: 'allocated_amount',      label: 'Amount',          sortable: true,  width: 130, align: 'right', format: 'currency' },
  { key: 'currency_code',         label: 'Currency',        sortable: true,  width: 90 },
  { key: 'is_posted',             label: 'Posted',          sortable: true,  width: 80,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'allocation',
    label: 'Allocation Details',
    fields: [
      {
        key: 'shipment_id',
        label: 'Shipment',
        type: 'searchable-select',
        required: 'required',
        placeholder: 'Select shipment',
        dataSource: {
          type: 'api',
          endpoint: '/api/logistics-shipments?limit=200',
          valueField: 'id',
          labelField: 'shipment_number',
        },
        colSpan: 6,
      },
      {
        key: 'allocation_method', label: 'Allocation Method', type: 'select', required: 'required',
        options: [
          { value: 'value',    label: 'By Value' },
          { value: 'weight',   label: 'By Weight' },
          { value: 'volume',   label: 'By Volume' },
          { value: 'quantity', label: 'By Quantity' },
          { value: 'equal',    label: 'Equal Distribution' },
          { value: 'manual',   label: 'Manual' },
        ],
        colSpan: 6,
      },
      { key: 'allocated_amount', label: 'Allocated Amount', type: 'currency', required: 'required', placeholder: '0.00', colSpan: 4 },
      {
        key: 'currency_id',
        label: 'Currency',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select currency',
        dataSource: {
          type: 'api',
          endpoint: '/api/finance/currencies?is_active=true',
          valueField: 'id',
          labelField: 'code',
          labelArField: 'name_ar',
        },
        colSpan: 4,
      },
      { key: 'allocation_percentage', label: 'Allocation %', type: 'number', required: 'optional', placeholder: '0.00', colSpan: 4 },
    ],
  },
  {
    key: 'extra',
    label: 'Additional',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', required: 'optional', colSpan: 'full' as any },
    ],
  },
];

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'logistics:landed_cost_allocation:manage', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'logistics:landed_cost_allocation:manage', position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'logistics:landed_cost_allocation:manage', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'logistics:landed_cost_allocation:view',   position: ['toolbar'] },
];

export const landedCostAllocationConfig: PageConfig<ShipmentCostAllocation> = {
  title: 'Landed Cost Allocation',
  titleKey: 'pages.shipments.landedCostAllocation.title',
  subtitle: 'Allocate shipment costs across items by value, weight, volume, quantity, or manual distribution',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Shipments', href: '/shipments' },
    { label: 'Landed Cost Allocation' },
  ],
  apiEndpoint: '/api/shipment-cost-allocations',
  resourceName: 'shipment_cost_allocations',
  permissionPrefix: 'logistics:landed_cost_allocation',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'landed_cost_allocations',
  defaultSortField: 'created_at',
  defaultSortOrder: 'desc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
