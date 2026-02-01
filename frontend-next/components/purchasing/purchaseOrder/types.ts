export interface PurchaseOrderReferenceOption {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  vendor_id?: number; // For projects filtering
  project_level?: string; // For projects hierarchy
}

export interface PurchaseOrderItemRef {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  base_uom_id?: number;
  base_uom_code?: string;
  purchase_price?: number;
  default_tax_rate?: number;
  tax_rate_id?: number;
  uoms?: Array<{
    id?: number | null;
    uom_id: number;
    uom_code?: string;
    uom_name?: string;
    code?: string;
    name?: string;
    name_ar?: string;
    conversion_factor?: number;
    is_base_uom?: boolean;
    is_active?: boolean;
  }>;
}

export interface TaxRef {
  id: number;
  code: string;
  name: string;
  rate: number;
}

export interface UnitOfMeasureRef {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

export interface VendorRef {
  id: number;
  code?: string;
  name: string;
  name_ar?: string;
  status_code?: string;
  allows_purchase_orders?: boolean;
}

export interface PurchaseOrderMeta {
  supplier?: {
    vat_number?: string;
    cr_number?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  buyer?: {
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
  };
  shipping?: {
    incoterms?: string;
    port_of_loading?: string;
    port_of_discharge?: string;
    vessel?: string;
    eta?: string;
    etd?: string;
  };
  payment?: {
    method?: string;
    lc_no?: string;
    due_date?: string;
  };
  bank?: {
    beneficiary_name?: string;
    bank_name?: string;
    iban?: string;
    swift?: string;
    account_no?: string;
  };
}

export interface PurchaseOrderFormModel {
  // Core fields backed by DB
  vendor_id: string;
  vendor_contract_number?: string;
  vendor_contract_date?: string;
  status_id?: string;
  order_type_id: string;
  order_date: string;
  expected_date: string;
  warehouse_id: string;
  currency_id: string;
  exchange_rate: string;
  payment_terms_id: string;
  payment_method_id: string;
  project_id: string;
  delivery_terms_id: string;
  supply_terms_id: string;
  origin_country_id?: string;
  origin_city_id?: string;
  destination_country_id?: string;
  destination_city_id?: string;
  port_of_loading_text?: string;
  port_of_discharge_id?: string;
  ship_to_address: string;
  notes: string;
  internal_notes: string;
  discount_amount: string;
  freight_amount: string;
  cost_center_id: string;

  // Meta (stored into internal_notes as JSON)
  meta: PurchaseOrderMeta;
}
