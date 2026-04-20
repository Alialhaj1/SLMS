/**
 * Item Types Master Data — Page Configuration
 * Auto-generated governance config for Item Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ItemType {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

export type { ItemType as ItemTypeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ItemType>[] = [
  { key: 'code',      label: 'Code',       sortable: true,  width: 100 },
  { key: 'name_en',   label: 'Name (EN)',  sortable: true               },
  { key: 'name_ar',   label: 'Name (AR)',  sortable: true               },
  { key: 'is_active', label: 'Active',     sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Item type code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Item type name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم نوع الصنف بالعربية' },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Description of this item type', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:item_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:item_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:item_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:item_types:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const itemTypesConfig: PageConfig<ItemType> = {
  title: 'Item Types',
  titleKey: 'pages.master.itemTypes.title',
  subtitle: 'Manage item type classifications',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Item Types' },
  ],
  apiEndpoint: '/api/master/item-types',
  resourceName: 'item-types',
  permissionPrefix: 'master:item_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'item-types',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const itemTypeConfig = itemTypesConfig;
