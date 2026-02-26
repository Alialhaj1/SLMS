import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface PriceList {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  currency_id?: number;
  valid_from?: string;
  valid_to?: string;
  is_default?: boolean;
  description?: string;
  is_active: boolean;
}

const priceListsConfig: PageConfig = {
  pageKey: 'sales:price_lists',
  title: 'Price Lists',
  description: 'Manage sales price lists and pricing structures',
  apiEndpoint: '/api/sales/price-lists',
  permissionPrefix: 'sales:price_lists',

  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Sales', href: '/sales' },
    { label: 'Price Lists' },
  ],

  columns: [
    { key: 'code', label: 'Code', type: 'text', sortable: true, filterable: true, width: 120 },
    { key: 'name_en', label: 'Name (EN)', type: 'text', sortable: true, filterable: true, width: 200 },
    { key: 'currency_id', label: 'Currency', type: 'lookup', sortable: true, filterable: true, width: 140, lookup: { endpoint: '/api/master/currencies', labelKey: 'name_en', valueKey: 'id' } },
    { key: 'valid_from', label: 'Valid From', type: 'date', sortable: true, filterable: true, width: 130 },
    { key: 'valid_to', label: 'Valid To', type: 'date', sortable: true, filterable: true, width: 130 },
    { key: 'is_default', label: 'Default', type: 'boolean', sortable: true, filterable: true, width: 100 },
    { key: 'is_active', label: 'Active', type: 'boolean', sortable: true, filterable: true, width: 100 },
  ] as ColumnMeta[],

  actions: [
    { key: 'create', label: 'Create New', icon: 'PlusIcon', variant: 'primary', permission: 'sales:price_lists:create', position: ['toolbar'] as any },
    { key: 'edit', label: 'Edit', icon: 'PencilSquareIcon', variant: 'secondary', permission: 'sales:price_lists:edit', position: ['row'] as any },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', variant: 'danger', permission: 'sales:price_lists:delete', position: ['row', 'bulk'] as any, requireConfirmation: true, isDangerous: true },
    { key: 'export', label: 'Export', icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'sales:price_lists:view', position: ['toolbar'] as any },
  ] as ActionMeta[],

  formSections: [
    {
      key: 'general',
      title: 'General',
      columns: 2,
      fields: [
        { key: 'code', label: 'Code', type: 'code', required: true, placeholder: 'e.g. PL-001' },
        { key: 'name_en', label: 'Name (EN)', type: 'text', required: true, placeholder: 'Price list name in English' },
        { key: 'name_ar', label: 'Name (AR)', type: 'text', placeholder: 'Price list name in Arabic' },
        { key: 'currency_id', label: 'Currency', type: 'searchable-select', endpoint: '/api/master/currencies', labelKey: 'name_en', valueKey: 'id' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Price list description' },
        { key: 'is_active', label: 'Active', type: 'toggle', defaultValue: true },
      ],
    },
    {
      key: 'validity',
      title: 'Validity',
      columns: 2,
      fields: [
        { key: 'valid_from', label: 'Valid From', type: 'date' },
        { key: 'valid_to', label: 'Valid To', type: 'date' },
        { key: 'is_default', label: 'Default Price List', type: 'checkbox' },
      ],
    },
  ] as PageSection[],
};

export default priceListsConfig;
