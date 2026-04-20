/**
 * Unit Types Master Data — Page Configuration
 * Auto-generated governance config for Unit Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface UnitType {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  is_active: boolean;
}

export type { UnitType as UnitTypeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<UnitType>[] = [
  { key: 'code',        label: 'Code',        sortable: true,  width: 100 },
  { key: 'name_en',     label: 'Name (EN)',   sortable: true               },
  { key: 'name_ar',     label: 'Name (AR)',   sortable: true               },
  { key: 'description', label: 'Description', sortable: false              },
  { key: 'is_active',   label: 'Active',      sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',        label: 'Code',           type: 'code',     required: 'optional',    placeholder: 'Unit type code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',     label: 'Name (English)',  type: 'text',     required: 'required',    placeholder: 'Unit type name in English' },
      { key: 'name_ar',     label: 'Name (Arabic)',   type: 'text',     required: 'recommended', placeholder: 'اسم نوع الوحدة بالعربية' },
      { key: 'description', label: 'Description',     type: 'textarea', required: 'optional',    placeholder: 'Brief description of this unit type', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:unit_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:unit_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:unit_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:unit_types:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const unitTypesConfig: PageConfig<UnitType> = {
  title: 'Unit Types',
  titleKey: 'pages.master.unitTypes.title',
  subtitle: 'Manage unit classification types (weight, length, volume, etc.)',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Unit Types' },
  ],
  apiEndpoint: '/api/master/unit-types',
  resourceName: 'unit_types',
  permissionPrefix: 'master:unit_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'unit_types',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const unitTypeConfig = unitTypesConfig;
