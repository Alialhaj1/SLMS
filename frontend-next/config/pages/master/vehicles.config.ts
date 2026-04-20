/**
 * Vehicles Master Data — Page Configuration
 * Governance config for Vehicles CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface Vehicle {
  id: number;
  code?: string;
  plate_number: string;
  plate_type?: string;
  vehicle_type_id?: number;
  vehicle_type_name?: string;
  transport_company_id?: number;
  transport_company_name?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vin_number?: string;
  registration_number?: string;
  registration_expiry?: string;
  insurance_policy_number?: string;
  insurance_expiry?: string;
  insurance_company_id?: number;
  inspection_expiry?: string;
  gps_tracker_id?: string;
  gps_enabled?: boolean;
  current_status?: string;
  current_location_text?: string;
  odometer_km?: number;
  fuel_capacity_liters?: number;
  max_weight_tons?: number;
  max_volume_cbm?: number;
  assigned_driver_id?: number;
  assigned_driver_name?: string;
  daily_rate?: number;
  per_km_rate?: number;
  notes?: string;
  is_active: boolean;
  sort_order?: number;
}

const columns: ColumnMeta<Vehicle>[] = [
  { key: 'plate_number',          label: 'Plate Number',   sortable: true, width: 130 },
  { key: 'code',                  label: 'Code',           sortable: true, width: 100 },
  { key: 'vehicle_type_name',     label: 'Vehicle Type',   sortable: true, width: 140 },
  { key: 'transport_company_name', label: 'Company',       sortable: true, width: 160 },
  { key: 'brand',                 label: 'Brand',          sortable: true, width: 100 },
  { key: 'model',                 label: 'Model',          sortable: true, width: 100 },
  { key: 'year',                  label: 'Year',           sortable: true, width: 70,  format: 'number', align: 'center' },
  { key: 'current_status',        label: 'Status',         sortable: true, width: 100 },
  { key: 'is_active',             label: 'Active',         sortable: true, width: 90,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Vehicle Identity',
    fields: [
      { key: 'code',          label: 'Code',         type: 'code', required: 'optional', placeholder: 'Vehicle code', autoUppercase: true, colSpan: 4 },
      { key: 'plate_number',  label: 'Plate Number', type: 'text', required: 'required', placeholder: 'License plate number' },
      { key: 'plate_type',    label: 'Plate Type',   type: 'select', required: 'optional', placeholder: 'Plate type',
        options: [
          { value: 'private',     label: 'Private' },
          { value: 'commercial',  label: 'Commercial' },
          { value: 'government',  label: 'Government' },
          { value: 'diplomatic',  label: 'Diplomatic' },
        ],
      },
      { key: 'brand', label: 'Brand', type: 'text', required: 'optional', placeholder: 'Vehicle brand' },
      { key: 'model', label: 'Model', type: 'text', required: 'optional', placeholder: 'Vehicle model' },
      { key: 'year',  label: 'Year',  type: 'number', required: 'optional', placeholder: 'Manufacturing year' },
      { key: 'color', label: 'Color', type: 'text', required: 'optional', placeholder: 'Vehicle color' },
      { key: 'vin_number', label: 'VIN Number', type: 'text', required: 'optional', placeholder: 'Vehicle identification number' },
    ],
  },
  {
    key: 'assignment',
    label: 'Assignment',
    fields: [
      { key: 'vehicle_type_id',       label: 'Vehicle Type',       type: 'number', required: 'recommended', placeholder: 'Vehicle type ID' },
      { key: 'transport_company_id',   label: 'Transport Company',  type: 'number', required: 'optional', placeholder: 'Transport company ID' },
      { key: 'assigned_driver_id',     label: 'Assigned Driver',    type: 'number', required: 'optional', placeholder: 'Driver ID' },
      { key: 'current_status', label: 'Current Status', type: 'select', required: 'optional', placeholder: 'Status',
        options: [
          { value: 'available',    label: 'Available' },
          { value: 'in_transit',   label: 'In Transit' },
          { value: 'maintenance',  label: 'Maintenance' },
          { value: 'out_of_service', label: 'Out of Service' },
        ],
      },
    ],
  },
  {
    key: 'registration',
    label: 'Registration & Insurance',
    fields: [
      { key: 'registration_number',    label: 'Registration No.',   type: 'text', required: 'optional', placeholder: 'Registration number' },
      { key: 'registration_expiry',     label: 'Registration Expiry', type: 'date', required: 'optional' },
      { key: 'insurance_policy_number', label: 'Insurance Policy',   type: 'text', required: 'optional', placeholder: 'Insurance policy number' },
      { key: 'insurance_expiry',        label: 'Insurance Expiry',   type: 'date', required: 'optional' },
      { key: 'inspection_expiry',       label: 'Inspection Expiry',  type: 'date', required: 'optional' },
    ],
  },
  {
    key: 'specs',
    label: 'Specifications',
    fields: [
      { key: 'max_weight_tons',      label: 'Max Weight (tons)',    type: 'number', required: 'optional', placeholder: 'Maximum weight' },
      { key: 'max_volume_cbm',       label: 'Max Volume (m³)',     type: 'number', required: 'optional', placeholder: 'Maximum volume' },
      { key: 'fuel_capacity_liters', label: 'Fuel Capacity (L)',   type: 'number', required: 'optional', placeholder: 'Fuel tank capacity' },
      { key: 'odometer_km',          label: 'Odometer (km)',       type: 'number', required: 'optional', placeholder: 'Current odometer reading' },
    ],
  },
  {
    key: 'gps',
    label: 'GPS & Tracking',
    fields: [
      { key: 'gps_enabled',          label: 'GPS Enabled',       type: 'toggle', required: 'optional', defaultValue: false },
      { key: 'gps_tracker_id',       label: 'GPS Tracker ID',    type: 'text',   required: 'optional', placeholder: 'GPS device ID' },
      { key: 'current_location_text', label: 'Current Location', type: 'text',   required: 'optional', placeholder: 'Current location description' },
    ],
  },
  {
    key: 'rates',
    label: 'Rates',
    fields: [
      { key: 'daily_rate',  label: 'Daily Rate',    type: 'number', required: 'optional', placeholder: 'Daily rental rate' },
      { key: 'per_km_rate', label: 'Per KM Rate',   type: 'number', required: 'optional', placeholder: 'Rate per kilometer' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'notes',      label: 'Notes',      type: 'textarea', required: 'optional', placeholder: 'Additional notes', colSpan: 'full' as any },
      { key: 'is_active',  label: 'Active',     type: 'toggle',   required: 'optional', defaultValue: true },
      { key: 'sort_order', label: 'Sort Order', type: 'number',   required: 'optional', placeholder: 'Display order' },
    ],
  },
];

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'master:vehicles:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:vehicles:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'master:vehicles:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:vehicles:view',   position: ['toolbar'] },
];

export const vehiclesConfig: PageConfig<Vehicle> = {
  title: 'Vehicles',
  titleKey: 'pages.master.vehicles.title',
  subtitle: 'Manage fleet vehicles, assignments, and tracking',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Vehicles' },
  ],
  apiEndpoint: '/api/master/vehicles',
  resourceName: 'vehicles',
  permissionPrefix: 'master:vehicles',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'vehicles',
  defaultSortField: 'plate_number',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const vehicleConfig = vehiclesConfig;
