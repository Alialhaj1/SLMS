/**
 * 🛒 PURCHASE ORDER TYPES
 * =======================
 * Comprehensive TypeScript interfaces for Purchase Orders
 * 
 * Based on enterprise requirements:
 * - Header information
 * - Supplier/Exporter details
 * - Buyer/Consignee details
 * - Shipping & Logistics
 * - Payment & Incoterms
 * - Bank details
 * - Line items
 * - Signatures & Acceptance
 */

// ============================================
// ENUMS
// ============================================

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum ShippingMode {
  SEA = 'sea',
  AIR = 'air',
  LAND = 'land',
  RAIL = 'rail',
  MULTIMODAL = 'multimodal',
}

export enum PurchaseOrderPaymentMethod {
  TT = 'tt', // Telegraphic Transfer
  LC = 'lc', // Letter of Credit
  CASH = 'cash',
  CHEQUE = 'cheque',
  CREDIT = 'credit',
}

export enum Incoterms {
  EXW = 'EXW', // Ex Works
  FCA = 'FCA', // Free Carrier
  CPT = 'CPT', // Carriage Paid To
  CIP = 'CIP', // Carriage and Insurance Paid To
  DAP = 'DAP', // Delivered at Place
  DPU = 'DPU', // Delivered at Place Unloaded
  DDP = 'DDP', // Delivered Duty Paid
  FAS = 'FAS', // Free Alongside Ship
  FOB = 'FOB', // Free on Board
  CFR = 'CFR', // Cost and Freight
  CIF = 'CIF', // Cost, Insurance and Freight
}

export enum PackageType {
  CARTONS = 'cartons',
  PALLETS = 'pallets',
  BAGS = 'bags',
  DRUMS = 'drums',
  CONTAINERS = 'containers',
  BULK = 'bulk',
  OTHER = 'other',
}

// ============================================
// INTERFACES
// ============================================

/**
 * Purchase Order Header
 */
export interface PurchaseOrderHeader {
  id?: number;
  company_id: number;
  
  // Order Identification
  order_number: string;
  revision_number?: number;
  order_date: string;
  order_type_id?: number;
  order_type_code?: string;
  order_type_name?: string;
  
  // External References
  exporter_order_no?: string;
  exporter_reference_no?: string;
  other_reference_no?: string;
  internal_reference_no?: string;
  
  // ISO Certification
  iso_certification?: string;
  
  // Contract/Quotation References
  contract_id?: number;
  quotation_id?: number;
  project_id?: number;
  
  // Currency
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  exchange_rate?: number;
  
  // Status
  status_id?: number;
  status?: PurchaseOrderStatus;
  status_name?: string;
  status_color?: string;
  
  // Approval
  requires_approval?: boolean;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  
  // Totals
  total_quantity?: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  freight_amount?: number;
  insurance_amount?: number;
  other_charges?: number;
  total_amount: number;
  amount_in_words?: string;
  amount_in_words_ar?: string;
  
  // Receipt tracking
  received_amount?: number;
  invoiced_amount?: number;
  
  // HS Code (General)
  hs_code?: string;
  tolerance_percentage?: number;
  
  // Notes
  notes?: string;
  internal_notes?: string;
  special_clauses?: string;
  
  // Warehouse
  warehouse_id?: number;
  warehouse_name?: string;
  
  // Cost Center
  cost_center_id?: number;
  cost_center_name?: string;
  
  // Audit
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

/**
 * Supplier/Exporter Information
 */
export interface PurchaseOrderSupplier {
  vendor_id: number;
  vendor_code?: string;
  vendor_name: string;
  vendor_name_ar?: string;
  vendor_legal_name?: string;
  vendor_address?: string;
  vendor_city?: string;
  vendor_state?: string;
  vendor_postal_code?: string;
  vendor_country?: string;
  vendor_country_code?: string;
  vendor_phone?: string;
  vendor_fax?: string;
  vendor_email?: string;
  vendor_website?: string;
  vendor_cin_no?: string; // Corporate Identification Number
  vendor_gst_no?: string; // GST/VAT Number
  vendor_tax_id?: string;
  authorized_signatory_name?: string;
  authorized_signatory_title?: string;
}

/**
 * Buyer/Consignee Information
 */
export interface PurchaseOrderBuyer {
  buyer_name?: string;
  buyer_address?: string;
  buyer_city?: string;
  buyer_country?: string;
  buyer_phone?: string;
  buyer_email?: string;
  
  // Consignee (if different from buyer)
  consignee_name?: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_country?: string;
  consignee_phone?: string;
  
  // Delivery Address
  delivery_address?: string;
  delivery_city?: string;
  delivery_country?: string;
  final_destination_country?: string;
}

/**
 * Shipping & Logistics Information
 */
export interface PurchaseOrderShipping {
  // Shipping Mode
  shipping_mode?: ShippingMode;
  shipping_mode_name?: string;
  
  // Vessel/Flight
  vessel_name?: string;
  flight_no?: string;
  voyage_no?: string;
  
  // Pre-carriage
  pre_carriage_by?: string;
  pre_carriage_place?: string;
  
  // Ports
  place_of_receipt?: string;
  port_of_loading?: string;
  port_of_loading_code?: string;
  port_of_discharge?: string;
  port_of_discharge_code?: string;
  final_destination?: string;
  
  // Timing
  estimated_shipment_date?: string;
  expected_delivery_date?: string;
  actual_shipment_date?: string;
  actual_delivery_date?: string;
  
  // Packages
  shipping_marks?: string;
  number_of_packages?: number;
  package_type?: PackageType;
  package_type_name?: string;
  total_cartons?: number;
  gross_weight?: number;
  gross_weight_unit?: string;
  net_weight?: number;
  net_weight_unit?: string;
  volume?: number;
  volume_unit?: string;
  
  // Country of Origin
  country_of_origin?: string;
  country_of_origin_code?: string;
  country_of_final_destination?: string;
}

/**
 * Payment Terms & Incoterms
 */
export interface PurchaseOrderPayment {
  // Incoterms
  incoterms?: Incoterms;
  incoterms_location?: string;
  delivery_terms_id?: number;
  delivery_terms_name?: string;
  
  // Payment Method
  payment_method?: PurchaseOrderPaymentMethod;
  payment_method_name?: string;
  payment_terms_id?: number;
  payment_terms_name?: string;
  payment_terms_days?: number;
  
  // Bank Charges
  bank_charges_responsibility?: 'buyer' | 'seller' | 'shared';
  
  // Advance Payment
  advance_payment_required?: boolean;
  advance_payment_percent?: number;
  advance_payment_days?: number;
  advance_payment_amount?: number;
  
  // LC Reference
  lc_number?: string;
  lc_date?: string;
  lc_bank?: string;
  lc_expiry_date?: string;
  
  // Jurisdiction
  jurisdiction?: string;
  
  // Supply Terms
  supply_terms_id?: number;
  supply_terms_name?: string;
}

/**
 * Bank Details (Beneficiary)
 */
export interface PurchaseOrderBankDetails {
  beneficiary_name?: string;
  beneficiary_bank_name?: string;
  beneficiary_account_number?: string;
  beneficiary_iban?: string;
  beneficiary_ifsc_code?: string;
  beneficiary_swift_code?: string;
  beneficiary_bank_address?: string;
  beneficiary_bank_country?: string;
  
  // Correspondent Bank
  correspondent_bank_name?: string;
  correspondent_bank_swift?: string;
  correspondent_bank_aba?: string;
  correspondent_bank_fed_no?: string;
  correspondent_bank_country?: string;
}

/**
 * Purchase Order Line Item
 */
export interface PurchaseOrderItem {
  id?: number;
  order_id?: number;
  line_number: number;
  
  // Item Identification
  item_id: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  
  // Product Details
  product_brand?: string;
  product_grade?: string;
  product_description?: string;
  
  // Packaging
  packaging_type?: string;
  packaging_size?: string;
  units_per_carton?: number;
  net_weight_per_carton?: number;
  total_cartons?: number;
  
  // Quantity
  uom_id: number;
  uom_code?: string;
  uom_name?: string;
  ordered_qty: number;
  received_qty?: number;
  invoiced_qty?: number;
  pending_qty?: number;
  
  // Pricing
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  
  // Tax
  tax_rate_id?: number;
  tax_rate?: number;
  tax_rate_name?: string;
  tax_amount?: number;
  
  // Line Total
  line_total: number;
  
  // HS Code (Item Level)
  hs_code?: string;
  
  // Shipping Marks (Item Level)
  shipping_marks?: string;
  
  // Warehouse override
  warehouse_id?: number;
  warehouse_name?: string;
  
  // Cost Center override
  cost_center_id?: number;
  cost_center_name?: string;
  
  // Account override
  expense_account_id?: number;
  expense_account_code?: string;
  
  notes?: string;
  
  created_at?: string;
  updated_at?: string;
}

/**
 * Acceptance & Signatures
 */
export interface PurchaseOrderAcceptance {
  // Supplier Acceptance
  accepted_by_supplier?: boolean;
  supplier_accepted_by?: string;
  supplier_accepted_date?: string;
  supplier_signature?: string;
  
  // Buyer Signature
  buyer_signature?: string;
  buyer_signed_by?: string;
  buyer_signed_date?: string;
  
  // Company Stamp
  company_stamp?: string;
  
  // Confirmation Deadline
  confirmation_deadline?: string;
}

/**
 * Linked Documents
 */
export interface PurchaseOrderLinks {
  linked_shipments?: number[];
  linked_purchase_invoices?: number[];
  linked_expenses?: number[];
  linked_payments?: number[];
  linked_lc_id?: number;
  linked_lc_number?: string;
  linked_project_id?: number;
  linked_project_name?: string;
  linked_goods_receipts?: number[];
}

/**
 * Cost Analysis
 */
export interface PurchaseOrderCosts {
  expected_cost?: number;
  actual_cost?: number;
  variance_amount?: number;
  insurance_cost?: number;
  freight_cost?: number;
  customs_cost?: number;
  other_charges?: number;
  total_landed_cost?: number;
}

/**
 * Complete Purchase Order
 */
export interface PurchaseOrder extends 
  PurchaseOrderHeader,
  PurchaseOrderSupplier,
  PurchaseOrderBuyer,
  PurchaseOrderShipping,
  PurchaseOrderPayment,
  PurchaseOrderBankDetails,
  PurchaseOrderAcceptance,
  PurchaseOrderLinks,
  PurchaseOrderCosts {
  items: PurchaseOrderItem[];
  attachments?: PurchaseOrderAttachment[];
  history?: PurchaseOrderHistory[];
}

/**
 * Attachment
 */
export interface PurchaseOrderAttachment {
  id: number;
  order_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  description?: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  uploaded_at: string;
}

/**
 * History/Audit Log Entry
 */
export interface PurchaseOrderHistory {
  id: number;
  order_id: number;
  action: string;
  action_ar?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  performed_by: number;
  performed_by_name?: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Form Data for Create/Update
 */
export interface PurchaseOrderFormData {
  // Header
  order_date: string;
  order_type_id?: number;
  vendor_id: number;
  currency_id?: number;
  exchange_rate?: number;
  warehouse_id?: number;
  cost_center_id?: number;
  project_id?: number;
  
  // References
  exporter_order_no?: string;
  exporter_reference_no?: string;
  other_reference_no?: string;
  contract_id?: number;
  quotation_id?: number;
  
  // Shipping
  shipping_mode?: ShippingMode;
  port_of_loading?: string;
  port_of_discharge?: string;
  final_destination?: string;
  expected_delivery_date?: string;
  country_of_origin?: string;
  
  // Payment
  incoterms?: Incoterms;
  incoterms_location?: string;
  payment_terms_id?: number;
  delivery_terms_id?: number;
  supply_terms_id?: number;
  payment_method?: PurchaseOrderPaymentMethod;
  advance_payment_required?: boolean;
  advance_payment_percent?: number;
  lc_number?: string;
  
  // Notes
  notes?: string;
  internal_notes?: string;
  special_clauses?: string;
  
  // Items
  items: PurchaseOrderItemFormData[];
}

/**
 * Item Form Data
 */
export interface PurchaseOrderItemFormData {
  id?: number;
  line_number: number;
  item_id: number;
  item_code: string;
  item_name: string;
  uom_id: number;
  uom_code?: string;
  ordered_qty: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate_id?: number;
  tax_rate?: number;
  warehouse_id?: number;
  cost_center_id?: number;
  hs_code?: string;
  notes?: string;
}

/**
 * Reference Data
 */
export interface PurchaseOrderReferenceData {
  orderTypes: { id: number; code: string; name: string; name_ar?: string }[];
  orderStatuses: { id: number; code: string; name: string; name_ar?: string; color?: string }[];
  currencies: { id: number; code: string; name: string; symbol: string }[];
  vendors: { id: number; code: string; name: string; name_ar?: string; status_code?: string }[];
  warehouses: { id: number; code: string; name: string; name_ar?: string }[];
  paymentTerms: { id: number; code: string; name: string; days?: number }[];
  deliveryTerms: { id: number; code: string; name: string }[];
  supplyTerms: { id: number; code: string; name: string }[];
  taxRates: { id: number; code: string; name: string; rate: number }[];
  costCenters: { id: number; code: string; name: string }[];
  projects: { id: number; code: string; name: string }[];
  shippingModes: { value: ShippingMode; label: string; label_ar?: string }[];
  incoterms: { value: Incoterms; label: string; description?: string }[];
  paymentMethods: { value: PurchaseOrderPaymentMethod; label: string; label_ar?: string }[];
}

/**
 * Summary Statistics
 */
export interface PurchaseOrderSummary {
  total_orders: number;
  draft_count: number;
  pending_approval_count: number;
  approved_count: number;
  total_amount: number;
  pending_delivery_amount: number;
  this_month_orders: number;
  this_month_amount: number;
}
