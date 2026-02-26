import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface CycleCountPolicy {
  id: number;
  code?: string;
  name_en: string;
  name_ar?: string;
  frequency?: string;
  count_method?: string;
  description?: string;
  is_active: boolean;
}

const cycleCountPoliciesConfig: PageConfig = {
  pageKey: 'master:cycle_count_policies',
  title: 'Counting Policies',
  description: 'Manage cycle count policies and inventory counting schedules',
  apiEndpoint: '/api/master/cycle-count-policies',
  permissionPrefix: 'master:cycle_count_policies',

  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Counting Policies' },
  ],

  columns: [
    { key: 'code', label: 'Code', type: 'text', sortable: true, filterable: true, width: 120 },
    { key: 'name_en', label: 'Name (EN)', type: 'text', sortable: true, filterable: true, width: 200 },
    { key: 'frequency', label: 'Frequency', type: 'text', sortable: true, filterable: true, width: 140 },
    { key: 'count_method', label: 'Count Method', type: 'text', sortable: true, filterable: true, width: 160 },
    { key: 'is_active', label: 'Active', type: 'boolean', sortable: true, filterable: true, width: 100 },
  ] as ColumnMeta[],

  actions: [
    { key: 'create', label: 'Create New', icon: 'PlusIcon', variant: 'primary', permission: 'master:cycle_count_policies:create', position: ['toolbar'] as any },
    { key: 'edit', label: 'Edit', icon: 'PencilSquareIcon', variant: 'secondary', permission: 'master:cycle_count_policies:edit', position: ['row'] as any },
    { key: 'delete', label: 'Delete', icon: 'TrashIcon', variant: 'danger', permission: 'master:cycle_count_policies:delete', position: ['row', 'bulk'] as any, requireConfirmation: true, isDangerous: true },
    { key: 'export', label: 'Export', icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:cycle_count_policies:view', position: ['toolbar'] as any },
  ] as ActionMeta[],

  formSections: [
    {
      key: 'general',
      title: 'General Information',
      columns: 2,
      fields: [
        { key: 'code', label: 'Code', type: 'code', placeholder: 'e.g. CCP-001' },
        { key: 'name_en', label: 'Name (EN)', type: 'text', required: true, placeholder: 'Policy name in English' },
        { key: 'name_ar', label: 'Name (AR)', type: 'text', placeholder: 'Policy name in Arabic' },
        {
          key: 'frequency', label: 'Frequency', type: 'select',
          options: [
            { label: 'Daily', value: 'Daily' },
            { label: 'Weekly', value: 'Weekly' },
            { label: 'Monthly', value: 'Monthly' },
            { label: 'Quarterly', value: 'Quarterly' },
            { label: 'Annually', value: 'Annually' },
          ],
        },
        {
          key: 'count_method', label: 'Count Method', type: 'select',
          options: [
            { label: 'Full Count', value: 'Full Count' },
            { label: 'ABC Analysis', value: 'ABC Analysis' },
            { label: 'Random Sample', value: 'Random Sample' },
            { label: 'Zone', value: 'Zone' },
          ],
        },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Policy description' },
        { key: 'is_active', label: 'Active', type: 'toggle', defaultValue: true },
      ],
    },
  ] as PageSection[],
};

export default cycleCountPoliciesConfig;
