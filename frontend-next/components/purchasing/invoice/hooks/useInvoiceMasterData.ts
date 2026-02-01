/**
 * MASTER DATA HOOK - Invoice Master Data Engine
 * Purpose: Centralized data fetching for ALL invoice dropdowns
 * Architecture: Single source of truth with caching and error isolation
 * 
 * Business Rules:
 * - All dropdowns are API-driven (no hardcoded enums)
 * - Data cached per session to avoid redundant calls
 * - Each dataset has independent loading/error states
 * - Company-scoped by default
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================
// INTERFACES - Matching Backend Schema
// =============================================

export interface InvoiceType {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  affects_inventory: boolean;
  requires_customs: boolean;
  requires_goods_receipt: boolean;
  allows_services: boolean;
  requires_warehouse: boolean;
  requires_approval: boolean;
  color: string;
  icon: string;
  is_active: boolean;
  is_default: boolean;
}

export interface ExpenseType {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  distribution_base: 'quantity' | 'value' | 'weight' | 'volume' | 'manual';
  affects_landed_cost: boolean;
  is_taxable: boolean;
  category: string;
  color: string;
  is_active: boolean;
}

export interface Currency {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  symbol: string;
  exchange_rate?: number;
  is_base_currency?: boolean;
}

export interface PaymentTerm {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  due_days: number;
  discount_days?: number;
  discount_percent?: number;
  is_default: boolean;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  payment_type: string; // 'CASH' | 'BANK' | 'CHEQUE'
  requires_bank_account: boolean;
  requires_cheque_details: boolean;
}

export interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  bank_id: number;
  bank_name?: string;
  currency_id: number;
  is_active: boolean;
}

export interface CashBox {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  currency_id: number;
  is_active: boolean;
}

export interface CostCenter {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  level: number;
  is_active: boolean;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  status: string;
  is_active: boolean;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  warehouse_type: string;
  is_active: boolean;
}

export interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  vendor_category_id: number;
  payment_term_id?: number;
  currency_id?: number;
  is_active: boolean;
}

export interface Tax {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  vat_rate: number;
  customs_rate?: number;
  excise_rate?: number;
  withholding_rate?: number;
  applies_to?: 'sales' | 'purchases' | 'both';
  is_zero_rated?: boolean;
  is_exempt?: boolean;
  is_active: boolean;
}

export interface ItemUOM {
  id: number | null;
  uom_id: number;
  uom_code: string;
  uom_name: string;
  conversion_factor: number;
  is_base_uom: boolean;
  is_purchase_uom: boolean;
  default_purchase_price?: number;
}

export interface MasterItem {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  item_type: 'stock' | 'service' | 'expense';
  category_id?: number;
  category_name?: string;
  base_uom_id: number;
  base_uom_code: string;
  base_uom_name: string;
  purchase_price?: number;
  selling_price?: number;
  stock_quantity?: number;
  tax_rate_id?: number;
  default_tax_rate?: number;
  is_active: boolean;
  uoms?: ItemUOM[];
}

// =============================================
// HOOK STATE INTERFACE
// =============================================
export interface InvoiceMasterData {
  invoiceTypes: InvoiceType[];
  expenseTypes: ExpenseType[];
  currencies: Currency[];
  paymentTerms: PaymentTerm[];
  paymentMethods: PaymentMethod[];
  bankAccounts: BankAccount[];
  cashBoxes: CashBox[];
  costCenters: CostCenter[];
  projects: Project[];
  warehouses: Warehouse[];
  vendors: Vendor[];
  taxes: Tax[];
  items: MasterItem[];
  
  // Loading states
  loading: {
    invoiceTypes: boolean;
    expenseTypes: boolean;
    currencies: boolean;
    paymentTerms: boolean;
    paymentMethods: boolean;
    bankAccounts: boolean;
    cashBoxes: boolean;
    costCenters: boolean;
    projects: boolean;
    warehouses: boolean;
    vendors: boolean;
    taxes: boolean;
    items: boolean;
  };
  
  // Error states
  errors: {
    invoiceTypes?: string;
    expenseTypes?: string;
    currencies?: string;
    paymentTerms?: string;
    paymentMethods?: string;
    bankAccounts?: string;
    cashBoxes?: string;
    costCenters?: string;
    projects?: string;
    warehouses?: string;
    vendors?: string;
    taxes?: string;
    items?: string;
  };
  
  // Utility functions
  getInvoiceTypeByCode: (code: string) => InvoiceType | undefined;
  getDefaultInvoiceType: () => InvoiceType | undefined;
  getDefaultCurrency: () => Currency | undefined;
  getDefaultPaymentTerm: () => PaymentTerm | undefined;
  getDefaultTax: () => Tax | undefined;
  refetch: (key: keyof InvoiceMasterData['loading']) => Promise<void>;
  fetchItems: (search?: string) => Promise<void>;
}

// =============================================
// CUSTOM HOOK
// =============================================
export const useInvoiceMasterData = (companyId: number): InvoiceMasterData => {
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);

  const [loading, setLoading] = useState({
    invoiceTypes: false,
    expenseTypes: false,
    currencies: false,
    paymentTerms: false,
    paymentMethods: false,
    bankAccounts: false,
    cashBoxes: false,
    costCenters: false,
    projects: false,
    warehouses: false,
    vendors: false,
    taxes: false,
    items: false,
  });

  const [errors, setErrors] = useState<InvoiceMasterData['errors']>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}` };

  // =============================================
  // FETCH FUNCTIONS
  // =============================================
  
  const fetchInvoiceTypes = useCallback(async () => {
    setLoading(prev => ({ ...prev, invoiceTypes: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/procurement/invoice-types?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch invoice types');
      const data = await res.json();
      setInvoiceTypes(data.data || []);
      setErrors(prev => ({ ...prev, invoiceTypes: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, invoiceTypes: err.message }));
      console.error('Error fetching invoice types:', err);
    } finally {
      setLoading(prev => ({ ...prev, invoiceTypes: false }));
    }
  }, [companyId, token]);

  const fetchExpenseTypes = useCallback(async () => {
    setLoading(prev => ({ ...prev, expenseTypes: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/procurement/expense-types?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch expense types');
      const data = await res.json();
      setExpenseTypes(data.data || []);
      setErrors(prev => ({ ...prev, expenseTypes: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, expenseTypes: err.message }));
      console.error('Error fetching expense types:', err);
    } finally {
      setLoading(prev => ({ ...prev, expenseTypes: false }));
    }
  }, [companyId, token]);

  const fetchCurrencies = useCallback(async () => {
    setLoading(prev => ({ ...prev, currencies: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/finance/currencies?company_id=${companyId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch currencies');
      const data = await res.json();
      setCurrencies(data.data || []);
      setErrors(prev => ({ ...prev, currencies: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, currencies: err.message }));
      console.error('Error fetching currencies:', err);
    } finally {
      setLoading(prev => ({ ...prev, currencies: false }));
    }
  }, [companyId, token]);

  const fetchPaymentTerms = useCallback(async () => {
    setLoading(prev => ({ ...prev, paymentTerms: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/finance/payment-terms?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch payment terms');
      const data = await res.json();
      setPaymentTerms(data.data || []);
      setErrors(prev => ({ ...prev, paymentTerms: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, paymentTerms: err.message }));
      console.error('Error fetching payment terms:', err);
    } finally {
      setLoading(prev => ({ ...prev, paymentTerms: false }));
    }
  }, [companyId, token]);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(prev => ({ ...prev, paymentMethods: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/finance/payment-methods?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch payment methods');
      const data = await res.json();
      setPaymentMethods(data.data || []);
      setErrors(prev => ({ ...prev, paymentMethods: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, paymentMethods: err.message }));
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoading(prev => ({ ...prev, paymentMethods: false }));
    }
  }, [companyId, token]);

  const fetchBankAccounts = useCallback(async () => {
    setLoading(prev => ({ ...prev, bankAccounts: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/finance/bank-accounts?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch bank accounts');
      const data = await res.json();
      setBankAccounts(data.data || []);
      setErrors(prev => ({ ...prev, bankAccounts: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, bankAccounts: err.message }));
      console.error('Error fetching bank accounts:', err);
    } finally {
      setLoading(prev => ({ ...prev, bankAccounts: false }));
    }
  }, [companyId, token]);

  const fetchCashBoxes = useCallback(async () => {
    setLoading(prev => ({ ...prev, cashBoxes: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/finance/cash-boxes?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch cash boxes');
      const data = await res.json();
      setCashBoxes(data.data || []);
      setErrors(prev => ({ ...prev, cashBoxes: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, cashBoxes: err.message }));
      console.error('Error fetching cash boxes:', err);
    } finally {
      setLoading(prev => ({ ...prev, cashBoxes: false }));
    }
  }, [companyId, token]);

  const fetchCostCenters = useCallback(async () => {
    setLoading(prev => ({ ...prev, costCenters: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/finance/cost-centers?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch cost centers');
      const data = await res.json();
      setCostCenters(data.data || []);
      setErrors(prev => ({ ...prev, costCenters: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, costCenters: err.message }));
      console.error('Error fetching cost centers:', err);
    } finally {
      setLoading(prev => ({ ...prev, costCenters: false }));
    }
  }, [companyId, token]);

  const fetchProjects = useCallback(async () => {
    setLoading(prev => ({ ...prev, projects: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/finance/projects?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data.data || []);
      setErrors(prev => ({ ...prev, projects: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, projects: err.message }));
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  }, [companyId, token]);

  const fetchWarehouses = useCallback(async () => {
    setLoading(prev => ({ ...prev, warehouses: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/inventory/warehouses?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch warehouses');
      const data = await res.json();
      setWarehouses(data.data || []);
      setErrors(prev => ({ ...prev, warehouses: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, warehouses: err.message }));
      console.error('Error fetching warehouses:', err);
    } finally {
      setLoading(prev => ({ ...prev, warehouses: false }));
    }
  }, [companyId, token]);

  const fetchVendors = useCallback(async () => {
    setLoading(prev => ({ ...prev, vendors: true }));
    try {
      // Request 500 vendors for dropdown (no pagination for dropdowns)
      const res = await fetch(`http://localhost:4000/api/procurement/vendors?company_id=${companyId}&is_active=true&limit=500`, { headers });
      if (!res.ok) throw new Error('Failed to fetch vendors');
      const data = await res.json();
      setVendors(data.data || []);
      setErrors(prev => ({ ...prev, vendors: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, vendors: err.message }));
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(prev => ({ ...prev, vendors: false }));
    }
  }, [companyId, token]);

  const fetchTaxes = useCallback(async () => {
    setLoading(prev => ({ ...prev, taxes: true }));
    try {
      // Use tax-codes endpoint which has the actual tax data
      const res = await fetch(`http://localhost:4000/api/tax-codes?company_id=${companyId}&is_active=true`, { headers });
      if (!res.ok) throw new Error('Failed to fetch taxes');
      const data = await res.json();
      setTaxes(data.data || []);
      setErrors(prev => ({ ...prev, taxes: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, taxes: err.message }));
      console.error('Error fetching taxes:', err);
    } finally {
      setLoading(prev => ({ ...prev, taxes: false }));
    }
  }, [companyId, token]);

  // Fetch items with optional search (for dropdown with UOMs)
  const fetchItems = useCallback(async (search?: string) => {
    setLoading(prev => ({ ...prev, items: true }));
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await fetch(
        `http://localhost:4000/api/master/items/for-invoice?company_id=${companyId}&is_active=true${searchParam}`, 
        { headers }
      );
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data.data || []);
      setErrors(prev => ({ ...prev, items: undefined }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, items: err.message }));
      console.error('Error fetching items:', err);
    } finally {
      setLoading(prev => ({ ...prev, items: false }));
    }
  }, [companyId, token]);

  // =============================================
  // INITIAL LOAD - Parallel Fetching
  // =============================================
  useEffect(() => {
    if (!companyId || !token) return;

    Promise.all([
      fetchInvoiceTypes(),
      fetchExpenseTypes(),
      fetchCurrencies(),
      fetchPaymentTerms(),
      fetchPaymentMethods(),
      fetchBankAccounts(),
      fetchCashBoxes(),
      fetchCostCenters(),
      fetchProjects(),
      fetchWarehouses(),
      fetchVendors(),
      fetchTaxes(),
      fetchItems(), // Load items with UOMs for invoice
    ]);
  }, [companyId, token]);

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================
  const getInvoiceTypeByCode = useCallback(
    (code: string) => invoiceTypes.find(t => t.code === code),
    [invoiceTypes]
  );

  const getDefaultInvoiceType = useCallback(
    () => invoiceTypes.find(t => t.is_default) || invoiceTypes[0],
    [invoiceTypes]
  );

  const getDefaultCurrency = useCallback(
    () => currencies.find(c => c.code === 'SAR') || currencies[0],
    [currencies]
  );

  const getDefaultPaymentTerm = useCallback(
    () => paymentTerms.find(t => t.is_default) || paymentTerms[0],
    [paymentTerms]
  );

  const getDefaultTax = useCallback(
    // Standard rate (S) is the default tax for purchases
    () => taxes.find(t => t.code === 'S') || taxes.find(t => t.vat_rate > 0) || taxes[0],
    [taxes]
  );

  const refetch = useCallback(async (key: keyof InvoiceMasterData['loading']) => {
    const fetchMap: Record<string, () => Promise<void>> = {
      invoiceTypes: fetchInvoiceTypes,
      expenseTypes: fetchExpenseTypes,
      currencies: fetchCurrencies,
      paymentTerms: fetchPaymentTerms,
      paymentMethods: fetchPaymentMethods,
      bankAccounts: fetchBankAccounts,
      cashBoxes: fetchCashBoxes,
      costCenters: fetchCostCenters,
      projects: fetchProjects,
      warehouses: fetchWarehouses,
      vendors: fetchVendors,
      taxes: fetchTaxes,
      items: fetchItems,
    };
    
    await fetchMap[key]?.();
  }, [
    fetchInvoiceTypes,
    fetchExpenseTypes,
    fetchCurrencies,
    fetchPaymentTerms,
    fetchPaymentMethods,
    fetchBankAccounts,
    fetchCashBoxes,
    fetchCostCenters,
    fetchProjects,
    fetchWarehouses,
    fetchVendors,
    fetchTaxes,
    fetchItems,
  ]);

  return {
    invoiceTypes,
    expenseTypes,
    currencies,
    paymentTerms,
    paymentMethods,
    bankAccounts,
    cashBoxes,
    costCenters,
    projects,
    warehouses,
    vendors,
    taxes,
    items,
    loading,
    errors,
    getInvoiceTypeByCode,
    getDefaultInvoiceType,
    getDefaultCurrency,
    getDefaultPaymentTerm,
    getDefaultTax,
    refetch,
    fetchItems,
  };
};
