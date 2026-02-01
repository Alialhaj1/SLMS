/**
 * INVOICE FORM STATE ENGINE
 * Purpose: Centralized state management for purchase invoice
 * Architecture: Business logic + validation + derived calculations
 * 
 * Business Rules Implementation:
 * - Invoice type controls behavior (inventory/customs/warehouse requirements)
 * - Currency changes trigger exchange rate updates
 * - Due date calculated from payment terms
 * - Totals auto-calculated from items
 * - Locking prevents edits after posting
 * - Approval workflow integration
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { InvoiceType } from './useInvoiceMasterData';

// =============================================
// INTERFACES
// =============================================

export interface InvoiceItem {
  id?: number;
  temp_id?: string;
  item_id: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  item_type: 'stock' | 'service' | 'expense';
  
  // Quantity
  quantity: number;
  bonus_quantity: number;
  uom_id: number;
  uom_code: string;
  uom_name?: string;
  
  // Pricing
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  
  // Tax
  tax_rate_id?: number;
  tax_percent: number;
  tax_amount: number;
  
  // Line total
  line_total: number;
  
  // Allocation (from expenses)
  allocated_expenses: number;
  landed_cost_per_unit: number;
  
  // Stock items only
  warehouse_id?: number;
  warehouse_code?: string;
  warehouse_name?: string;
  
  // Costing
  cost_center_id?: number;
  cost_center_code?: string;
  project_id?: number;
  project_code?: string;
  
  // Notes
  notes?: string;
}

export interface InvoiceExpense {
  id?: number;
  temp_id?: string;
  expense_type_id: number;
  expense_type_code: string;
  expense_type_name: string;
  expense_type_name_ar?: string;
  
  amount: number;
  currency_id?: number;
  exchange_rate: number;
  base_amount: number;
  
  distribution_base: 'quantity' | 'value' | 'weight' | 'volume' | 'manual';
  is_distributed: boolean;
  
  vendor_id?: number;
  reference_number?: string;
  notes?: string;
}

export interface InvoiceFormData {
  // Header
  id?: number;
  invoice_number: string;
  vendor_id: number | null;
  vendor_invoice_number: string;
  vendor_invoice_date: string;
  
  // Dates
  invoice_date: string;
  posting_date: string;
  due_date: string;
  
  // Type & Classification
  invoice_type_id: number | null;
  invoice_type_code?: string;
  
  // Financial
  currency_id: number | null;
  exchange_rate: number;
  payment_term_id: number | null;
  
  // Costing
  cost_center_id: number | null;
  project_id: number | null;
  default_warehouse_id: number | null;
  
  // Payment
  payment_method_id: number | null;
  bank_account_id: number | null;
  cash_box_id: number | null;
  cheque_number: string;
  cheque_date: string;
  expected_payment_date: string;
  
  // Withholding Tax
  withholding_tax_rate: number;
  withholding_tax_amount: number;
  
  // Description
  description: string;
  internal_notes: string;
  
  // Lines
  items: InvoiceItem[];
  expenses: InvoiceExpense[];
  
  // Totals (calculated)
  subtotal: number;
  total_discount: number;
  total_tax: number;
  total_expenses: number;
  total_amount: number;
  
  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed';
  approval_status: string;
  is_posted: boolean;
  is_locked: boolean;
  is_reversed: boolean;
  
  // Audit
  posted_at?: string;
  posted_by?: number;
  approved_at?: string;
  approved_by?: number;
}

export interface ValidationErrors {
  vendor_id?: string;
  vendor_invoice_number?: string;
  invoice_type_id?: string;
  currency_id?: string;
  items?: string;
  [key: string]: string | undefined;
}

// =============================================
// HOOK
// =============================================

interface UseInvoiceFormOptions {
  initialData?: Partial<InvoiceFormData>;
  invoiceType?: InvoiceType | null;
  onInvoiceTypeChange?: (typeId: number) => void;
}

export const useInvoiceForm = ({
  initialData,
  invoiceType,
  onInvoiceTypeChange,
}: UseInvoiceFormOptions = {}) => {
  
  const getTodayDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Helper to convert ISO date to yyyy-MM-dd
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };
  
  // Normalize initialData dates
  const normalizedInitialData = initialData ? {
    ...initialData,
    invoice_date: formatDateForInput(initialData.invoice_date) || getTodayDate(),
    posting_date: formatDateForInput(initialData.posting_date) || getTodayDate(),
    due_date: formatDateForInput(initialData.due_date) || getTodayDate(),
    vendor_invoice_date: formatDateForInput(initialData.vendor_invoice_date) || getTodayDate(),
    cheque_date: formatDateForInput(initialData.cheque_date),
    expected_payment_date: formatDateForInput(initialData.expected_payment_date),
  } : {};
  
  // =============================================
  // FORM STATE
  // =============================================
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: '',
    vendor_id: null,
    vendor_invoice_number: '',
    vendor_invoice_date: getTodayDate(),
    
    invoice_date: getTodayDate(),
    posting_date: getTodayDate(),
    due_date: getTodayDate(),
    
    invoice_type_id: null,
    invoice_type_code: undefined,
    
    currency_id: null,
    exchange_rate: 1.0,
    payment_term_id: null,
    
    cost_center_id: null,
    project_id: null,
    default_warehouse_id: null,
    
    payment_method_id: null,
    bank_account_id: null,
    cash_box_id: null,
    cheque_number: '',
    cheque_date: '',
    expected_payment_date: '',
    
    withholding_tax_rate: 0,
    withholding_tax_amount: 0,
    
    description: '',
    internal_notes: '',
    
    items: [],
    expenses: [],
    
    subtotal: 0,
    total_discount: 0,
    total_tax: 0,
    total_expenses: 0,
    total_amount: 0,
    
    status: 'draft',
    approval_status: 'not_required',
    is_posted: false,
    is_locked: false,
    is_reversed: false,
    
    ...normalizedInitialData,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // =============================================
  // DERIVED STATE - Invoice Type Rules
  // =============================================
  const invoiceTypeRules = useMemo(() => {
    if (!invoiceType) {
      return {
        requiresWarehouse: false,
        affectsInventory: false,
        requiresCustoms: false,
        allowsServices: false,
        requiresApproval: false,
      };
    }

    return {
      requiresWarehouse: invoiceType.requires_warehouse,
      affectsInventory: invoiceType.affects_inventory,
      requiresCustoms: invoiceType.requires_customs,
      allowsServices: invoiceType.allows_services,
      requiresApproval: invoiceType.requires_approval,
    };
  }, [invoiceType]);

  // =============================================
  // LOCKING RULES
  // =============================================
  const isLocked = useMemo(() => {
    return formData.is_posted || formData.is_locked || formData.status === 'posted';
  }, [formData.is_posted, formData.is_locked, formData.status]);

  const canEdit = useMemo(() => {
    return !isLocked && formData.status !== 'reversed';
  }, [isLocked, formData.status]);

  const canPost = useMemo(() => {
    return (
      !isLocked &&
      formData.status === 'approved' &&
      formData.items.length > 0
    );
  }, [isLocked, formData.status, formData.items.length]);

  const canApprove = useMemo(() => {
    return (
      !isLocked &&
      formData.status === 'pending_approval' &&
      formData.items.length > 0
    );
  }, [isLocked, formData.status, formData.items.length]);

  // =============================================
  // CALCULATED TOTALS
  // =============================================
  useEffect(() => {
    const items = formData.items;
    
    // Subtotal (before discount and tax)
    const subtotal = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
    
    // Total discount
    const total_discount = items.reduce((sum, item) => 
      sum + item.discount_amount, 0
    );
    
    // Total tax
    const total_tax = items.reduce((sum, item) => 
      sum + item.tax_amount, 0
    );
    
    // Total expenses
    const total_expenses = formData.expenses.reduce((sum, exp) => 
      sum + exp.base_amount, 0
    );
    
    // Total amount
    const total_amount = subtotal - total_discount + total_tax;
    
    // Withholding tax
    const withholding_tax_amount = total_amount * (formData.withholding_tax_rate / 100);
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total_discount,
      total_tax,
      total_expenses,
      total_amount,
      withholding_tax_amount,
    }));
  }, [formData.items, formData.expenses, formData.withholding_tax_rate]);

  // =============================================
  // DUE DATE CALCULATION (from payment terms)
  // =============================================
  const calculateDueDate = useCallback((invoiceDate: string, dueDays: number) => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + dueDays);
    return date.toISOString().split('T')[0];
  }, []);

  // =============================================
  // VALIDATION
  // =============================================
  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    // Vendor required
    if (!formData.vendor_id) {
      newErrors.vendor_id = 'Vendor is required';
    }

    // Vendor invoice number required
    if (!formData.vendor_invoice_number) {
      newErrors.vendor_invoice_number = 'Vendor invoice number is required';
    }

    // Invoice type required
    if (!formData.invoice_type_id) {
      newErrors.invoice_type_id = 'Invoice type is required';
    }

    // Currency required
    if (!formData.currency_id) {
      newErrors.currency_id = 'Currency is required';
    }

    // Items required
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    // Warehouse required for stock items (if invoice type affects inventory)
    if (invoiceTypeRules.affectsInventory) {
      const stockItemsWithoutWarehouse = formData.items.filter(
        item => item.item_type === 'stock' && !item.warehouse_id
      );
      if (stockItemsWithoutWarehouse.length > 0) {
        newErrors.items = 'Warehouse is required for all stock items';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, invoiceTypeRules]);

  // =============================================
  // FIELD UPDATES
  // =============================================
  const updateField = useCallback((field: keyof InvoiceFormData, value: any) => {
    if (!canEdit) return;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => new Set(prev).add(field));
  }, [canEdit]);

  const updateItem = useCallback((index: number, updates: Partial<InvoiceItem>) => {
    if (!canEdit) return;
    
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], ...updates };
      
      // Recalculate line total
      const item = newItems[index];
      const lineSubtotal = item.quantity * item.unit_price;
      const discountAmount = lineSubtotal * (item.discount_percent / 100);
      const afterDiscount = lineSubtotal - discountAmount;
      const taxAmount = afterDiscount * (item.tax_percent / 100);
      const lineTotal = afterDiscount + taxAmount;
      
      newItems[index] = {
        ...newItems[index],
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        line_total: lineTotal,
      };
      
      return { ...prev, items: newItems };
    });
  }, [canEdit]);

  const addItem = useCallback((item: InvoiceItem) => {
    if (!canEdit) return;
    
    // Calculate line total
    const lineSubtotal = item.quantity * item.unit_price;
    const discountAmount = lineSubtotal * (item.discount_percent / 100);
    const afterDiscount = lineSubtotal - discountAmount;
    const taxAmount = afterDiscount * (item.tax_percent / 100);
    const lineTotal = afterDiscount + taxAmount;
    
    const newItem: InvoiceItem = {
      ...item,
      temp_id: Math.random().toString(36).substr(2, 9),
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      line_total: lineTotal,
      allocated_expenses: 0,
      landed_cost_per_unit: item.unit_price,
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, [canEdit]);

  const removeItem = useCallback((index: number) => {
    if (!canEdit) return;
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, [canEdit]);

  const addExpense = useCallback((expense: InvoiceExpense) => {
    if (!canEdit) return;
    
    const newExpense: InvoiceExpense = {
      ...expense,
      temp_id: Math.random().toString(36).substr(2, 9),
      base_amount: expense.amount * expense.exchange_rate,
      is_distributed: false,
    };
    
    setFormData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense],
    }));
  }, [canEdit]);

  const removeExpense = useCallback((index: number) => {
    if (!canEdit) return;
    
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index),
    }));
  }, [canEdit]);

  const updateExpense = useCallback((index: number, updates: Partial<InvoiceExpense>) => {
    if (!canEdit) return;
    
    setFormData(prev => {
      const newExpenses = [...prev.expenses];
      const expense = { ...newExpenses[index], ...updates };
      
      // Recalculate base_amount if amount or exchange_rate changed
      if (updates.amount !== undefined || updates.exchange_rate !== undefined) {
        expense.base_amount = expense.amount * expense.exchange_rate;
      }
      
      newExpenses[index] = expense;
      return { ...prev, expenses: newExpenses };
    });
  }, [canEdit]);

  // =============================================
  // RESET
  // =============================================
  const reset = useCallback(() => {
    setFormData({
      invoice_number: '',
      vendor_id: null,
      vendor_invoice_number: '',
      vendor_invoice_date: getTodayDate(),
      invoice_date: getTodayDate(),
      posting_date: getTodayDate(),
      due_date: getTodayDate(),
      invoice_type_id: null,
      currency_id: null,
      exchange_rate: 1.0,
      payment_term_id: null,
      cost_center_id: null,
      project_id: null,
      default_warehouse_id: null,
      payment_method_id: null,
      bank_account_id: null,
      cash_box_id: null,
      cheque_number: '',
      cheque_date: '',
      expected_payment_date: '',
      withholding_tax_rate: 0,
      withholding_tax_amount: 0,
      description: '',
      internal_notes: '',
      items: [],
      expenses: [],
      subtotal: 0,
      total_discount: 0,
      total_tax: 0,
      total_expenses: 0,
      total_amount: 0,
      status: 'draft',
      approval_status: 'not_required',
      is_posted: false,
      is_locked: false,
      is_reversed: false,
    });
    setErrors({});
    setTouched(new Set());
  }, []);

  return {
    formData,
    setFormData,
    errors,
    touched,
    invoiceTypeRules,
    isLocked,
    canEdit,
    canPost,
    canApprove,
    validate,
    updateField,
    updateItem,
    addItem,
    removeItem,
    addExpense,
    updateExpense,
    removeExpense,
    calculateDueDate,
    reset,
  };
};
