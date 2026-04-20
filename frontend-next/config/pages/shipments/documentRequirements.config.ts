/**
 * Shipment Document Requirements — Page Configuration
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface ShipmentDocumentRequirement {
  id: number;
  requirement_code?: string;
  name_en: string;
  name_ar?: string;
  document_category?: string;
  stage?: string;
  is_mandatory: boolean;
  is_active: boolean;
  issuing_authority?: string;
  valid_days?: number;
  applies_to?: string;
  description_en?: string;
  description_ar?: string;
  sort_order?: number;
  shipment_type_id?: number;
  shipment_type_name_en?: string;
  template_url?: string;
  created_at?: string;
  updated_at?: string;
}

const columns: ColumnMeta<ShipmentDocumentRequirement>[] = [
  { key: 'requirement_code',       label: 'Code',        sortable: true,  width: 100 },
  { key: 'name_en',                label: 'Name (EN)',    sortable: true               },
  { key: 'name_ar',                label: 'Name (AR)',    sortable: true               },
  { key: 'document_category',      label: 'Category',     sortable: true,  width: 130 },
  { key: 'stage',                  label: 'Stage',        sortable: true,  width: 130 },
  { key: 'is_mandatory',           label: 'Mandatory',    sortable: true,  width: 90,  format: 'boolean', align: 'center' },
  { key: 'shipment_type_name_en',  label: 'Shipment Type', sortable: false, width: 140 },
  { key: 'is_active',              label: 'Active',       sortable: true,  width: 80,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Basic Information',
    fields: [
      { key: 'requirement_code', label: 'Code',         type: 'code', required: 'optional', placeholder: 'Document code', autoUppercase: true, colSpan: 4 },
      { key: 'name_en',          label: 'Name (English)', type: 'text', required: 'required', placeholder: 'Document name in English' },
      { key: 'name_ar',          label: 'Name (Arabic)',  type: 'text', required: 'recommended', placeholder: 'اسم المستند بالعربية' },
      {
        key: 'document_category', label: 'Category', type: 'select', required: 'recommended',
        options: [
          { value: 'commercial',    label: 'Commercial' },
          { value: 'transport',     label: 'Transport' },
          { value: 'customs',       label: 'Customs' },
          { value: 'insurance',     label: 'Insurance' },
          { value: 'inspection',    label: 'Inspection' },
          { value: 'compliance',    label: 'Compliance' },
          { value: 'financial',     label: 'Financial' },
          { value: 'other',         label: 'Other' },
        ],
      },
    ],
  },
  {
    key: 'requirements',
    label: 'Requirement Details',
    fields: [
      {
        key: 'stage', label: 'Required at Stage', type: 'select', required: 'recommended',
        options: [
          { value: 'booking',           label: 'Booking' },
          { value: 'loading',           label: 'Loading' },
          { value: 'in_transit',        label: 'In Transit' },
          { value: 'port_arrival',      label: 'Port Arrival' },
          { value: 'customs_clearance', label: 'Customs Clearance' },
          { value: 'delivery',          label: 'Delivery' },
          { value: 'receiving',         label: 'Receiving' },
          { value: 'all',               label: 'All Stages' },
        ],
      },
      {
        key: 'applies_to', label: 'Applies To', type: 'select', required: 'optional',
        options: [
          { value: 'import',  label: 'Import' },
          { value: 'export',  label: 'Export' },
          { value: 'both',    label: 'Both' },
        ],
      },
      { key: 'is_mandatory', label: 'Mandatory', type: 'toggle', required: 'optional', defaultValue: false },
      {
        key: 'shipment_type_id',
        label: 'Shipment Type',
        type: 'searchable-select',
        required: 'optional',
        placeholder: 'Select shipment type',
        dataSource: {
          type: 'api',
          endpoint: '/api/logistics-shipment-types?limit=100',
          valueField: 'id',
          labelField: 'name_en',
          labelArField: 'name_ar',
        },
      },
      { key: 'issuing_authority', label: 'Issuing Authority', type: 'text', required: 'optional', placeholder: 'Authority that issues this document' },
      { key: 'valid_days', label: 'Validity (Days)', type: 'number', required: 'optional', placeholder: '0 = no expiry' },
      { key: 'template_url', label: 'Template URL', type: 'text', required: 'optional', placeholder: 'URL to document template' },
    ],
  },
  {
    key: 'descriptions',
    label: 'Descriptions',
    fields: [
      { key: 'description_en', label: 'Description (EN)', type: 'textarea', required: 'optional', placeholder: 'Description in English', colSpan: 'full' as any },
      { key: 'description_ar', label: 'Description (AR)', type: 'textarea', required: 'optional', placeholder: 'الوصف بالعربية', colSpan: 'full' as any },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    fields: [
      { key: 'sort_order', label: 'Sort Order', type: 'number', required: 'optional', placeholder: '0' },
      { key: 'is_active', label: 'Active', type: 'toggle', required: 'optional', defaultValue: true },
    ],
  },
];

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'logistics:shipment_document_requirements:manage', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'logistics:shipment_document_requirements:manage', position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'logistics:shipment_document_requirements:manage', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'logistics:shipment_document_requirements:view',   position: ['toolbar'] },
];

export const documentRequirementsConfig: PageConfig<ShipmentDocumentRequirement> = {
  title: 'Document Requirements',
  titleKey: 'pages.shipments.documentRequirements.title',
  subtitle: 'Define required documents per shipment type, stage, and category',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Shipments', href: '/shipments' },
    { label: 'Document Requirements' },
  ],
  apiEndpoint: '/api/shipment-document-requirements',
  resourceName: 'shipment_document_requirements',
  permissionPrefix: 'logistics:shipment_document_requirements',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'shipment_document_requirements',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
