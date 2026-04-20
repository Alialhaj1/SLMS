/**
 * Vehicle Types Master Data — Page Configuration
 * Governance config for Vehicle Types CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface VehicleType {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  category?: string;
  max_weight_tons?: number;
  max_volume_cbm?: number;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  fuel_type?: string;
  axle_count?: number;
  is_refrigerated?: boolean;
  temperature_range_min?: number;
  temperature_range_max?: number;
  requires_special_license?: boolean;
  license_type?: string;
  icon?: string;
  color_hex?: string;
  description_en?: string;
  description_ar?: string;
  notes?: string;
  is_active: boolean;
  sort_order?: number;
}

const columns: ColumnMeta<VehicleType>[] = [
  { key: 'code',             label: 'Code',          sortable: true,  width: 100 },
  { key: 'name_en',          label: 'Name (EN)',     sortable: true },
  { key: 'name_ar',          label: 'Name (AR)',     sortable: true },
  { key: 'category',         label: 'Category',      sortable: true,  width: 120 },
  { key: 'max_weight_tons',  label: 'Max Weight (t)', sortable: true, width: 120, format: 'number', align: 'right' },
  { key: 'max_volume_cbm',   label: 'Max Vol (m³)',  sortable: true,  width: 110, format: 'number', align: 'right' },
  { key: 'is_refrigerated',  label: 'Reefer',        sortable: true,  width: 80,  format: 'boolean', align: 'center' },
  { key: 'is_active',        label: 'Active',        sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional', placeholder: 'Vehicle type code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)', type: 'text', required: 'required', placeholder: 'Vehicle type name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',  type: 'text', required: 'recommended', placeholder: 'اسم نوع المركبة بالعربية' },
      { key: 'category', label: 'Category', type: 'select', required: 'recommended', placeholder: 'Select category',
        options: [
          { value: 'truck',   label: 'Truck' },
          { value: 'trailer', label: 'Trailer' },
          { value: 'van',     label: 'Van' },
          { value: 'tanker',  label: 'Tanker' },
          { value: 'flatbed', label: 'Flatbed' },
        ],
      },
      { key: 'icon',      label: 'Icon',      type: 'text', required: 'optional', placeholder: 'Emoji or icon', colSpan: 2 },
      { key: 'color_hex', label: 'Color Hex', type: 'text', required: 'optional', placeholder: '#FF0000', colSpan: 2 },
    ],
  },
  {
    key: 'specifications',
    label: 'Specifications',
    fields: [
      { key: 'max_weight_tons', label: 'Max Weight (tons)', type: 'number', required: 'recommended', placeholder: 'Maximum weight capacity' },
      { key: 'max_volume_cbm',  label: 'Max Volume (m³)',   type: 'number', required: 'optional',    placeholder: 'Maximum volume capacity' },
      { key: 'length_m',        label: 'Length (m)',         type: 'number', required: 'optional',    placeholder: 'Length in meters' },
      { key: 'width_m',         label: 'Width (m)',          type: 'number', required: 'optional',    placeholder: 'Width in meters' },
      { key: 'height_m',        label: 'Height (m)',         type: 'number', required: 'optional',    placeholder: 'Height in meters' },
      { key: 'fuel_type',       label: 'Fuel Type',          type: 'select', required: 'optional', placeholder: 'Fuel type',
        options: [
          { value: 'diesel',   label: 'Diesel' },
          { value: 'petrol',   label: 'Petrol' },
          { value: 'electric', label: 'Electric' },
          { value: 'hybrid',   label: 'Hybrid' },
          { value: 'cng',      label: 'CNG' },
        ],
      },
      { key: 'axle_count', label: 'Axle Count', type: 'number', required: 'optional', placeholder: 'Number of axles' },
    ],
  },
  {
    key: 'refrigeration',
    label: 'Refrigeration',
    fields: [
      { key: 'is_refrigerated',      label: 'Refrigerated',      type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'temperature_range_min', label: 'Min Temp (°C)',     type: 'number', required: 'optional', placeholder: 'Minimum temperature' },
      { key: 'temperature_range_max', label: 'Max Temp (°C)',     type: 'number', required: 'optional', placeholder: 'Maximum temperature' },
    ],
  },
  {
    key: 'license',
    label: 'License Requirements',
    fields: [
      { key: 'requires_special_license', label: 'Requires Special License', type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'license_type',             label: 'License Type',             type: 'text',   required: 'optional', placeholder: 'Required license type' },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    fields: [
      { key: 'description_en', label: 'Description (EN)', type: 'textarea', required: 'optional', placeholder: 'Description in English', colSpan: 'full' as any },
      { key: 'description_ar', label: 'Description (AR)', type: 'textarea', required: 'optional', placeholder: 'الوصف بالعربية', colSpan: 'full' as any },
      { key: 'notes',          label: 'Notes',            type: 'textarea', required: 'optional', placeholder: 'Additional notes', colSpan: 'full' as any },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'is_active',  label: 'Active',     type: 'toggle', required: 'optional', defaultValue: true },
      { key: 'sort_order', label: 'Sort Order', type: 'number', required: 'optional', placeholder: 'Display order' },
    ],
  },
];

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'master:vehicle_types:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:vehicle_types:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'master:vehicle_types:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:vehicle_types:view',   position: ['toolbar'] },
];

export const vehicleTypesConfig: PageConfig<VehicleType> = {
  title: 'Vehicle Types',
  titleKey: 'pages.master.vehicleTypes.title',
  subtitle: 'Manage vehicle type definitions and specifications',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Vehicle Types' },
  ],
  apiEndpoint: '/api/master/vehicle-types',
  resourceName: 'vehicle_types',
  permissionPrefix: 'master:vehicle_types',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'vehicle_types',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const vehicleTypeConfig = vehicleTypesConfig;
