/**
 * Transport Routes Master Data — Page Configuration
 * Governance config for Transport Routes CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface TransportRoute {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  route_type?: string;
  transport_mode?: string;
  origin_type?: string;
  origin_port_id?: number;
  origin_city_id?: number;
  origin_country_id?: number;
  origin_description?: string;
  destination_type?: string;
  destination_port_id?: number;
  destination_city_id?: number;
  destination_country_id?: number;
  destination_description?: string;
  via_points?: any;
  distance_km?: number;
  estimated_hours?: number;
  estimated_days?: number;
  cost_per_trip?: number;
  cost_per_ton_km?: number;
  currency_code?: string;
  requires_customs_clearance?: boolean;
  border_crossing_points?: string[];
  risk_level?: string;
  frequency?: string;
  preferred_carrier_id?: number;
  max_weight_tons?: number;
  notes?: string;
  is_active: boolean;
  sort_order?: number;
}

const columns: ColumnMeta<TransportRoute>[] = [
  { key: 'code',             label: 'Code',          sortable: true,  width: 100 },
  { key: 'name_en',          label: 'Route Name',    sortable: true },
  { key: 'route_type',       label: 'Type',          sortable: true,  width: 110 },
  { key: 'transport_mode',   label: 'Mode',          sortable: true,  width: 100 },
  { key: 'origin_description',      label: 'Origin',       sortable: true,  width: 140 },
  { key: 'destination_description', label: 'Destination',  sortable: true,  width: 140 },
  { key: 'distance_km',      label: 'Distance (km)', sortable: true,  width: 110, format: 'number', align: 'right' },
  { key: 'estimated_days',   label: 'Est. Days',     sortable: true,  width: 90,  format: 'number', align: 'center' },
  { key: 'risk_level',       label: 'Risk',          sortable: true,  width: 80 },
  { key: 'is_active',        label: 'Active',        sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Route Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional', placeholder: 'Route code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)', type: 'text', required: 'required', placeholder: 'Route name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',  type: 'text', required: 'recommended', placeholder: 'اسم المسار بالعربية' },
      { key: 'route_type', label: 'Route Type', type: 'select', required: 'recommended', placeholder: 'Select type',
        options: [
          { value: 'domestic',      label: 'Domestic' },
          { value: 'international', label: 'International' },
          { value: 'cross_border',  label: 'Cross Border' },
          { value: 'transit',       label: 'Transit' },
        ],
      },
      { key: 'transport_mode', label: 'Transport Mode', type: 'select', required: 'recommended', placeholder: 'Mode',
        options: [
          { value: 'road',  label: 'Road' },
          { value: 'sea',   label: 'Sea' },
          { value: 'air',   label: 'Air' },
          { value: 'rail',  label: 'Rail' },
          { value: 'multi', label: 'Multimodal' },
        ],
      },
    ],
  },
  {
    key: 'origin',
    label: 'Origin',
    fields: [
      { key: 'origin_type', label: 'Origin Type', type: 'select', required: 'optional', placeholder: 'Type',
        options: [
          { value: 'port',      label: 'Port' },
          { value: 'city',      label: 'City' },
          { value: 'warehouse', label: 'Warehouse' },
        ],
      },
      { key: 'origin_description',   label: 'Origin Description',   type: 'text',   required: 'recommended', placeholder: 'Origin location description' },
      { key: 'origin_country_id',    label: 'Origin Country',       type: 'number', required: 'optional', placeholder: 'Country ID' },
      { key: 'origin_city_id',       label: 'Origin City',          type: 'number', required: 'optional', placeholder: 'City ID' },
      { key: 'origin_port_id',       label: 'Origin Port',          type: 'number', required: 'optional', placeholder: 'Port ID' },
    ],
  },
  {
    key: 'destination',
    label: 'Destination',
    fields: [
      { key: 'destination_type', label: 'Destination Type', type: 'select', required: 'optional', placeholder: 'Type',
        options: [
          { value: 'port',      label: 'Port' },
          { value: 'city',      label: 'City' },
          { value: 'warehouse', label: 'Warehouse' },
        ],
      },
      { key: 'destination_description', label: 'Dest. Description', type: 'text',   required: 'recommended', placeholder: 'Destination location description' },
      { key: 'destination_country_id',  label: 'Dest. Country',     type: 'number', required: 'optional', placeholder: 'Country ID' },
      { key: 'destination_city_id',     label: 'Dest. City',        type: 'number', required: 'optional', placeholder: 'City ID' },
      { key: 'destination_port_id',     label: 'Dest. Port',        type: 'number', required: 'optional', placeholder: 'Port ID' },
    ],
  },
  {
    key: 'logistics',
    label: 'Logistics',
    fields: [
      { key: 'distance_km',     label: 'Distance (km)',   type: 'number', required: 'optional', placeholder: 'Total distance' },
      { key: 'estimated_hours', label: 'Est. Hours',      type: 'number', required: 'optional', placeholder: 'Estimated hours' },
      { key: 'estimated_days',  label: 'Est. Days',       type: 'number', required: 'optional', placeholder: 'Estimated days' },
      { key: 'max_weight_tons', label: 'Max Weight (t)',  type: 'number', required: 'optional', placeholder: 'Maximum weight in tons' },
      { key: 'frequency', label: 'Frequency', type: 'select', required: 'optional', placeholder: 'Schedule frequency',
        options: [
          { value: 'daily',     label: 'Daily' },
          { value: 'weekly',    label: 'Weekly' },
          { value: 'biweekly',  label: 'Bi-weekly' },
          { value: 'monthly',   label: 'Monthly' },
          { value: 'on_demand', label: 'On Demand' },
        ],
      },
      { key: 'risk_level', label: 'Risk Level', type: 'select', required: 'optional', placeholder: 'Risk level',
        options: [
          { value: 'low',      label: 'Low' },
          { value: 'medium',   label: 'Medium' },
          { value: 'high',     label: 'High' },
          { value: 'critical', label: 'Critical' },
        ],
      },
      { key: 'requires_customs_clearance', label: 'Requires Customs', type: 'toggle', required: 'optional', defaultValue: false },
    ],
  },
  {
    key: 'cost',
    label: 'Cost',
    fields: [
      { key: 'cost_per_trip',   label: 'Cost per Trip',   type: 'number', required: 'optional', placeholder: 'Cost per trip' },
      { key: 'cost_per_ton_km', label: 'Cost per Ton-KM', type: 'number', required: 'optional', placeholder: 'Cost per ton-km' },
      { key: 'currency_code',   label: 'Currency',        type: 'text',   required: 'optional', placeholder: 'Currency code (e.g., USD)' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'master:transport_routes:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:transport_routes:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'master:transport_routes:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:transport_routes:view',   position: ['toolbar'] },
];

export const transportRoutesConfig: PageConfig<TransportRoute> = {
  title: 'Transport Routes',
  titleKey: 'pages.master.transportRoutes.title',
  subtitle: 'Manage transport routes, distances, and logistics',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Transport Routes' },
  ],
  apiEndpoint: '/api/master/transport-routes',
  resourceName: 'transport_routes',
  permissionPrefix: 'master:transport_routes',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'transport_routes',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const transportRouteConfig = transportRoutesConfig;
