import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface ReorderRule {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  rule_type?: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  lead_time_days?: number;
  description?: string;
  is_active: boolean;
}

const reorderRulesConfig: PageConfig = {
  pageKey: 'master:reorder_rules',
  title: 'Reorder Rules',
  description: 'Manage inventory reorder rules and replenishment parameters',
  apiEndpoint: '/api/master/reorder-rules',
  permissionPrefix: 'master:reorder_rules',

  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Reorder Rules' },
  ],

  columns: [
    { key: 'code', label: 'Code', type: 'text', sortable: true, filterable: true, width: 120 },
    { key: 'name_en', label: 'Name (EN)', type: 'text', sortable: true, filterable: true, width: 200 },
    { key: 'rule_type', label: 'Rule Type', type: 'text', sortable: true, filterable: true, width: 160 },
    { key: 'min_quantity', label: 'Min Qty', type: 'number', sortable: true, filterable: false, width: 110 },
    { key: 'max_quantity', label: 'Max Qty', type: 'number', sortable: true, filterable: false, width: 110 },
    { key: 'reorder_point', label: 'Reorder Point', type: 'number', sortable: true, filterable: false, width: 130 },
    { key: 'is_active', label: 'Active', type: 'boolean', sortable: true, filterable: true, width: 100 },
  ] as ColumnMeta[],

  actions: [
    { key: 'create', label: 'Create New', icon: 'PlusIcon', variant: 'primary', permission: 'master:reorder_rules:create', position: ['toolbar'] as any },
    { key: 'edit', label: 'Edit', icon: 'PencilSquareIcon', variant: 'secondary', permission: 'master:reorder_rules:edit', position: ['row'] as any },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', variant: 'danger', permission: 'master:reorder_rules:delete', position: ['row', 'bulk'] as any, requireConfirmation: true, isDangerous: true },
    { key: 'export', label: 'Export', icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:reorder_rules:view', position: ['toolbar'] as any },
  ] as ActionMeta[],

  formSections: [
    {
      key: 'general',
      title: 'General',
      columns: 2,
      fields: [
        { key: 'code', label: 'Code', type: 'code', placeholder: 'e.g. RR-001' },
        { key: 'name_en', label: 'Name (EN)', type: 'text', required: true, placeholder: 'Rule name in English' },
        { key: 'name_ar', label: 'Name (AR)', type: 'text', placeholder: 'Rule name in Arabic' },
        {
          key: 'rule_type', label: 'Rule Type', type: 'select',
          options: [
            { label: 'Fixed Quantity', value: 'Fixed Quantity' },
            { label: 'Min-Max', value: 'Min-Max' },
            { label: 'Economic Order Quantity', value: 'Economic Order Quantity' },
            { label: 'Just-in-Time', value: 'Just-in-Time' },
          ],
        },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Rule description' },
        { key: 'is_active', label: 'Active', type: 'toggle', defaultValue: true },
      ],
    },
    {
      key: 'parameters',
      title: 'Parameters',
      columns: 2,
      fields: [
        { key: 'min_quantity', label: 'Min Quantity', type: 'number', placeholder: '0' },
        { key: 'max_quantity', label: 'Max Quantity', type: 'number', placeholder: '0' },
        { key: 'reorder_point', label: 'Reorder Point', type: 'number', placeholder: '0' },
        { key: 'lead_time_days', label: 'Lead Time (Days)', type: 'number', placeholder: '0' },
      ],
    },
  ] as PageSection[],
};

export default reorderRulesConfig;
