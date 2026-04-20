/**
 * Project Management Types — Enhanced for Cost Center Module
 * ===========================================================
 * Supports hierarchical projects (group/master/sub), cost tracking,
 * financial reporting, phases, and integration with shipments/invoices/payments.
 */

// =============================================
// ENUMS & BASIC TYPES
// =============================================

export type ProjectLevel = 'group' | 'master' | 'sub';

export type ProjectStatus = 
  | 'planned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type FinancialStatus = 'open' | 'in_review' | 'approved' | 'closed' | 'archived';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ProjectTypeCode = 
  | 'construction'
  | 'procurement'
  | 'real_estate'
  | 'new_branch'
  | 'internal_dev'
  | 'research_marketing'
  | 'it_infrastructure'
  | 'other';

export type CostCategory =
  | 'freight'
  | 'customs_duty'
  | 'insurance'
  | 'inland_transport'
  | 'supplier_payment'
  | 'service_fee'
  | 'demurrage'
  | 'bank_charges'
  | 'misc'
  | 'revenue';

export type LinkType = 
  | 'shipment'
  | 'purchase_invoice'
  | 'sales_invoice'
  | 'expense'
  | 'payment';

export type PhaseType = 'planning' | 'procurement' | 'execution' | 'testing' | 'closure' | 'custom';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type ProjectItemType = 'task' | 'milestone' | 'deliverable' | 'phase';
export type ProjectItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Legacy cost categories kept for backward compatibility
export type LegacyCostCategory = 'materials' | 'labor' | 'services' | 'equipment' | 'transportation' | 'miscellaneous';

// =============================================
// PROJECT TYPE
// =============================================

export interface ProjectType {
  id: number;
  code: ProjectTypeCode;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  is_system?: boolean;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// COST SUMMARY (from v_project_cost_summary view)
// =============================================

export interface ProjectCostSummary {
  total_cost: number;
  total_revenue: number;
  profit_loss: number;
  freight_cost: number;
  customs_cost: number;
  insurance_cost: number;
  inland_transport_cost: number;
  supplier_payment_cost: number;
  service_fee_cost: number;
  demurrage_cost: number;
  bank_charges_cost: number;
  misc_cost: number;
  shipment_linked_cost: number;
  payment_linked_cost: number;
  expense_linked_cost: number;
  invoice_linked_cost: number;
  shipments_count: number;
  payments_count: number;
  expenses_count: number;
  invoices_count: number;
  total_links_count: number;
}

// =============================================
// PROJECT ENTITY
// =============================================

export interface Project {
  id: number;
  company_id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;

  // Hierarchy
  project_level: ProjectLevel;
  parent_project_id?: number | null;
  parent_code?: string;
  parent_name?: string;
  children?: Project[];
  children_count?: number;
  level: number;
  depth?: number;
  path?: string;

  // Classification
  project_type_id?: number | null;
  project_type_code?: string;
  project_type_name?: string;
  project_type_name_ar?: string;
  project_type_icon?: string;
  project_type_color?: string;

  // People
  customer_id?: number | null;
  customer_name?: string;
  manager_id?: number | null;
  manager_name?: string;
  vendor_id?: number | null;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_code?: string;

  // Currency
  currency_id?: number | null;
  currency_code?: string;

  // Dates
  start_date?: string | null;
  end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;

  // Budget (original)
  budget: number;
  budget_materials: number;
  budget_labor: number;
  budget_services: number;
  budget_miscellaneous: number;

  // Cost Center fields (new)
  budget_allocated: number;
  budget_consumed: number;
  budget_remaining?: number;
  revenue_target: number;
  revenue_actual: number;

  // Financials (legacy)
  total_expected_amount?: number;
  total_actual_cost?: number;
  total_paid_amount?: number;
  balance_remaining?: number;

  // Cost summary from view
  cost_summary?: ProjectCostSummary;

  // Progress
  progress_percent: number;
  completion_pct: number;

  // Status
  status: ProjectStatus;
  financial_status: FinancialStatus;
  priority: ProjectPriority;
  risk_level: RiskLevel;
  is_locked?: boolean;
  is_active: boolean;

  // References
  lc_number?: string;
  contract_number?: string;
  cost_center_id?: number | null;
  cost_center_name?: string;

  // Extensibility
  tags: string[];
  custom_fields?: Record<string, any>;

  // Links counts
  links_count?: {
    shipments: number;
    payments: number;
    expenses: number;
    invoices: number;
  };

  // Audit
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  closed_by?: number | null;
  deleted_at?: string | null;
}

// =============================================
// PROJECT PHASE
// =============================================

export interface ProjectPhase {
  id: number;
  company_id?: number;
  project_id?: number | null;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  phase_type: PhaseType;
  sort_order: number;
  planned_start?: string | null;
  planned_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  duration_days: number;
  budget: number;
  actual_cost: number;
  completion_pct: number;
  status: PhaseStatus;
  is_template: boolean;
  is_active: boolean;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// PROJECT LINK
// =============================================

export interface ProjectLink {
  id: number;
  company_id: number;
  project_id: number;
  project_item_id?: number | null;
  link_type: LinkType;
  linked_id: number;
  linked_reference?: string;
  linked_date?: string;
  linked_description?: string;
  linked_status?: string;
  linked_amount?: number;
  amount?: number;
  currency_code?: string;
  amount_base?: number;
  cost_category?: CostCategory;
  phase_id?: number;
  notes?: string;
  linked_by?: number;
  linked_by_name?: string;
  linked_at?: string;
  created_at?: string;
}

// =============================================
// PROJECT ITEMS / TASKS
// =============================================

export interface ProjectItem {
  id: number;
  project_id: number;
  parent_item_id?: number | null;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  item_type: ProjectItemType;
  assigned_to_id?: number | null;
  assigned_to_name?: string;
  vendor_id?: number | null;
  vendor_name?: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  duration_days?: number;
  estimated_cost: number;
  actual_cost: number;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percent: number;
  status: ProjectItemStatus;
  priority: ProjectPriority;
  sort_order: number;
  level: number;
  children?: ProjectItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// PROJECT COSTS
// =============================================

export interface ProjectCost {
  id: number;
  project_id: number;
  project_item_id?: number | null;
  category: LegacyCostCategory;
  description: string;
  description_ar?: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percent: number;
  source_type?: 'invoice' | 'expense' | 'payment' | 'manual';
  source_id?: number | null;
  source_reference?: string;
  cost_date: string;
  notes?: string;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// FORM DATA
// =============================================

export interface ProjectFormData {
  code?: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  project_level: ProjectLevel;
  parent_project_id?: number | null;
  project_type_id?: number | null;
  vendor_id?: number | null;
  manager_id?: number | null;
  customer_id?: number | null;
  cost_center_id?: number | null;
  start_date?: string;
  end_date?: string;
  budget?: number;
  budget_allocated?: number;
  budget_materials?: number;
  budget_labor?: number;
  budget_services?: number;
  budget_miscellaneous?: number;
  revenue_target?: number;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  risk_level?: RiskLevel;
  tags?: string[];
  lc_number?: string;
  contract_number?: string;
  is_active?: boolean;
}

// =============================================
// FILTERS & SORT
// =============================================

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus | 'all';
  financial_status?: FinancialStatus | 'all';
  project_level?: ProjectLevel | 'all';
  priority?: ProjectPriority | 'all';
  risk_level?: RiskLevel | 'all';
  project_type_id?: number | 'all';
  vendor_id?: number | 'all';
  parent_project_id?: number | 'root' | 'all';
  manager_id?: number | 'all';
  budget_status?: 'all' | 'under_70' | 'warning_70_90' | 'critical_90_plus' | 'over_budget';
  start_date_from?: string;
  start_date_to?: string;
  is_active?: boolean;
}

export type ProjectSortField = 
  | 'code'
  | 'name'
  | 'start_date'
  | 'end_date'
  | 'budget'
  | 'budget_allocated'
  | 'total_cost'
  | 'budget_consumed'
  | 'progress_percent'
  | 'completion_pct'
  | 'status'
  | 'risk_level'
  | 'created_at';

export interface ProjectSort {
  field: ProjectSortField;
  order: 'asc' | 'desc';
}

// =============================================
// API RESPONSES
// =============================================

export interface ProjectListResponse {
  success: boolean;
  data: Project[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProjectDetailResponse {
  success: boolean;
  data: Project & {
    children: Project[];
    breadcrumb: { id: number; code: string; name: string; name_ar?: string }[];
    phases?: ProjectPhase[];
    links_count?: { shipments: number; payments: number; expenses: number; invoices: number };
  };
}

// =============================================
// REPORT TYPES
// =============================================

export interface ProjectReportSummary {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  project_level: ProjectLevel;
  status: ProjectStatus;
  priority: ProjectPriority;
  risk_level: RiskLevel;
  financial_status: FinancialStatus;
  budget_allocated: number;
  total_cost: number;
  total_revenue: number;
  profit_loss: number;
  margin_pct: number;
  budget_utilization_pct: number;
  shipments_count: number;
  completion_pct: number;
  vendor_name?: string;
  project_type_name?: string;
  project_type_icon?: string;
  project_type_color?: string;
}

export interface VendorAnalysis {
  vendor_id: number;
  vendor_name: string;
  vendor_name_ar: string;
  vendor_code: string;
  project_count: number;
  total_budget: number;
  total_cost: number;
  total_revenue: number;
  total_profit: number;
  total_shipments: number;
  total_payments: number;
  avg_project_cost: number;
}

export interface CashflowEntry {
  month: string;
  inflow: number;
  outflow: number;
  net_flow: number;
  cumulative: number;
}

// =============================================
// DASHBOARD STATS
// =============================================

export interface ProjectDashboardStats {
  total_projects: number;
  total_groups: number;
  total_masters: number;
  total_subs: number;
  active_count: number;
  completed_count: number;
  at_risk_count: number;
  total_budget: number;
  total_consumed: number;
  total_revenue: number;
  budget_utilization_percent: number;
  by_status: {
    status: string;
    count: number;
  }[];
  by_type: {
    type_id: number;
    type_name: string;
    type_name_ar: string;
    icon: string;
    color: string;
    count: number;
    budget: number;
  }[];
}
