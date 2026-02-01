/**
 * 📦 REFERENCE DATA TYPES
 * =======================
 * Single Source of Truth for all reference/lookup data types
 * 
 * ⚠️ RULE: Any Select/Dropdown in the system MUST use these interfaces
 */

// ═══════════════════════════════════════════════════════════════
// BASE INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface BaseRef {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  is_active?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════

export interface ItemType extends BaseRef {
  description?: string;
}

export interface ItemGroup extends BaseRef {
  parent_id?: number | null;
  level?: number;
}

export interface ItemCategory extends BaseRef {
  parent_id?: number | null;
}

export interface Unit extends BaseRef {
  symbol?: string;
  is_base_unit?: boolean;
}

export interface Country extends BaseRef {
  iso_code?: string;
  iso_code_3?: string;
}

export interface HarvestSchedule extends BaseRef {
  season?: string;
  start_month?: number;
  end_month?: number;
  harvest_duration_days?: number;
  region?: string;
  country_id?: number;
}

// ═══════════════════════════════════════════════════════════════
// PROCUREMENT
// ═══════════════════════════════════════════════════════════════

export interface Vendor extends BaseRef {
  email?: string;
  phone?: string;
  tax_number?: string;
  country?: string;
  city?: string;
  credit_limit?: number;
  payment_terms?: number;
  status?: 'active' | 'blocked' | 'pending';
}

export interface VendorCategory extends BaseRef {
  color?: string;
}

export interface PaymentTerm extends BaseRef {
  due_days: number;
  discount_days?: number;
  discount_percent?: number;
}

// ═══════════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════════

export interface Currency extends BaseRef {
  symbol?: string;
  decimal_places?: number;
  is_base_currency?: boolean;
}

export interface CostCenter extends BaseRef {
  parent_id?: number | null;
}

export interface Project extends BaseRef {
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface PaymentMethod extends BaseRef {
  payment_type: 'CASH' | 'BANK' | 'CHEQUE' | 'CREDIT';
  requires_bank_account?: boolean;
}

export interface BankAccount extends BaseRef {
  account_number: string;
  bank_name: string;
  bank_name_ar?: string;
  currency_code?: string;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════

export interface Warehouse extends BaseRef {
  location?: string;
  is_default?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// API RESPONSE WRAPPER
// ═══════════════════════════════════════════════════════════════

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ApiSingleResponse<T> {
  success: boolean;
  data: T;
}
