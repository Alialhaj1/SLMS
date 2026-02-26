/**
 * Ports & Airports Master Data — Page Configuration
 * Auto-generated governance config for Ports & Airports CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface PortAirport {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string;
  type?: string;
  country_id?: number;
  city_id?: number;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

export type { PortAirport as PortAirportType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<PortAirport>[] = [
  { key: 'code',       label: 'Code',      sortable: true,  width: 120 },
  { key: 'name_en',    label: 'Name (EN)', sortable: true               },
  { key: 'type',       label: 'Type',      sortable: true,  width: 120 },
  { key: 'country_id', label: 'Country',   sortable: true,  width: 140, format: 'lookup' },
  { key: 'city_id',    label: 'City',      sortable: true,  width: 140, format: 'lookup' },
  { key: 'is_active',  label: 'Active',    sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'required',    placeholder: 'Port/airport code (e.g. AEAUH, SAJED)', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Port or airport name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم الميناء أو المطار بالعربية' },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        required: 'recommended',
        placeholder: 'Select port/airport type',
        options: [
          { value: 'Sea Port',  label: 'Sea Port' },
          { value: 'Airport',   label: 'Airport' },
          { value: 'Dry Port',  label: 'Dry Port' },
          { value: 'Free Zone', label: 'Free Zone' },
        ],
      },
    ],
  },
  {
    key: 'location',
    label: 'Location',
    fields: [
      { key: 'country_id', label: 'Country',   type: 'searchable-select', required: 'recommended', placeholder: 'Search country...', lookupEndpoint: '/api/master/countries' },
      { key: 'city_id',    label: 'City',       type: 'searchable-select', required: 'optional',    placeholder: 'Search city...',    lookupEndpoint: '/api/master/cities' },
      { key: 'latitude',   label: 'Latitude',   type: 'number',            required: 'optional',    placeholder: 'e.g. 21.4858' },
      { key: 'longitude',  label: 'Longitude',  type: 'number',            required: 'optional',    placeholder: 'e.g. 39.1925' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'ports:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'ports:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'ports:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'ports:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const portsAirportsConfig: PageConfig<PortAirport> = {
  title: 'Ports & Airports',
  titleKey: 'pages.master.portsAirports.title',
  subtitle: 'Manage sea ports, airports, dry ports, and free zone locations',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Ports & Airports' },
  ],
  apiEndpoint: '/api/master/ports-airports',
  resourceName: 'ports',
  permissionPrefix: 'ports',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'ports_airports',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
