/**
 * Harvest Schedules Master Data — Page Configuration
 * Auto-generated governance config for Harvest Schedules CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface HarvestSchedule {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  season?: string;
  start_month?: number;
  end_month?: number;
  description?: string;
  is_active: boolean;
}

export type { HarvestSchedule as HarvestScheduleType };

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<HarvestSchedule>[] = [
  { key: 'code',        label: 'Code',        sortable: true,  width: 100 },
  { key: 'name_en',     label: 'Name (EN)',   sortable: true               },
  { key: 'season',      label: 'Season',      sortable: true,  width: 130  },
  { key: 'start_month', label: 'Start Month', sortable: true,  width: 120, align: 'center', format: 'number' },
  { key: 'end_month',   label: 'End Month',   sortable: true,  width: 120, align: 'center', format: 'number' },
  { key: 'is_active',   label: 'Active',      sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

// ─── Form Sections ────────────────────────────────────────────────────────────

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'code',    label: 'Code',           type: 'code', required: 'optional',    placeholder: 'Schedule code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en', label: 'Name (English)',  type: 'text', required: 'required',    placeholder: 'Harvest schedule name in English' },
      { key: 'name_ar', label: 'Name (Arabic)',   type: 'text', required: 'recommended', placeholder: 'اسم جدول الحصاد بالعربية' },
    ],
  },
  {
    key: 'schedule',
    label: 'Schedule',
    fields: [
      {
        key: 'season',
        label: 'Season',
        type: 'select',
        required: 'optional',
        placeholder: 'Select season',
        options: [
          { value: 'Spring',     label: 'Spring' },
          { value: 'Summer',     label: 'Summer' },
          { value: 'Fall',       label: 'Fall' },
          { value: 'Winter',     label: 'Winter' },
          { value: 'Year-Round', label: 'Year-Round' },
        ],
        colSpan: 4,
      },
      { key: 'start_month', label: 'Start Month', type: 'number', required: 'optional', placeholder: '1', validation: [{ type: 'min', value: 1 }, { type: 'max', value: 12 }], helperText: 'Month number (1–12)', colSpan: 4 },
      { key: 'end_month',   label: 'End Month',   type: 'number', required: 'optional', placeholder: '12', validation: [{ type: 'min', value: 1 }, { type: 'max', value: 12 }], helperText: 'Month number (1–12)', colSpan: 4 },
    ],
  },
  {
    key: 'details',
    label: 'Details',
    collapsible: true,
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', required: 'optional', placeholder: 'Description of this harvest schedule', colSpan: 'full' as any },
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
  { key: 'create', label: 'Create New', icon: 'PlusIcon',          variant: 'primary',   permission: 'master:harvest_schedules:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',       icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:harvest_schedules:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',     icon: 'TrashIcon',         variant: 'danger',    permission: 'master:harvest_schedules:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',     icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:harvest_schedules:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const harvestSchedulesConfig: PageConfig<HarvestSchedule> = {
  title: 'Harvest Schedules',
  titleKey: 'pages.master.harvestSchedules.title',
  subtitle: 'Manage crop harvest seasons and timing schedules',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Harvest Schedules' },
  ],
  apiEndpoint: '/api/master/harvest-schedules',
  resourceName: 'harvest-schedules',
  permissionPrefix: 'master:harvest_schedules',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'harvest-schedules',
  defaultSortField: 'name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
