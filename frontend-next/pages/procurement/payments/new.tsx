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

  // Get currency from document or vendor
  const activeCurrency = useMemo(() => {
    if (selectedDocument?.currency_id) {
      return currencies.find(c => c.id === selectedDocument.currency_id);
    }
    if (selectedVendor?.currency_id) {
      return currencies.find(c => c.id === selectedVendor.currency_id);
    }
    return currencies.find(c => c.code === 'SAR');
  }, [selectedDocument, selectedVendor, currencies]);

  // Calculate remaining after payment
  const remainingAfterPayment = useMemo(() => {
    if (!selectedDocument) return 0;
    const amount = parseFloat(formData.payment_amount) || 0;
    return Math.max(0, Number(selectedDocument.balance) - amount);
  }, [selectedDocument, formData.payment_amount]);

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

  // Update payment amount based on percentage
  useEffect(() => {
    if (selectedDocument && formData.payment_percentage) {
      const percentage = parseFloat(formData.payment_percentage) || 0;
      const docBalance = Number(selectedDocument.balance) || 0;
      const amount = (docBalance * percentage) / 100;
      setFormData(prev => ({ 
        ...prev, 
        payment_amount: amount.toFixed(2),
        amount_in_words: numberToArabicWords(amount, activeCurrency?.code || 'SAR')
      }));
    }
  }, [formData.payment_percentage, selectedDocument]);

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
        fetch('http://localhost:4000/api/procurement/vendors?limit=1000', { headers }),
        fetch('http://localhost:4000/api/currencies', { headers }),
        fetch('http://localhost:4000/api/procurement/payments/reference-data/all', { headers })
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
        `http://localhost:4000/api/procurement/payments/vendor/${formData.vendor_id}/documents?source_type=${formData.source_type}`,
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
        `http://localhost:4000/api/procurement/payments/vendor/${formData.vendor_id}/document/${formData.source_type}/${formData.document_id}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.data) {
        setSelectedDocument(data.data);
        // Auto-set currency and project
        setFormData(prev => ({
          ...prev,
          currency_id: String(data.data.currency_id),
          payment_amount: String(data.data.balance || 0),
          payment_percentage: '100'
        }));
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      showToast(isArabic ? 'فشل تحميل تفاصيل المستند' : 'Failed to load document details', 'error');
    } finally {
      setLoadingDocumentDetails(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendor_id) newErrors.vendor_id = isArabic ? 'المورد مطلوب' : 'Vendor is required';
    if (!formData.payment_date) newErrors.payment_date = isArabic ? 'التاريخ مطلوب' : 'Date is required';
    if (!formData.currency_id) newErrors.currency_id = isArabic ? 'العملة مطلوبة' : 'Currency is required';
    if (!formData.payment_amount || parseFloat(formData.payment_amount) <= 0) {
      newErrors.payment_amount = isArabic ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero';
    }
    
    // Validate payment amount doesn't exceed document balance
    if (selectedDocument && parseFloat(formData.payment_amount) > parseFloat(String(selectedDocument.balance))) {
      newErrors.payment_amount = isArabic 
        ? `المبلغ يتجاوز الرصيد المتبقي (${parseFloat(String(selectedDocument.balance)).toLocaleString()})` 
        : `Amount exceeds remaining balance (${parseFloat(String(selectedDocument.balance)).toLocaleString()})`;
    }
    
    if (!formData.payment_method) {
      newErrors.payment_method = isArabic ? 'طريقة الدفع مطلوبة' : 'Payment method is required';
    }

    // Validate payment destination based on method type
    if (formData.payment_method_type === 'cash' && !formData.cash_box_id) {
      newErrors.cash_box_id = isArabic ? 'الصندوق مطلوب' : 'Cash box is required';
    }
    if (formData.payment_method_type === 'bank' && !formData.bank_account_id) {
      newErrors.bank_account_id = isArabic ? 'الحساب البنكي مطلوب' : 'Bank account is required';
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

      const response = await fetch('http://localhost:4000/api/procurement/payments', {
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isArabic ? 'دفعة مورد جديدة' : 'New Vendor Payment'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isArabic ? 'إنشاء دفعة جديدة للمورد مع ربط المستندات' : 'Create new vendor payment with document linking'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.back()}>
            {isArabic ? 'رجوع' : 'Back'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Vendor Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
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
            </div>
          </div>

          {/* Step 2: Source Type & Document Selection */}
          {formData.vendor_id && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
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
          {formData.vendor_id && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                {isArabic ? 'تفاصيل الدفع' : 'Payment Details'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  type="date"
                  label={isArabic ? 'تاريخ الدفع *' : 'Payment Date *'}
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  error={errors.payment_date}
                  required
                />

                <Select
                  label={isArabic ? 'طريقة الدفع *' : 'Payment Method *'}
                  value={formData.payment_method}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  error={errors.payment_method}
                  required
                >
                  <option value="">{isArabic ? 'اختر طريقة الدفع' : 'Select Payment Method'}</option>
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.id}>
                      {isArabic && method.name_ar ? method.name_ar : method.name}
                    </option>
                  ))}
                </Select>

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

                <Input
                  type="text"
                  label={isArabic ? 'رقم المرجع' : 'Reference Number'}
                  placeholder={isArabic ? 'رقم الشيك، رقم الحوالة، إلخ' : 'Check number, wire ref, etc.'}
                  value={formData.reference_number}
                  onChange={(e) => handleInputChange('reference_number', e.target.value)}
                />
              </div>

              {/* Amount Section */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  {isArabic ? 'المبلغ' : 'Amount'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select
                    label={isArabic ? 'العملة *' : 'Currency *'}
                    value={formData.currency_id}
                    onChange={(e) => handleInputChange('currency_id', e.target.value)}
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
                            className={`px-2 py-1 text-xs rounded border ${
                              formData.payment_percentage === String(pct)
                                ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-200'
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

                  <Input
                    type="number"
                    label={isArabic ? 'سعر الصرف' : 'Exchange Rate'}
                    placeholder="1.000000"
                    step="0.000001"
                    min="0.000001"
                    value={formData.exchange_rate}
                    onChange={(e) => handleInputChange('exchange_rate', e.target.value)}
                  />
                </div>

                {/* Remaining after payment */}
                {selectedDocument && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-sm text-orange-600 dark:text-orange-400">{isArabic ? 'المتبقي بعد الدفع' : 'Remaining After Payment'}</div>
                      <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                        {remainingAfterPayment.toLocaleString()} {selectedDocument.currency_code}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-blue-600 dark:text-blue-400">{isArabic ? 'المبلغ الأساسي' : 'Base Amount (SAR)'}</div>
                      <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {(parseFloat(formData.payment_amount || '0') * parseFloat(formData.exchange_rate || '1')).toLocaleString()} SAR
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount in words */}
                {formData.payment_amount && parseFloat(formData.payment_amount) > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isArabic ? 'المبلغ بالحروف' : 'Amount in Words'}</div>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
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
              disabled={submitting || !formData.vendor_id}
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
    EGP: { singular: 'جنيه مصري', plural: 'جنيهات مصرية', fraction: 'قرش' }
  };

  const currency = currencyNames[currencyCode] || currencyNames['SAR'];
  
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
