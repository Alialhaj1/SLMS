/**
 * 🔐 MENU PERMISSIONS - Type-safe Permission Constants
    Types: {
      View: 'tax:types:view' as const,
      Create: 'tax:types:create' as const,
      Edit: 'tax:types:edit' as const,
      Delete: 'tax:types:delete' as const,
    },
 * =====================================================
 * 
 * هذا الملف يوفر:
 * ✅ Autocomplete للصلاحيات
 * ✅ Type-safety
 * ✅ منع الأخطاء الإملائية
 * ✅ Refactor آمن
 * 
 * @example
 * // ✅ صحيح - مع autocomplete
 * permission: MenuPermissions.Accounting.Journals.View
 * 
 * // ❌ خطأ - بدون type checking
 * permission: 'accounting.journal.veiw' // typo لن يُكتشف
 */

import { Permission } from '../types/permissions';

/**
 * صلاحيات القائمة الجانبية
 * مُنظمة حسب الوحدات (Modules)
 */
export const MenuPermissions = {
  // ═══════════════════════════════════════════════════════════
  // 📊 Dashboard
  // ═══════════════════════════════════════════════════════════
  Dashboard: {
    View: 'dashboard:view' as const,
    Statistics: {
      View: 'dashboard:statistics:view' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 📈 Reports
  // ═══════════════════════════════════════════════════════════
  Reports: {
    ReferenceData: {
      View: 'reports:reference_data:view' as const,
      Export: 'reports:reference_data:export' as const,
    },
    Warehouses: {
      View: 'reports:warehouses:view' as const,
      Export: 'reports:warehouses:export' as const,
    },
    Quality: {
      View: 'reports:quality:view' as const,
      Export: 'reports:quality:export' as const,
    },
    Risks: {
      View: 'reports:risks:view' as const,
      Export: 'reports:risks:export' as const,
    },
    Security: {
      View: 'reports:security:view' as const,
      Export: 'reports:security:export' as const,
    },

    // Logistics analytics (shipping & cost)
    ShipmentCosts: {
      View: 'reports:shipment_costs:view' as const,
      Export: 'reports:shipment_costs:export' as const,
    },
    ItemLandedCost: {
      View: 'reports:item_landed_cost:view' as const,
      Export: 'reports:item_landed_cost:export' as const,
    },
    ShipmentDelays: {
      View: 'reports:shipment_delays:view' as const,
      Export: 'reports:shipment_delays:export' as const,
    },

    ShipmentProfitability: {
      View: 'reports:shipment_profitability:view' as const,
      Export: 'reports:shipment_profitability:export' as const,
    },
    CostVariance: {
      View: 'reports:cost_variance:view' as const,
      Export: 'reports:cost_variance:export' as const,
    },
    TopCostSuppliers: {
      View: 'reports:top_cost_suppliers:view' as const,
      Export: 'reports:top_cost_suppliers:export' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🚚 Shipments
  // ═══════════════════════════════════════════════════════════
  Shipments: {
    View: 'shipments:view' as Permission,
    Create: 'shipments:create' as Permission,
    Edit: 'shipments:edit' as Permission,
    Delete: 'shipments:delete' as Permission,
  },

  // ═══════════════════════════════════════════════════════════
  // 💰 Expenses
  // ═══════════════════════════════════════════════════════════
  Expenses: {
    View: 'expenses:view' as const,
    Create: 'expenses:create' as const,
    Edit: 'expenses:edit' as const,
    Delete: 'expenses:delete' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // 🏭 Warehouses
  // ═══════════════════════════════════════════════════════════
  Warehouses: {
    View: 'warehouses:view' as Permission,
    Create: 'warehouses:create' as Permission,
    Edit: 'warehouses:edit' as Permission,
    Delete: 'warehouses:delete' as Permission,

    InventoryOperations: {
      Balances: {
        View: 'inventory:balances:view' as const,
      },
      Receipts: {
        View: 'inventory:receipts:view' as const,
        Create: 'inventory:receipts:create' as const,
      },
      Issues: {
        View: 'inventory:issues:view' as const,
        Create: 'inventory:issues:create' as const,
      },
      Transfers: {
        View: 'inventory:transfers:view' as const,
        Create: 'inventory:transfers:create' as const,
      },
      Returns: {
        View: 'inventory:returns:view' as const,
        Create: 'inventory:returns:create' as const,
      },
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 👥 Suppliers
  // ═══════════════════════════════════════════════════════════
  Suppliers: {
    View: 'suppliers:view' as Permission,
    Create: 'suppliers:create' as Permission,
    Edit: 'suppliers:edit' as Permission,
    Delete: 'suppliers:delete' as Permission,
  },

  // ═══════════════════════════════════════════════════════════
  // 📒 Accounting
  // ═══════════════════════════════════════════════════════════
  Accounting: {
    Accounts: {
      View: 'master:accounts:view' as const,
      Create: 'master:accounts:create' as const,
      Edit: 'master:accounts:edit' as const,
      Delete: 'master:accounts:delete' as const,
    },
    Journals: {
      View: 'accounting:journal:view' as const,
      Create: 'accounting:journal:create' as const,
      Edit: 'accounting:journal:edit' as const,
      Delete: 'accounting:journal:delete' as const,
      Post: 'accounting:journal:post' as const,
      Reverse: 'accounting:journal:reverse' as const,
    },
    Reports: {
      TrialBalance: {
        View: 'accounting:reports:trial-balance:view' as const,
      },
      GeneralLedger: {
        View: 'accounting:reports:general-ledger:view' as const,
        Export: 'accounting:reports:general-ledger:export' as const,
      },
      IncomeStatement: {
        View: 'accounting:reports:income-statement:view' as const,
        Export: 'accounting:reports:income-statement:export' as const,
      },
      BalanceSheet: {
        View: 'accounting:reports:balance-sheet:view' as const,
        Export: 'accounting:reports:balance-sheet:export' as const,
      },
      CashFlow: {
        View: 'accounting:reports:cash-flow:view' as const,
        Export: 'accounting:reports:cash-flow:export' as const,
      },
    },
    Periods: {
      View: 'accounting:periods:view' as const,
      Manage: 'accounting:periods:manage' as const,
    },

    OpeningBalances: {
      View: 'accounting:opening_balances:view' as const,
      Create: 'accounting:opening_balances:create' as const,
      Edit: 'accounting:opening_balances:edit' as const,
      Delete: 'accounting:opening_balances:delete' as const,
      Post: 'accounting:opening_balances:post' as const,
      Reverse: 'accounting:opening_balances:reverse' as const,
    },

    Budgets: {
      View: 'accounting:budgets:view' as const,
      Create: 'accounting:budgets:create' as const,
      Edit: 'accounting:budgets:edit' as const,
      Delete: 'accounting:budgets:delete' as const,
    },

    // Utility / sub-ledgers (UI pages)
    PrepaidExpenses: {
      View: 'accounting:prepaid_expenses:view' as const,
      Create: 'accounting:prepaid_expenses:create' as const,
      Edit: 'accounting:prepaid_expenses:edit' as const,
      Delete: 'accounting:prepaid_expenses:delete' as const,
    },
    DeferredRevenue: {
      View: 'accounting:deferred_revenue:view' as const,
      Create: 'accounting:deferred_revenue:create' as const,
      Edit: 'accounting:deferred_revenue:edit' as const,
      Delete: 'accounting:deferred_revenue:delete' as const,
    },
    ChequesDue: {
      View: 'accounting:cheques_due:view' as const,
      Create: 'accounting:cheques_due:create' as const,
      Edit: 'accounting:cheques_due:edit' as const,
      Delete: 'accounting:cheques_due:delete' as const,
    },
    CustomersLedger: {
      View: 'accounting:customers_ledger:view' as const,
      Export: 'accounting:customers_ledger:export' as const,
    },
    InventoryLedger: {
      View: 'accounting:inventory_ledger:view' as const,
      Export: 'accounting:inventory_ledger:export' as const,
    },
    DefaultAccounts: {
      View: 'accounting:default_accounts:view' as const,
      Manage: 'accounting:default_accounts:manage' as const,
    },

    // Additional accounting sub-ledgers
    AccruedRevenue: {
      View: 'accounting:accrued_revenue:view' as const,
      Create: 'accounting:accrued_revenue:create' as const,
      Edit: 'accounting:accrued_revenue:edit' as const,
    },
    BankMatching: {
      View: 'accounting:bank_matching:view' as const,
      Manage: 'accounting:bank_matching:manage' as const,
    },
    BankReconciliation: {
      View: 'accounting:bank_reconciliation:view' as const,
      Manage: 'accounting:bank_reconciliation:manage' as const,
    },
    CashDeposit: {
      View: 'accounting:cash_deposit:view' as const,
      Create: 'accounting:cash_deposit:create' as const,
    },
    CashInventory: {
      View: 'accounting:cash_inventory:view' as const,
    },
    CashLedger: {
      View: 'accounting:cash_ledger:view' as const,
      Export: 'accounting:cash_ledger:export' as const,
    },
    CreditNotes: {
      View: 'accounting:credit_notes:view' as const,
      Create: 'accounting:credit_notes:create' as const,
      Edit: 'accounting:credit_notes:edit' as const,
      Delete: 'accounting:credit_notes:delete' as const,
    },
    DebitNotes: {
      View: 'accounting:debit_notes:view' as const,
      Create: 'accounting:debit_notes:create' as const,
      Edit: 'accounting:debit_notes:edit' as const,
      Delete: 'accounting:debit_notes:delete' as const,
    },
    PaymentVoucher: {
      View: 'accounting:payment_voucher:view' as const,
      Create: 'accounting:payment_voucher:create' as const,
      Post: 'accounting:payment_voucher:post' as const,
    },
    ReceiptVoucher: {
      View: 'accounting:receipt_voucher:view' as const,
      Create: 'accounting:receipt_voucher:create' as const,
      Post: 'accounting:receipt_voucher:post' as const,
    },
    SuppliersLedger: {
      View: 'accounting:suppliers_ledger:view' as const,
      Export: 'accounting:suppliers_ledger:export' as const,
    },
    FinancialYears: {
      View: 'accounting:financial_years:view' as const,
      Manage: 'accounting:financial_years:manage' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 📦 Master Data
  // ═══════════════════════════════════════════════════════════
  MasterData: {
    // ─────────────────────────────────────────────────────
    // Group 1: System & General Settings
    // ─────────────────────────────────────────────────────
    NumberingSeries: {
      View: 'numbering_series:view' as const,
      Create: 'numbering_series:create' as const,
      Edit: 'numbering_series:edit' as const,
      Delete: 'numbering_series:delete' as const,
    },
    SystemLanguages: {
      View: 'system_languages:view' as const,
      Create: 'system_languages:create' as const,
      Edit: 'system_languages:edit' as const,
      Delete: 'system_languages:delete' as const,
    },
    SystemPolicies: {
      View: 'system_policies:view' as const,
      Create: 'system_policies:create' as const,
      Edit: 'system_policies:edit' as const,
      Delete: 'system_policies:delete' as const,
    },
    PrintedTemplates: {
      View: 'printed_templates:view' as const,
      Create: 'printed_templates:create' as const,
      Edit: 'printed_templates:edit' as const,
      Delete: 'printed_templates:delete' as const,
    },
    DigitalSignatures: {
      View: 'digital_signatures:view' as const,
      Create: 'digital_signatures:create' as const,
      Edit: 'digital_signatures:edit' as const,
      Delete: 'digital_signatures:delete' as const,
    },
    UIThemes: {
      View: 'ui_themes:view' as const,
      Create: 'ui_themes:create' as const,
      Edit: 'ui_themes:edit' as const,
      Delete: 'ui_themes:delete' as const,
    },
    
    // ─────────────────────────────────────────────────────
    // Group 2: Reference Data (Geographic & Contact)
    // ─────────────────────────────────────────────────────
    Regions: {
      View: 'master:regions:view' as const,
      Create: 'master:regions:create' as const,
      Edit: 'master:regions:edit' as const,
      Delete: 'master:regions:delete' as const,
      Manage: 'master:regions:manage' as const,
    },
    BorderPoints: {
      View: 'border_points:view' as const,
      Create: 'border_points:create' as const,
      Edit: 'border_points:edit' as const,
      Delete: 'border_points:delete' as const,
    },
    TimeZones: {
      View: 'master:timezones:view' as const,
      Create: 'master:timezones:create' as const,
      Edit: 'master:timezones:edit' as const,
      Delete: 'master:timezones:delete' as const,
      Manage: 'master:timezones:manage' as const,
    },
    Languages: {
      View: 'master:languages:view' as const,
      Create: 'master:languages:create' as const,
      Edit: 'master:languages:edit' as const,
      Delete: 'master:languages:delete' as const,
      Export: 'master:languages:export' as const,
      Manage: 'master:languages:manage' as const,
    },
    AddressTypes: {
      View: 'address_types:view' as const,
      Create: 'address_types:create' as const,
      Edit: 'address_types:edit' as const,
      Delete: 'address_types:delete' as const,
    },
    ContactTypes: {
      View: 'contact_types:view' as const,
      Create: 'contact_types:create' as const,
      Edit: 'contact_types:edit' as const,
      Delete: 'contact_types:delete' as const,
    },
    CustomerTypes: {
      View: 'customer_types:view' as const,
      Create: 'customer_types:create' as const,
      Edit: 'customer_types:edit' as const,
      Delete: 'customer_types:delete' as const,
    },
    CustomerCategories: {
      View: 'customer_categories:view' as const,
      Create: 'customer_categories:create' as const,
      Edit: 'customer_categories:edit' as const,
      Delete: 'customer_categories:delete' as const,
    },
    CustomerStatuses: {
      View: 'customer_statuses:view' as const,
      Create: 'customer_statuses:create' as const,
      Edit: 'customer_statuses:edit' as const,
      Delete: 'customer_statuses:delete' as const,
    },
    ContactMethods: {
      View: 'contact_methods:view' as const,
      Create: 'contact_methods:create' as const,
      Edit: 'contact_methods:edit' as const,
      Delete: 'contact_methods:delete' as const,
    },
    RecordStatuses: {
      View: 'record_statuses:view' as const,
      Create: 'record_statuses:create' as const,
      Edit: 'record_statuses:edit' as const,
      Delete: 'record_statuses:delete' as const,
    },
    RequestStatuses: {
      View: 'request_statuses:view' as const,
      Create: 'request_statuses:create' as const,
      Edit: 'request_statuses:edit' as const,
      Delete: 'request_statuses:delete' as const,
    },
    SupplierTypes: {
      View: 'supplier_types:view' as const,
      Create: 'supplier_types:create' as const,
      Edit: 'supplier_types:edit' as const,
      Delete: 'supplier_types:delete' as const,
    },
    SupplierCategories: {
      View: 'supplier_categories:view' as const,
      Create: 'supplier_categories:create' as const,
      Edit: 'supplier_categories:edit' as const,
      Delete: 'supplier_categories:delete' as const,
    },
    SupplierStatuses: {
      View: 'supplier_statuses:view' as const,
      Create: 'supplier_statuses:create' as const,
      Edit: 'supplier_statuses:edit' as const,
      Delete: 'supplier_statuses:delete' as const,
    },
    SupplierBankAccounts: {
      View: 'supplier_bank_accounts:view' as const,
      Create: 'supplier_bank_accounts:create' as const,
      Edit: 'supplier_bank_accounts:edit' as const,
      Delete: 'supplier_bank_accounts:delete' as const,
    },
    PoStatuses: {
      View: 'po_statuses:view' as const,
      Create: 'po_statuses:create' as const,
      Edit: 'po_statuses:edit' as const,
      Delete: 'po_statuses:delete' as const,
    },
    ContractStatuses: {
      View: 'contract_statuses:view' as const,
      Create: 'contract_statuses:create' as const,
      Edit: 'contract_statuses:edit' as const,
      Delete: 'contract_statuses:delete' as const,
    },
    Ports: {
      View: 'ports:view' as const,
      Create: 'ports:create' as const,
      Edit: 'ports:edit' as const,
      Delete: 'ports:delete' as const,
    },
    CustomsOffices: {
      View: 'customs_offices:view' as const,
      Create: 'customs_offices:create' as const,
      Edit: 'customs_offices:edit' as const,
      Delete: 'customs_offices:delete' as const,
    },
    ClearanceOffices: {
      View: 'clearance_offices:view' as const,
      Create: 'clearance_offices:create' as const,
      Edit: 'clearance_offices:edit' as const,
      Delete: 'clearance_offices:delete' as const,
    },
    HSCodes: {
      View: 'hs_codes:view' as const,
      Create: 'hs_codes:create' as const,
      Edit: 'hs_codes:edit' as const,
      Delete: 'hs_codes:delete' as const,
    },
    CustomsFeeCategories: {
      View: 'customs_fee_categories:view' as const,
      Create: 'customs_fee_categories:create' as const,
      Edit: 'customs_fee_categories:edit' as const,
      Delete: 'customs_fee_categories:delete' as const,
    },
    CustomsDuties: {
      View: 'customs_duties:view' as const,
      Create: 'customs_duties:create' as const,
      Edit: 'customs_duties:edit' as const,
      Delete: 'customs_duties:delete' as const,
    },
    CustomsDutyTypes: {
      View: 'customs_duty_types:view' as const,
      Create: 'customs_duty_types:create' as const,
      Edit: 'customs_duty_types:edit' as const,
      Delete: 'customs_duty_types:delete' as const,
    },
    ClearanceStatus: {
      View: 'clearance_status:view' as const,
      Create: 'clearance_status:create' as const,
      Edit: 'clearance_status:edit' as const,
      Delete: 'clearance_status:delete' as const,
    },
    CustomsStatuses: {
      View: 'customs_statuses:view' as const,
      Create: 'customs_statuses:create' as const,
      Edit: 'customs_statuses:edit' as const,
      Delete: 'customs_statuses:delete' as const,
    },
    ClaimStatus: {
      View: 'claim_status:view' as const,
      Create: 'claim_status:create' as const,
      Edit: 'claim_status:edit' as const,
      Delete: 'claim_status:delete' as const,
    },
    PaymentTerms: {
      View: 'payment_terms:view' as const,
      Create: 'payment_terms:create' as const,
      Edit: 'payment_terms:edit' as const,
      Delete: 'payment_terms:delete' as const,
    },
    PaymentMethods: {
      View: 'payment_methods:view' as const,
      Create: 'payment_methods:create' as const,
      Edit: 'payment_methods:edit' as const,
      Delete: 'payment_methods:delete' as const,
    },

    ContractApprovalStatus: {
      View: 'master:contract_approval_status:view' as const,
      Create: 'master:contract_approval_status:create' as const,
      Edit: 'master:contract_approval_status:edit' as const,
      Delete: 'master:contract_approval_status:delete' as const,
    },
    ContractStatus: {
      View: 'master:contract_status:view' as const,
      Create: 'master:contract_status:create' as const,
      Edit: 'master:contract_status:edit' as const,
      Delete: 'master:contract_status:delete' as const,
    },
    DeliveryLocations: {
      View: 'master:delivery_locations:view' as const,
      Create: 'master:delivery_locations:create' as const,
      Edit: 'master:delivery_locations:edit' as const,
      Delete: 'master:delivery_locations:delete' as const,
    },
    ExternalWarehouses: {
      View: 'master:external_warehouses:view' as const,
      Create: 'master:external_warehouses:create' as const,
      Edit: 'master:external_warehouses:edit' as const,
      Delete: 'master:external_warehouses:delete' as const,
    },
    GroupTypes: {
      View: 'master:group_types:view' as const,
      Create: 'master:group_types:create' as const,
      Edit: 'master:group_types:edit' as const,
      Delete: 'master:group_types:delete' as const,
    },
    GroupLevels: {
      View: 'group_levels:view' as const,
      Create: 'group_levels:create' as const,
      Edit: 'group_levels:edit' as const,
      Delete: 'group_levels:delete' as const,
    },
    GroupCategories: {
      View: 'group_categories:view' as const,
      Create: 'group_categories:create' as const,
      Edit: 'group_categories:edit' as const,
      Delete: 'group_categories:delete' as const,
    },
    ItemGroups: {
      View: 'item_groups:view' as const,
      Create: 'item_groups:create' as const,
      Edit: 'item_groups:edit' as const,
      Delete: 'item_groups:delete' as const,
    },
    ItemTypes: {
      View: 'item_types:view' as const,
      Create: 'item_types:create' as const,
      Edit: 'item_types:edit' as const,
      Delete: 'item_types:delete' as const,
    },
    ItemGrades: {
      View: 'item_grades:view' as const,
      Create: 'item_grades:create' as const,
      Edit: 'item_grades:edit' as const,
      Delete: 'item_grades:delete' as const,
    },
    InvoiceTemplates: {
      View: 'master:invoice_templates:view' as const,
      Create: 'master:invoice_templates:create' as const,
      Edit: 'master:invoice_templates:edit' as const,
      Delete: 'master:invoice_templates:delete' as const,
    },
    InvoiceTypes: {
      View: 'master:invoice_types:view' as const,
      Create: 'master:invoice_types:create' as const,
      Edit: 'master:invoice_types:edit' as const,
      Delete: 'master:invoice_types:delete' as const,
    },
    NoticeTypes: {
      View: 'master:notice_types:view' as const,
      Create: 'master:notice_types:create' as const,
      Edit: 'master:notice_types:edit' as const,
      Delete: 'master:notice_types:delete' as const,
    },
    PaymentTypes: {
      View: 'master:payment_types:view' as const,
      Create: 'master:payment_types:create' as const,
      Edit: 'master:payment_types:edit' as const,
      Delete: 'master:payment_types:delete' as const,
    },
    PriceLists: {
      View: 'price_lists:view' as const,
      Create: 'price_lists:create' as const,
      Edit: 'price_lists:edit' as const,
      Delete: 'price_lists:delete' as const,
    },
    DiscountAgreements: {
      View: 'discount_agreements:view' as const,
      Create: 'discount_agreements:create' as const,
      Edit: 'discount_agreements:edit' as const,
      Delete: 'discount_agreements:delete' as const,
    },
    PricingMethods: {
      View: 'master:pricing_methods:view' as const,
      Create: 'master:pricing_methods:create' as const,
      Edit: 'master:pricing_methods:edit' as const,
      Delete: 'master:pricing_methods:delete' as const,
    },
    ProjectContractTypes: {
      View: 'master:project_contract_types:view' as const,
      Create: 'master:project_contract_types:create' as const,
      Edit: 'master:project_contract_types:edit' as const,
      Delete: 'master:project_contract_types:delete' as const,
    },
    PurchaseOrderTemplates: {
      View: 'master:purchase_order_templates:view' as const,
      Create: 'master:purchase_order_templates:create' as const,
      Edit: 'master:purchase_order_templates:edit' as const,
      Delete: 'master:purchase_order_templates:delete' as const,
    },
    PurchaseOrderTypes: {
      View: 'master:purchase_order_types:view' as const,
      Create: 'master:purchase_order_types:create' as const,
      Edit: 'master:purchase_order_types:edit' as const,
      Delete: 'master:purchase_order_types:delete' as const,
    },
    QualityStatus: {
      View: 'master:quality_status:view' as const,
      Create: 'master:quality_status:create' as const,
      Edit: 'master:quality_status:edit' as const,
      Delete: 'master:quality_status:delete' as const,
    },

    ReceiptTypes: {
      View: 'master:receipt_types:view' as const,
      Create: 'master:receipt_types:create' as const,
      Edit: 'master:receipt_types:edit' as const,
      Delete: 'master:receipt_types:delete' as const,
    },
    ReportTypes: {
      View: 'master:report_types:view' as const,
      Create: 'master:report_types:create' as const,
      Edit: 'master:report_types:edit' as const,
      Delete: 'master:report_types:delete' as const,
    },
    ResponsibilityCenters: {
      View: 'master:responsibility_centers:view' as const,
      Create: 'master:responsibility_centers:create' as const,
      Edit: 'master:responsibility_centers:edit' as const,
      Delete: 'master:responsibility_centers:delete' as const,
    },
    RiskTypes: {
      View: 'master:risk_types:view' as const,
      Create: 'master:risk_types:create' as const,
      Edit: 'master:risk_types:edit' as const,
      Delete: 'master:risk_types:delete' as const,
    },
    ShipmentCostCenters: {
      View: 'master:shipment_cost_centers:view' as const,
      Create: 'master:shipment_cost_centers:create' as const,
      Edit: 'master:shipment_cost_centers:edit' as const,
      Delete: 'master:shipment_cost_centers:delete' as const,
    },
    ShipmentTypes: {
      View: 'shipment_types:view' as const,
      Create: 'shipment_types:create' as const,
      Edit: 'shipment_types:edit' as const,
      Delete: 'shipment_types:delete' as const,
    },
    ContainerTypes: {
      View: 'container_types:view' as const,
      Create: 'container_types:create' as const,
      Edit: 'container_types:edit' as const,
      Delete: 'container_types:delete' as const,
    },
    Incoterms: {
      View: 'incoterms:view' as const,
      Create: 'incoterms:create' as const,
      Edit: 'incoterms:edit' as const,
      Delete: 'incoterms:delete' as const,
    },
    ShippingMethods: {
      View: 'shipping_methods:view' as const,
      Create: 'shipping_methods:create' as const,
      Edit: 'shipping_methods:edit' as const,
      Delete: 'shipping_methods:delete' as const,
    },
    SupplyTerms: {
      View: 'supply_terms:view' as const,
      Create: 'supply_terms:create' as const,
      Edit: 'supply_terms:edit' as const,
      Delete: 'supply_terms:delete' as const,
    },
    DeliveryTerms: {
      View: 'delivery_terms:view' as const,
      Create: 'delivery_terms:create' as const,
      Edit: 'delivery_terms:edit' as const,
      Delete: 'delivery_terms:delete' as const,
    },
    ContractTypes: {
      View: 'contract_types:view' as const,
      Create: 'contract_types:create' as const,
      Edit: 'contract_types:edit' as const,
      Delete: 'contract_types:delete' as const,
    },
    TaxExemptions: {
      View: 'master:tax_exemptions:view' as const,
      Create: 'master:tax_exemptions:create' as const,
      Edit: 'master:tax_exemptions:edit' as const,
      Delete: 'master:tax_exemptions:delete' as const,
    },
    TaxRegions: {
      View: 'master:tax_regions:view' as const,
      Create: 'master:tax_regions:create' as const,
      Edit: 'master:tax_regions:edit' as const,
      Delete: 'master:tax_regions:delete' as const,
    },
    VendorPaymentTerms: {
      View: 'master:vendor_payment_terms:view' as const,
      Create: 'master:vendor_payment_terms:create' as const,
      Edit: 'master:vendor_payment_terms:edit' as const,
      Delete: 'master:vendor_payment_terms:delete' as const,
    },
    ZakatCodes: {
      View: 'master:zakat_codes:view' as const,
      Create: 'master:zakat_codes:create' as const,
      Edit: 'master:zakat_codes:edit' as const,
      Delete: 'master:zakat_codes:delete' as const,
    },
    
    // ─────────────────────────────────────────────────────
    // Group 3: Customers & Suppliers
    // ─────────────────────────────────────────────────────
    CustomerGroups: {
      View: 'customer_groups:view' as const,
      Create: 'customer_groups:create' as const,
      Edit: 'customer_groups:edit' as const,
      Delete: 'customer_groups:delete' as const,
    },
    
    // ─────────────────────────────────────────────────────
    // Group 4: Inventory Management
    // ─────────────────────────────────────────────────────
    BatchNumbers: {
      View: 'batch_numbers:view' as const,
      Create: 'batch_numbers:create' as const,
      Edit: 'batch_numbers:edit' as const,
      Delete: 'batch_numbers:delete' as const,
    },
    HarvestSchedules: {
      View: 'harvest_schedules:view' as const,
      Create: 'harvest_schedules:create' as const,
      Edit: 'harvest_schedules:edit' as const,
      Delete: 'harvest_schedules:delete' as const,
    },
    InventoryPolicies: {
      View: 'inventory_policies:view' as const,
      Create: 'inventory_policies:create' as const,
      Edit: 'inventory_policies:edit' as const,
      Delete: 'inventory_policies:delete' as const,
    },
    ReorderRules: {
      View: 'reorder_rules:view' as const,
      Create: 'reorder_rules:create' as const,
      Edit: 'reorder_rules:edit' as const,
      Delete: 'reorder_rules:delete' as const,
    },
    CycleCountPolicies: {
      View: 'cycle_count_policies:view' as const,
      Create: 'cycle_count_policies:create' as const,
      Edit: 'cycle_count_policies:edit' as const,
      Delete: 'cycle_count_policies:delete' as const,
    },
    
    // ─────────────────────────────────────────────────────
    // Core Master Data (Existing)
    // ─────────────────────────────────────────────────────
    Items: {
      View: 'master:items:view' as const,
      Create: 'master:items:create' as const,
      Edit: 'master:items:edit' as const,
      Delete: 'master:items:delete' as const,
    },
    ItemBarcodes: {
      View: 'master:item_barcodes:view' as const,
      Create: 'master:item_barcodes:create' as const,
      Edit: 'master:item_barcodes:edit' as const,
      Delete: 'master:item_barcodes:delete' as const,
    },
    Customers: {
      View: 'master:customers:view' as const,
      Create: 'master:customers:create' as const,
      Edit: 'master:customers:edit' as const,
      Delete: 'master:customers:delete' as const,
    },
    Vendors: {
      View: 'master:vendors:view' as const,
      Create: 'master:vendors:create' as const,
      Edit: 'master:vendors:edit' as const,
      Delete: 'master:vendors:delete' as const,
    },
    CostCenters: {
      View: 'master:cost_centers:view' as const,
      Create: 'master:cost_centers:create' as const,
      Edit: 'master:cost_centers:edit' as const,
      Delete: 'master:cost_centers:delete' as const,
    },
    Currencies: {
      View: 'master:currencies:view' as const,
      Manage: 'master:currencies:manage' as const,
    },
    Countries: {
      View: 'master:countries:view' as const,
      Create: 'master:countries:create' as const,
      Edit: 'master:countries:edit' as const,
      Delete: 'master:countries:delete' as const,
      Manage: 'master:countries:manage' as const,
    },
    Cities: {
      View: 'master:cities:view' as const,
      Create: 'master:cities:create' as const,
      Edit: 'master:cities:edit' as const,
      Delete: 'master:cities:delete' as const,
    },
    Warehouses: {
      View: 'master:warehouses:view' as const,
      Create: 'master:warehouses:create' as const,
      Edit: 'master:warehouses:edit' as const,
      Delete: 'master:warehouses:delete' as const,
    },
    WarehouseLocations: {
      View: 'master:warehouse_locations:view' as const,
      Create: 'master:warehouse_locations:create' as const,
      Edit: 'master:warehouse_locations:edit' as const,
      Delete: 'master:warehouse_locations:delete' as const,
    },
    Units: {
      View: 'master:units:view' as const,
      Create: 'master:units:create' as const,
      Edit: 'master:units:edit' as const,
      Delete: 'master:units:delete' as const,
    },
    UnitTypes: {
      View: 'unit_types:view' as const,
      Create: 'unit_types:create' as const,
      Edit: 'unit_types:edit' as const,
      Delete: 'unit_types:delete' as const,
    },
    WarehouseTypes: {
      View: 'warehouse_types:view' as const,
      Create: 'warehouse_types:create' as const,
      Edit: 'warehouse_types:edit' as const,
      Delete: 'warehouse_types:delete' as const,
    },
    StorageLocationTypes: {
      View: 'storage_location_types:view' as const,
      Create: 'storage_location_types:create' as const,
      Edit: 'storage_location_types:edit' as const,
      Delete: 'storage_location_types:delete' as const,
    },
    TrackingPolicies: {
      View: 'tracking_policies:view' as const,
      Create: 'tracking_policies:create' as const,
      Edit: 'tracking_policies:edit' as const,
      Delete: 'tracking_policies:delete' as const,
    },
    Taxes: {
      View: 'master:taxes:view' as const,
      Create: 'master:taxes:create' as const,
      Edit: 'master:taxes:edit' as const,
      Delete: 'master:taxes:delete' as const,
    },

    // ─────────────────────────────────────────────────────
    // Additional Master Data (UI pages)
    // ─────────────────────────────────────────────────────
    ParallelCurrencies: {
      View: 'master:parallel_currencies:view' as const,
      Create: 'master:parallel_currencies:create' as const,
      Edit: 'master:parallel_currencies:edit' as const,
      Delete: 'master:parallel_currencies:delete' as const,
    },
    TaxCategories: {
      View: 'master:tax_categories:view' as const,
      Create: 'master:tax_categories:create' as const,
      Edit: 'master:tax_categories:edit' as const,
      Delete: 'master:tax_categories:delete' as const,
    },
    DocumentStatus: {
      View: 'master:document_status:view' as const,
      Create: 'master:document_status:create' as const,
      Edit: 'master:document_status:edit' as const,
      Delete: 'master:document_status:delete' as const,
    },
    CostItems: {
      View: 'master:cost_items:view' as const,
      Create: 'master:cost_items:create' as const,
      Edit: 'master:cost_items:edit' as const,
      Delete: 'master:cost_items:delete' as const,
    },
    CostElementGroups: {
      View: 'cost_element_groups:view' as const,
      Create: 'cost_element_groups:create' as const,
      Edit: 'cost_element_groups:edit' as const,
      Delete: 'cost_element_groups:delete' as const,
    },
    ProfitCenters: {
      View: 'master:profit_centers:view' as const,
      Create: 'master:profit_centers:create' as const,
      Edit: 'master:profit_centers:edit' as const,
      Delete: 'master:profit_centers:delete' as const,
    },
    TransportCompanies: {
      View: 'master:transport_companies:view' as const,
      Create: 'master:transport_companies:create' as const,
      Edit: 'master:transport_companies:edit' as const,
      Delete: 'master:transport_companies:delete' as const,
    },

    ExchangeRates: {
      View: 'master:exchange_rates:view' as const,
      Create: 'master:exchange_rates:create' as const,
      Edit: 'master:exchange_rates:edit' as const,
      Delete: 'master:exchange_rates:delete' as const,
    },
    Banks: {
      View: 'master:banks:view' as const,
      Create: 'master:banks:create' as const,
      Edit: 'master:banks:edit' as const,
      Delete: 'master:banks:delete' as const,
    },
    Drivers: {
      View: 'master:drivers:view' as const,
      Create: 'master:drivers:create' as const,
      Edit: 'master:drivers:edit' as const,
      Delete: 'master:drivers:delete' as const,
    },
    FreightAgents: {
      View: 'master:freight_agents:view' as const,
      Create: 'master:freight_agents:create' as const,
      Edit: 'master:freight_agents:edit' as const,
      Delete: 'master:freight_agents:delete' as const,
    },
    InsuranceTypes: {
      View: 'master:insurance_types:view' as const,
      Create: 'master:insurance_types:create' as const,
      Edit: 'master:insurance_types:edit' as const,
      Delete: 'master:insurance_types:delete' as const,
    },
    BillOfLadingTypes: {
      View: 'master:bill_of_lading_types:view' as const,
      Create: 'master:bill_of_lading_types:create' as const,
      Edit: 'master:bill_of_lading_types:edit' as const,
      Delete: 'master:bill_of_lading_types:delete' as const,
    },
    ShipmentClassifications: {
      View: 'master:shipment_classifications:view' as const,
      Create: 'master:shipment_classifications:create' as const,
      Edit: 'master:shipment_classifications:edit' as const,
      Delete: 'master:shipment_classifications:delete' as const,
    },

    AssetCategories: {
      View: 'master:asset_categories:view' as const,
      Create: 'master:asset_categories:create' as const,
      Edit: 'master:asset_categories:edit' as const,
      Delete: 'master:asset_categories:delete' as const,
    },
    AssetStatus: {
      View: 'master:asset_status:view' as const,
      Create: 'master:asset_status:create' as const,
      Edit: 'master:asset_status:edit' as const,
      Delete: 'master:asset_status:delete' as const,
    },
    AssetLocations: {
      View: 'master:asset_locations:view' as const,
      Create: 'master:asset_locations:create' as const,
      Edit: 'master:asset_locations:edit' as const,
      Delete: 'master:asset_locations:delete' as const,
    },
    Vehicles: {
      View: 'master:vehicles:view' as const,
      Create: 'master:vehicles:create' as const,
      Edit: 'master:vehicles:edit' as const,
      Delete: 'master:vehicles:delete' as const,
    },
    VehicleTypes: {
      View: 'master:vehicle_types:view' as const,
      Create: 'master:vehicle_types:create' as const,
      Edit: 'master:vehicle_types:edit' as const,
      Delete: 'master:vehicle_types:delete' as const,
    },
    TransportRoutes: {
      View: 'master:transport_routes:view' as const,
      Create: 'master:transport_routes:create' as const,
      Edit: 'master:transport_routes:edit' as const,
      Delete: 'master:transport_routes:delete' as const,
    },
    InsuranceCompanies: {
      View: 'master:insurance_companies:view' as const,
      Create: 'master:insurance_companies:create' as const,
      Edit: 'master:insurance_companies:edit' as const,
      Delete: 'master:insurance_companies:delete' as const,
    },

    // Additional Master Data
    VoucherTypes: {
      View: 'master:voucher_types:view' as const,
      Create: 'master:voucher_types:create' as const,
      Edit: 'master:voucher_types:edit' as const,
      Delete: 'master:voucher_types:delete' as const,
    },
    JournalTypes: {
      View: 'master:journal_types:view' as const,
      Create: 'master:journal_types:create' as const,
      Edit: 'master:journal_types:edit' as const,
      Delete: 'master:journal_types:delete' as const,
    },
    TransactionDefaults: {
      View: 'master:transaction_defaults:view' as const,
      Edit: 'master:transaction_defaults:edit' as const,
    },
    PrepaidPolicies: {
      View: 'master:prepaid_policies:view' as const,
      Edit: 'master:prepaid_policies:edit' as const,
    },
    DeferredPolicies: {
      View: 'master:deferred_policies:view' as const,
      Edit: 'master:deferred_policies:edit' as const,
    },
    ExpenseDistribution: {
      View: 'master:expense_distribution:view' as const,
      Edit: 'master:expense_distribution:edit' as const,
    },
    Laboratories: {
      View: 'master:laboratories:view' as const,
      Create: 'master:laboratories:create' as const,
      Edit: 'master:laboratories:edit' as const,
      Delete: 'master:laboratories:delete' as const,
    },
    EntryExitPoints: {
      View: 'master:entry_exit_points:view' as const,
      Create: 'master:entry_exit_points:create' as const,
      Edit: 'master:entry_exit_points:edit' as const,
      Delete: 'master:entry_exit_points:delete' as const,
    },
    Tariffs: {
      View: 'master:tariffs:view' as const,
      Create: 'master:tariffs:create' as const,
      Edit: 'master:tariffs:edit' as const,
      Delete: 'master:tariffs:delete' as const,
    },
    SerialNumbers: {
      View: 'master:serial_numbers:view' as const,
      Create: 'master:serial_numbers:create' as const,
      Edit: 'master:serial_numbers:edit' as const,
      Delete: 'master:serial_numbers:delete' as const,
    },
    StockLimits: {
      View: 'master:stock_limits:view' as const,
      Edit: 'master:stock_limits:edit' as const,
    },
    MinMaxPolicies: {
      View: 'master:min_max_policies:view' as const,
      Edit: 'master:min_max_policies:edit' as const,
    },
    ExpiryPolicies: {
      View: 'master:expiry_policies:view' as const,
      Edit: 'master:expiry_policies:edit' as const,
    },
    ValuationMethods: {
      View: 'master:valuation_methods:view' as const,
      Edit: 'master:valuation_methods:edit' as const,
    },
    InventoryCounting: {
      View: 'master:inventory_counting:view' as const,
      Create: 'master:inventory_counting:create' as const,
    },
    ShippingExpenseCategories: {
      View: 'shipping:expense_categories:view' as const,
      Create: 'shipping:expense_categories:create' as const,
      Edit: 'shipping:expense_categories:edit' as const,
      Delete: 'shipping:expense_categories:delete' as const,
    },
    ShippingDocumentTypes: {
      View: 'shipping:document_types:view' as const,
      Create: 'shipping:document_types:create' as const,
      Edit: 'shipping:document_types:edit' as const,
      Delete: 'shipping:document_types:delete' as const,
    },
    EmployeeStatus: {
      View: 'master:employee_status:view' as const,
      Create: 'master:employee_status:create' as const,
      Edit: 'master:employee_status:edit' as const,
      Delete: 'master:employee_status:delete' as const,
    },
    AllowanceTypes: {
      View: 'master:allowance_types:view' as const,
      Create: 'master:allowance_types:create' as const,
      Edit: 'master:allowance_types:edit' as const,
      Delete: 'master:allowance_types:delete' as const,
    },
    DeductionTypes: {
      View: 'master:deduction_types:view' as const,
      Create: 'master:deduction_types:create' as const,
      Edit: 'master:deduction_types:edit' as const,
      Delete: 'master:deduction_types:delete' as const,
    },
    AdvanceTypes: {
      View: 'master:advance_types:view' as const,
      Create: 'master:advance_types:create' as const,
      Edit: 'master:advance_types:edit' as const,
      Delete: 'master:advance_types:delete' as const,
    },
    HrExpenseTypes: {
      View: 'master:hr_expense_types:view' as const,
      Create: 'master:hr_expense_types:create' as const,
      Edit: 'master:hr_expense_types:edit' as const,
      Delete: 'master:hr_expense_types:delete' as const,
    },
    PayrollPeriods: {
      View: 'master:payroll_periods:view' as const,
      Edit: 'master:payroll_periods:edit' as const,
    },
    HrContractTypes: {
      View: 'master:hr_contract_types:view' as const,
      Create: 'master:hr_contract_types:create' as const,
      Edit: 'master:hr_contract_types:edit' as const,
      Delete: 'master:hr_contract_types:delete' as const,
    },
    HrContractStatus: {
      View: 'master:hr_contract_status:view' as const,
      Create: 'master:hr_contract_status:create' as const,
      Edit: 'master:hr_contract_status:edit' as const,
      Delete: 'master:hr_contract_status:delete' as const,
    },
    JobTitles: {
      View: 'master:job_titles:view' as const,
      Create: 'master:job_titles:create' as const,
      Edit: 'master:job_titles:edit' as const,
      Delete: 'master:job_titles:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // � Inventory
  // ═══════════════════════════════════════════════════════════
  Inventory: {
    View: 'inventory:view' as const,
    Items: {
      View: 'inventory:items:view' as const,
      Create: 'inventory:items:create' as const,
      Edit: 'inventory:items:edit' as const,
      Delete: 'inventory:items:delete' as const,
    },
    Categories: {
      View: 'inventory:categories:view' as const,
      Create: 'inventory:categories:create' as const,
      Edit: 'inventory:categories:edit' as const,
      Delete: 'inventory:categories:delete' as const,
    },
    Warehouses: {
      View: 'inventory:warehouses:view' as const,
      Create: 'inventory:warehouses:create' as const,
      Edit: 'inventory:warehouses:edit' as const,
      Delete: 'inventory:warehouses:delete' as const,
    },
    Stock: {
      View: 'inventory:stock:view' as const,
      Adjust: 'inventory:stock:adjust' as const,
      Transfer: 'inventory:stock:transfer' as const,
      Count: 'inventory:stock:count' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 👥 Partners (Customers & Suppliers)
  // ═══════════════════════════════════════════════════════════
  Partners: {
    View: 'partners:view' as const,
    Customers: {
      View: 'partners:customers:view' as const,
      Create: 'partners:customers:create' as const,
      Edit: 'partners:customers:edit' as const,
      Delete: 'partners:customers:delete' as const,
    },
    Vendors: {
      View: 'partners:vendors:view' as const,
      Create: 'partners:vendors:create' as const,
      Edit: 'partners:vendors:edit' as const,
      Delete: 'partners:vendors:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🚛 Logistics
  // ═══════════════════════════════════════════════════════════
  Logistics: {
    View: 'logistics:view' as const,
    // Logistics Shipments (V2)
    Shipments: {
      View: 'logistics:shipments:view' as const,
      Create: 'logistics:shipments:create' as const,
      Edit: 'logistics:shipments:edit' as const,
      Delete: 'logistics:shipments:delete' as const,
    },

    ShipmentTypes: {
      View: 'logistics:shipment_types:view' as const,
      Create: 'logistics:shipment_types:create' as const,
      Edit: 'logistics:shipment_types:edit' as const,
      Delete: 'logistics:shipment_types:delete' as const,
    },
    ShippingLines: {
      View: 'logistics:shipping_lines:view' as const,
      Create: 'logistics:shipping_lines:create' as const,
      Edit: 'logistics:shipping_lines:edit' as const,
      Delete: 'logistics:shipping_lines:delete' as const,
    },
    ShippingCompanies: {
      View: 'shipping_companies:view' as const,
      Create: 'shipping_companies:create' as const,
      Edit: 'shipping_companies:edit' as const,
      Delete: 'shipping_companies:delete' as const,
    },
    FreightAgents: {
      View: 'freight_agents:view' as const,
      Create: 'freight_agents:create' as const,
      Edit: 'freight_agents:edit' as const,
      Delete: 'freight_agents:delete' as const,
    },
    Ports: {
      View: 'logistics:ports:view' as const,
      Create: 'logistics:ports:create' as const,
      Edit: 'logistics:ports:edit' as const,
      Delete: 'logistics:ports:delete' as const,
    },
    Customs: {
      View: 'logistics:customs:view' as const,
      Create: 'logistics:customs:create' as const,
      Edit: 'logistics:customs:edit' as const,
      Delete: 'logistics:customs:delete' as const,
    },

    // Shipment lifecycle engine
    ShipmentLifecycleStatuses: {
      View: 'logistics:shipment_lifecycle_statuses:view' as const,
      Create: 'logistics:shipment_lifecycle_statuses:create' as const,
      Edit: 'logistics:shipment_lifecycle_statuses:edit' as const,
      Delete: 'logistics:shipment_lifecycle_statuses:delete' as const,
    },
    ShipmentStages: {
      View: 'logistics:shipment_stages:view' as const,
      Create: 'logistics:shipment_stages:create' as const,
      Edit: 'logistics:shipment_stages:edit' as const,
      Delete: 'logistics:shipment_stages:delete' as const,
    },
    ShipmentEventLog: {
      View: 'logistics:shipment_events:view' as const,
      Export: 'logistics:shipment_events:export' as const,
    },
    ShipmentAlerts: {
      View: 'logistics:shipment_alerts:view' as const,
      Manage: 'logistics:shipment_alerts:manage' as const,
    },
    ShipmentDocumentRequirements: {
      View: 'logistics:shipment_document_requirements:view' as const,
      Manage: 'logistics:shipment_document_requirements:manage' as const,
    },

    ShipmentMilestones: {
      View: 'logistics:shipment_milestones:view' as const,
      Manage: 'logistics:shipment_milestones:manage' as const,
    },

    ShipmentAlertRules: {
      View: 'logistics:shipment_alert_rules:view' as const,
      Manage: 'logistics:shipment_alert_rules:manage' as const,
    },

    // Receiving shipments into inventory
    ShipmentReceiving: {
      View: 'logistics:shipment_receiving:view' as const,
      Receive: 'logistics:shipment_receiving:receive' as const,
      Manage: 'logistics:shipment_receiving:manage' as const,
    },

    // Landed cost & allocation
    ShipmentCostTypes: {
      View: 'logistics:shipment_cost_types:view' as const,
      Create: 'logistics:shipment_cost_types:create' as const,
      Edit: 'logistics:shipment_cost_types:edit' as const,
      Delete: 'logistics:shipment_cost_types:delete' as const,
    },
    LandedCostAllocation: {
      View: 'logistics:landed_cost_allocation:view' as const,
      Manage: 'logistics:landed_cost_allocation:manage' as const,
    },
    LandedCostSettings: {
      View: 'logistics:landed_cost_settings:view' as const,
      Manage: 'logistics:landed_cost_settings:manage' as const,
    },

    // Shipping Bills (B/L, AWB)
    ShippingBills: {
      View: 'shipping_bills:view' as const,
      Create: 'shipping_bills:create' as const,
      Edit: 'shipping_bills:update' as const,
      Delete: 'shipping_bills:delete' as const,
      ChangeStatus: 'shipping_bills:change_status' as const,
    },
    BillTypes: {
      View: 'bill_types:view' as const,
      Manage: 'bill_types:manage' as const,
    },

    // Customs calculation engine
    HSCodes: {
      View: 'logistics:hs_codes:view' as const,
      Create: 'logistics:hs_codes:create' as const,
      Edit: 'logistics:hs_codes:edit' as const,
      Delete: 'logistics:hs_codes:delete' as const,
    },
    CustomsTariffs: {
      View: 'logistics:customs_tariffs:view' as const,
      Create: 'logistics:customs_tariffs:create' as const,
      Edit: 'logistics:customs_tariffs:edit' as const,
      Delete: 'logistics:customs_tariffs:delete' as const,
    },
    CustomsExemptions: {
      View: 'logistics:customs_exemptions:view' as const,
      Create: 'logistics:customs_exemptions:create' as const,
      Edit: 'logistics:customs_exemptions:edit' as const,
      Delete: 'logistics:customs_exemptions:delete' as const,
    },
    DutyCalculation: {
      View: 'logistics:duty_calculation:view' as const,
      Manage: 'logistics:duty_calculation:manage' as const,
    },

    // Shipment → Accounting bridge
    ShipmentAccountingBridge: {
      View: 'logistics:shipment_accounting_bridge:view' as const,
      Manage: 'logistics:shipment_accounting_bridge:manage' as const,
      Close: 'logistics:shipment_accounting_bridge:close' as const,
    },

    CarrierQuotes: {
      View: 'logistics:carrier_quotes:view' as const,
      Manage: 'logistics:carrier_quotes:manage' as const,
    },
    CarrierEvaluations: {
      View: 'logistics:carrier_evaluations:view' as const,
      Manage: 'logistics:carrier_evaluations:manage' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🛃 Customs Declarations (بيان جمركي)
  // ═══════════════════════════════════════════════════════════
  Customs: {
    Declarations: {
      View: 'customs_declarations:view' as const,
      Create: 'customs_declarations:create' as const,
      Update: 'customs_declarations:update' as const,
      Delete: 'customs_declarations:delete' as const,
      ChangeStatus: 'customs_declarations:change_status' as const,
      Print: 'customs_declarations:print' as const,
      Export: 'customs_declarations:export' as const,
      Upload: 'customs_declarations:upload' as const,
      ViewHistory: 'customs_declarations:view_history' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 📋 Projects & Contracts
  // ═══════════════════════════════════════════════════════════
  Projects: {
    View: 'projects:view' as const,
    Create: 'projects:create' as const,
    Edit: 'projects:edit' as const,
    Delete: 'projects:delete' as const,
    Projects: {
      View: 'projects:projects:view' as const,
      Create: 'projects:projects:create' as const,
      Edit: 'projects:projects:edit' as const,
      Delete: 'projects:projects:delete' as const,
    },
    Phases: {
      View: 'projects:phases:view' as const,
      Create: 'projects:phases:create' as const,
      Edit: 'projects:phases:edit' as const,
      Delete: 'projects:phases:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ✨ Quality
  // ═══════════════════════════════════════════════════════════
  Quality: {
    View: 'quality:view' as const,
    Create: 'quality:create' as const,
    Edit: 'quality:edit' as const,
    Delete: 'quality:delete' as const,
    ApprovedVendors: {
      View: 'quality:approved_vendors:view' as const,
      Create: 'quality:approved_vendors:create' as const,
      Edit: 'quality:approved_vendors:edit' as const,
      Delete: 'quality:approved_vendors:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ⚠️ Risks & Insurance
  // ═══════════════════════════════════════════════════════════
  Risks: {
    View: 'risks:view' as const,
    Create: 'risks:create' as const,
    Edit: 'risks:edit' as const,
    Delete: 'risks:delete' as const,
    InsuranceDocuments: {
      View: 'risks:insurance_documents:view' as const,
      Create: 'risks:insurance_documents:create' as const,
      Edit: 'risks:insurance_documents:edit' as const,
      Delete: 'risks:insurance_documents:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 💵 Tax & Zakat
  // ═══════════════════════════════════════════════════════════
  Tax: {
    View: 'tax:view' as const,
    Types: {
      View: 'tax:types:view' as const,
      Create: 'tax:types:create' as const,
      Edit: 'tax:types:edit' as const,
      Delete: 'tax:types:delete' as const,
    },
    Rates: {
      View: 'tax:rates:view' as const,
      Create: 'tax:rates:create' as const,
      Edit: 'tax:rates:edit' as const,
      Delete: 'tax:rates:delete' as const,
    },
    Codes: {
      View: 'tax:codes:view' as const,
      Create: 'tax:codes:create' as const,
      Edit: 'tax:codes:edit' as const,
      Delete: 'tax:codes:delete' as const,
    },
    ZATCA: {
      View: 'tax:zatca:view' as const,
      Manage: 'tax:zatca:manage' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🏦 Finance
  // ═══════════════════════════════════════════════════════════
  Finance: {
    View: 'finance:view' as const,
    ChartOfAccounts: {
      View: 'finance:coa:view' as const,
      Create: 'finance:coa:create' as const,
      Edit: 'finance:coa:edit' as const,
      Delete: 'finance:coa:delete' as const,
    },
    CashBoxes: {
      View: 'finance:cash_boxes:view' as const,
      Create: 'finance:cash_boxes:create' as const,
      Edit: 'finance:cash_boxes:edit' as const,
      Delete: 'finance:cash_boxes:delete' as const,
    },
    BankAccounts: {
      View: 'finance:bank_accounts:view' as const,
      Create: 'finance:bank_accounts:create' as const,
      Edit: 'finance:bank_accounts:edit' as const,
      Delete: 'finance:bank_accounts:delete' as const,
    },
    ChequeBooks: {
      View: 'finance:cheque_books:view' as const,
      Create: 'finance:cheque_books:create' as const,
      Edit: 'finance:cheque_books:edit' as const,
      Delete: 'finance:cheque_books:delete' as const,
    },
    Periods: {
      View: 'finance:periods:view' as const,
      Manage: 'finance:periods:manage' as const,
    },
    CashRegisters: {
      View: 'cash_registers:view' as const,
      Create: 'cash_registers:create' as const,
      Edit: 'cash_registers:edit' as const,
      Delete: 'cash_registers:delete' as const,
    },
    ReceiptVouchers: {
      View: 'receipt_vouchers:view' as const,
      Create: 'receipt_vouchers:create' as const,
      Approve: 'receipt_vouchers:approve' as const,
      Post: 'receipt_vouchers:post' as const,
    },
    VatReturns: {
      View: 'vat_returns:view' as const,
      Create: 'vat_returns:create' as const,
      Approve: 'vat_returns:approve' as const,
      Submit: 'vat_returns:submit' as const,
    },
    ZatcaSubmissions: {
      View: 'zatca:view' as const,
      Submit: 'zatca:submit' as const,
    },
    InventoryTransfers: {
      View: 'inventory_transfers:view' as const,
      Create: 'inventory_transfers:create' as const,
      Approve: 'inventory_transfers:approve' as const,
      Ship: 'inventory_transfers:ship' as const,
      Receive: 'inventory_transfers:receive' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 👔 Human Resources
  // ═══════════════════════════════════════════════════════════
  HR: {
    View: 'hr:view' as const,
    Departments: {
      View: 'hr:departments:view' as const,
      Create: 'hr:departments:create' as const,
      Edit: 'hr:departments:edit' as const,
      Delete: 'hr:departments:delete' as const,
    },
    Jobs: {
      View: 'hr:jobs:view' as const,
      Create: 'hr:jobs:create' as const,
      Edit: 'hr:jobs:edit' as const,
      Delete: 'hr:jobs:delete' as const,
    },
    Contracts: {
      View: 'hr:contracts:view' as const,
      Create: 'hr:contracts:create' as const,
      Edit: 'hr:contracts:edit' as const,
      Delete: 'hr:contracts:delete' as const,
    },
    Payroll: {
      View: 'hr:payroll:view' as const,
      Manage: 'hr:payroll:manage' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 📄 Documents
  // ═══════════════════════════════════════════════════════════
  Documents: {
    View: 'documents:view' as const,
    Types: {
      View: 'documents:types:view' as const,
      Create: 'documents:types:create' as const,
      Edit: 'documents:types:edit' as const,
      Delete: 'documents:types:delete' as const,
    },
    Workflows: {
      View: 'documents:workflows:view' as const,
      Create: 'documents:workflows:create' as const,
      Edit: 'documents:workflows:edit' as const,
      Delete: 'documents:workflows:delete' as const,
    },
    Templates: {
      View: 'documents:templates:view' as const,
      Create: 'documents:templates:create' as const,
      Edit: 'documents:templates:edit' as const,
      Delete: 'documents:templates:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 📦 Procurement (Purchasing & Payments)
  // ═══════════════════════════════════════════════════════════
  Procurement: {
    View: 'procurement:view' as const,
    Dashboard: {
      View: 'procurement:dashboard:view' as const,
    },
    PurchaseOrders: {
      View: 'procurement:purchase_orders:view' as const,
      Create: 'procurement:purchase_orders:create' as const,
      Edit: 'procurement:purchase_orders:edit' as const,
      Delete: 'procurement:purchase_orders:delete' as const,
      Approve: 'procurement:purchase_orders:approve' as const,
    },
    PurchaseInvoices: {
      View: 'procurement:purchase_invoices:view' as const,
      Create: 'procurement:purchase_invoices:create' as const,
      Edit: 'procurement:purchase_invoices:edit' as const,
      Delete: 'procurement:purchase_invoices:delete' as const,
      Post: 'procurement:purchase_invoices:post' as const,
    },
    VendorContracts: {
      View: 'procurement:vendor_contracts:view' as const,
      Create: 'procurement:vendor_contracts:create' as const,
      Edit: 'procurement:vendor_contracts:edit' as const,
      Delete: 'procurement:vendor_contracts:delete' as const,
    },
    Payments: {
      View: 'procurement:payments:view' as const,
      Create: 'procurement:payments:create' as const,
      Edit: 'procurement:payments:edit' as const,
      Delete: 'procurement:payments:delete' as const,
      Post: 'procurement:payments:post' as const,
      Allocate: 'procurement:payments:allocate' as const,
    },
    Reports: {
      View: 'procurement:reports:view' as const,
      Export: 'procurement:reports:export' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // �🔰 Master (Generic Permission for all Master Data)
  // ═══════════════════════════════════════════════════════════
  Master: {
    View: 'master:view' as const,
    Create: 'master:create' as const,
    Edit: 'master:edit' as const,
    Delete: 'master:delete' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // �👤 Users & Access
  // ═══════════════════════════════════════════════════════════
  Users: {
    View: 'users:view' as Permission,
    Create: 'users:create' as Permission,
    Edit: 'users:edit' as Permission,
    Delete: 'users:delete' as Permission,
    Restore: 'users:restore' as Permission,
    PermanentDelete: 'users:permanent_delete' as Permission,
    ViewDeleted: 'users:view_deleted' as Permission,
    ManageStatus: 'users:manage_status' as Permission, // Disable/Enable/Unlock
    AssignRoles: 'users:assign_roles' as Permission,
  },
  Roles: {
    View: 'roles:view' as Permission,
    Create: 'roles:create' as Permission,
    Edit: 'roles:edit' as Permission,
    Delete: 'roles:delete' as Permission,
    Restore: 'roles:restore' as Permission,
    ViewDeleted: 'roles:view_deleted' as Permission,
    AssignPermissions: 'roles:assign_permissions' as Permission,
  },

  // ═══════════════════════════════════════════════════════════
  // ⚙️ System Administration
  // ═══════════════════════════════════════════════════════════
  System: {
    Companies: {
      View: 'companies:view' as Permission,
      Create: 'companies:create' as Permission,
      Edit: 'companies:edit' as Permission,
      Delete: 'companies:delete' as Permission,
    },
    Branches: {
      View: 'branches:view' as Permission,
      Create: 'branches:create' as Permission,
      Edit: 'branches:edit' as Permission,
      Delete: 'branches:delete' as Permission,
    },
    Settings: {
      View: 'system_settings:view' as const,
      Edit: 'system_settings:edit' as const,
    },
    SystemSetup: {
      View: 'system_setup:view' as Permission,
      Edit: 'system_setup:edit' as Permission,
    },
    BackupSettings: {
      View: 'backup_settings:view' as Permission,
      Edit: 'backup_settings:edit' as Permission,
      Execute: 'backup_settings:execute' as Permission,
    },
    SystemPolicies: {
      View: 'system_policies:view' as Permission,
      Create: 'system_policies:create' as Permission,
      Edit: 'system_policies:edit' as Permission,
      Delete: 'system_policies:delete' as Permission,
    },
    Permissions: {
      View: 'permissions:view' as Permission,
      Create: 'permissions:create' as Permission,
      Edit: 'permissions:edit' as Permission,
      Delete: 'permissions:delete' as Permission,
    },
    AuditLogs: {
      View: 'audit_logs:view' as Permission,
      Export: 'audit_logs:export' as Permission,
    },
    EntityAccess: {
      View: 'entity_access:view' as Permission,
      Manage: 'entity_access:manage' as Permission,
    },
    HelpRequests: {
      View: 'help_requests:view' as Permission,
      Manage: 'help_requests:manage' as Permission,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🔔 Notifications
  // ═══════════════════════════════════════════════════════════
  Notifications: {
    View: 'notifications:view' as const,
    Manage: 'notifications:manage' as const,
    Delete: 'notifications:delete' as const,
    ViewAll: 'notifications:view_all' as const, // Admin-level
  },

  // ═══════════════════════════════════════════════════════════
  // 🔑 Password Reset Requests (Admin Approval)
  // ═══════════════════════════════════════════════════════════
  PasswordRequests: {
    View: 'password_requests:view' as const,
    Approve: 'password_requests:approve' as const,
    Reject: 'password_requests:reject' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // 📋 Account Requests (Platform Sales Funnel)
  // ═══════════════════════════════════════════════════════════
  AccountRequests: {
    View: 'account_requests:view' as const,
    Manage: 'account_requests:manage' as const,
    Delete: 'account_requests:delete' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // 🏭 Provisioning Engine (Master Data Setup)
  // ═══════════════════════════════════════════════════════════
  Provisioning: {
    View: 'admin:provisioning:view' as const,
    Execute: 'admin:provisioning:execute' as const,
    Manage: 'admin:provisioning:manage' as const,
  },
  ReferenceData: {
    View: 'admin:reference_data:view' as const,
    Manage: 'admin:reference_data:manage' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // 🛒 Sales
  // ═══════════════════════════════════════════════════════════
  Sales: {
    View: 'sales:view' as const,
    Quotations: {
      View: 'sales:quotations:view' as const,
      Create: 'sales:quotations:create' as const,
      Edit: 'sales:quotations:edit' as const,
      Delete: 'sales:quotations:delete' as const,
    },
    CustomerContracts: {
      View: 'sales:customer_contracts:view' as const,
      Create: 'sales:customer_contracts:create' as const,
      Edit: 'sales:customer_contracts:edit' as const,
      Delete: 'sales:customer_contracts:delete' as const,
    },
    Orders: {
      View: 'sales:orders:view' as const,
      Create: 'sales:orders:create' as const,
      Edit: 'sales:orders:edit' as const,
      Delete: 'sales:orders:delete' as const,
    },
    Invoices: {
      View: 'sales:invoices:view' as const,
      Create: 'sales:invoices:create' as const,
      Edit: 'sales:invoices:edit' as const,
      Delete: 'sales:invoices:delete' as const,
    },
    Returns: {
      View: 'sales:returns:view' as const,
      Create: 'sales:returns:create' as const,
      Edit: 'sales:returns:edit' as const,
      Delete: 'sales:returns:delete' as const,
    },
    PriceLists: {
      View: 'sales:price_lists:view' as const,
      Create: 'sales:price_lists:create' as const,
      Edit: 'sales:price_lists:edit' as const,
      Delete: 'sales:price_lists:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🤝 CRM
  // ═══════════════════════════════════════════════════════════
  CRM: {
    View: 'crm:view' as const,
    Addresses: {
      View: 'crm:addresses:view' as const,
      Create: 'crm:addresses:create' as const,
      Edit: 'crm:addresses:edit' as const,
      Delete: 'crm:addresses:delete' as const,
    },
    Contacts: {
      View: 'crm:contacts:view' as const,
      Create: 'crm:contacts:create' as const,
      Edit: 'crm:contacts:edit' as const,
      Delete: 'crm:contacts:delete' as const,
    },
    Opportunities: {
      View: 'crm:opportunities:view' as const,
      Create: 'crm:opportunities:create' as const,
      Edit: 'crm:opportunities:edit' as const,
      Delete: 'crm:opportunities:delete' as const,
    },
    FollowUp: {
      View: 'crm:follow_up:view' as const,
      Create: 'crm:follow_up:create' as const,
      Edit: 'crm:follow_up:edit' as const,
      Delete: 'crm:follow_up:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🏗️ Fixed Assets
  // ═══════════════════════════════════════════════════════════
  Assets: {
    View: 'assets:view' as const,
    FixedAssets: {
      View: 'assets:fixed_assets:view' as const,
      Create: 'assets:fixed_assets:create' as const,
      Edit: 'assets:fixed_assets:edit' as const,
      Delete: 'assets:fixed_assets:delete' as const,
    },
    DepreciationSchedules: {
      View: 'assets:depreciation_schedules:view' as const,
      Manage: 'assets:depreciation_schedules:manage' as const,
    },
    MaintenanceContracts: {
      View: 'assets:maintenance_contracts:view' as const,
      Create: 'assets:maintenance_contracts:create' as const,
      Edit: 'assets:maintenance_contracts:edit' as const,
      Delete: 'assets:maintenance_contracts:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 🚢 Shipping
  // ═══════════════════════════════════════════════════════════
  Shipping: {
    View: 'shipping:view' as const,
    BillOfLading: {
      View: 'shipping:bill_of_lading:view' as const,
      Create: 'shipping:bill_of_lading:create' as const,
      Edit: 'shipping:bill_of_lading:edit' as const,
    },
    Documents: {
      View: 'shipping:documents:view' as const,
      Create: 'shipping:documents:create' as const,
      Edit: 'shipping:documents:edit' as const,
      Delete: 'shipping:documents:delete' as const,
    },
    Schedules: {
      View: 'shipping:schedules:view' as const,
      Manage: 'shipping:schedules:manage' as const,
    },
    Contracts: {
      View: 'shipping:contracts:view' as const,
      Create: 'shipping:contracts:create' as const,
      Edit: 'shipping:contracts:edit' as const,
      Delete: 'shipping:contracts:delete' as const,
    },
    Insurance: {
      View: 'shipping:insurance:view' as const,
      Create: 'shipping:insurance:create' as const,
      Edit: 'shipping:insurance:edit' as const,
      Delete: 'shipping:insurance:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ✅ Compliance
  // ═══════════════════════════════════════════════════════════
  ComplianceModule: {
    View: 'compliance:view' as const,
    ConformityCertificates: {
      View: 'compliance:conformity_certificates:view' as const,
      Create: 'compliance:conformity_certificates:create' as const,
      Edit: 'compliance:conformity_certificates:edit' as const,
      Delete: 'compliance:conformity_certificates:delete' as const,
    },
    OriginCertificates: {
      View: 'compliance:origin_certificates:view' as const,
      Create: 'compliance:origin_certificates:create' as const,
      Edit: 'compliance:origin_certificates:edit' as const,
      Delete: 'compliance:origin_certificates:delete' as const,
    },
    Licenses: {
      View: 'compliance:licenses:view' as const,
      Create: 'compliance:licenses:create' as const,
      Edit: 'compliance:licenses:edit' as const,
      Delete: 'compliance:licenses:delete' as const,
    },
    Regulations: {
      View: 'compliance:regulations:view' as const,
      Create: 'compliance:regulations:create' as const,
      Edit: 'compliance:regulations:edit' as const,
      Delete: 'compliance:regulations:delete' as const,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 💲 Costs & Pricing
  // ═══════════════════════════════════════════════════════════
  CostsPricing: {
    View: 'costs_pricing:view' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // 🔗 Integrations
  // ═══════════════════════════════════════════════════════════
  Integrations: {
    View: 'integrations:view' as const,
    PaymentGateways: { View: 'integrations:payment_gateways:view' as const },
    ShippingCompanies: { View: 'integrations:shipping_companies:view' as const },
    BankIntegration: { View: 'integrations:bank_integration:view' as const },
  },

  // ═══════════════════════════════════════════════════════════
  // 📊 Advanced Purchasing
  // ═══════════════════════════════════════════════════════════
  AdvancedPurchasing: {
    View: 'purchasing:view' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // 🛃 Advanced Customs
  // ═══════════════════════════════════════════════════════════
  AdvancedCustoms: {
    View: 'customs:view' as const,
  },

  // ═══════════════════════════════════════════════════════════
  // 🛒 E-Commerce Store
  // ═══════════════════════════════════════════════════════════
  Store: {
    View: 'store_management:view' as const,
    Settings: {
      View: 'store_management:settings:view' as const,
      Edit: 'store_management:settings:edit' as const,
    },
    Products: {
      View: 'store_management:products:view' as const,
      Create: 'store_management:products:create' as const,
      Edit: 'store_management:products:edit' as const,
      Delete: 'store_management:products:delete' as const,
    },
    Orders: {
      View: 'store_management:orders:view' as const,
      Edit: 'store_management:orders:edit' as const,
    },
    Customers: {
      View: 'store_management:customers:view' as const,
      Edit: 'store_management:customers:edit' as const,
    },
    Coupons: {
      View: 'store_management:coupons:view' as const,
      Create: 'store_management:coupons:create' as const,
      Edit: 'store_management:coupons:edit' as const,
      Delete: 'store_management:coupons:delete' as const,
    },
    Reviews: {
      View: 'store_management:reviews:view' as const,
      Delete: 'store_management:reviews:delete' as const,
    },
    Shipping: {
      View: 'store_management:shipping:view' as const,
      Edit: 'store_management:shipping:edit' as const,
    },
    Analytics: {
      View: 'store_management:analytics:view' as const,
    },
  },

  // 🏪 Marketplace
  // ═══════════════════════════════════════════════════════════
  Marketplace: {
    View: 'marketplace:view' as const,
    Manage: 'marketplace:manage' as const,
    Vendors: {
      View: 'marketplace_vendors:view' as const,
      Create: 'marketplace_vendors:create' as const,
      Edit: 'marketplace_vendors:edit' as const,
    },
    Listings: {
      View: 'marketplace_listings:view' as const,
      Edit: 'marketplace_listings:edit' as const,
    },
    Orders: {
      View: 'marketplace_orders:view' as const,
    },
    Categories: {
      View: 'marketplace_categories:view' as const,
      Create: 'marketplace_categories:create' as const,
    },
    Payouts: {
      View: 'marketplace_payouts:view' as const,
      Edit: 'marketplace_payouts:edit' as const,
    },
    Disputes: {
      View: 'marketplace_disputes:view' as const,
      Edit: 'marketplace_disputes:edit' as const,
    },
  },

  // 🏬 Vendor Dashboard
  // ═══════════════════════════════════════════════════════════
  VendorDashboard: {
    View: 'vendor_dashboard:view' as const,
    Listings: {
      View: 'vendor_listings:view' as const,
      Manage: 'vendor_listings:manage' as const,
    },
    Orders: {
      View: 'vendor_orders:view' as const,
      Manage: 'vendor_orders:manage' as const,
    },
    Wallet: {
      View: 'vendor_wallet:view' as const,
    },
    Payouts: {
      View: 'vendor_payouts:view' as const,
      Request: 'vendor_payouts:request' as const,
    },
    Settings: {
      View: 'vendor_settings:view' as const,
      Edit: 'vendor_settings:edit' as const,
    },
  },
} as const;

/**
 * نوع الصلاحية من MenuPermissions
 */
export type MenuPermission = 
  | typeof MenuPermissions.Dashboard.View
  | typeof MenuPermissions.Dashboard.Statistics.View
  | typeof MenuPermissions.Shipments.View
  | typeof MenuPermissions.Shipments.Create
  | typeof MenuPermissions.Expenses.View
  | typeof MenuPermissions.Warehouses.View
  | typeof MenuPermissions.Suppliers.View
  | typeof MenuPermissions.Accounting.Accounts.View
  | typeof MenuPermissions.Accounting.Journals.View
  | typeof MenuPermissions.MasterData.Items.View
  | typeof MenuPermissions.Users.View
  | typeof MenuPermissions.Roles.View
  | typeof MenuPermissions.System.Companies.View
  | typeof MenuPermissions.System.AuditLogs.View
  | typeof MenuPermissions.Notifications.View
  | string; // للتوافق مع الصلاحيات القديمة

export default MenuPermissions;
