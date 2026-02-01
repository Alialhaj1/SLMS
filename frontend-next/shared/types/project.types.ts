/**
 * Project Management Types
 * ========================
 * Comprehensive type definitions for the project management module.
 * Supports hierarchical projects, multiple project types, cost tracking,
 * and integration with shipments, invoices, expenses, and payments.
 */

// =============================================
// PROJECT TYPES
// =============================================

export type ProjectStatus = 
  | 'planned'      // المخطط
  | 'in_progress'  // قيد التنفيذ
  | 'on_hold'      // معلق
  | 'completed'    // مكتمل
  | 'cancelled';   // ملغي

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export type ProjectTypeCode = 
  | 'construction'       // بناء
  | 'procurement'        // مشتريات خارجية
  | 'real_estate'        // عقارات
  | 'new_branch'         // إنشاء فروع جديدة
  | 'internal_dev'       // تطوير داخلي
  | 'research_marketing' // بحوث وتسويق
  | 'it_infrastructure'  // بنية تحتية تقنية
  | 'other';             // أخرى

export interface ProjectType {
  id: number;
  code: ProjectTypeCode;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  parent_project_id?: number | null;
  parent_project?: Project | null;
  children?: Project[];
  level: number;  // 0 = root, 1 = child, 2 = grandchild, etc.
  
  // Classification
  project_type_id?: number | null;
  project_type?: ProjectType | null;
  
  // People
  customer_id?: number | null;
  customer_name?: string;
  customer_name_ar?: string;
  manager_id?: number | null;
  manager_name?: string;
  
  // Dates
  start_date?: string | null;
  end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  
  // Budget & Costs
  budget: number;
  budget_materials: number;
  budget_labor: number;
  budget_services: number;
  budget_miscellaneous: number;
  
  // Calculated totals (including children)
  total_budget: number;
  total_actual_cost: number;
  total_materials_cost: number;
  total_labor_cost: number;
  total_services_cost: number;
  total_miscellaneous_cost: number;
  
  // Progress
  progress_percent: number;
  
  // Status
  status: ProjectStatus;
  priority: ProjectPriority;
  
  // Links counts
  shipments_count: number;
  invoices_count: number;
  expenses_count: number;
  payments_count: number;
  items_count: number;
  children_count: number;
  
  // Accounting
  cost_center_id?: number | null;
  cost_center_name?: string;
  
  // Metadata
  is_active: boolean;
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// =============================================
// PROJECT ITEMS / TASKS
// =============================================

export type ProjectItemStatus = 
  | 'pending'      // معلق
  | 'in_progress'  // قيد التنفيذ
  | 'completed'    // مكتمل
  | 'cancelled';   // ملغي

export type ProjectItemType = 
  | 'task'         // مهمة
  | 'milestone'    // معلم رئيسي
  | 'deliverable'  // مخرج
  | 'phase';       // مرحلة

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
  
  // Assignment
  assigned_to_id?: number | null;
  assigned_to_name?: string;
  vendor_id?: number | null;
  vendor_name?: string;
  
  // Dates
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  duration_days?: number;
  
  // Costs
  estimated_cost: number;
  actual_cost: number;
  estimated_hours?: number;
  actual_hours?: number;
  
  // Progress
  progress_percent: number;
  status: ProjectItemStatus;
  priority: ProjectPriority;
  
  // Hierarchy
  sort_order: number;
  level: number;
  children?: ProjectItem[];
  
  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// PROJECT COSTS
// =============================================

export type CostCategory = 
  | 'materials'      // مواد
  | 'labor'          // عمالة
  | 'services'       // خدمات
  | 'equipment'      // معدات
  | 'transportation' // نقل
  | 'miscellaneous'; // متنوعة

export interface ProjectCost {
  id: number;
  project_id: number;
  project_item_id?: number | null;
  
  category: CostCategory;
  description: string;
  description_ar?: string;
  
  // Amounts
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percent: number;
  
  // Source reference
  source_type?: 'invoice' | 'expense' | 'payment' | 'manual';
  source_id?: number | null;
  source_reference?: string;
  
  // Date
  cost_date: string;
  
  // Metadata
  notes?: string;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// PROJECT LINKS (Shipments, Invoices, etc.)
// =============================================

export type LinkType = 
  | 'shipment'
  | 'purchase_invoice'
  | 'sales_invoice'
  | 'expense'
  | 'payment';

export interface ProjectLink {
  id: number;
  project_id: number;
  project_item_id?: number | null;
  
  link_type: LinkType;
  linked_id: number;
  linked_reference: string;
  linked_date: string;
  linked_amount: number;
  
  // Denormalized info for display
  linked_description?: string;
  linked_status?: string;
  
  created_at: string;
}

// =============================================
// AGGREGATED DATA
// =============================================

export interface ProjectCostSummary {
  total_budget: number;
  total_actual: number;
  total_variance: number;
  variance_percent: number;
  
  by_category: {
    category: CostCategory;
    category_label: string;
    category_label_ar: string;
    budgeted: number;
    actual: number;
    variance: number;
  }[];
  
  by_month: {
    month: string;
    budgeted: number;
    actual: number;
  }[];
}

export interface ProjectHierarchy {
  project: Project;
  children: ProjectHierarchy[];
  total_budget: number;
  total_actual_cost: number;
  aggregated_progress: number;
}

// =============================================
// FORM DATA
// =============================================

export interface ProjectFormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  
  parent_project_id: number | '';
  project_type_id: number | '';
  
  customer_id: number | '';
  manager_id: number | '';
  
  start_date: string;
  end_date: string;
  
  budget: number;
  budget_materials: number;
  budget_labor: number;
  budget_services: number;
  budget_miscellaneous: number;
  
  status: ProjectStatus;
  priority: ProjectPriority;
  
  cost_center_id: number | '';
  is_active: boolean;
}

export interface ProjectItemFormData {
  project_id: number;
  parent_item_id: number | '';
  code: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  
  item_type: ProjectItemType;
  
  assigned_to_id: number | '';
  vendor_id: number | '';
  
  planned_start_date: string;
  planned_end_date: string;
  
  estimated_cost: number;
  estimated_hours: number;
  
  priority: ProjectPriority;
  is_active: boolean;
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
    items: ProjectItem[];
    costs: ProjectCost[];
    links: ProjectLink[];
    cost_summary: ProjectCostSummary;
    hierarchy: ProjectHierarchy;
  };
}

// =============================================
// FILTER & SORT
// =============================================

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus | 'all';
  priority?: ProjectPriority | 'all';
  project_type_id?: number | 'all';
  parent_project_id?: number | 'root' | 'all';  // 'root' = only root projects
  manager_id?: number | 'all';
  customer_id?: number | 'all';
  start_date_from?: string;
  start_date_to?: string;
  budget_min?: number;
  budget_max?: number;
  is_active?: boolean;
}

export type ProjectSortField = 
  | 'code'
  | 'name'
  | 'start_date'
  | 'end_date'
  | 'budget'
  | 'total_actual_cost'
  | 'progress_percent'
  | 'status'
  | 'created_at';

export interface ProjectSort {
  field: ProjectSortField;
  order: 'asc' | 'desc';
}

// =============================================
// DASHBOARD STATS
// =============================================

export interface ProjectDashboardStats {
  total_projects: number;
  by_status: {
    status: ProjectStatus;
    count: number;
    budget: number;
  }[];
  by_type: {
    type_id: number;
    type_name: string;
    type_name_ar: string;
    count: number;
    budget: number;
  }[];
  total_budget: number;
  total_actual_cost: number;
  budget_utilization_percent: number;
  projects_on_track: number;
  projects_delayed: number;
  projects_over_budget: number;
}
