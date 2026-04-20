/**
 * Vendor Payment Creation Page - Enhanced Version
 * Features:
 * - Full vendor search
 * - Payment source selection (PO, Shipment, Quotation, Invoice)
 * - Dynamic document loading per vendor
 * - Document details with items display
 * - Payment method cascading (cash->boxes, bank->accounts, check->cheques, LC->LCs)
 * - Auto-generated description
 * - Amount in words
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import { useLocale } from '../../../contexts/LocaleContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import ExchangeRateField from '../../../components/ui/ExchangeRateField';
import { companyStore } from '../../../lib/companyStore';

// Interfaces
interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  currency_id?: number;
  currency_code?: string;
  payment_terms?: string;
}

interface Currency {
  id: number;
  code: string;
  symbol: string;
  name: string;
}

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  payment_type: string;
  is_default: boolean;
}

interface CashBox {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  currency_code: string;
  is_default: boolean;
}

interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  bank_name: string;
  currency_code: string;
  is_default: boolean;
}

interface LetterOfCredit {
  id: number;
  lc_number: string;
  current_amount: number;
  available_amount: number;
  currency_code: string;
  bank_name: string;
  vendor_id: number;
  vendor_name: string;
}

interface Document {
  id: number;
  document_number: string;
  document_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  currency_id: number;
  currency_code: string;
  currency_symbol?: string;
  status: string;
  project_id?: number;
  project_code?: string;
  project_name?: string;
  bl_no?: string;
  due_date?: string;
  days_overdue?: number;
}

interface DocumentItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  uom_code: string;
}

interface DocumentDetails extends Document {
  items: DocumentItem[];
  notes?: string;
  // Payment method from source document
  document_payment_method?: string; // 'cash' | 'bank' | 'check' | 'wire' | null
  document_payment_method_code?: string; // 'CASH' | 'BANK-TRF' | 'LC' | 'CHECK' | 'WIRE' | null
  document_exchange_rate?: number;
  payment_terms_code?: string;
  payment_terms_name?: string;
  payment_terms_name_ar?: string;
  // Shipment-specific
  shipment_payment_method?: string;
  shipment_lc_number?: string;
  purchase_order_id?: number;
  po_paid_amount?: number;
  po_total_amount?: number;
  po_number?: string;
  // LC linkage
  is_lc_payment?: boolean;
  lc_payment_blocked?: boolean;
  lc_payment_message_ar?: string;
  lc_payment_message_en?: string;
  linked_lc?: {
    id: number;
    lc_number: string;
    current_amount: number;
    utilized_amount: number;
    available_amount: number;
    currency_id: number;
    lc_currency_code: string;
    issuing_bank_name: string;
    lc_status: string;
  };
  // Cross-document payment tracking
  cross_document_payments?: Array<{
    id: number;
    payment_number: string;
    payment_amount: number;
    payment_date: string;
    source_type: string;
    currency_code: string;
    source_document_number: string;
  }>;
  cross_document_total?: number;
  // Same-document payment history
  same_document_payments?: Array<{
    id: number;
    payment_number: string;
    payment_amount: number;
    payment_date: string;
    status: string;
    reference_number?: string;
    notes?: string;
    currency_code: string;
    payment_method?: string;
    bank_name?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    cash_box_name?: string;
  }>;
  same_document_payment_count?: number;
  payment_percentage_paid?: number;
}

type SourceType = 'po' | 'shipment' | 'quotation' | 'invoice' | '';

export default function NewVendorPaymentPage() {
  const router = useRouter();
  const { vendor_id: queryVendorId, from, return_url } = router.query;
  const fromVendor = from === 'vendor';
  const returnUrl = return_url ? String(return_url) : null;
  
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  // Form state
  const [formData, setFormData] = useState({
    vendor_id: '',
    source_type: '' as SourceType,
    document_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    payment_method_type: '',
    bank_account_id: '',
    cash_box_id: '',
    lc_id: '',
    reference_number: '',
    currency_id: '',
    payment_amount: '',
    payment_percentage: '100',
    exchange_rate: '1.000000',
    notes: '',
    amount_in_words: '',
  });

  // Reference data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [lettersOfCredit, setLettersOfCredit] = useState<LetterOfCredit[]>([]);
  
  // Document data
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetails | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingDocumentDetails, setLoadingDocumentDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendorSearch, setVendorSearch] = useState('');
  
  // Decision dialog state - shows after vendor selection
  const [showPaymentTypeDialog, setShowPaymentTypeDialog] = useState(false);
  const [paymentTypeDecided, setPaymentTypeDecided] = useState(false);
  
  // LC auto-detection state
  const [linkedLC, setLinkedLC] = useState<LetterOfCredit | null>(null);
  const [loadingLinkedLC, setLoadingLinkedLC] = useState(false);
  const [lcRequired, setLcRequired] = useState(false);

  // Filtered vendors based on search
  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors;
    const search = vendorSearch.toLowerCase();
    return vendors.filter(v => 
      v.code.toLowerCase().includes(search) ||
      v.name.toLowerCase().includes(search) ||
      (v.name_ar && v.name_ar.includes(vendorSearch))
    );
  }, [vendors, vendorSearch]);

  // Selected vendor object
  const selectedVendor = useMemo(() => {
    return vendors.find(v => v.id === parseInt(formData.vendor_id)) || null;
  }, [vendors, formData.vendor_id]);

  // Filtered LCs for selected vendor
  const vendorLCs = useMemo(() => {
    if (!formData.vendor_id) return [];
    return lettersOfCredit.filter(lc => lc.vendor_id === parseInt(formData.vendor_id));
  }, [lettersOfCredit, formData.vendor_id]);

  // Get currency from form selection (tracks user's choice), then document, then vendor
  const activeCurrency = useMemo(() => {
    if (formData.currency_id) {
      const selected = currencies.find(c => c.id === parseInt(formData.currency_id));
      if (selected) return selected;
    }
    if (selectedDocument?.currency_id) {
      return currencies.find(c => c.id === selectedDocument.currency_id);
    }
    if (selectedVendor?.currency_id) {
      return currencies.find(c => c.id === selectedVendor.currency_id);
    }
    return currencies.find(c => c.code === 'SAR');
  }, [formData.currency_id, selectedDocument, selectedVendor, currencies]);

  // Effective balance: document balance minus cross-document payments (same vendor + project)
  const effectiveBalance = useMemo(() => {
    if (!selectedDocument) return 0;
    const docBalance = Number(selectedDocument.balance) || 0;
    const crossDocTotal = Number(selectedDocument.cross_document_total) || 0;
    return Math.max(0, docBalance - crossDocTotal);
  }, [selectedDocument]);

  // Calculate remaining after payment (uses effective balance)
  const remainingAfterPayment = useMemo(() => {
    if (!selectedDocument) return 0;
    const amount = parseFloat(formData.payment_amount) || 0;
    return Math.max(0, effectiveBalance - amount);
  }, [effectiveBalance, formData.payment_amount]);

  // Auto-generated description
  const autoDescription = useMemo(() => {
    if (!selectedVendor || !formData.source_type || !selectedDocument) return '';
    
    const sourceLabels: Record<SourceType, { ar: string; en: string }> = {
      po: { ar: 'أمر شراء', en: 'Purchase Order' },
      shipment: { ar: 'شحنة', en: 'Shipment' },
      quotation: { ar: 'عرض سعر', en: 'Quotation' },
      invoice: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
      '': { ar: '', en: '' }
    };

    const sourceLabel = sourceLabels[formData.source_type];
    const projectText = selectedDocument.project_code 
      ? (isArabic ? `مشروع رقم ${selectedDocument.project_code}` : `Project ${selectedDocument.project_code}`)
      : '';

    if (isArabic) {
      return `دفعة للمورد ${selectedVendor.name_ar || selectedVendor.name} مقابل ${sourceLabel.ar} رقم ${selectedDocument.document_number}${projectText ? ` - ${projectText}` : ''}`;
    }
    return `Payment to ${selectedVendor.name} for ${sourceLabel.en} No. ${selectedDocument.document_number}${projectText ? ` - ${projectText}` : ''}`;
  }, [selectedVendor, formData.source_type, selectedDocument, isArabic]);

  // Fetch initial reference data
  useEffect(() => {
    fetchReferenceData();
  }, []);

  // Fetch documents when vendor and source type selected
  useEffect(() => {
    if (formData.vendor_id && formData.source_type) {
      fetchVendorDocuments();
    } else {
      setDocuments([]);
      setSelectedDocument(null);
    }
  }, [formData.vendor_id, formData.source_type]);

  // Fetch document details when document selected
  useEffect(() => {
    if (formData.vendor_id && formData.source_type && formData.document_id) {
      fetchDocumentDetails();
    } else {
      setSelectedDocument(null);
    }
  }, [formData.document_id]);

  // Update currency when document changes
  useEffect(() => {
    if (activeCurrency && !formData.currency_id) {
      setFormData(prev => ({ ...prev, currency_id: String(activeCurrency.id) }));
    }
  }, [activeCurrency]);

  // Update payment amount based on percentage (uses effective balance after cross-doc deduction)
  useEffect(() => {
    if (selectedDocument && formData.payment_percentage) {
      const percentage = parseFloat(formData.payment_percentage) || 0;
      const amount = (effectiveBalance * percentage) / 100;
      setFormData(prev => ({ 
        ...prev, 
        payment_amount: amount.toFixed(2),
        amount_in_words: numberToArabicWords(amount, activeCurrency?.code || 'SAR')
      }));
    }
  }, [formData.payment_percentage, selectedDocument, effectiveBalance]);

  // Update amount in words when amount changes manually
  useEffect(() => {
    const amount = parseFloat(formData.payment_amount) || 0;
    setFormData(prev => ({
      ...prev,
      amount_in_words: numberToArabicWords(amount, activeCurrency?.code || 'SAR')
    }));
  }, [formData.payment_amount, activeCurrency]);

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId() || 1;
    return {
      Authorization: `Bearer ${token}`,
      'X-Company-Id': String(companyId),
      'Content-Type': 'application/json'
    };
  };

  const fetchReferenceData = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();

      // Fetch all in parallel
      const [vendorsRes, currenciesRes, refDataRes] = await Promise.all([
        fetch('/api/procurement/vendors?limit=1000', { headers }),
        fetch('/api/finance/currencies?is_active=true', { headers }),
        fetch('/api/procurement/payments/reference-data/all', { headers })
      ]);

      const [vendorsData, currenciesData, refData] = await Promise.all([
        vendorsRes.json(),
        currenciesRes.json(),
        refDataRes.json()
      ]);

      setVendors(vendorsData.data || []);
      setCurrencies(currenciesData.data || []);
      
      // Auto-select vendor if vendor_id is in URL query
      if (queryVendorId && vendorsData.data) {
        const vendorFromQuery = vendorsData.data.find((v: Vendor) => v.id === Number(queryVendorId));
        if (vendorFromQuery) {
          setFormData(prev => ({ ...prev, vendor_id: String(vendorFromQuery.id) }));
          // Show decision dialog for auto-selected vendor too
          setShowPaymentTypeDialog(true);
        }
      }
      
      if (refData.data) {
        setPaymentMethods(refData.data.paymentMethods || []);
        setCashBoxes(refData.data.cashBoxes || []);
        setBankAccounts(refData.data.bankAccounts || []);
        setLettersOfCredit(refData.data.lettersOfCredit || []);
        
        // Set default payment method
        const defaultMethod = refData.data.paymentMethods?.find((m: PaymentMethod) => m.is_default);
        if (defaultMethod) {
          setFormData(prev => ({ 
            ...prev, 
            payment_method: String(defaultMethod.id),
            payment_method_type: defaultMethod.payment_type
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
      showToast(isArabic ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDocuments = async () => {
    setLoadingDocuments(true);
    setDocuments([]);
    setSelectedDocument(null);
    setFormData(prev => ({ ...prev, document_id: '' }));
    
    try {
      const headers = getHeaders();
      const res = await fetch(
        `/api/procurement/payments/vendor/${formData.vendor_id}/documents?source_type=${formData.source_type}`,
        { headers }
      );
      const data = await res.json();
      setDocuments(data.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast(isArabic ? 'فشل تحميل المستندات' : 'Failed to load documents', 'error');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchDocumentDetails = async () => {
    setLoadingDocumentDetails(true);
    try {
      const headers = getHeaders();
      const res = await fetch(
        `/api/procurement/payments/vendor/${formData.vendor_id}/document/${formData.source_type}/${formData.document_id}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.data) {
        setSelectedDocument(data.data);
        
        // Auto-set currency from document (always match document currency)
        const docCurrencyId = String(data.data.currency_id);
        
        // Auto-set payment method from document if available
        const docPaymentMethod = data.data.document_payment_method;
        const docPaymentMethodCode = data.data.document_payment_method_code;
        let autoPaymentMethodId = formData.payment_method;
        let autoPaymentMethodType = formData.payment_method_type;
        
        if (docPaymentMethod || docPaymentMethodCode) {
          // Find matching payment method: prefer exact code match, then fall back to type match
          const matchingMethod = 
            (docPaymentMethodCode && paymentMethods.find(m => m.code === docPaymentMethodCode)) ||
            paymentMethods.find(m => m.payment_type === docPaymentMethod);
          if (matchingMethod) {
            autoPaymentMethodId = String(matchingMethod.id);
            autoPaymentMethodType = matchingMethod.payment_type;
          }
        }
        
        // Auto-set exchange rate from document if available
        const docExchangeRate = data.data.document_exchange_rate 
          ? String(data.data.document_exchange_rate) 
          : '1.000000';
        
        // Calculate effective balance (deducting cross-document payments for same vendor+project)
        const crossDocTotal = Number(data.data.cross_document_total) || 0;
        const rawBalance = Number(data.data.balance) || 0;
        const effectiveInitialBalance = Math.max(0, rawBalance - crossDocTotal);
        
        setFormData(prev => ({
          ...prev,
          currency_id: docCurrencyId,
          payment_amount: effectiveInitialBalance.toFixed(2),
          payment_percentage: '100',
          payment_method: autoPaymentMethodId,
          payment_method_type: autoPaymentMethodType,
          exchange_rate: docExchangeRate,
          bank_account_id: '',
          cash_box_id: '',
          lc_id: ''
        }));
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      showToast(isArabic ? 'فشل تحميل تفاصيل المستند' : 'Failed to load document details', 'error');
    } finally {
      setLoadingDocumentDetails(false);
    }
  };

  // Check if document is linked to an LC
  const checkDocumentLC = async (sourceType: string, documentId: string) => {
    if (!sourceType || !documentId || (sourceType !== 'po' && sourceType !== 'shipment')) {
      setLinkedLC(null);
      setLcRequired(false);
      return;
    }

    setLoadingLinkedLC(true);
    try {
      const headers = getHeaders();
      const res = await fetch(
        `/api/procurement/payments/document/${sourceType}/${documentId}/linked-lc`,
        { headers }
      );
      const data = await res.json();
      
      if (data.linked && data.data) {
        setLinkedLC(data.data);
        setLcRequired(true);
        // Auto-set LC in form
        setFormData(prev => ({ ...prev, lc_id: String(data.data.id) }));
      } else {
        setLinkedLC(null);
        setLcRequired(false);
      }
    } catch (error) {
      console.error('Error checking LC linkage:', error);
      setLinkedLC(null);
      setLcRequired(false);
    } finally {
      setLoadingLinkedLC(false);
    }
  };

  // Auto-check LC when document is selected
  useEffect(() => {
    if (formData.source_type && formData.document_id) {
      checkDocumentLC(formData.source_type, formData.document_id);
    } else {
      setLinkedLC(null);
      setLcRequired(false);
    }
  }, [formData.source_type, formData.document_id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Block submission if LC payment is blocked
    if (selectedDocument?.lc_payment_blocked) {
      newErrors._form = isArabic 
        ? 'لا يمكن إنشاء دفعة — الشحنة مرتبطة باعتماد مستندي' 
        : 'Cannot create payment — shipment is linked to a Letter of Credit';
      setErrors(newErrors);
      return false;
    }

    if (!formData.vendor_id) newErrors.vendor_id = isArabic ? 'المورد مطلوب' : 'Vendor is required';
    if (!formData.payment_date) newErrors.payment_date = isArabic ? 'التاريخ مطلوب' : 'Date is required';
    if (!formData.currency_id) newErrors.currency_id = isArabic ? 'العملة مطلوبة' : 'Currency is required';
    if (!formData.payment_amount || parseFloat(formData.payment_amount) <= 0) {
      newErrors.payment_amount = isArabic ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero';
    }
    
    // Validate payment amount doesn't exceed effective balance (document balance minus cross-doc payments)
    if (selectedDocument) {
      const docBal = Number(selectedDocument.balance) || 0;
      const crossTotal = Number(selectedDocument.cross_document_total) || 0;
      const effBal = Math.max(0, docBal - crossTotal);
      if (parseFloat(formData.payment_amount) > effBal && effBal > 0) {
        newErrors.payment_amount = isArabic 
          ? `المبلغ يتجاوز الرصيد الفعلي المتاح (${effBal.toLocaleString()})${crossTotal > 0 ? ` — تم خصم ${crossTotal.toLocaleString()} كدفعات مرتبطة بنفس المورد والمشروع` : ''}`
          : `Amount exceeds effective available balance (${effBal.toLocaleString()})${crossTotal > 0 ? ` — ${crossTotal.toLocaleString()} deducted for related vendor+project payments` : ''}`;
      }
    }

    // Validate total payments (including cross-document) don't exceed document total
    if (selectedDocument && selectedDocument.cross_document_total) {
      const payAmount = parseFloat(formData.payment_amount) || 0;
      const docTotal = parseFloat(String(selectedDocument.total_amount)) || 0;
      const crossTotal = selectedDocument.cross_document_total || 0;
      const thisPaid = parseFloat(String(selectedDocument.paid_amount)) || 0;
      const grandTotal = crossTotal + thisPaid + payAmount;
      
      if (grandTotal > docTotal && docTotal > 0) {
        const maxRemaining = Math.max(0, docTotal - crossTotal - thisPaid);
        newErrors.payment_amount = isArabic 
          ? `إجمالي المدفوعات (${grandTotal.toLocaleString()}) يتجاوز إجمالي المستند (${docTotal.toLocaleString()}). الدفعات السابقة المرتبطة: ${crossTotal.toLocaleString()}. الحد الأقصى المتاح: ${maxRemaining.toLocaleString()}`
          : `Total payments (${grandTotal.toLocaleString()}) exceed document total (${docTotal.toLocaleString()}). Related prior payments: ${crossTotal.toLocaleString()}. Max available: ${maxRemaining.toLocaleString()}`;
      }
    }
    
    if (!formData.payment_method) {
      newErrors.payment_method = isArabic ? 'طريقة الدفع مطلوبة' : 'Payment method is required';
    }

    // Validate exchange rate for foreign currencies
    if (activeCurrency && activeCurrency.code !== 'SAR') {
      const rate = parseFloat(formData.exchange_rate);
      if (!rate || rate <= 0) {
        newErrors.exchange_rate = isArabic ? 'سعر الصرف مطلوب للعملات الأجنبية' : 'Exchange rate is required for foreign currencies';
      }
    }

    // Validate payment destination based on method type
    if (formData.payment_method_type === 'cash' && !formData.cash_box_id) {
      newErrors.cash_box_id = isArabic ? 'الصندوق مطلوب' : 'Cash box is required';
    }
    if (formData.payment_method_type === 'bank' && !formData.bank_account_id) {
      newErrors.bank_account_id = isArabic ? 'الحساب البنكي مطلوب' : 'Bank account is required';
    }

    // Validate LC when document is LC-linked
    if (lcRequired && !formData.lc_id) {
      newErrors.lc_id = isArabic ? 'الاعتماد المستندي مطلوب - المستند مرتبط باعتماد مستندي' : 'Letter of Credit is required - document is linked to an LC';
    }

    // Validate LC available balance covers payment
    if (formData.lc_id && linkedLC) {
      const payAmount = parseFloat(formData.payment_amount) || 0;
      const lcAvail = parseFloat(String(linkedLC.available_amount)) || 0;
      if (payAmount > lcAvail) {
        newErrors.payment_amount = isArabic 
          ? `مبلغ الدفع يتجاوز الرصيد المتاح في الاعتماد المستندي (${lcAvail.toLocaleString()})`
          : `Payment amount exceeds LC available balance (${lcAvail.toLocaleString()})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast(isArabic ? 'يرجى تصحيح الأخطاء' : 'Please fix validation errors', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const headers = getHeaders();

      const payload = {
        vendor_id: parseInt(formData.vendor_id),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method_type || 'bank_transfer',
        bank_account_id: formData.bank_account_id ? parseInt(formData.bank_account_id) : null,
        cash_box_id: formData.cash_box_id ? parseInt(formData.cash_box_id) : null,
        reference_number: formData.reference_number,
        currency_id: parseInt(formData.currency_id),
        payment_amount: parseFloat(formData.payment_amount),
        exchange_rate: parseFloat(formData.exchange_rate),
        notes: autoDescription,
        source_type: formData.source_type || 'direct',
        // Link to appropriate document
        purchase_order_id: formData.source_type === 'po' && formData.document_id ? parseInt(formData.document_id) : null,
        shipment_id: formData.source_type === 'shipment' && formData.document_id ? parseInt(formData.document_id) : null,
        quotation_id: formData.source_type === 'quotation' && formData.document_id ? parseInt(formData.document_id) : null,
        invoice_id: formData.source_type === 'invoice' && formData.document_id ? parseInt(formData.document_id) : null,
        lc_id: formData.lc_id ? parseInt(formData.lc_id) : null,
        project_id: selectedDocument?.project_id || null
      };

      const response = await fetch('/api/procurement/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const result = await response.json();
      showToast(
        isArabic ? `تم إنشاء الدفعة ${result.data.payment_number}` : `Payment ${result.data.payment_number} created`,
        'success'
      );
      
      // Redirect based on where user came from
      if (returnUrl) {
        router.push(returnUrl);
      } else if (fromVendor && formData.vendor_id) {
        router.push(`/master/vendors/${formData.vendor_id}`);
      } else {
        router.push(`/procurement/payments/${result.data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      showToast(error.message || (isArabic ? 'فشل إنشاء الدفعة' : 'Failed to create payment'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }

    // Handle payment method type change
    if (key === 'payment_method') {
      const method = paymentMethods.find(m => m.id === parseInt(value));
      if (method) {
        setFormData(prev => ({ 
          ...prev, 
          [key]: value,
          payment_method_type: method.payment_type,
          bank_account_id: '',
          cash_box_id: '',
          lc_id: ''
        }));
      }
    }

    // Clear downstream selections
    if (key === 'vendor_id') {
      setFormData(prev => ({ 
        ...prev, 
        [key]: value, 
        source_type: '' as SourceType, 
        document_id: '' 
      }));
      // Reset decision state when vendor changes
      setPaymentTypeDecided(false);
      setLinkedLC(null);
      setLcRequired(false);
      // Show decision dialog when a vendor is selected
      if (value) {
        setShowPaymentTypeDialog(true);
      }
    }
    if (key === 'source_type') {
      setFormData(prev => ({ ...prev, [key]: value as SourceType, document_id: '' }));
    }
  };

  // Check permissions
  if (!hasPermission('procurement:payments:create')) {
    return (
      <MainLayout>
        <Head>
          <title>{isArabic ? 'دفعة جديدة' : 'New Payment'} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <p className="text-gray-500">{isArabic ? 'ليس لديك صلاحية' : 'Access Denied'}</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <Head>
          <title>{isArabic ? 'دفعة جديدة' : 'New Payment'} - SLMS</title>
        </Head>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'دفعة مورد جديدة' : 'New Vendor Payment'} - SLMS</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition" title={isArabic ? 'رجوع' : 'Back'}>
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isArabic ? 'دفعة مورد جديدة' : 'New Vendor Payment'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isArabic ? 'إنشاء دفعة جديدة للمورد مع ربط المستندات' : 'Create new vendor payment with document linking'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Vendor Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-sm">1</span>
              {isArabic ? 'اختيار المورد' : 'Select Vendor'}
            </h2>

            <div className="space-y-4">
              {/* Combined Vendor Search & Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'المورد *' : 'Vendor *'}
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    ${errors.vendor_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder={isArabic ? 'ابحث واختر المورد بالكود أو الاسم...' : 'Search & select vendor by code or name...'}
                  value={selectedVendor ? `${selectedVendor.code} - ${isArabic && selectedVendor.name_ar ? selectedVendor.name_ar : selectedVendor.name}` : vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    // Clear selection when typing
                    if (formData.vendor_id) {
                      handleInputChange('vendor_id', '');
                    }
                  }}
                  onFocus={() => setVendorSearch('')}
                />
                {errors.vendor_id && (
                  <p className="mt-1 text-sm text-red-500">{errors.vendor_id}</p>
                )}
                
                {/* Dropdown list */}
                {!formData.vendor_id && vendorSearch && filteredVendors.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredVendors.slice(0, 10).map(vendor => (
                      <button
                        key={vendor.id}
                        type="button"
                        onClick={() => {
                          handleInputChange('vendor_id', String(vendor.id));
                          setVendorSearch('');
                        }}
                        className="w-full px-4 py-2 text-right hover:bg-blue-50 dark:hover:bg-blue-900/30 
                          text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-600 last:border-0
                          flex justify-between items-center"
                      >
                        <span className="font-medium">{vendor.code}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {isArabic && vendor.name_ar ? vendor.name_ar : vendor.name}
                          {vendor.currency_code && <span className="mr-2 text-xs">({vendor.currency_code})</span>}
                        </span>
                      </button>
                    ))}
                    {filteredVendors.length > 10 && (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {isArabic ? `و ${filteredVendors.length - 10} آخرين...` : `and ${filteredVendors.length - 10} more...`}
                      </div>
                    )}
                  </div>
                )}
                
                {/* No results */}
                {!formData.vendor_id && vendorSearch && filteredVendors.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                    {isArabic ? 'لا توجد نتائج' : 'No vendors found'}
                  </div>
                )}
              </div>

              {selectedVendor && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex justify-between items-center">
                  <p className="text-sm text-blue-900 dark:text-blue-300">
                    <strong>{isArabic ? 'المورد:' : 'Vendor:'}</strong> {selectedVendor.code} - {selectedVendor.name}
                    {selectedVendor.currency_code && (
                      <span className="mr-2">| <strong>{isArabic ? 'العملة:' : 'Currency:'}</strong> {selectedVendor.currency_code}</span>
                    )}
                    {selectedVendor.payment_terms && (
                      <span className="mr-2">| <strong>{isArabic ? 'شروط الدفع:' : 'Payment Terms:'}</strong> {selectedVendor.payment_terms}</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('vendor_id', '');
                      setVendorSearch('');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
                  >
                    {isArabic ? 'تغيير' : 'Change'}
                  </button>
                </div>
              )}

              {/* Payment Type Decision Badge */}
              {selectedVendor && paymentTypeDecided && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex justify-between items-center">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    ✅ {isArabic ? 'نوع الدفع: دفعة مرتبطة بمستند (أمر شراء / شحنة / عرض سعر / فاتورة)' : 'Payment Type: Document-linked payment (PO / Shipment / Quotation / Invoice)'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPaymentTypeDialog(true)}
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-sm"
                  >
                    {isArabic ? 'تغيير' : 'Change'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment Type Decision Dialog (Modal) */}
          {showPaymentTypeDialog && selectedVendor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-600 max-w-lg w-full mx-4 overflow-hidden">
                {/* Dialog Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white">
                    {isArabic ? 'نوع الدفعة' : 'Payment Type'}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {isArabic 
                      ? `المورد: ${selectedVendor.name_ar || selectedVendor.name}` 
                      : `Vendor: ${selectedVendor.name}`}
                  </p>
                </div>
                
                {/* Dialog Body */}
                <div className="p-6 space-y-3">
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                    {isArabic 
                      ? 'هل هذه الدفعة مرتبطة بمستند (أمر شراء، شحنة، عرض سعر، فاتورة) أم دفعة مباشرة للمورد؟'
                      : 'Is this payment linked to a document (PO, Shipment, Quotation, Invoice) or a direct payment to the vendor?'}
                  </p>

                  {/* Option 1: Document-linked */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentTypeDialog(false);
                      setPaymentTypeDecided(true);
                    }}
                    className="w-full p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all text-right flex items-start gap-4 group"
                  >
                    <div className="bg-blue-100 dark:bg-blue-800 rounded-lg p-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-700 transition">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-base">
                        {isArabic ? 'دفعة مرتبطة بمستند' : 'Document-Linked Payment'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isArabic 
                          ? 'دفعة مقابل أمر شراء أو شحنة أو عرض سعر أو فاتورة مشتريات' 
                          : 'Payment against a Purchase Order, Shipment, Quotation, or Purchase Invoice'}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isArabic ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                    </svg>
                  </button>

                  {/* Option 2: Direct Payment (redirect to سند صرف) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentTypeDialog(false);
                      // Redirect to payment voucher with vendor pre-selected
                      router.push(`/accounting/payment-voucher?vendor_id=${formData.vendor_id}&from=procurement`);
                    }}
                    className="w-full p-4 rounded-xl border-2 border-amber-200 dark:border-amber-700 hover:border-amber-500 dark:hover:border-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all text-right flex items-start gap-4 group"
                  >
                    <div className="bg-amber-100 dark:bg-amber-800 rounded-lg p-3 group-hover:bg-amber-200 dark:group-hover:bg-amber-700 transition">
                      <svg className="w-6 h-6 text-amber-600 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-base">
                        {isArabic ? 'دفعة مباشرة — سند صرف' : 'Direct Payment — Payment Voucher'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isArabic 
                          ? 'دفعة مباشرة للمورد بدون أمر شراء أو شحنة أو عرض سعر أو عقد (سند صرف / Payment Voucher)' 
                          : 'Direct payment to vendor without PO, Shipment, Quotation, or Contract (Payment Voucher / سند صرف)'}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isArabic ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                    </svg>
                  </button>
                </div>

                {/* Dialog Footer */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentTypeDialog(false);
                      // If not decided yet, clear vendor selection
                      if (!paymentTypeDecided) {
                        handleInputChange('vendor_id', '');
                        setVendorSearch('');
                      }
                    }}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Source Type & Document Selection */}
          {formData.vendor_id && paymentTypeDecided && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-sm">2</span>
                {isArabic ? 'دفعة من' : 'Payment From'}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { value: 'po', label: isArabic ? 'أمر شراء' : 'Purchase Order', icon: '📋' },
                  { value: 'shipment', label: isArabic ? 'شحنة' : 'Shipment', icon: '🚢' },
                  { value: 'quotation', label: isArabic ? 'عرض سعر' : 'Quotation', icon: '📝' },
                  { value: 'invoice', label: isArabic ? 'فاتورة مشتريات' : 'Invoice', icon: '🧾' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('source_type', option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      formData.source_type === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{option.icon}</div>
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                ))}
              </div>

              {/* Document Selection */}
              {formData.source_type && (
                <div className="space-y-4">
                  <Select
                    label={isArabic ? 'اختر المستند' : 'Select Document'}
                    value={formData.document_id}
                    onChange={(e) => handleInputChange('document_id', e.target.value)}
                    disabled={loadingDocuments}
                  >
                    <option value="">
                      {loadingDocuments 
                        ? (isArabic ? 'جاري التحميل...' : 'Loading...') 
                        : (isArabic ? 'اختر المستند' : 'Select Document')}
                    </option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.document_number} - {isArabic ? 'الرصيد:' : 'Balance:'} {Number(doc.balance || 0).toFixed(2)} {doc.currency_code}
                        {doc.project_code && ` (${doc.project_code})`}
                      </option>
                    ))}
                  </Select>

                  {documents.length === 0 && !loadingDocuments && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        {isArabic ? 'لا توجد مستندات متاحة لهذا المورد' : 'No documents available for this vendor'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Document Details */}
          {selectedDocument && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-sm">3</span>
                {isArabic ? 'تفاصيل المستند' : 'Document Details'}
              </h2>

              {loadingDocumentDetails ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Document Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'رقم المستند' : 'Document No.'}</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{selectedDocument.document_number}</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'الإجمالي' : 'Total'}</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {Number(selectedDocument.total_amount || 0).toLocaleString()} {selectedDocument.currency_code}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-xs text-green-600 dark:text-green-400">{isArabic ? 'المدفوع' : 'Paid'}</div>
                      <div className="font-semibold text-green-700 dark:text-green-300">
                        {Number(selectedDocument.paid_amount || 0).toLocaleString()} {selectedDocument.currency_code}
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-xs text-red-600 dark:text-red-400">{isArabic ? 'المتبقي' : 'Balance'}</div>
                      <div className="font-semibold text-red-700 dark:text-red-300">
                        {Number(selectedDocument.balance || 0).toLocaleString()} {selectedDocument.currency_code}
                      </div>
                    </div>
                  </div>

                  {/* Project Info */}
                  {selectedDocument.project_code && (
                    <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <span className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>{isArabic ? 'المشروع:' : 'Project:'}</strong> {selectedDocument.project_code} - {selectedDocument.project_name}
                      </span>
                    </div>
                  )}

                  {/* LC Payment Blocked Warning */}
                  {selectedDocument.lc_payment_blocked && selectedDocument.linked_lc && (
                    <div className="mb-4 p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-300 dark:border-red-700">
                      <div className="flex items-start gap-3">
                        <div className="bg-red-100 dark:bg-red-800 rounded-lg p-2 flex-shrink-0">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-red-900 dark:text-red-200 text-base mb-2">
                            {isArabic ? '🚫 لا يمكن الدفع — الشحنة مرتبطة باعتماد مستندي' : '🚫 Payment Blocked — Shipment Linked to Letter of Credit'}
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                            {isArabic ? selectedDocument.lc_payment_message_ar : selectedDocument.lc_payment_message_en}
                          </p>
                          <div className="p-3 bg-red-100 dark:bg-red-800/50 rounded-lg mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <div className="text-xs text-red-500 dark:text-red-400">{isArabic ? 'رقم الاعتماد' : 'LC Number'}</div>
                              <div className="font-bold text-red-900 dark:text-red-200">{selectedDocument.linked_lc.lc_number}</div>
                            </div>
                            <div>
                              <div className="text-xs text-red-500 dark:text-red-400">{isArabic ? 'البنك' : 'Bank'}</div>
                              <div className="font-medium text-red-800 dark:text-red-200">{selectedDocument.linked_lc.issuing_bank_name || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-red-500 dark:text-red-400">{isArabic ? 'المبلغ' : 'Amount'}</div>
                              <div className="font-medium text-red-800 dark:text-red-200">
                                {parseFloat(String(selectedDocument.linked_lc.current_amount || 0)).toLocaleString()} {selectedDocument.linked_lc.lc_currency_code}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-red-500 dark:text-red-400">{isArabic ? 'المتاح' : 'Available'}</div>
                              <div className="font-medium text-red-800 dark:text-red-200">
                                {parseFloat(String(selectedDocument.linked_lc.available_amount || 0)).toLocaleString()} {selectedDocument.linked_lc.lc_currency_code}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => router.push(`/finance/letters-of-credit`)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            {isArabic ? 'الذهاب لشاشة الاعتمادات المستندية' : 'Go to Letters of Credit'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LC Linkage Info Badge */}
                  {loadingLinkedLC && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isArabic ? 'جاري فحص ارتباط الاعتماد المستندي...' : 'Checking Letter of Credit linkage...'}
                      </span>
                    </div>
                  )}
                  
                  {linkedLC && (
                    <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-2 border-indigo-300 dark:border-indigo-700">
                      <div className="flex items-start gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-800 rounded-lg p-2 flex-shrink-0">
                          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm mb-2">
                            {isArabic ? '🏦 اعتماد مستندي مرتبط بهذا المستند' : '🏦 Letter of Credit Linked to This Document'}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <div className="text-xs text-indigo-600 dark:text-indigo-400">{isArabic ? 'رقم الاعتماد' : 'LC Number'}</div>
                              <div className="font-bold text-indigo-900 dark:text-indigo-100">{linkedLC.lc_number}</div>
                            </div>
                            <div>
                              <div className="text-xs text-indigo-600 dark:text-indigo-400">{isArabic ? 'البنك' : 'Bank'}</div>
                              <div className="font-medium text-indigo-800 dark:text-indigo-200">{linkedLC.bank_name || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-indigo-600 dark:text-indigo-400">{isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}</div>
                              <div className="font-medium text-indigo-800 dark:text-indigo-200">
                                {parseFloat(String(linkedLC.current_amount || 0)).toLocaleString()} {linkedLC.currency_code}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-green-600 dark:text-green-400">{isArabic ? 'المتاح' : 'Available'}</div>
                              <div className="font-bold text-green-700 dark:text-green-300">
                                {parseFloat(String(linkedLC.available_amount || 0)).toLocaleString()} {linkedLC.currency_code}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-800/50 rounded px-2 py-1 inline-block">
                            {isArabic ? '⚠️ يجب تسوية الدفع عبر الاعتماد المستندي' : '⚠️ Payment must be settled through this Letter of Credit'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!loadingLinkedLC && !linkedLC && (formData.source_type === 'po' || formData.source_type === 'shipment') && formData.document_id && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {isArabic ? 'ℹ️ هذا المستند غير مرتبط باعتماد مستندي' : 'ℹ️ This document is not linked to a Letter of Credit'}
                      </span>
                    </div>
                  )}

                  {/* Items Table */}
                  {selectedDocument.items && selectedDocument.items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">#</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">{isArabic ? 'الصنف' : 'Item'}</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">{isArabic ? 'الكمية' : 'Qty'}</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">{isArabic ? 'الوحدة' : 'UOM'}</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">{isArabic ? 'السعر' : 'Price'}</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">{isArabic ? 'الإجمالي' : 'Total'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedDocument.items.map((item, index) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.item_name}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.uom_code}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{Number(item.unit_price || 0).toLocaleString()}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{Number(item.total_price || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4: Payment Details */}
          {formData.vendor_id && paymentTypeDecided && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-sm">4</span>
                {isArabic ? 'تفاصيل الدفع' : 'Payment Details'}
              </h2>

              {/* ═══════════════════════════════════════════════════════ */}
              {/* Document Payment Summary Header (only for document-linked payments) */}
              {/* ═══════════════════════════════════════════════════════ */}
              {selectedDocument && (
                <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-700/50 dark:via-blue-900/10 dark:to-gray-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-800 rounded-lg p-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">
                          {isArabic ? 'ملخص المدفوعات للمستند' : 'Document Payment Summary'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedDocument.document_number} — {
                            formData.source_type === 'po' ? (isArabic ? 'أمر شراء' : 'Purchase Order') :
                            formData.source_type === 'shipment' ? (isArabic ? 'شحنة' : 'Shipment') :
                            formData.source_type === 'quotation' ? (isArabic ? 'عرض سعر' : 'Quotation') :
                            formData.source_type === 'invoice' ? (isArabic ? 'فاتورة' : 'Invoice') : ''
                          }
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const combinedPaid = parseFloat(String(selectedDocument.paid_amount || 0)) + (selectedDocument.cross_document_total || 0);
                      const combinedPct = selectedDocument.total_amount > 0 ? Math.round((combinedPaid / parseFloat(String(selectedDocument.total_amount))) * 100) : 0;
                      return (
                      <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        combinedPct === 0 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                        combinedPct < 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                        combinedPct < 100 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {combinedPct === 0 ? (isArabic ? 'لم يتم الدفع بعد' : 'Not Paid Yet') :
                         combinedPct >= 100 ? (isArabic ? 'مدفوع بالكامل' : 'Fully Paid') :
                         `${combinedPct}% ${isArabic ? 'مدفوع' : 'Paid'}`}
                      </div>
                      );
                    })()}
                  </div>

                  {/* Progress Bar */}
                  {(() => {
                    const sameDocPaid = parseFloat(String(selectedDocument.paid_amount || 0));
                    const crossDocPaid = selectedDocument.cross_document_total || 0;
                    const combinedPaid = sameDocPaid + crossDocPaid;
                    const docTotal = parseFloat(String(selectedDocument.total_amount || 0));
                    const combinedPct = docTotal > 0 ? Math.min(100, Math.round((combinedPaid / docTotal) * 100)) : 0;
                    const effBalance = Math.max(0, Number(selectedDocument.balance) - crossDocPaid);
                    return (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600 dark:text-gray-400">
                        {isArabic ? 'إجمالي المدفوع:' : 'Total Paid:'} <span className="font-semibold text-gray-900 dark:text-white">{combinedPaid.toLocaleString()} {selectedDocument.currency_code}</span>
                        {crossDocPaid > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] mr-1 ml-1">
                            ({isArabic ? `منها ${crossDocPaid.toLocaleString()} مستندات أخرى` : `incl. ${crossDocPaid.toLocaleString()} cross-doc`})
                          </span>
                        )}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {isArabic ? 'الإجمالي:' : 'Total:'} <span className="font-semibold text-gray-900 dark:text-white">{docTotal.toLocaleString()} {selectedDocument.currency_code}</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden relative">
                      {crossDocPaid > 0 && sameDocPaid > 0 && (
                        <div
                          className="absolute h-full rounded-l-full bg-amber-400 dark:bg-amber-500 opacity-60"
                          style={{ width: `${Math.min(docTotal > 0 ? Math.round((crossDocPaid / docTotal) * 100) : 0, 100)}%` }}
                        />
                      )}
                      <div
                        className={`h-full rounded-full transition-all duration-500 relative ${
                          combinedPct >= 100 ? 'bg-green-500' :
                          combinedPct >= 75 ? 'bg-amber-500' :
                          combinedPct >= 50 ? 'bg-blue-500' :
                          'bg-blue-400'
                        }`}
                        style={{ width: `${combinedPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className={`font-medium ${
                        effBalance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {isArabic ? 'الرصيد الفعلي المتاح:' : 'Effective Available:'} {effBalance.toLocaleString()} {selectedDocument.currency_code}
                      </span>
                      {((selectedDocument.same_document_payment_count || 0) + (selectedDocument.cross_document_payments?.length || 0)) > 0 && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {isArabic 
                            ? `${(selectedDocument.same_document_payment_count || 0) + (selectedDocument.cross_document_payments?.length || 0)} دفعة سابقة إجمالاً` 
                            : `${(selectedDocument.same_document_payment_count || 0) + (selectedDocument.cross_document_payments?.length || 0)} total previous payment(s)`}
                        </span>
                      )}
                    </div>
                  </div>
                    );
                  })()}

                  {/* Stats Cards Row */}
                  <div className={`grid grid-cols-2 ${(selectedDocument.cross_document_total || 0) > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 mb-4`}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'قيمة المستند' : 'Document Value'}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{parseFloat(String(selectedDocument.total_amount || 0)).toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'مدفوع (هذا المستند)' : 'Paid (This Doc)'}</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{parseFloat(String(selectedDocument.paid_amount || 0)).toLocaleString()}</div>
                    </div>
                    {(selectedDocument.cross_document_total || 0) > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-700 text-center">
                        <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">{isArabic ? 'مدفوع (مستندات أخرى)' : 'Paid (Other Docs)'}</div>
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{(selectedDocument.cross_document_total || 0).toLocaleString()}</div>
                      </div>
                    )}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'الرصيد الفعلي المتاح' : 'Effective Available'}</div>
                      <div className={`text-sm font-bold ${effectiveBalance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                        {effectiveBalance.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'العملة' : 'Currency'}</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{selectedDocument.currency_code}</div>
                    </div>
                  </div>

                  {/* Document info hints */}
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.document_payment_method && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs border border-blue-200 dark:border-blue-800">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        {isArabic ? 'طريقة الدفع:' : 'Pay Method:'} <strong>{selectedDocument.document_payment_method_code || selectedDocument.document_payment_method}</strong>
                      </span>
                    )}
                    {selectedDocument.payment_terms_name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs border border-purple-200 dark:border-purple-800">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {isArabic ? 'شروط الدفع:' : 'Terms:'} <strong>{isArabic ? (selectedDocument.payment_terms_name_ar || selectedDocument.payment_terms_name) : selectedDocument.payment_terms_name}</strong>
                      </span>
                    )}
                    {selectedDocument.project_code && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-xs border border-teal-200 dark:border-teal-800">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {isArabic ? 'المشروع:' : 'Project:'} <strong>{selectedDocument.project_code}</strong>
                      </span>
                    )}
                    {selectedDocument.document_exchange_rate && selectedDocument.document_exchange_rate !== 1 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs border border-yellow-200 dark:border-yellow-800">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        {isArabic ? 'سعر الصرف:' : 'Rate:'} <strong>{selectedDocument.document_exchange_rate}</strong>
                      </span>
                    )}
                  </div>

                  {/* Balance Warning */}
                  {selectedDocument.balance <= 0 && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-300 dark:border-green-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        {isArabic 
                          ? '✅ تم سداد كامل قيمة المستند. أي دفعة إضافية ستكون زائدة عن المطلوب.' 
                          : '✅ This document is fully paid. Any additional payment will exceed the document total.'}
                      </span>
                    </div>
                  )}
                  {selectedDocument.balance > 0 && effectiveBalance <= 0 && (selectedDocument.cross_document_total || 0) > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-300 dark:border-amber-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        {isArabic 
                          ? `⚠️ الرصيد الفعلي المتاح = 0 — تم خصم ${(selectedDocument.cross_document_total || 0).toLocaleString()} كدفعات سابقة لنفس المورد والمشروع على مستندات أخرى.` 
                          : `⚠️ Effective available balance = 0 — ${(selectedDocument.cross_document_total || 0).toLocaleString()} deducted for prior vendor+project payments on other documents.`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* Previous Payments for THIS Document */}
              {/* ═══════════════════════════════════════════════════════ */}
              {selectedDocument?.same_document_payments && selectedDocument.same_document_payments.length > 0 && (
                <div className="mb-6 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-100 dark:bg-emerald-800 rounded-lg p-1.5">
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                        {isArabic 
                          ? `دفعات سابقة لهذا المستند (${selectedDocument.same_document_payments.length})` 
                          : `Previous Payments for This Document (${selectedDocument.same_document_payments.length})`}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {isArabic ? 'الإجمالي:' : 'Total:'} {parseFloat(String(selectedDocument.paid_amount || 0)).toLocaleString()} {selectedDocument.currency_code}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-emerald-200 dark:border-emerald-700">
                          <th className="px-3 py-2 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">{isArabic ? 'رقم الدفعة' : 'Payment #'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">{isArabic ? 'التاريخ' : 'Date'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">{isArabic ? 'طريقة الدفع' : 'Method'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">{isArabic ? 'المرجع' : 'Reference'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">{isArabic ? 'المبلغ' : 'Amount'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">{isArabic ? 'الحالة' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDocument.same_document_payments.map((sp) => (
                          <tr key={sp.id} className="border-b border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                            <td className="px-3 py-2 text-emerald-900 dark:text-emerald-200 font-mono text-xs">{sp.payment_number}</td>
                            <td className="px-3 py-2 text-emerald-800 dark:text-emerald-300 text-xs">{sp.payment_date ? new Date(sp.payment_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US') : '-'}</td>
                            <td className="px-3 py-2 text-emerald-800 dark:text-emerald-300 text-xs">
                              {sp.payment_method || '-'}
                              {sp.bank_name && <span className="text-emerald-500 dark:text-emerald-500 text-[10px] block">{sp.bank_name}</span>}
                              {sp.cash_box_name && <span className="text-emerald-500 dark:text-emerald-500 text-[10px] block">{sp.cash_box_name}</span>}
                            </td>
                            <td className="px-3 py-2 text-emerald-800 dark:text-emerald-300 text-xs font-mono">{sp.reference_number || '-'}</td>
                            <td className="px-3 py-2 font-semibold text-emerald-900 dark:text-emerald-200 text-xs">
                              {parseFloat(String(sp.payment_amount)).toLocaleString()} {sp.currency_code}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                sp.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                                sp.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                sp.status === 'posted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {sp.status === 'approved' ? (isArabic ? 'معتمد' : 'Approved') :
                                 sp.status === 'pending' ? (isArabic ? 'معلق' : 'Pending') :
                                 sp.status === 'posted' ? (isArabic ? 'مرحل' : 'Posted') :
                                 sp.status === 'draft' ? (isArabic ? 'مسودة' : 'Draft') : sp.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* Cross-Document Payments — REAL payments affecting balance (same vendor + project) */}
              {/* ═══════════════════════════════════════════════════════ */}
              {selectedDocument?.cross_document_payments && selectedDocument.cross_document_payments.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 dark:bg-amber-800 rounded-lg p-1.5">
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <span className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                        {isArabic 
                          ? `دفعات سابقة لنفس المورد والمشروع (${selectedDocument.project_code}) — محتسبة من الرصيد` 
                          : `Prior Payments — Same Vendor & Project (${selectedDocument.project_code}) — Deducted from Balance`}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      {isArabic ? 'الإجمالي:' : 'Total:'} {(selectedDocument.cross_document_total || 0).toLocaleString()} {selectedDocument.currency_code}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-amber-200 dark:border-amber-700">
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 dark:text-amber-400">{isArabic ? 'رقم الدفعة' : 'Payment #'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 dark:text-amber-400">{isArabic ? 'التاريخ' : 'Date'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 dark:text-amber-400">{isArabic ? 'المستند' : 'Document'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 dark:text-amber-400">{isArabic ? 'النوع' : 'Type'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-700 dark:text-amber-400">{isArabic ? 'المبلغ' : 'Amount'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDocument.cross_document_payments.map((cp) => (
                          <tr key={cp.id} className="border-b border-amber-100 dark:border-amber-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                            <td className="px-3 py-2 text-amber-900 dark:text-amber-200 font-mono text-xs">{cp.payment_number}</td>
                            <td className="px-3 py-2 text-amber-800 dark:text-amber-300 text-xs">{cp.payment_date ? new Date(cp.payment_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US') : '-'}</td>
                            <td className="px-3 py-2 text-amber-800 dark:text-amber-300 text-xs font-mono">{cp.source_document_number || '-'}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded text-[10px] font-medium">
                                {cp.source_type === 'po' ? (isArabic ? 'أمر شراء' : 'PO') :
                                 cp.source_type === 'shipment' ? (isArabic ? 'شحنة' : 'Shipment') :
                                 cp.source_type === 'quotation' ? (isArabic ? 'عرض سعر' : 'Quotation') :
                                 cp.source_type === 'invoice' ? (isArabic ? 'فاتورة' : 'Invoice') : cp.source_type}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-semibold text-amber-900 dark:text-amber-200 text-xs">
                              {parseFloat(String(cp.payment_amount)).toLocaleString()} {cp.currency_code}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    {isArabic 
                      ? `⚡ هذه الدفعات محتسبة فعلياً وتم خصم ${(selectedDocument.cross_document_total || 0).toLocaleString()} من الرصيد المتاح لهذا المستند` 
                      : `⚡ These payments are active — ${(selectedDocument.cross_document_total || 0).toLocaleString()} deducted from this document's available balance`}
                  </div>
                </div>
              )}

              {/* LC Blocked - disable payment details */}
              {selectedDocument?.lc_payment_blocked && (
                <div className="col-span-full mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 text-center">
                  <p className="text-red-700 dark:text-red-300 font-medium">
                    {isArabic 
                      ? '⛔ الدفع محظور — هذه الشحنة مرتبطة باعتماد مستندي. يرجى الدفع عبر شاشة الاعتمادات المستندية.' 
                      : '⛔ Payment blocked — this shipment is linked to an LC. Please use the Letters of Credit module.'}
                  </p>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* Payment Form Fields */}
              {/* ═══════════════════════════════════════════════════════ */}
              <div className={`${selectedDocument?.lc_payment_blocked ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* Smart Hints Bar */}
                {selectedDocument && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedDocument.document_payment_method && (
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        {isArabic ? 'طريقة الدفع مقفلة حسب المستند' : 'Payment method locked per document'}
                      </div>
                    )}
                    {activeCurrency && activeCurrency.code !== 'SAR' && (
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        {isArabic ? `عملة أجنبية (${activeCurrency.code}) — تأكد من سعر الصرف` : `Foreign currency (${activeCurrency.code}) — verify exchange rate`}
                      </div>
                    )}
                    {selectedDocument.balance > 0 && parseFloat(formData.payment_amount || '0') > effectiveBalance && effectiveBalance > 0 && (
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        {isArabic ? '⚠️ المبلغ يتجاوز الرصيد الفعلي المتاح!' : '⚠️ Amount exceeds effective available balance!'}
                      </div>
                    )}
                    {(selectedDocument.cross_document_total || 0) > 0 && (
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {isArabic 
                          ? `يوجد ${selectedDocument.cross_document_payments?.length || 0} دفعات سابقة لنفس المشروع — مخصومة من الرصيد` 
                          : `${selectedDocument.cross_document_payments?.length || 0} prior payment(s) for same project — deducted from balance`}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    type="date"
                    label={isArabic ? 'تاريخ الدفع *' : 'Payment Date *'}
                    value={formData.payment_date}
                    onChange={(e) => handleInputChange('payment_date', e.target.value)}
                    error={errors.payment_date}
                    required
                  />

                  {/* Payment method - locked when document specifies it */}
                  <div>
                    <Select
                      label={isArabic 
                        ? (selectedDocument?.document_payment_method ? 'طريقة الدفع * (من المستند 🔒)' : 'طريقة الدفع *')
                        : (selectedDocument?.document_payment_method ? 'Payment Method * (from document 🔒)' : 'Payment Method *')}
                      value={formData.payment_method}
                      onChange={(e) => handleInputChange('payment_method', e.target.value)}
                      error={errors.payment_method}
                      disabled={!!selectedDocument?.document_payment_method}
                      required
                    >
                      <option value="">{isArabic ? 'اختر طريقة الدفع' : 'Select Payment Method'}</option>
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>
                          {isArabic && method.name_ar ? method.name_ar : method.name}
                        </option>
                      ))}
                    </Select>
                    {selectedDocument?.document_payment_method && (
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        {isArabic ? 'محددة تلقائياً من المستند المصدري' : 'Auto-set from source document'}
                      </p>
                    )}
                  </div>

                  {/* Conditional fields based on payment method type */}
                  {formData.payment_method_type === 'cash' && (
                    <Select
                      label={isArabic ? 'الصندوق *' : 'Cash Box *'}
                      value={formData.cash_box_id}
                      onChange={(e) => handleInputChange('cash_box_id', e.target.value)}
                      error={errors.cash_box_id}
                      required
                    >
                      <option value="">{isArabic ? 'اختر الصندوق' : 'Select Cash Box'}</option>
                      {cashBoxes.map(box => (
                        <option key={box.id} value={box.id}>
                          {isArabic && box.name_ar ? box.name_ar : box.name} ({box.currency_code})
                        </option>
                      ))}
                    </Select>
                  )}

                  {formData.payment_method_type === 'bank' && (
                    <Select
                      label={isArabic ? 'الحساب البنكي *' : 'Bank Account *'}
                      value={formData.bank_account_id}
                      onChange={(e) => handleInputChange('bank_account_id', e.target.value)}
                      error={errors.bank_account_id}
                      required
                    >
                      <option value="">{isArabic ? 'اختر الحساب البنكي' : 'Select Bank Account'}</option>
                      {bankAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number} ({account.currency_code})
                        </option>
                      ))}
                    </Select>
                  )}

                  {formData.payment_method_type === 'cheque' && (
                    <Input
                      type="text"
                      label={isArabic ? 'رقم الشيك *' : 'Cheque Number *'}
                      value={formData.reference_number}
                      onChange={(e) => handleInputChange('reference_number', e.target.value)}
                      placeholder={isArabic ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                      required
                    />
                  )}

                  {formData.payment_method_type === 'lc' && (
                    <Select
                      label={isArabic ? 'الاعتماد المستندي *' : 'Letter of Credit *'}
                      value={formData.lc_id}
                      onChange={(e) => handleInputChange('lc_id', e.target.value)}
                      disabled={!!linkedLC}
                      required
                    >
                      <option value="">{isArabic ? 'اختر الاعتماد المستندي' : 'Select LC'}</option>
                      {vendorLCs.map(lc => (
                        <option key={lc.id} value={lc.id}>
                          {lc.lc_number} - {parseFloat(String(lc.available_amount || lc.current_amount || 0)).toLocaleString()} {lc.currency_code}
                        </option>
                      ))}
                    </Select>
                  )}

                  {/* Show LC field when document is LC-linked, regardless of payment method */}
                  {lcRequired && linkedLC && formData.payment_method_type !== 'lc' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {isArabic ? 'الاعتماد المستندي (مرتبط تلقائياً) *' : 'Letter of Credit (Auto-linked) *'}
                      </label>
                      <div className="w-full px-3 py-2 border border-indigo-300 dark:border-indigo-600 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 font-medium">
                        {linkedLC.lc_number} — {linkedLC.bank_name || ''} — {isArabic ? 'متاح:' : 'Avail:'} {parseFloat(String(linkedLC.available_amount || 0)).toLocaleString()} {linkedLC.currency_code}
                      </div>
                      {errors.lc_id && <p className="mt-1 text-sm text-red-500">{errors.lc_id}</p>}
                    </div>
                  )}

                  <Input
                    type="text"
                    label={isArabic ? 'رقم المرجع' : 'Reference Number'}
                    placeholder={isArabic ? 'رقم الشيك، رقم الحوالة، إلخ' : 'Check number, wire ref, etc.'}
                    value={formData.reference_number}
                    onChange={(e) => handleInputChange('reference_number', e.target.value)}
                  />
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════ */}
              {/* Amount Section */}
              {/* ═══════════════════════════════════════════════════════ */}
              <div className={`mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 ${selectedDocument?.lc_payment_blocked ? 'opacity-40 pointer-events-none' : ''}`}>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {isArabic ? 'المبلغ والعملة' : 'Amount & Currency'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Select
                      label={isArabic ? 'العملة *' : 'Currency *'}
                      value={formData.currency_id}
                      onChange={(e) => {
                        handleInputChange('currency_id', e.target.value);
                        // Reset exchange rate when currency changes
                        const selectedCur = currencies.find(c => c.id === parseInt(e.target.value));
                        if (selectedCur && selectedCur.code !== 'SAR') {
                          // Keep existing exchange rate or set to document's rate
                          setFormData(prev => ({
                            ...prev,
                            exchange_rate: selectedDocument?.document_exchange_rate 
                              ? String(selectedDocument.document_exchange_rate) 
                              : prev.exchange_rate
                          }));
                        } else {
                          setFormData(prev => ({ ...prev, exchange_rate: '1.000000' }));
                        }
                      }}
                      error={errors.currency_id}
                      required
                    >
                      <option value="">{isArabic ? 'اختر العملة' : 'Select Currency'}</option>
                      {currencies.map(currency => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </Select>
                    {selectedDocument && activeCurrency && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {isArabic ? `عملة المستند: ${selectedDocument.currency_code}` : `Document currency: ${selectedDocument.currency_code}`}
                        {activeCurrency.code !== selectedDocument.currency_code && (
                          <span className="text-red-500 font-medium ml-1">
                            {isArabic ? '(مختلفة!)' : '(mismatch!)'}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {selectedDocument && (
                    <div>
                      <Input
                        type="number"
                        label={isArabic ? 'نسبة الدفع %' : 'Payment %'}
                        placeholder="100"
                        step="1"
                        min="1"
                        max="100"
                        value={formData.payment_percentage}
                        onChange={(e) => handleInputChange('payment_percentage', e.target.value)}
                      />
                      <div className="mt-1 flex gap-2">
                        {[25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleInputChange('payment_percentage', String(pct))}
                            className={`px-2 py-1 text-xs rounded border transition-all ${
                              formData.payment_percentage === String(pct)
                                ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-200 shadow-sm'
                                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Input
                    type="number"
                    label={isArabic ? 'مبلغ الدفع *' : 'Payment Amount *'}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={formData.payment_amount}
                    onChange={(e) => {
                      handleInputChange('payment_amount', e.target.value);
                      // Clear percentage when manually editing
                      setFormData(prev => ({ ...prev, payment_percentage: '' }));
                    }}
                    error={errors.payment_amount}
                    required
                  />

                  <ExchangeRateField
                    currencyCode={activeCurrency?.code}
                    value={formData.exchange_rate}
                    onChange={(v) => handleInputChange('exchange_rate', v)}
                    label={isArabic ? 'سعر الصرف' : 'Exchange Rate'}
                    hideWhenBaseCurrency
                  />
                </div>

                {/* Payment Calculation Summary */}
                {selectedDocument && (
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-xs text-orange-600 dark:text-orange-400">{isArabic ? 'المتبقي بعد هذه الدفعة' : 'Remaining After This Payment'}</span>
                      </div>
                      <div className={`text-xl font-bold ${remainingAfterPayment < 0 ? 'text-red-600 dark:text-red-400' : remainingAfterPayment === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-700 dark:text-orange-300'}`}>
                        {remainingAfterPayment.toLocaleString()} {selectedDocument.currency_code}
                      </div>
                      {remainingAfterPayment < 0 && (
                        <div className="text-[10px] text-red-500 dark:text-red-400 mt-1 font-medium">
                          {isArabic ? '⚠️ دفع زائد عن المستند!' : '⚠️ Overpayment!'}
                        </div>
                      )}
                      {remainingAfterPayment === 0 && (
                        <div className="text-[10px] text-green-500 dark:text-green-400 mt-1 font-medium">
                          {isArabic ? '✅ سيتم سداد المستند بالكامل' : '✅ Document will be fully paid'}
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <span className="text-xs text-blue-600 dark:text-blue-400">{isArabic ? 'المبلغ بالعملة الأساسية' : 'Base Amount (SAR)'}</span>
                      </div>
                      <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {(parseFloat(formData.payment_amount || '0') * parseFloat(formData.exchange_rate || '1')).toLocaleString()} SAR
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <span className="text-xs text-violet-600 dark:text-violet-400">{isArabic ? 'نسبة السداد بعد الدفع' : 'Completion After Payment'}</span>
                      </div>
                      <div className="text-xl font-bold text-violet-700 dark:text-violet-300">
                        {selectedDocument.total_amount > 0 
                          ? Math.min(100, Math.round(((parseFloat(String(selectedDocument.paid_amount || 0)) + (selectedDocument.cross_document_total || 0) + parseFloat(formData.payment_amount || '0')) / parseFloat(String(selectedDocument.total_amount))) * 100))
                          : 0}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Remaining after payment for direct payments (no document) */}
                {!selectedDocument && formData.payment_amount && parseFloat(formData.payment_amount) > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-blue-600 dark:text-blue-400">{isArabic ? 'المبلغ بالعملة الأساسية' : 'Base Amount (SAR)'}</div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      {(parseFloat(formData.payment_amount || '0') * parseFloat(formData.exchange_rate || '1')).toLocaleString()} SAR
                    </div>
                  </div>
                )}

                {/* Amount in words */}
                {formData.payment_amount && parseFloat(formData.payment_amount) > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{isArabic ? 'المبلغ بالحروف' : 'Amount in Words'}</span>
                    </div>
                    <div className="text-md font-medium text-gray-900 dark:text-white">
                      {formData.amount_in_words}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Description/Notes */}
          {autoDescription && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-sm">5</span>
                {isArabic ? 'وصف الدفعة' : 'Payment Description'}
              </h2>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-300 font-medium">
                  {autoDescription}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={submitting}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting || !formData.vendor_id || !paymentTypeDecided || !!selectedDocument?.lc_payment_blocked}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
            >
              {isArabic ? 'حفظ الدفعة' : 'Save Payment'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

/**
 * Convert number to Arabic words with currency
 */
function numberToArabicWords(num: number, currencyCode: string): string {
  if (!num || num === 0) return '';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
    'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  const currencyNames: Record<string, { singular: string; plural: string; fraction: string }> = {
    SAR: { singular: 'ريال سعودي', plural: 'ريالات سعودية', fraction: 'هللة' },
    USD: { singular: 'دولار أمريكي', plural: 'دولارات أمريكية', fraction: 'سنت' },
    EUR: { singular: 'يورو', plural: 'يورو', fraction: 'سنت' },
    AED: { singular: 'درهم إماراتي', plural: 'دراهم إماراتية', fraction: 'فلس' },
    EGP: { singular: 'جنيه مصري', plural: 'جنيهات مصرية', fraction: 'قرش' },
    GBP: { singular: 'جنيه إسترليني', plural: 'جنيهات إسترلينية', fraction: 'بنس' },
    KWD: { singular: 'دينار كويتي', plural: 'دنانير كويتية', fraction: 'فلس' },
    BHD: { singular: 'دينار بحريني', plural: 'دنانير بحرينية', fraction: 'فلس' },
    OMR: { singular: 'ريال عماني', plural: 'ريالات عمانية', fraction: 'بيسة' },
    QAR: { singular: 'ريال قطري', plural: 'ريالات قطرية', fraction: 'درهم' },
    JOD: { singular: 'دينار أردني', plural: 'دنانير أردنية', fraction: 'قرش' },
    IQD: { singular: 'دينار عراقي', plural: 'دنانير عراقية', fraction: 'فلس' },
    TRY: { singular: 'ليرة تركية', plural: 'ليرات تركية', fraction: 'قرش' },
    CNY: { singular: 'يوان صيني', plural: 'يوانات صينية', fraction: 'فن' },
    INR: { singular: 'روبية هندية', plural: 'روبيات هندية', fraction: 'بيسة' },
  };

  const currency = currencyNames[currencyCode] || { singular: currencyCode, plural: currencyCode, fraction: 'جزء' };
  
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const remainder = n % 10;
      return remainder === 0 ? tens[Math.floor(n / 10)] : `${ones[remainder]} و${tens[Math.floor(n / 10)]}`;
    }
    const remainder = n % 100;
    return remainder === 0 ? hundreds[Math.floor(n / 100)] : `${hundreds[Math.floor(n / 100)]} و${convertLessThanThousand(remainder)}`;
  };

  const convertToWords = (n: number): string => {
    if (n === 0) return 'صفر';
    if (n < 1000) return convertLessThanThousand(n);
    if (n < 1000000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      let result = '';
      if (thousands === 1) result = 'ألف';
      else if (thousands === 2) result = 'ألفان';
      else if (thousands <= 10) result = `${convertLessThanThousand(thousands)} آلاف`;
      else result = `${convertLessThanThousand(thousands)} ألف`;
      return remainder === 0 ? result : `${result} و${convertLessThanThousand(remainder)}`;
    }
    if (n < 1000000000) {
      const millions = Math.floor(n / 1000000);
      const remainder = n % 1000000;
      let result = '';
      if (millions === 1) result = 'مليون';
      else if (millions === 2) result = 'مليونان';
      else result = `${convertLessThanThousand(millions)} مليون`;
      return remainder === 0 ? result : `${result} و${convertToWords(remainder)}`;
    }
    return num.toLocaleString('ar-SA');
  };

  let result = `${convertToWords(intPart)} ${intPart > 10 ? currency.plural : currency.singular}`;
  if (decPart > 0) {
    result += ` و${convertToWords(decPart)} ${currency.fraction}`;
  }
  
  return result + ' فقط لا غير';
}
