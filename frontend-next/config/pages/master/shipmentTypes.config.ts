/**
 * Shipment Types Master Data — Page Configuration
 * Auto-generated governance config for Shipment Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface ShipmentType {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  transport_mode?: string;
  is_active: boolean;
}

export type { ShipmentType as ShipmentTypeType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<ShipmentType>[] = [
  { key: 'code',           label: 'Code',           sortable: true,  width: 100 },
  { key: 'name_en',        label: 'Name (EN)',      sortable: true               },
  { key: 'name_ar',        label: 'Name (AR)',      sortable: true               },
  { key: 'transport_mode', label: 'Transport Mode', sortable: true,  width: 140 },
  { key: 'is_active',      label: 'Active',         sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Shipment type code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Shipment type name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم نوع الشحنة بالعربية' },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    fields: [
      {
        key: 'transport_mode',
        label: 'Transport Mode',
        type: 'select',
        required: 'recommended',
        placeholder: 'Select transport mode',
        options: [
          { value: 'Sea',        label: 'Sea' },
          { value: 'Air',        label: 'Air' },
          { value: 'Land',       label: 'Land' },
          { value: 'Rail',       label: 'Rail' },
          { value: 'Multimodal', label: 'Multimodal' },
        ],
      },
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Brief description of this shipment type', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:shipment_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:shipment_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:shipment_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:shipment_types:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const shipmentTypesConfig: PageConfig<ShipmentType> = {
  title: 'Shipment Types',
  titleKey: 'pages.master.shipmentTypes.title',
  subtitle: 'Manage shipment type definitions and transport mode associations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Shipment Types' },
  ],
  apiEndpoint: '/api/master/shipment-types',
  resourceName: 'shipment_types',
  permissionPrefix: 'master:shipment_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'shipment_types',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const shipmentTypeConfig = shipmentTypesConfig;
