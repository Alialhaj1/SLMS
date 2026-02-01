/**
 * 📦 INVOICE TYPES
 * ================
 * Shared types for Purchase Invoice components
 */

export interface InvoiceItem {
  id?: number;
  temp_id?: string;
  item_id: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  uom_id: number;
  uom_code: string;
  uom_name?: string;
  quantity: number;
  bonus_quantity?: number;  // Optional - free quantity
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_rate_id?: number;
  tax_percent?: number;
  tax_amount?: number;
  line_total?: number;
  cost_center_id?: number;
  cost_center_code?: string;
  project_id?: number;
  project_code?: string;
  notes?: string;
  // Allocated costs (calculated)
  customs_duty_amount?: number;
  other_expenses_amount?: number;
  weight_kg?: number;
}

export interface InvoiceExpense {
  id?: number;
  expense_type_id: number;
  expense_type_code?: string;
  expense_type_name?: string;
  amount: number;
  currency_id?: number;
  currency_code?: string;
  exchange_rate?: number;
  notes?: string;
}

export interface InvoiceFormData {
  // Identity
  id?: number;  // Present when editing existing invoice
  
  invoice_number: string;
  vendor_id: number | '';
  vendor_invoice_number: string;
  vendor_invoice_date: string;
  invoice_date: string;
  due_date: string;
  description: string;
  currency_id: number | null;
  exchange_rate: string;  // Exchange rate for foreign currencies
  payment_terms_id: number | null;
  delivery_terms_id: number | null;
  project_id: number | null;
  cost_center_id: number | null;
  default_warehouse_id: number;
  notes: string;
  
  // Type
  invoice_type: 'local' | 'import';
  
  // References
  purchase_order_id: number | null;
  quotation_id: number | null;
  
  items: InvoiceItem[];
  expenses: InvoiceExpense[];
  
  // Financials
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  
  // Payment Method details
  payment_method_id: number | null;
  bank_account_id: number | null;
  cash_box_id: number | null;
  cheque_number: string;
  cheque_date: string;
}

export interface VendorRef {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

export interface PaymentTermRef {
  id: number;
  name: string;
  due_days: number;
}

export interface PurchaseOrderRef {
  id: number;
  po_number: string;
}

export interface QuotationRef {
  id: number;
  number: string;
}

export type TabKey = 'general' | 'lines' | 'financials' | 'expenses';

export const INITIAL_FORM_DATA: InvoiceFormData = {
  invoice_number: '',
  vendor_id: '',
  vendor_invoice_number: '',
  vendor_invoice_date: new Date().toISOString().split('T')[0],
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: new Date().toISOString().split('T')[0],
  description: '',
  currency_id: null,
  exchange_rate: '1',
  payment_terms_id: null,
  delivery_terms_id: null,
  project_id: null,
  cost_center_id: null,
  default_warehouse_id: 1,
  notes: '',
  invoice_type: 'local',
  purchase_order_id: null,
  quotation_id: null,
  items: [],
  expenses: [],
  subtotal: 0,
  discount_amount: 0,
  tax_amount: 0,
  total_amount: 0,
  payment_method_id: null,
  bank_account_id: null,
  cash_box_id: null,
  cheque_number: '',
  cheque_date: '',
};
