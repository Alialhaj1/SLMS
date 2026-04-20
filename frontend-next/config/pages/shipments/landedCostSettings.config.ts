/**
 * Landed Cost Settings (Default Accounts) — Page Configuration
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface LandedCostSetting {
  id: number;
  cost_type_code: string;
  debit_account_id?: number;
  debit_account_code?: string;
  debit_account_name?: string;
  credit_account_id?: number;
  credit_account_code?: string;
  credit_account_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const columns: ColumnMeta<LandedCostSetting>[] = [
  { key: 'cost_type_code',       label: 'Cost Type',       sortable: true,  width: 140 },
  { key: 'debit_account_code',   label: 'Debit Account',   sortable: false, width: 130 },
  { key: 'debit_account_name',   label: 'Debit Acc. Name', sortable: false              },
  { key: 'credit_account_code',  label: 'Credit Account',  sortable: false, width: 130 },
  { key: 'credit_account_name',  label: 'Credit Acc. Name', sortable: false             },
  { key: 'is_active',            label: 'Active',          sortable: true,  width: 80, format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'mapping',
    label: 'Account Mapping',
    fields: [
      {
        key: 'cost_type_code',
        label: 'Cost Type',
        type: 'select',
        required: 'required',
        placeholder: 'Select cost type',
        options: [
          { value: 'FREIGHT',     label: 'Freight' },
          { value: 'INSURANCE',   label: 'Insurance' },
          { value: 'CUSTOMS',     label: 'Customs' },
          { value: 'PORT',        label: 'Port Charges' },
          { value: 'CLEARANCE',   label: 'Clearance' },
          { value: 'TRANSPORT',   label: 'Transport' },
          { value: 'INSPECTION',  label: 'Inspection' },
          { value: 'LC',          label: 'Letter of Credit' },
          { value: 'OTHER',       label: 'Other' },
        ],
        colSpan: 4,
      },
      {
        key: 'debit_account_id',
        label: 'Debit Account',
        type: 'searchable-select',
        required: 'required',
        placeholder: 'Select debit account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?limit=500',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 4,
      },
      {
        key: 'credit_account_id',
        label: 'Credit Account',
        type: 'searchable-select',
        required: 'required',
        placeholder: 'Select credit account',
        dataSource: {
          type: 'api',
          endpoint: '/api/accounts?limit=500',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 4,
      },
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

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'logistics:landed_cost_settings:manage', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'logistics:landed_cost_settings:manage', position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'logistics:landed_cost_settings:manage', position: ['row'], requireConfirmation: true, isDangerous: true },
];

export const landedCostSettingsConfig: PageConfig<LandedCostSetting> = {
  title: 'Landed Cost Settings',
  titleKey: 'pages.shipments.landedCostSettings.title',
  subtitle: 'Configure default debit/credit accounts for each cost type in landed cost calculations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Shipments', href: '/shipments' },
    { label: 'Landed Cost Settings' },
  ],
  apiEndpoint: '/api/shipment-accounting/default-accounts',
  resourceName: 'logistics_shipment_cost_default_accounts',
  permissionPrefix: 'logistics:landed_cost_settings',
  columns,
  formSections,
  actions,
  auditEnabled: false,
  exportEnabled: false,
  defaultSortField: 'cost_type_code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50],
  bulkOperationsEnabled: false,
};
