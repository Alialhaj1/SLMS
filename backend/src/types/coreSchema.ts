/**
 * ============================================================================
 * Core Database Types — Arabic Specification §15.1
 * ============================================================================
 * TypeScript interfaces matching the 12 core tables defined in §15.1.
 *
 *   ⚠ كل جدول يحتوي على: tenant_id + created_at + updated_at + deleted_at (Soft Delete)
 *   ✕ تحذير أمني: لا تجعل tenant_id اختيارياً في أي جدول يخص بيانات العملاء
 * ============================================================================
 */

// ===========================
// Base Types (shared columns)
// ===========================

/** Columns present on every tenant-scoped table */
export interface TenantScopedEntity {
  /** Tenant ID — NOT NULL for customer data tables */
  tenant_id: number;
  created_at: string;   // ISO 8601 timestamp
  updated_at: string;   // ISO 8601 timestamp
  deleted_at: string | null;  // Soft delete — null = active
}

/** Audit columns for tracking who created/modified records */
export interface AuditableEntity {
  created_by?: number;
  updated_by?: number;
}

// ===========================
// 1. Tenants (المستأجرون)
// ===========================

export interface Tenant {
  id: number;
  company_code: string;
  name: string;
  name_ar?: string;
  plan: 'standard' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'locked' | 'terminated';
  settings: Record<string, any>;
  slug?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  subscription_plan_id?: number;
  max_users?: number;
  max_companies?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ===========================
// 2. Tenant Users (مستخدمو المستأجر)
// ===========================

export interface TenantUser extends TenantScopedEntity, AuditableEntity {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role_id?: number;
  permissions: string[];    // e.g. ['shipments:view', 'shipments:create']
  status: 'active' | 'disabled' | 'locked';
  must_change_password?: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  failed_login_count?: number;
  locked_until?: string;
}

// ===========================
// 3. Platform Users (مستخدمو المنصة)
// ===========================
// مستقل عن tenants — independent of tenant scope

export interface PlatformUser {
  id: number;
  email: string;
  password_hash: string;
  full_name?: string;
  role: string;
  is_super_admin: boolean;
  status: 'active' | 'disabled' | 'locked';
  last_login_at?: string;
  last_login_ip?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ===========================
// 4. Roles (الأدوار)
// ===========================

export interface Role extends TenantScopedEntity {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  permissions: string[];    // JSON array of permission codes
  is_system?: boolean;
  is_locked?: boolean;
  hierarchy_level?: number;
}

// ===========================
// 5. Shipments (الشحنات)
// ===========================

export interface Shipment extends TenantScopedEntity, AuditableEntity {
  id: number;
  code: string;
  type: string;
  status: string;
  origin_port?: string;     // → ports reference
  dest_port?: string;       // → ports reference
  eta?: string;             // ISO 8601 date
  company_id: number;       // → companies
  shipping_company_id?: number;
  bl_no?: string;
  awb_no?: string;
  notes?: string;
}

// ===========================
// 6. Purchase Orders (أوامر الشراء)
// ===========================

export interface PurchaseOrder extends TenantScopedEntity, AuditableEntity {
  id: number;
  company_id: number;       // → companies
  code: string;             // order_number
  vendor_id: number;        // → vendors
  status: string;
  total: number;            // total_amount
  currency_id?: number;     // → currencies
  exchange_rate?: number;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  freight_amount?: number;
  warehouse_id?: number;
  cost_center_id?: number;
  notes?: string;
}

// ===========================
// 7. PO Items (بنود أمر الشراء)
// ===========================

export interface PurchaseOrderItem {
  id: number;
  po_id: number;            // order_id → purchase_orders
  item_id: number;          // → items
  quantity: number;         // ordered_qty
  unit_price: number;
  hs_code_id?: number;
  line_number?: number;
  uom_id?: number;
  tax_rate?: number;
  tax_amount?: number;
  line_total?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by?: number;
  updated_by?: number;
}

// ===========================
// 8. Customs Declarations (البيانات الجمركية)
// ===========================

export interface CustomsDeclaration extends TenantScopedEntity, AuditableEntity {
  id: number;
  company_id: number;       // → companies
  shipment_id?: number;     // → shipments
  type: string;             // declaration_type_id → customs_declaration_types
  total_duties: number;     // total_customs_duty + total_vat + total_other_fees
  status: string;           // status_id → customs_declaration_statuses
  declaration_number?: string;
  declaration_date?: string;
  submission_date?: string;
  clearance_date?: string;
  origin_country_id?: number;
  destination_country_id?: number;
  total_cif_value?: number;
  total_fob_value?: number;
  notes?: string;
}

// ===========================
// 9. Journal Entries (القيود المحاسبية)
// ===========================

export interface JournalEntry extends TenantScopedEntity, AuditableEntity {
  id: number;
  company_id: number;       // → companies
  code: string;             // entry_number
  date: string;             // entry_date
  total_debit: number;
  total_credit: number;
  entry_type?: string;
  status?: string;          // draft, submitted, approved, posted, cancelled
  description?: string;
  reference?: string;
  fiscal_year_id?: number;
  period_id?: number;
  currency_id?: number;
  exchange_rate?: number;
}

// ===========================
// 10. Journal Lines (بنود القيد المحاسبي)
// ===========================

export interface JournalLine {
  id: number;
  journal_id: number;       // journal_entry_id → journal_entries
  account_id: number;       // → accounts (chart of accounts)
  debit: number;            // debit_amount
  credit: number;           // credit_amount
  cost_center_id?: number;  // → cost_centers
  line_number?: number;
  description?: string;
  partner_type?: string;
  partner_id?: number;
  project_id?: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

// ===========================
// 11. Chart of Accounts (دليل الحسابات)
// ===========================

export interface ChartOfAccount extends TenantScopedEntity, AuditableEntity {
  id: number;
  company_id: number;       // → companies
  code: string;
  name: string;
  name_ar?: string;
  type: string;             // account_type_id → account_types
  parent_id: number | null; // → accounts (self-referencing tree)
  level: number;
  is_group?: boolean;
  is_active?: boolean;
  allow_posting?: boolean;
  currency_id?: number;
  opening_balance?: number;
  current_balance?: number;
}

// ===========================
// 12. Audit Logs (سجلات المراجعة)
// ===========================
// Note: Audit logs are immutable — no deleted_at needed

export interface AuditLog {
  id: number;
  tenant_id: number | null;  // → tenants (nullable for platform-level actions)
  user_id: number;           // → users
  action: string;            // CREATE, UPDATE, DELETE, etc.
  entity: string;            // Table/resource name (e.g., 'shipments')
  entity_id: number | null;  // Row ID in the entity table
  old_data: Record<string, any> | null;  // JSONB before state
  new_data: Record<string, any> | null;  // JSONB after state
  ip: string;               // ip_address
  user_agent?: string;
  created_at: string;
}

// ===========================
// Utility Types
// ===========================

/** Extract only the fields that are safe to return in API responses (no password_hash) */
export type SafeTenantUser = Omit<TenantUser, 'password_hash'>;
export type SafePlatformUser = Omit<PlatformUser, 'password_hash'>;

/** For INSERT operations — omit auto-generated fields */
export type CreateTenantUser = Omit<TenantUser, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateShipment = Omit<Shipment, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreatePurchaseOrder = Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateJournalEntry = Omit<JournalEntry, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

/** Table name ↔ type mapping for generic CRUD operations */
export interface CoreTableMap {
  tenants: Tenant;
  users: TenantUser;
  platform_users: PlatformUser;
  roles: Role;
  shipments: Shipment;
  purchase_orders: PurchaseOrder;
  purchase_order_items: PurchaseOrderItem;
  customs_declarations: CustomsDeclaration;
  journal_entries: JournalEntry;
  journal_lines: JournalLine;
  accounts: ChartOfAccount;
  audit_logs: AuditLog;
}
