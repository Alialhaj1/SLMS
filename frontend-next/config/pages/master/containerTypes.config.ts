/**
 * Container Types Master Data — Page Configuration
 * Auto-generated governance config for Container Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ContainerType {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  size?: string;
  max_weight?: number;
  description?: string;
  is_active: boolean;
}

export type { ContainerType as ContainerTypeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ContainerType>[] = [
  { key: 'code',       label: 'Code',         sortable: true,  width: 100 },
  { key: 'name_en',    label: 'Name (EN)',    sortable: true               },
  { key: 'name_ar',    label: 'Name (AR)',    sortable: true               },
  { key: 'size',       label: 'Size',         sortable: true,  width: 120 },
  { key: 'max_weight', label: 'Max Weight',   sortable: true,  width: 130, format: 'number', align: 'right' },
  { key: 'is_active',  label: 'Active',       sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Container type code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Container type name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم نوع الحاوية بالعربية' },
    ],
  },
  {
    key: 'specifications',
    label: 'Specifications',
    fields: [
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        required: 'recommended',
        placeholder: 'Select container size',
        options: [
          { value: '20ft',    label: '20ft' },
          { value: '40ft',    label: '40ft' },
          { value: '40ft HC', label: '40ft HC' },
          { value: '45ft',    label: '45ft' },
        ],
      },
      { key: 'max_weight',  label: 'Max Weight (kg)', type: 'number', required: 'optional', placeholder: 'Maximum weight capacity' },
      { key: 'description', label: 'Description',     type: 'textarea', required: 'optional', placeholder: 'Brief description of this container type', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:container_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:container_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:container_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:container_types:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const containerTypesConfig: PageConfig<ContainerType> = {
  title: 'Container Types',
  titleKey: 'pages.master.containerTypes.title',
  subtitle: 'Manage shipping container type definitions and specifications',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Container Types' },
  ],
  apiEndpoint: '/api/master/container-types',
  resourceName: 'container_types',
  permissionPrefix: 'master:container_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'container_types',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const containerTypeConfig = containerTypesConfig;
