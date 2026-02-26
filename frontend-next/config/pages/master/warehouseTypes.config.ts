import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface WarehouseType {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

const warehouseTypesConfig: PageConfig = {
  pageKey: 'master:warehouse_types',
  title: 'Warehouse Types',
  description: 'Manage warehouse type classifications',
  apiEndpoint: '/api/master/warehouse-types',
  permissionPrefix: 'master:warehouse_types',

  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Warehouse Types' },
  ],

  columns: [
    { key: 'code', label: 'Code', type: 'text', sortable: true, filterable: true, width: 120 },
    { key: 'name_en', label: 'Name (EN)', type: 'text', sortable: true, filterable: true, width: 200 },
    { key: 'name_ar', label: 'Name (AR)', type: 'text', sortable: true, filterable: true, width: 200 },
    { key: 'description', label: 'Description', type: 'text', sortable: false, filterable: true, width: 300 },
    { key: 'is_active', label: 'Active', type: 'boolean', sortable: true, filterable: true, width: 100 },
  ] as ColumnMeta[],

  actions: [
    { key: 'create', label: 'Create New', icon: 'PlusIcon', variant: 'primary', permission: 'master:warehouse_types:create', position: ['toolbar'] as any },
    { key: 'edit', label: 'Edit', icon: 'PencilSquareIcon', variant: 'secondary', permission: 'master:warehouse_types:edit', position: ['row'] as any },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', variant: 'danger', permission: 'master:warehouse_types:delete', position: ['row', 'bulk'] as any, requireConfirmation: true, isDangerous: true },
    { key: 'export', label: 'Export', icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:warehouse_types:view', position: ['toolbar'] as any },
  ] as ActionMeta[],

  formSections: [
    {
      key: 'general',
      title: 'General Information',
      columns: 2,
      fields: [
        { key: 'code', label: 'Code', type: 'code', placeholder: 'e.g. WT-001' },
        { key: 'name_en', label: 'Name (EN)', type: 'text', required: true, placeholder: 'Type name in English' },
        { key: 'name_ar', label: 'Name (AR)', type: 'text', placeholder: 'Type name in Arabic' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description' },
        { key: 'is_active', label: 'Active', type: 'toggle', defaultValue: true },
      ],
    },
  ] as PageSection[],
};

export default warehouseTypesConfig;
