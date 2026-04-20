/**
 * Drivers Master Data — Page Configuration
 * Governance config for Drivers CRUD.
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection } from '@/lib/governance/types';

export interface Driver {
  id: number;
  code: string;
  full_name_en: string;
  full_name_ar?: string;
  id_number?: string;
  id_type?: string;
  nationality_id?: number;
  phone?: string;
  phone2?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  license_number?: string;
  license_type?: string;
  license_expiry?: string;
  license_issuing_country_id?: number;
  transport_company_id?: number;
  transport_company_name?: string;
  assigned_vehicle_id?: number;
  assigned_vehicle_plate?: string;
  current_status?: string;
  hire_date?: string;
  contract_end?: string;
  daily_rate?: number;
  per_trip_rate?: number;
  total_trips?: number;
  total_km?: number;
  rating?: number;
  certifications?: string[];
  violations_count?: number;
  blood_type?: string;
  medical_clearance_expiry?: string;
  notes?: string;
  is_active: boolean;
  sort_order?: number;
}

const columns: ColumnMeta<Driver>[] = [
  { key: 'code',                   label: 'Code',          sortable: true,  width: 100 },
  { key: 'full_name_en',           label: 'Name (EN)',     sortable: true },
  { key: 'full_name_ar',           label: 'Name (AR)',     sortable: true },
  { key: 'license_number',         label: 'License No.',   sortable: true,  width: 130 },
  { key: 'license_type',           label: 'License Type',  sortable: true,  width: 110 },
  { key: 'transport_company_name', label: 'Company',       sortable: true,  width: 160 },
  { key: 'current_status',         label: 'Status',        sortable: true,  width: 100 },
  { key: 'rating',                 label: 'Rating',        sortable: true,  width: 80,  format: 'number', align: 'center' },
  { key: 'is_active',              label: 'Active',        sortable: true,  width: 90,  format: 'boolean', align: 'center' },
];

const formSections: PageSection[] = [
  {
    key: 'identity',
    label: 'Personal Information',
    fields: [
      { key: 'code',          label: 'Code',           type: 'code', required: 'optional', placeholder: 'Driver code', autoUppercase: true, colSpan: 4 },
      { key: 'full_name_en',  label: 'Full Name (EN)', type: 'text', required: 'required', placeholder: 'Full name in English' },
      { key: 'full_name_ar',  label: 'Full Name (AR)', type: 'text', required: 'recommended', placeholder: 'الاسم الكامل بالعربية' },
      { key: 'id_type', label: 'ID Type', type: 'select', required: 'optional', placeholder: 'ID document type',
        options: [
          { value: 'national_id', label: 'National ID' },
          { value: 'passport',    label: 'Passport' },
          { value: 'iqama',       label: 'Iqama / Residence' },
        ],
      },
      { key: 'id_number',    label: 'ID Number',   type: 'text', required: 'optional', placeholder: 'ID document number' },
      { key: 'blood_type', label: 'Blood Type', type: 'select', required: 'optional', placeholder: 'Blood type',
        options: [
          { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
          { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
          { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
          { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
        ],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    fields: [
      { key: 'phone',                  label: 'Phone',                 type: 'text', required: 'optional', placeholder: 'Primary phone' },
      { key: 'phone2',                 label: 'Phone 2',              type: 'text', required: 'optional', placeholder: 'Secondary phone' },
      { key: 'email',                  label: 'Email',                type: 'text', required: 'optional', placeholder: 'Email address' },
      { key: 'emergency_contact_name', label: 'Emergency Contact',    type: 'text', required: 'optional', placeholder: 'Emergency contact name' },
      { key: 'emergency_contact_phone', label: 'Emergency Phone',     type: 'text', required: 'optional', placeholder: 'Emergency contact phone' },
    ],
  },
  {
    key: 'license',
    label: 'License Details',
    fields: [
      { key: 'license_number', label: 'License Number', type: 'text', required: 'recommended', placeholder: 'Driving license number' },
      { key: 'license_type', label: 'License Type', type: 'select', required: 'recommended', placeholder: 'License type',
        options: [
          { value: 'light',       label: 'Light Vehicle' },
          { value: 'heavy',       label: 'Heavy Vehicle' },
          { value: 'hazmat',      label: 'Hazmat' },
          { value: 'tanker',      label: 'Tanker' },
          { value: 'trailer',     label: 'Trailer' },
          { value: 'international', label: 'International' },
        ],
      },
      { key: 'license_expiry',              label: 'License Expiry',           type: 'date', required: 'optional' },
      { key: 'medical_clearance_expiry',     label: 'Medical Clearance Expiry', type: 'date', required: 'optional' },
    ],
  },
  {
    key: 'employment',
    label: 'Employment',
    fields: [
      { key: 'transport_company_id', label: 'Transport Company', type: 'number', required: 'optional', placeholder: 'Transport company ID' },
      { key: 'assigned_vehicle_id',  label: 'Assigned Vehicle',  type: 'number', required: 'optional', placeholder: 'Vehicle ID' },
      { key: 'current_status', label: 'Status', type: 'select', required: 'optional', placeholder: 'Current status',
        options: [
          { value: 'available',   label: 'Available' },
          { value: 'on_trip',     label: 'On Trip' },
          { value: 'on_leave',    label: 'On Leave' },
          { value: 'suspended',   label: 'Suspended' },
          { value: 'terminated',  label: 'Terminated' },
        ],
      },
      { key: 'hire_date',     label: 'Hire Date',       type: 'date',   required: 'optional' },
      { key: 'contract_end',  label: 'Contract End',    type: 'date',   required: 'optional' },
    ],
  },
  {
    key: 'rates',
    label: 'Rates & Performance',
    fields: [
      { key: 'daily_rate',       label: 'Daily Rate',    type: 'number', required: 'optional', placeholder: 'Daily rate' },
      { key: 'per_trip_rate',    label: 'Per Trip Rate', type: 'number', required: 'optional', placeholder: 'Rate per trip' },
      { key: 'rating',           label: 'Rating',        type: 'number', required: 'optional', placeholder: 'Driver rating (1-5)' },
      { key: 'total_trips',      label: 'Total Trips',   type: 'number', required: 'optional', placeholder: 'Total trips completed' },
      { key: 'total_km',         label: 'Total KM',      type: 'number', required: 'optional', placeholder: 'Total kilometers driven' },
      { key: 'violations_count', label: 'Violations',    type: 'number', required: 'optional', placeholder: 'Number of violations' },
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
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',          variant: 'primary',   permission: 'master:drivers:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',  variant: 'secondary', permission: 'master:drivers:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',         variant: 'danger',    permission: 'master:drivers:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon', variant: 'secondary', permission: 'master:drivers:view',   position: ['toolbar'] },
];

export const driversConfig: PageConfig<Driver> = {
  title: 'Drivers',
  titleKey: 'pages.master.drivers.title',
  subtitle: 'Manage fleet drivers, licenses, and assignments',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Drivers' },
  ],
  apiEndpoint: '/api/master/drivers',
  resourceName: 'drivers',
  permissionPrefix: 'master:drivers',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'drivers',
  defaultSortField: 'full_name_en',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};

export const driverConfig = driversConfig;
