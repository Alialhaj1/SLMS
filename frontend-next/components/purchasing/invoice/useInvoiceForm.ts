/**
 * 🪝 USE INVOICE FORM HOOK
 * ========================
 * Centralized state management for Purchase Invoice form
 */

import { useState, useEffect, useCallback } from 'react';
import type { 
  InvoiceFormData, 
  InvoiceItem, 
  InvoiceExpense,
  VendorRef,
  PaymentTermRef,
  PurchaseOrderRef,
  QuotationRef,
  TabKey 
} from './types';
import { INITIAL_FORM_DATA } from './types';

interface UseInvoiceFormOptions {
  isOpen: boolean;
  initialData?: Partial<InvoiceFormData>;
  companyId: number;
}

interface UseInvoiceFormReturn {
  // State
  formData: InvoiceFormData;
  activeTab: TabKey;
  vendors: VendorRef[];
  vendorSearch: string;
  filteredVendors: VendorRef[];
  paymentTerms: PaymentTermRef[];
  purchaseOrders: PurchaseOrderRef[];
  quotations: QuotationRef[];
  loadingRefs: boolean;
  newItem: Partial<InvoiceItem>;
  
  // Tab Actions
  setActiveTab: (tab: TabKey) => void;
  
  // Form Actions
  updateFormData: (updates: Partial<InvoiceFormData>) => void;
  setVendorSearch: (search: string) => void;
  
  // Item Actions
  setNewItem: (item: Partial<InvoiceItem>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  
  // Expense Actions
  updateExpenses: (items: InvoiceItem[], expenses: InvoiceExpense[]) => void;
  
  // Validation
  validate: () => { isValid: boolean; errors: string[] };
  
  // Submit
  getSubmitData: () => InvoiceFormData;
}

export function useInvoiceForm({ 
  isOpen, 
  initialData, 
  companyId 
}: UseInvoiceFormOptions): UseInvoiceFormReturn {
  
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [formData, setFormData] = useState<InvoiceFormData>(INITIAL_FORM_DATA);
  
  // Reference Data
  const [vendors, setVendors] = useState<VendorRef[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermRef[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRef[]>([]);
  const [quotations, setQuotations] = useState<QuotationRef[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  
  // New Item State
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({
    quantity: 1,
    bonus_quantity: 0,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 15
  });
  
  // ═══════════════════════════════════════════════════════════════
  // FILTERED DATA
  // ═══════════════════════════════════════════════════════════════
  
  const filteredVendors = vendors.filter(v => {
    if (!vendorSearch) return true;
    const search = vendorSearch.toLowerCase();
    const name = (v.name_ar || v.name).toLowerCase();
    const code = (v.code || '').toLowerCase();
    return name.includes(search) || code.includes(search);
  });
  
  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════
  
  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      fetchReferenceData();
      if (initialData?.id) {
        setFormData({
          ...INITIAL_FORM_DATA,
          ...initialData,
          items: initialData.items || [],
          expenses: initialData.expenses || []
        } as InvoiceFormData);
      } else {
        setFormData(INITIAL_FORM_DATA);
        fetchNextInvoiceNumber();
      }
    }
  }, [isOpen, initialData]);
  
  // Fetch POs when vendor changes
  useEffect(() => {
    if (formData.vendor_id && isOpen) {
      fetchVendorDocuments(Number(formData.vendor_id));
    }
  }, [formData.vendor_id, isOpen]);
  
  // Recalculate totals when items change
  useEffect(() => {
    const items = formData.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const totalTax = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const total = subtotal - totalDiscount + totalTax;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: totalTax,
      total_amount: total
    }));
  }, [formData.items]);
  
  // ═══════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════
  
  const fetchReferenceData = async () => {
    setLoadingRefs(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` };
      const [vendorsRes, termsRes] = await Promise.all([
        fetch('http://localhost:4000/api/procurement/vendors', { headers }),
        fetch('http://localhost:4000/api/procurement/vendors/payment-terms', { headers })
      ]);
      
      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        setVendors(data.data || []);
      }
      if (termsRes.ok) {
        const data = await termsRes.json();
        setPaymentTerms(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reference data', err);
    } finally {
      setLoadingRefs(false);
    }
  };
  
  const fetchNextInvoiceNumber = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/procurement/invoices/next-number', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({
          ...prev,
          invoice_number: result.data?.invoice_number || ''
        }));
      }
    } catch (err) {
      console.error('Failed to fetch next invoice number:', err);
    }
  };
  
  const fetchVendorDocuments = async (vendorId: number) => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` };
      const res = await fetch(
        `http://localhost:4000/api/procurement/purchase-orders?company_id=${companyId}&vendor_id=${vendorId}&status=approved`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch POs', err);
    }
  };
  
  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════
  
  const updateFormData = useCallback((updates: Partial<InvoiceFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);
  
  const addItem = useCallback(() => {
    if (!newItem.item_id) return;
    
    const qty = newItem.quantity || 0;
    const price = newItem.unit_price || 0;
    const discountPct = newItem.discount_percent || 0;
    
    const baseTotal = qty * price;
    const discountAmt = baseTotal * (discountPct / 100);
    const afterDiscount = baseTotal - discountAmt;
    
    // No VAT on import usually
    const taxPct = formData.invoice_type === 'local' ? (newItem.tax_percent || 0) : 0;
    const taxAmt = afterDiscount * (taxPct / 100);
    
    const itemToAdd: InvoiceItem = {
      ...newItem as InvoiceItem,
      warehouse_id: newItem.warehouse_id || formData.default_warehouse_id || 1,
      temp_id: Math.random().toString(36).substr(2, 9),
      discount_amount: discountAmt,
      tax_amount: taxAmt,
      line_total: afterDiscount + taxAmt,
      bonus_quantity: newItem.bonus_quantity || 0
    };
    
    setFormData(prev => ({ ...prev, items: [...prev.items, itemToAdd] }));
    setNewItem({
      quantity: 1,
      bonus_quantity: 0,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 15,
      item_id: 0,
      item_code: '',
      item_name: ''
    });
  }, [newItem, formData.invoice_type, formData.default_warehouse_id]);
  
  const removeItem = useCallback((index: number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  }, []);
  
  const updateExpenses = useCallback((items: InvoiceItem[], expenses: InvoiceExpense[]) => {
    setFormData(prev => ({ ...prev, items, expenses }));
  }, []);
  
  // ═══════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════
  
  const validate = useCallback(() => {
    const errors: string[] = [];
    
    if (!formData.vendor_id) {
      errors.push('Please select a vendor');
    }
    if (formData.items.length === 0) {
      errors.push('Please add at least one item');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData.vendor_id, formData.items.length]);
  
  // ═══════════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════════
  
  const getSubmitData = useCallback(() => {
    return formData;
  }, [formData]);
  
  // ═══════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════
  
  return {
    formData,
    activeTab,
    vendors,
    vendorSearch,
    filteredVendors,
    paymentTerms,
    purchaseOrders,
    quotations,
    loadingRefs,
    newItem,
    
    setActiveTab,
    updateFormData,
    setVendorSearch,
    setNewItem,
    addItem,
    removeItem,
    updateExpenses,
    validate,
    getSubmitData
  };
}
