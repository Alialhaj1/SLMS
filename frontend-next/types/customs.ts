/**
 * Customs Declaration Types & Interfaces
 * بيان جمركي - واجهات TypeScript
 */

// =====================================================
// Enums & Constants
// =====================================================

export type DeclarationDirection = 'import' | 'export' | 'transit';

export type DeclarationStatusCode = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INSPECTION_PENDING'
  | 'INSPECTION_DONE'
  | 'FEES_CALCULATED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CLEARED'
  | 'REJECTED'
  | 'CANCELLED';

export type TransportMode = 'sea' | 'air' | 'land' | 'rail' | 'multi';

export type PartyType = 
  | 'importer'
  | 'exporter'
  | 'consignee'
  | 'notify_party'
  | 'broker'
  | 'carrier'
  | 'shipping_agent';

export type FeeType =
  | 'CUSTOMS_DUTY'
  | 'VAT'
  | 'INSPECTION_FEE'
  | 'DOCUMENTATION_FEE'
  | 'STORAGE_FEE'
  | 'DEMURRAGE'
  | 'QUARANTINE_FEE'
  | 'CERTIFICATION_FEE'
  | 'HANDLING_FEE'
  | 'BROKERAGE_FEE';

export type InspectionType = 
  | 'document_review'
  | 'physical_inspection'
  | 'sampling'
  | 'x_ray'
  | 'laboratory';

export type InspectionResult = 'passed' | 'failed' | 'conditional' | 'pending';

export type ContainerStatus = 'pending' | 'inspected' | 'released';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'sadad' | 'credit_card';

export type DocumentType =
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'BILL_OF_LADING'
  | 'AIRWAY_BILL'
  | 'CERTIFICATE_ORIGIN'
  | 'HEALTH_CERTIFICATE'
  | 'CONFORMITY_CERTIFICATE'
  | 'INSURANCE_CERTIFICATE'
  | 'IMPORT_LICENSE'
  | 'SASO_CERTIFICATE';

export type ContainerType = 
  | '20GP' | '40GP' | '40HC' 
  | '20RF' | '40RF' 
  | '20OT' | '40OT' 
  | 'FLAT' | 'TANK';

// =====================================================
// Base Interfaces
// =====================================================

export interface CustomsDeclarationType {
  id: number;
  company_id?: number;
  code: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  direction: DeclarationDirection;
  requires_inspection: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface CustomsDeclarationStatus {
  id: number;
  company_id?: number;
  code: DeclarationStatusCode;
  name_en: string;
  name_ar: string;
  stage_order: number;
  is_initial: boolean;
  is_final: boolean;
  color: string;
  is_active: boolean;
}

// =====================================================
// Main Declaration
// =====================================================

export interface CustomsDeclaration {
  id: number;
  company_id: number;
  
  // Reference
  declaration_number: string;
  declaration_type_id: number;
  declaration_type?: CustomsDeclarationType;
  status_id: number;
  status?: CustomsDeclarationStatus;
  
  // Dates
  declaration_date: string;
  submission_date?: string;
  clearance_date?: string;
  
  // Linked Documents
  shipment_id?: number;
  shipment_number?: string;
  purchase_order_id?: number;
  purchase_order_number?: string;
  commercial_invoice_id?: number;
  commercial_invoice_number?: string;
  project_id?: number;
  project_name?: string;
  
  // Customs Office
  customs_office_code?: string;
  customs_office_name?: string;
  entry_point_code?: string;
  entry_point_name?: string;
  
  // Transport
  transport_mode?: TransportMode;
  vessel_name?: string;
  voyage_number?: string;
  bl_number?: string;
  awb_number?: string;
  manifest_number?: string;
  
  // Origin / Destination
  origin_country_id?: number;
  origin_country_name?: string;
  destination_country_id?: number;
  destination_country_name?: string;
  final_destination?: string;
  
  // Incoterm
  incoterm?: string;
  
  // Currency
  currency_id: number;
  currency_code?: string;
  exchange_rate: number;
  
  // Values (Summary)
  total_cif_value: number;
  total_fob_value: number;
  freight_value: number;
  insurance_value: number;
  other_charges: number;
  
  // Fees Summary
  total_customs_duty: number;
  total_vat: number;
  total_other_fees: number;
  total_fees: number;
  
  // Weights & Packages
  total_gross_weight: number;
  total_net_weight: number;
  total_packages: number;
  package_type?: string;
  
  // Notes
  notes?: string;
  internal_notes?: string;
  
  // Workflow
  submitted_by?: number;
  submitted_by_name?: string;
  submitted_at?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  
  // Audit
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  
  // Nested (optional)
  parties?: CustomsDeclarationParty[];
  items?: CustomsDeclarationItem[];
  containers?: CustomsDeclarationContainer[];
  fees?: CustomsDeclarationFee[];
  inspections?: CustomsDeclarationInspection[];
  payments?: CustomsDeclarationPayment[];
  attachments?: CustomsDeclarationAttachment[];
}

// =====================================================
// Declaration Party
// =====================================================

export interface CustomsDeclarationParty {
  id: number;
  company_id: number;
  declaration_id: number;
  
  party_type: PartyType;
  
  party_name: string;
  party_name_ar?: string;
  tax_number?: string;
  commercial_register?: string;
  
  address?: string;
  city?: string;
  country_id?: number;
  country_name?: string;
  phone?: string;
  email?: string;
  
  broker_license_number?: string;
  
  is_primary: boolean;
}

// =====================================================
// Declaration Item
// =====================================================

export interface CustomsDeclarationItem {
  id: number;
  company_id: number;
  declaration_id: number;
  
  line_number: number;
  
  // Item Reference
  item_id?: number;
  item_code?: string;
  item_description: string;
  item_description_ar?: string;
  
  // HS Code
  hs_code: string;
  hs_code_description?: string;
  
  // Origin
  origin_country_id?: number;
  origin_country_name?: string;
  
  // Quantities
  quantity: number;
  unit_id?: number;
  unit_code?: string;
  unit_name?: string;
  
  gross_weight: number;
  net_weight: number;
  packages: number;
  
  // Values
  unit_price: number;
  fob_value: number;
  freight_value: number;
  insurance_value: number;
  cif_value: number;
  
  // Customs
  duty_rate: number;
  duty_amount: number;
  vat_rate: number;
  vat_amount: number;
  other_fees: number;
  total_fees: number;
  
  // Exemptions
  exemption_id?: number;
  exemption_code?: string;
  exemption_rate: number;
  
  // Inspection
  inspection_required: boolean;
  inspection_result?: InspectionResult;
  inspection_notes?: string;
  
  notes?: string;
}

// =====================================================
// Declaration Container
// =====================================================

export interface CustomsDeclarationContainer {
  id: number;
  company_id: number;
  declaration_id: number;
  
  container_number: string;
  container_type?: ContainerType;
  seal_number?: string;
  
  gross_weight: number;
  tare_weight: number;
  net_weight: number;
  
  packages_count: number;
  
  status: ContainerStatus;
  inspection_date?: string;
  release_date?: string;
  
  notes?: string;
}

// =====================================================
// Declaration Fee
// =====================================================

export interface CustomsDeclarationFee {
  id: number;
  company_id: number;
  declaration_id: number;
  
  fee_type: FeeType;
  fee_code?: string;
  fee_name_en: string;
  fee_name_ar?: string;
  
  base_amount: number;
  rate: number;
  calculated_amount: number;
  
  exemption_amount: number;
  final_amount: number;
  
  is_paid: boolean;
  paid_at?: string;
  payment_reference?: string;
  
  account_id?: number;
  account_code?: string;
  
  notes?: string;
}

// =====================================================
// Declaration Inspection
// =====================================================

export interface CustomsDeclarationInspection {
  id: number;
  company_id: number;
  declaration_id: number;
  
  inspection_type: InspectionType;
  inspection_date: string;
  
  inspector_name?: string;
  inspector_id_number?: string;
  
  location?: string;
  
  result: InspectionResult;
  findings?: string;
  recommendations?: string;
  
  attachments_count: number;
  
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

// =====================================================
// Declaration Payment
// =====================================================

export interface CustomsDeclarationPayment {
  id: number;
  company_id: number;
  declaration_id: number;
  
  payment_date: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  
  amount: number;
  currency_id: number;
  currency_code?: string;
  
  bank_name?: string;
  account_number?: string;
  
  sadad_number?: string;
  
  receipt_number?: string;
  receipt_date?: string;
  
  journal_entry_id?: number;
  
  notes?: string;
  
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

// =====================================================
// Declaration Attachment
// =====================================================

export interface CustomsDeclarationAttachment {
  id: number;
  company_id: number;
  declaration_id: number;
  
  document_type: DocumentType;
  document_name: string;
  
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  
  document_number?: string;
  document_date?: string;
  
  is_required: boolean;
  is_verified: boolean;
  verified_by?: number;
  verified_by_name?: string;
  verified_at?: string;
  
  notes?: string;
  
  uploaded_by?: number;
  uploaded_by_name?: string;
  created_at: string;
}

// =====================================================
// Declaration History
// =====================================================

export interface CustomsDeclarationHistory {
  id: number;
  company_id: number;
  declaration_id: number;
  
  action: string;
  
  old_status_id?: number;
  old_status_code?: string;
  new_status_id?: number;
  new_status_code?: string;
  
  field_name?: string;
  old_value?: string;
  new_value?: string;
  
  notes?: string;
  
  performed_by?: number;
  performed_by_name?: string;
  performed_at: string;
  
  ip_address?: string;
}

// =====================================================
// Form / Request Types
// =====================================================

export interface CreateCustomsDeclarationRequest {
  declaration_type_id: number;
  declaration_date: string;
  
  shipment_id?: number;
  purchase_order_id?: number;
  commercial_invoice_id?: number;
  project_id?: number;
  
  customs_office_code?: string;
  customs_office_name?: string;
  entry_point_code?: string;
  entry_point_name?: string;
  
  transport_mode?: TransportMode;
  vessel_name?: string;
  voyage_number?: string;
  bl_number?: string;
  awb_number?: string;
  manifest_number?: string;
  
  origin_country_id?: number;
  destination_country_id?: number;
  final_destination?: string;
  
  incoterm?: string;
  
  currency_id: number;
  exchange_rate?: number;
  
  freight_value?: number;
  insurance_value?: number;
  other_charges?: number;
  
  package_type?: string;
  
  notes?: string;
  internal_notes?: string;
}

export interface UpdateCustomsDeclarationRequest extends Partial<CreateCustomsDeclarationRequest> {
  id: number;
}

export interface CreateDeclarationItemRequest {
  declaration_id: number;
  
  item_id?: number;
  item_code?: string;
  item_description: string;
  item_description_ar?: string;
  
  hs_code: string;
  hs_code_description?: string;
  
  origin_country_id?: number;
  
  quantity: number;
  unit_id?: number;
  unit_code?: string;
  
  gross_weight?: number;
  net_weight?: number;
  packages?: number;
  
  unit_price: number;
  fob_value?: number;
  freight_value?: number;
  insurance_value?: number;
  
  duty_rate?: number;
  vat_rate?: number;
  
  exemption_id?: number;
  
  inspection_required?: boolean;
  
  notes?: string;
}

export interface CreateDeclarationFeeRequest {
  declaration_id: number;
  fee_type: FeeType;
  fee_code?: string;
  fee_name_en: string;
  fee_name_ar?: string;
  base_amount: number;
  rate?: number;
  exemption_amount?: number;
  account_id?: number;
  notes?: string;
}

export interface CreateDeclarationPaymentRequest {
  declaration_id: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  amount: number;
  currency_id: number;
  bank_name?: string;
  account_number?: string;
  sadad_number?: string;
  receipt_number?: string;
  receipt_date?: string;
  notes?: string;
}

export interface CreateDeclarationInspectionRequest {
  declaration_id: number;
  inspection_type: InspectionType;
  inspection_date: string;
  inspector_name?: string;
  inspector_id_number?: string;
  location?: string;
  result: InspectionResult;
  findings?: string;
  recommendations?: string;
}

// =====================================================
// List / Filter Types
// =====================================================

export interface CustomsDeclarationListFilters {
  search?: string;
  status_id?: number;
  status_code?: DeclarationStatusCode;
  declaration_type_id?: number;
  direction?: DeclarationDirection;
  date_from?: string;
  date_to?: string;
  shipment_id?: number;
  project_id?: number;
  origin_country_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CustomsDeclarationListResponse {
  success: boolean;
  data: CustomsDeclaration[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =====================================================
// Summary / Dashboard Types
// =====================================================

export interface CustomsDeclarationSummary {
  total_declarations: number;
  by_status: {
    status_code: DeclarationStatusCode;
    status_name: string;
    count: number;
    total_value: number;
  }[];
  by_type: {
    type_code: string;
    type_name: string;
    count: number;
    total_value: number;
  }[];
  pending_inspections: number;
  pending_payments: number;
  total_fees_due: number;
  total_fees_paid: number;
}

// =====================================================
// Workflow Actions
// =====================================================

export interface WorkflowActionRequest {
  declaration_id: number;
  action: 'submit' | 'approve' | 'reject' | 'cancel' | 'reopen';
  notes?: string;
}

export interface WorkflowActionResponse {
  success: boolean;
  message: string;
  new_status: CustomsDeclarationStatus;
}

// =====================================================
// Calculation Helpers
// =====================================================

export interface CalculateDutyRequest {
  hs_code: string;
  origin_country_id?: number;
  cif_value: number;
  exemption_id?: number;
}

export interface CalculateDutyResponse {
  duty_rate: number;
  duty_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_fees: number;
  exemption_applied: boolean;
  exemption_amount: number;
}
