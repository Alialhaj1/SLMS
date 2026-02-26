/**
 * Freight Agents Master Data — Page Configuration
 * Auto-generated governance config for Freight Agents CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface FreightAgent {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  company_id?: number;
  country_id?: number;
  city_id?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  license_number?: string;
  contact_person?: string;
  is_active: boolean;
}

export type { FreightAgent as FreightAgentType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<FreightAgent>[] = [
  { key: 'code',           label: 'Code',           sortable: true,  width: 100 },
  { key: 'name_en',        label: 'Name (EN)',      sortable: true               },
  { key: 'name_ar',        label: 'Name (AR)',      sortable: true               },
  { key: 'phone',          label: 'Phone',          sortable: false, width: 140  },
  { key: 'email',          label: 'Email',          sortable: true,  width: 200  },
  { key: 'license_number', label: 'License No.',    sortable: true,  width: 140  },
  { key: 'is_active',      label: 'Active',         sortable: true,  width: 90, format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Agent Code',      type: 'code', required: 'optional',    placeholder: 'Agent code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',   type: 'text', required: 'required',    placeholder: 'Agent name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',    type: 'text', required: 'recommended', placeholder: 'اسم وكيل الشحن بالعربية' },
    ],
  },
  {
    key: 'location',
    label: 'Location',
    collapsible: true,
    fields: [
      {
        key: 'country_id',
        label: 'Country',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select country',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/countries',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
      {
        key: 'city_id',
        label: 'City',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select city',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/cities',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
          parentField: 'country_id',
          filterParam: 'country_id',
        },
        colSpan: 6,
      },
      { key: 'address', label: 'Address', type: 'textarea', required: 'optional', placeholder: 'Full mailing address', colSpan: 'full' as any },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    collapsible: true,
    fields: [
      { key: 'phone',          label: 'Phone',          type: 'phone', required: 'optional', placeholder: '+966 XX XXX XXXX', colSpan: 6 },
      { key: 'email',          label: 'Email',          type: 'email', required: 'optional', placeholder: 'agent@company.com', validation: [{ type: 'email' }], colSpan: 6 },
      { key: 'website',        label: 'Website',        type: 'url',   required: 'optional', placeholder: 'https://agent.com', validation: [{ type: 'url' }], colSpan: 6 },
      { key: 'contact_person', label: 'Contact Person', type: 'text',  required: 'optional', placeholder: 'Primary contact name', colSpan: 6 },
    ],
  },
  {
    key: 'registration',
    label: 'Registration',
    collapsible: true,
    fields: [
      { key: 'license_number', label: 'License Number', type: 'text', required: 'optional', placeholder: 'Freight license number', colSpan: 6 },
      {
        key: 'company_id',
        label: 'Company',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select parent company',
        dataSource: {
          type: 'api',
          endpoint: '/api/master/companies',
          valueField: 'id',
          labelField: 'name',
          labelArField: 'name_ar',
        },
        colSpan: 6,
      },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'freight_agents:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'freight_agents:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'freight_agents:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'freight_agents:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const freightAgentsConfig: PageConfig<FreightAgent> = {
  title: 'Freight Agents',
  titleKey: 'pages.master.freightAgents.title',
  subtitle: 'Manage freight forwarding agents and their details',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Freight Agents' },
  ],
  apiEndpoint: '/api/master/freight-agents',
  resourceName: 'freight-agents',
  permissionPrefix: 'freight_agents',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'freight-agents',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
