/**
 * 🏛️ ENTERPRISE UI GOVERNANCE - TYPE DEFINITIONS
 * ================================================
 * 
 * Central type system for the Enterprise UI Governance Framework.
 * Defines metadata for fields, columns, actions, and validation.
 * 
 * Every screen in the system uses these types to ensure:
 * ✅ Consistent field governance
 * ✅ Permission-aware rendering
 * ✅ Standardized validation
 * ✅ Audit trail support
 * ✅ i18n ready
 */

// ─── FIELD GOVERNANCE ─────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  | 'textarea'
  | 'select'
  | 'searchable-select'
  | 'multi-select'
  | 'checkbox'
  | 'toggle'
  | 'date'
  | 'datetime'
  | 'time'
  | 'currency'
  | 'percentage'
  | 'file'
  | 'image'
  | 'color'
  | 'code'       // alphanumeric codes like country codes
  | 'reference'; // linked entity reference

export type RequiredLevel = 'required' | 'recommended' | 'optional' | 'conditional';

export type FieldVisibility = 'visible' | 'editable' | 'readonly' | 'hidden';

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'phone' | 'custom';
  value?: any;
  message?: string;
  messageKey?: string; // i18n key
  /** Custom validation function */
  validate?: (value: any, formData: Record<string, any>) => string | null;
}

export interface FieldDependency {
  /** Field that this depends on */
  field: string;
  /** Condition type */
  condition: 'equals' | 'notEquals' | 'contains' | 'notEmpty' | 'empty' | 'greaterThan' | 'lessThan';
  /** Value to compare against */
  value?: any;
  /** What happens when condition is met */
  effect: 'show' | 'hide' | 'require' | 'unrequire' | 'enable' | 'disable' | 'setValue';
  /** Value to set (when effect is 'setValue') */
  setValue?: any;
}

export interface FieldMeta<T = any> {
  /** Unique field key (matches form data key) */
  key: string;
  /** Display label (English) */
  label: string;
  /** i18n label key */
  labelKey?: string;
  /** Field type */
  type: FieldType;
  /** Required level */
  required: RequiredLevel;
  /** Placeholder text */
  placeholder?: string;
  /** i18n key for placeholder */
  placeholderKey?: string;
  /** Helper text shown below field */
  helperText?: string;
  /** i18n key for helper text */
  helperTextKey?: string;
  /** Tooltip text for info icon */
  tooltip?: string;
  /** Default value */
  defaultValue?: any;
  /** Input mask pattern */
  inputMask?: string;
  /** Validation rules */
  validation?: ValidationRule[];
  /** Field dependencies */
  dependencies?: FieldDependency[];
  /** Permission required to see this field */
  viewPermission?: string;
  /** Permission required to edit this field */
  editPermission?: string;
  /** Static options (shortcut for simple select fields) */
  options?: Array<{ value: any; label: string; labelAr?: string }>;
  /** Data source for select/reference fields */
  dataSource?: {
    type: 'static' | 'api' | 'reference';
    /** Static options */
    options?: Array<{ value: any; label: string; labelAr?: string }>;
    /** API endpoint for dynamic options */
    endpoint?: string;
    /** Field mappings from API response */
    valueField?: string;
    labelField?: string;
    labelArField?: string;
    /** Parent field for cascading selects */
    parentField?: string;
    /** Filter parameter name */
    filterParam?: string;
    /** Path to data array within API response (e.g. 'item_types' for response.data.item_types) */
    dataPath?: string;
  };
  /** Grid column span (1-12, or 'full') */
  colSpan?: number | 'full';
  /** Group/section this field belongs to */
  group?: string;
  /** Sort order within group */
  order?: number;
  /** Whether this is a code field (auto uppercase) */
  autoUppercase?: boolean;
  /** Max decimal places for decimal fields */
  decimalPrecision?: number;
  /** Whether code is editable after creation */
  immutableAfterCreate?: boolean;
}

// ─── COLUMN GOVERNANCE ────────────────────────────────────────────────────────

export type ColumnAlignment = 'left' | 'center' | 'right';

export interface ColumnMeta<T = any> {
  /** Column key (matches data key) */
  key: string;
  /** Display header text */
  label: string;
  /** i18n header key */
  labelKey?: string;
  /** Column alignment */
  align?: ColumnAlignment;
  /** Is sortable */
  sortable?: boolean;
  /** Column width (px or %) */
  width?: string | number;
  /** Min width */
  minWidth?: string | number;
  /** Is visible by default */
  defaultVisible?: boolean;
  /** Can be hidden by user */
  hideable?: boolean;
  /** Permission to see this column */
  permission?: string;
  /** Custom cell renderer */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** Value formatter */
  format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'status' | 'percentage';
  /** Enable aggregation */
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  /** Whether this column is pinned */
  pinned?: 'left' | 'right';
  /** Color coding rules */
  colorRules?: Array<{
    condition: (value: any) => boolean;
    color: string;
    bgColor?: string;
  }>;
}

// ─── ACTION GOVERNANCE ────────────────────────────────────────────────────────

export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
export type ActionPosition = 'toolbar' | 'row' | 'bulk' | 'context-menu';

export interface ActionMeta {
  /** Unique action key */
  key: string;
  /** Display label */
  label: string;
  /** i18n label key */
  labelKey?: string;
  /** Icon component name from Heroicons */
  icon?: string;
  /** Action variant/color */
  variant?: ActionVariant;
  /** Permission required */
  permission?: string;
  /** Where this action appears */
  position: ActionPosition[];
  /** Requires confirmation dialog */
  requireConfirmation?: boolean;
  /** Confirmation message */
  confirmMessage?: string;
  /** Whether action is available based on record state */
  isAvailable?: (record: any) => boolean;
  /** Sort order */
  order?: number;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Tooltip */
  tooltip?: string;
  /** Whether this is a dangerous/destructive action */
  isDangerous?: boolean;
}

// ─── PAGE GOVERNANCE ──────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  labelKey?: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PageSection {
  key: string;
  label: string;
  labelKey?: string;
  icon?: React.ReactNode;
  fields: FieldMeta[];
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Whether section starts collapsed */
  defaultCollapsed?: boolean;
  /** Permission to see this section */
  permission?: string;
}

export interface PageConfig<T = any> {
  /** Page title */
  title: string;
  titleKey?: string;
  /** Page subtitle/description */
  subtitle?: string;
  subtitleKey?: string;
  /** Page icon */
  icon?: React.ReactNode;
  /** Breadcrumb trail */
  breadcrumbs: BreadcrumbItem[];
  /** API endpoint */
  apiEndpoint: string;
  /** Resource name for engine hooks (e.g., 'countries', 'cities') */
  resourceName?: string;
  /** Permission prefix (e.g., 'master:countries') */
  permissionPrefix: string;
  /** Column definitions */
  columns: ColumnMeta<T>[];
  /** Form field definitions organized in sections */
  formSections: PageSection[];
  /** Available actions */
  actions: ActionMeta[];
  /** Filter fields */
  filterFields?: FieldMeta[];
  /** Whether audit trail is enabled */
  auditEnabled?: boolean;
  /** Whether export is enabled */
  exportEnabled?: boolean;
  /** Export filename prefix */
  exportFilename?: string;
  /** Custom import endpoint (overrides default /api/master/bulk/:resource/import) */
  importEndpoint?: string;
  /** Default sort field */
  defaultSortField?: string;
  /** Default sort order */
  defaultSortOrder?: 'asc' | 'desc';
  /** Page size options */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Whether to show detail side panel */
  detailPanelEnabled?: boolean;
  /** Detail panel sections */
  detailSections?: PageSection[];
  /** Quick create enabled */
  quickCreateEnabled?: boolean;
  /** Bulk operations enabled */
  bulkOperationsEnabled?: boolean;

  /** Stats bar configuration — stat cards displayed below the header */
  statsConfig?: StatsBarConfig;

  /** Cards view configuration — enables grid card view toggle */
  cardsConfig?: CardsViewConfig<T>;
}

// ─── STATS BAR CONFIG ─────────────────────────────────────────────────────────

export interface StatCardConfig {
  key: string;
  label: string;
  labelKey?: string;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan' | 'orange' | 'gray';
  icon?: React.ReactNode;
  /** The field from the /stats response to display */
  valueKey: string;
  /** Format function */
  format?: 'number' | 'percentage' | 'currency';
}

export interface StatsBarConfig {
  cards: StatCardConfig[];
}

// ─── CARDS VIEW CONFIG ────────────────────────────────────────────────────────

export interface CardsViewConfig<T = any> {
  /** Primary field to show on card */
  titleField: string;
  /** Secondary field (e.g. Arabic name) */
  subtitleField?: string;
  /** Fields to display on the card body */
  bodyFields?: string[];
  /** Field for the status badge */
  statusField?: string;
  /** Custom card renderer */
  renderCard?: (record: T, actions: { onEdit: () => void; onDelete: () => void; onView: () => void }) => React.ReactNode;
}

// ─── FILTER GOVERNANCE ────────────────────────────────────────────────────────

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
  isShared?: boolean;
  createdBy?: string;
  createdAt?: string;
}

// ─── AUDIT GOVERNANCE ─────────────────────────────────────────────────────────

export interface AuditEntry {
  id: number | string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'restore' | string;
  userId: number | string;
  userEmail?: string;
  userName?: string;
  timestamp: string;
  description?: string;
  changes?: Record<string, { before: any; after: any }> | Array<{ field: string; oldValue: any; newValue: any }>;
  ipAddress?: string;
  userAgent?: string;
}

// ─── EXPORT GOVERNANCE ────────────────────────────────────────────────────────

export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'json';

export interface ExportConfig {
  formats: ExportFormat[];
  columns?: string[]; // column keys to include
  filename?: string;
  includeFilters?: boolean;
  maxRows?: number;
}

// ─── STATUS GOVERNANCE ────────────────────────────────────────────────────────

export type StatusType = 'active' | 'inactive' | 'draft' | 'pending' | 'approved' | 'rejected' | 'archived' | 'deleted';

export const STATUS_COLORS: Record<StatusType, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', dot: 'bg-green-500' },
  inactive: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', dot: 'bg-gray-500' },
  draft: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', dot: 'bg-yellow-500' },
  pending: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
  approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', dot: 'bg-green-500' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', dot: 'bg-red-500' },
  archived: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', dot: 'bg-purple-500' },
  deleted: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', dot: 'bg-red-500' },
};
