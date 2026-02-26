import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface DiscountAgreement {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  customer_id?: number;
  vendor_id?: number;
  discount_type?: string;
  discount_value?: number;
  valid_from?: string;
  valid_to?: string;
  min_quantity?: number;
  min_amount?: number;
  description?: string;
  is_active: boolean;
}

const discountAgreementsConfig: PageConfig = {
  pageKey: 'sales:discount_agreements',
  title: 'Discount Agreements',
  description: 'Manage discount agreements with customers and vendors',
  apiEndpoint: '/api/sales/discount-agreements',
  permissionPrefix: 'sales:discount_agreements',

  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Sales', href: '/sales' },
    { label: 'Discount Agreements' },
  ],

  columns: [
    { key: 'code', label: 'Code', type: 'text', sortable: true, filterable: true, width: 120 },
    { key: 'name_en', label: 'Name (EN)', type: 'text', sortable: true, filterable: true, width: 200 },
    { key: 'discount_type', label: 'Discount Type', type: 'text', sortable: true, filterable: true, width: 150 },
    { key: 'discount_value', label: 'Discount Value', type: 'number', sortable: true, filterable: false, width: 130 },
    { key: 'valid_from', label: 'Valid From', type: 'date', sortable: true, filterable: true, width: 130 },
    { key: 'valid_to', label: 'Valid To', type: 'date', sortable: true, filterable: true, width: 130 },
    { key: 'is_active', label: 'Active', type: 'boolean', sortable: true, filterable: true, width: 100 },
  ] as ColumnMeta[],

  actions: [
    { key: 'create', label: 'Create New', icon: 'PlusIcon', variant: 'primary', permission: 'sales:discount_agreements:create', position: ['toolbar'] as any },
    { key: 'edit', label: 'Edit', icon: 'PencilSquareIcon', variant: 'secondary', permission: 'sales:discount_agreements:edit', position: ['row'] as any },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', variant: 'danger', permission: 'sales:discount_agreements:delete', position: ['row', 'bulk'] as any, requireConfirmation: true, isDangerous: true },
    { key: 'export', label: 'Export', icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'sales:discount_agreements:view', position: ['toolbar'] as any },
  ] as ActionMeta[],

  formSections: [
    {
      key: 'general',
      title: 'General',
      columns: 2,
      fields: [
        { key: 'code', label: 'Code', type: 'code', required: true, placeholder: 'e.g. DA-001' },
        { key: 'name_en', label: 'Name (EN)', type: 'text', required: true, placeholder: 'Agreement name in English' },
        { key: 'name_ar', label: 'Name (AR)', type: 'text', placeholder: 'Agreement name in Arabic' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Agreement description' },
        { key: 'is_active', label: 'Active', type: 'toggle', defaultValue: true },
      ],
    },
    {
      key: 'terms',
      title: 'Terms',
      columns: 2,
      fields: [
        {
          key: 'discount_type', label: 'Discount Type', type: 'select',
          options: [
            { label: 'Percentage', value: 'Percentage' },
            { label: 'Fixed Amount', value: 'Fixed Amount' },
            { label: 'Tiered', value: 'Tiered' },
            { label: 'Volume', value: 'Volume' },
          ],
        },
        { key: 'discount_value', label: 'Discount Value', type: 'decimal', placeholder: '0.00' },
        { key: 'min_quantity', label: 'Min Quantity', type: 'number', placeholder: '0' },
        { key: 'min_amount', label: 'Min Amount', type: 'currency', placeholder: '0.00' },
      ],
    },
    {
      key: 'parties_validity',
      title: 'Parties & Validity',
      columns: 2,
      fields: [
        { key: 'customer_id', label: 'Customer', type: 'searchable-select', endpoint: '/api/master/customers', labelKey: 'name_en', valueKey: 'id' },
        { key: 'vendor_id', label: 'Vendor', type: 'searchable-select', endpoint: '/api/master/vendors', labelKey: 'name_en', valueKey: 'id' },
        { key: 'valid_from', label: 'Valid From', type: 'date' },
        { key: 'valid_to', label: 'Valid To', type: 'date' },
      ],
    },
  ] as PageSection[],
};

export default discountAgreementsConfig;
