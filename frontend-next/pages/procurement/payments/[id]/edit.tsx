/**
 * Vendor Payment Edit Page
 * Allows editing of draft vendor payments
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useToast } from '../../../../contexts/ToastContext';
import { useLocale } from '../../../../contexts/LocaleContext';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { companyStore } from '../../../../lib/companyStore';

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
}

interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  bank_name: string;
  currency_code: string;
}

interface Currency {
  id: number;
  code: string;
  symbol: string;
  name: string;
}

interface PaymentDetails {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor_id: number;
  vendor_code: string;
  vendor_name: string;
  payment_amount: string;
  currency_id: number;
  currency_code: string;
  payment_method: string;
  bank_account_id?: number;
  cash_box_id?: number;
  reference_number?: string;
  exchange_rate: string;
  notes?: string;
  status: string;
  purchase_order_id?: number;
  shipment_id?: number;
  source_type?: string;
}

export default function EditVendorPaymentPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Reference data
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    payment_date: '',
    payment_method: '',
    payment_method_type: '',
    bank_account_id: '',
    cash_box_id: '',
    reference_number: '',
    currency_id: '',
    payment_amount: '',
    exchange_rate: '1.000000',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId() || 1;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Company-Id': String(companyId)
    };
  };

  useEffect(() => {
    if (id) {
      fetchPayment();
      fetchReferenceData();
    }
  }, [id]);

  const fetchPayment = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/procurement/payments/${id}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch payment');
      const result = await response.json();
      const data = result.data;
      
      setPayment(data);
      
      // Populate form
      setFormData({
        payment_date: data.payment_date?.split('T')[0] || '',
        payment_method: data.payment_method || '',
        payment_method_type: data.payment_method || '',
        bank_account_id: data.bank_account_id ? String(data.bank_account_id) : '',
        cash_box_id: data.cash_box_id ? String(data.cash_box_id) : '',
        reference_number: data.reference_number || '',
        currency_id: data.currency_id ? String(data.currency_id) : '',
        payment_amount: data.payment_amount || '',
        exchange_rate: data.exchange_rate || '1.000000',
        notes: data.notes || ''
      });
    } catch (error) {
      console.error('Error fetching payment:', error);
      showToast(isArabic ? 'فشل تحميل بيانات الدفعة' : 'Failed to load payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const headers = getHeaders();

      const [refRes, currRes] = await Promise.all([
        fetch('http://localhost:4000/api/procurement/payments/reference-data/all', { headers }),
        fetch('http://localhost:4000/api/currencies', { headers })
      ]);

      const refData = await refRes.json();
      const currData = await currRes.json();

      setCurrencies(currData.data || []);
      
      if (refData.data) {
        setPaymentMethods(refData.data.paymentMethods || []);
        setCashBoxes(refData.data.cashBoxes || []);
        setBankAccounts(refData.data.bankAccounts || []);
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
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
          cash_box_id: ''
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.payment_date) {
      newErrors.payment_date = isArabic ? 'التاريخ مطلوب' : 'Date is required';
    }
    if (!formData.currency_id) {
      newErrors.currency_id = isArabic ? 'العملة مطلوبة' : 'Currency is required';
    }
    if (!formData.payment_amount || parseFloat(formData.payment_amount) <= 0) {
      newErrors.payment_amount = isArabic ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero';
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
      const response = await fetch(`http://localhost:4000/api/procurement/payments/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          payment_date: formData.payment_date,
          payment_method: formData.payment_method_type || 'bank_transfer',
          bank_account_id: formData.bank_account_id ? parseInt(formData.bank_account_id) : null,
          cash_box_id: formData.cash_box_id ? parseInt(formData.cash_box_id) : null,
          reference_number: formData.reference_number,
          currency_id: parseInt(formData.currency_id),
          payment_amount: parseFloat(formData.payment_amount),
          exchange_rate: parseFloat(formData.exchange_rate) || 1,
          notes: formData.notes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update payment');
      }

      showToast(isArabic ? 'تم تحديث الدفعة بنجاح' : 'Payment updated successfully', 'success');
      router.push(`/procurement/payments/${id}`);
    } catch (error: any) {
      console.error('Error updating payment:', error);
      showToast(error.message || (isArabic ? 'فشل تحديث الدفعة' : 'Failed to update payment'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasPermission('procurement:payments:edit')) {
    return (
      <MainLayout>
        <Head><title>{isArabic ? 'تعديل الدفعة' : 'Edit Payment'} - SLMS</title></Head>
        <div className="text-center py-12">
          <p className="text-gray-500">{isArabic ? 'غير مصرح' : 'Access Denied'}</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <Head><title>{isArabic ? 'تعديل الدفعة' : 'Edit Payment'} - SLMS</title></Head>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!payment) {
    return (
      <MainLayout>
        <Head><title>{isArabic ? 'تعديل الدفعة' : 'Edit Payment'} - SLMS</title></Head>
        <div className="text-center py-12">
          <p className="text-gray-500">{isArabic ? 'الدفعة غير موجودة' : 'Payment not found'}</p>
        </div>
      </MainLayout>
    );
  }

  if (payment.status !== 'draft') {
    return (
      <MainLayout>
        <Head><title>{isArabic ? 'تعديل الدفعة' : 'Edit Payment'} - SLMS</title></Head>
        <div className="text-center py-12">
          <p className="text-red-500">{isArabic ? 'لا يمكن تعديل الدفعات المرحّلة' : 'Cannot edit posted payments'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.back()}>
            {isArabic ? 'رجوع' : 'Go Back'}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'تعديل الدفعة' : 'Edit Payment'} - SLMS</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isArabic ? 'تعديل الدفعة' : 'Edit Payment'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {payment.payment_number} - {payment.vendor_name}
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.back()}>
            {isArabic ? 'رجوع' : 'Back'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vendor Info (Read-only) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isArabic ? 'معلومات المورد' : 'Vendor Information'}
            </h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-900 dark:text-white">
                <strong>{isArabic ? 'المورد:' : 'Vendor:'}</strong> {payment.vendor_code} - {payment.vendor_name}
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
                label={isArabic ? 'طريقة الدفع' : 'Payment Method'}
                value={formData.payment_method}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
              >
                <option value="">{isArabic ? 'اختر طريقة الدفع' : 'Select Payment Method'}</option>
                {paymentMethods.map(method => (
                  <option key={method.id} value={method.id}>
                    {isArabic && method.name_ar ? method.name_ar : method.name}
                  </option>
                ))}
              </Select>

              {formData.payment_method_type === 'cash' && (
                <Select
                  label={isArabic ? 'الصندوق' : 'Cash Box'}
                  value={formData.cash_box_id}
                  onChange={(e) => handleInputChange('cash_box_id', e.target.value)}
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
                  label={isArabic ? 'الحساب البنكي' : 'Bank Account'}
                  value={formData.bank_account_id}
                  onChange={(e) => handleInputChange('bank_account_id', e.target.value)}
                >
                  <option value="">{isArabic ? 'اختر الحساب البنكي' : 'Select Bank Account'}</option>
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number} ({account.currency_code})
                    </option>
                  ))}
                </Select>
              )}

              <Input
                type="text"
                label={isArabic ? 'رقم المرجع' : 'Reference Number'}
                value={formData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
              />
            </div>

            {/* Amount Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                {isArabic ? 'المبلغ' : 'Amount'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <Input
                  type="number"
                  label={isArabic ? 'مبلغ الدفع *' : 'Payment Amount *'}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={formData.payment_amount}
                  onChange={(e) => handleInputChange('payment_amount', e.target.value)}
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
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isArabic ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </div>

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
              disabled={submitting}
            >
              {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
