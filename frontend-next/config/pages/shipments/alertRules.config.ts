/**
 * Shipment Alert Rules — Page Configuration
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface ShipmentAlertRule {
  id: number;
  name: string;
  rule_type?: string;
  severity?: string;
  threshold_value?: number;
  threshold_unit?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const columns: ColumnMeta<ShipmentAlertRule>[] = [
  { key: 'name',            label: 'Rule Name',       sortable: true               },
  { key: 'rule_type',       label: 'Rule Type',       sortable: true,  width: 140 },
  { key: 'severity',        label: 'Severity',        sortable: true,  width: 110, format: 'badge' },
  { key: 'threshold_value', label: 'Threshold',       sortable: true,  width: 110, align: 'right' },
  { key: 'threshold_unit',  label: 'Unit',            sortable: true,  width: 100 },
  { key: 'is_active',       label: 'Active',          sortable: true,  width: 80,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Rule Details',
    fields: [
      { key: 'name',  label: 'Rule Name', type: 'text', required: 'required', placeholder: 'Alert rule name' },
      {
        key: 'rule_type', label: 'Rule Type', type: 'select', required: 'required',
        options: [
          { value: 'eta_delay',         label: 'ETA Delay' },
          { value: 'cost_overrun',      label: 'Cost Overrun' },
          { value: 'document_expiry',   label: 'Document Expiry' },
          { value: 'customs_hold',      label: 'Customs Hold' },
          { value: 'temperature_breach', label: 'Temperature Breach' },
          { value: 'weight_discrepancy', label: 'Weight Discrepancy' },
        ],
      },
      {
        key: 'severity', label: 'Severity', type: 'select', required: 'required',
        options: [
          { value: 'low',      label: 'Low' },
          { value: 'medium',   label: 'Medium' },
          { value: 'high',     label: 'High' },
          { value: 'critical', label: 'Critical' },
        ],
      },
    ],
  },
  {
    key: 'threshold',
    label: 'Threshold',
    fields: [
      { key: 'threshold_value', label: 'Threshold Value', type: 'number', required: 'recommended', placeholder: '0' },
      {
        key: 'threshold_unit', label: 'Threshold Unit', type: 'select', required: 'recommended',
        options: [
          { value: 'days',       label: 'Days' },
          { value: 'hours',      label: 'Hours' },
          { value: 'percentage', label: 'Percentage (%)' },
          { value: 'amount',     label: 'Amount' },
          { value: 'celsius',    label: 'Celsius (°C)' },
          { value: 'kg',         label: 'Kilograms (kg)' },
        ],
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

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'logistics:shipment_alert_rules:manage', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'logistics:shipment_alert_rules:manage', position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'logistics:shipment_alert_rules:manage', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'logistics:shipment_alert_rules:view',   position: ['toolbar'] },
];

export const shipmentAlertRulesConfig: PageConfig<ShipmentAlertRule> = {
  title: 'Shipment Alert Rules',
  titleKey: 'pages.shipments.alertRules.title',
  subtitle: 'Configure automatic alerts for shipment events (delays, cost overruns, compliance issues)',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Shipments', href: '/shipments' },
    { label: 'Alert Rules' },
  ],
  apiEndpoint: '/api/shipment-alert-rules',
  resourceName: 'shipment_alert_rules',
  permissionPrefix: 'logistics:shipment_alert_rules',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'shipment_alert_rules',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
