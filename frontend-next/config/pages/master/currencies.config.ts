/**
 * Currencies Master Data — Page Configuration
 * Auto-generated governance config for Currencies CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Currency {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  symbol?: string;
  decimal_places?: number;
  exchange_rate?: number;
  is_active: boolean;
}

export type { Currency as CurrencyType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Currency>[] = [
  { key: 'code',           label: 'Code',           sortable: true,  width: 90  },
  { key: 'name',           label: 'Name',           sortable: true               },
  { key: 'symbol',         label: 'Symbol',         sortable: false, width: 80, align: 'center' },
  { key: 'decimal_places', label: 'Decimals',       sortable: false, width: 100, align: 'center', format: 'number' },
  { key: 'exchange_rate',  label: 'Exchange Rate',  sortable: true,  width: 140, align: 'right',  format: 'number' },
  { key: 'is_active',      label: 'Active',         sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Currency Code (ISO)', type: 'code', required: 'required',    placeholder: 'e.g. USD', autoUppercase: true, validation: [{ type: 'maxLength', value: 3 }], colSpan: 4 },
      { key: 'name',    label: 'Name (English)',       type: 'text', required: 'required',    placeholder: 'Currency name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',        type: 'text', required: 'recommended', placeholder: 'اسم العملة بالعربية' },
      { key: 'symbol',  label: 'Symbol',               type: 'text', required: 'required',    placeholder: 'e.g. $', colSpan: 4 },
    ],
  },
  {
    key: 'rates',
    label: 'Rates & Precision',
    collapsible: true,
    fields: [
      { key: 'decimal_places', label: 'Decimal Places', type: 'number',  required: 'optional', placeholder: '2', defaultValue: 2, validation: [{ type: 'min', value: 0 }, { type: 'max', value: 6 }], colSpan: 6 },
      { key: 'exchange_rate',  label: 'Exchange Rate',  type: 'decimal', required: 'optional', placeholder: '1.000000', decimalPrecision: 6, helperText: 'Rate relative to base currency', colSpan: 6 },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:currencies:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:currencies:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:currencies:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:currencies:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const currenciesConfig: PageConfig<Currency> = {
  title: 'Currencies',
  titleKey: 'pages.master.currencies.title',
  subtitle: 'Manage currency codes, symbols, and exchange rates',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Currencies' },
  ],
  apiEndpoint: '/api/master/currencies',
  resourceName: 'currencies',
  permissionPrefix: 'master:currencies',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'currencies',
  defaultSortField: 'code',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
