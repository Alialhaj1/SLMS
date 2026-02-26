/**
 * Countries Master Data — Page Configuration
 * Auto-generated governance config for Countries CRUD.
 */
import type { PageConfig, FieldMeta, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface Country {
  id: number;
  code: string;
  code_2?: string;
  code3?: string;
  name: string;
  name_ar?: string;
  numeric_code?: string;
  phone_code?: string;
  currency_code?: string;
  flag_emoji?: string;
  capital_en?: string;
  capital_ar?: string;
  continent?: string;
  region_id?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type { Country as CountryType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<Country>[] = [
  { key: 'code',          label: 'Code',          sortable: true,  width: 90  },
  { key: 'name',          label: 'Name',          sortable: true               },
  { key: 'name_ar',       label: 'Name (AR)',     sortable: true               },
  { key: 'phone_code',    label: 'Phone Code',    sortable: false, width: 110  },
  { key: 'currency_code', label: 'Currency',      sortable: true,  width: 100  },
  { key: 'flag_emoji',    label: 'Flag',          sortable: false, width: 60, align: 'center' },
  { key: 'continent',     label: 'Continent',     sortable: true,  width: 130  },
  { key: 'is_active',     label: 'Active',        sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const CONTINENT_OPTIONS = [
  { value: 'Asia',           label: 'Asia',           labelAr: 'آسيا' },
  { value: 'Europe',         label: 'Europe',         labelAr: 'أوروبا' },
  { value: 'Africa',         label: 'Africa',         labelAr: 'أفريقيا' },
  { value: 'North America',  label: 'North America',  labelAr: 'أمريكا الشمالية' },
  { value: 'South America',  label: 'South America',  labelAr: 'أمريكا الجنوبية' },
  { value: 'Oceania',        label: 'Oceania',        labelAr: 'أوقيانوسيا' },
  { value: 'Antarctica',     label: 'Antarctica',     labelAr: 'القارة القطبية الجنوبية' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',   label: 'Country Code (ISO 3)',  type: 'code', required: 'required',    placeholder: 'e.g. SAU', autoUppercase: true, validation: [{ type: 'maxLength', value: 3 }], colSpan: 4 },
      { key: 'code_2', label: 'Country Code (ISO 2)',   type: 'code', required: 'optional',    placeholder: 'e.g. SA',  autoUppercase: true, validation: [{ type: 'maxLength', value: 2 }], colSpan: 4 },
      { key: 'name',   label: 'Name (English)',         type: 'text', required: 'required',    placeholder: 'Country name in English' },
      { key: 'name_ar',label: 'Name (Arabic)',          type: 'text', required: 'recommended', placeholder: 'اسم الدولة بالعربية' },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'phone_code',    label: 'Phone Code',      type: 'text',    required: 'optional', placeholder: '+966', colSpan: 4 },
      { key: 'currency_code', label: 'Currency Code',    type: 'text',    required: 'optional', placeholder: 'e.g. SAR', autoUppercase: true, colSpan: 4 },
      { key: 'flag_emoji',    label: 'Flag Emoji',       type: 'text',    required: 'optional', placeholder: '🇸🇦', colSpan: 4 },
      { key: 'capital_en',    label: 'Capital (English)', type: 'text',   required: 'optional', placeholder: 'Capital city name' },
      { key: 'capital_ar',    label: 'Capital (Arabic)',  type: 'text',   required: 'optional', placeholder: 'اسم العاصمة بالعربية' },
      { key: 'continent',     label: 'Continent',        type: 'select',  required: 'optional', options: CONTINENT_OPTIONS, dataSource: { type: 'static', options: CONTINENT_OPTIONS } },
      { key: 'numeric_code',  label: 'Numeric Code',     type: 'text',    required: 'optional', placeholder: 'e.g. 682', colSpan: 4 },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:countries:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:countries:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:countries:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:countries:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const countriesConfig: PageConfig<Country> = {
  title: 'Countries',
  titleKey: 'pages.master.countries.title',
  subtitle: 'Manage country definitions and ISO codes',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Countries' },
  ],
  apiEndpoint: '/api/master/countries',
  resourceName: 'countries',
  permissionPrefix: 'master:countries',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'countries',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
