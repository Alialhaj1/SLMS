import { useState, useEffect } from 'react';
import clsx from 'clsx';

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  requires_bank_account: boolean;
  payment_type: 'CASH' | 'BANK' | 'CHEQUE' | 'CREDIT' | string;
  is_active?: boolean;
}

export interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  account_name_ar?: string;
  bank_name: string;
  bank_name_ar?: string;
  currency_code?: string;
  is_active?: boolean;
}

export interface CashBox {
  id: number;
  name: string;
  name_ar?: string;
  currency_code?: string;
}

interface PaymentMethodSelectorProps {
  paymentMethodId: number | string | null;
  bankAccountId?: number | string | null;
  cashBoxId?: number | string | null;
  onPaymentMethodChange: (methodId: number, type: string) => void;
  onBankAccountChange: (accountId: number | null) => void;
  onCashBoxChange?: (boxId: number | null) => void;
  companyId: number;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  locale?: string;
}

export default function PaymentMethodSelector({
  paymentMethodId,
  bankAccountId,
  cashBoxId,
  onPaymentMethodChange,
  onBankAccountChange,
  onCashBoxChange,
  companyId,
  label,
  required = false,
  error,
  disabled = false,
  locale = 'en'
}: PaymentMethodSelectorProps) {

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [loading, setLoading] = useState(false);
  
  const selectedMethod = paymentMethods.find(m => m.id === Number(paymentMethodId));
  const showBankAccount = selectedMethod?.payment_type === 'BANK' || selectedMethod?.payment_type === 'CHEQUE' || selectedMethod?.requires_bank_account;
  const showCashBox = selectedMethod?.payment_type === 'CASH';

  const getToken = () => localStorage.getItem('accessToken');
  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'X-Company-Id': String(companyId),
  });

  useEffect(() => {
    const fetchReferences = async () => {
      setLoading(true);
      try {
        const [methodsRes, banksRes, boxesRes] = await Promise.all([
            fetch(`http://localhost:4000/api/finance/payment-methods?company_id=${companyId}&is_active=true`, { headers: getHeaders() }),
            fetch(`http://localhost:4000/api/finance/bank-accounts?company_id=${companyId}&is_active=true`, { headers: getHeaders() }),
            fetch(`http://localhost:4000/api/finance/cash-boxes?company_id=${companyId}&is_active=true`, { headers: getHeaders() })
        ]);

        if (methodsRes.ok) {
          const result = await methodsRes.json();
          setPaymentMethods(result.data || []);
        }
        if (banksRes.ok) {
          const result = await banksRes.json();
          setBankAccounts(result.data || []);
        }
        if (boxesRes.ok) {
            const result = await boxesRes.json();
            setCashBoxes(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch payment references:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
        fetchReferences();
    }
  }, [companyId]);

  const handlePaymentMethodChange = (methodIdStr: string) => {
    const id = Number(methodIdStr);
    if (!id) {
        onPaymentMethodChange(0, '');
        return;
    }
    const method = paymentMethods.find(m => m.id === id);
    if (method) {
      onPaymentMethodChange(method.id, method.payment_type);
      
      // Reset dependent fields logic
      const type = method.payment_type;
      
      // If NOT Bank/Cheque, clear Bank Account
      if (type !== 'BANK' && type !== 'CHEQUE' && !method.requires_bank_account) {
        onBankAccountChange(null);
      }
      
      // If NOT Cash, clear Cash Box
      if (type !== 'CASH') {
        if (onCashBoxChange) onCashBoxChange(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Method Dropdown */}
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          value={paymentMethodId || ''}
          onChange={(e) => handlePaymentMethodChange(e.target.value)}
          disabled={disabled || loading}
          className={clsx(
            'input w-full dark:bg-slate-700 dark:border-slate-600',
            error && 'border-red-500'
          )}
        >
          <option value="">
            {loading
              ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
              : (locale === 'ar' ? 'اختر طريقة الدفع' : 'Select Payment Method')}
          </option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.code} - {locale === 'ar' && method.name_ar ? method.name_ar : method.name}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Conditional Bank Account Dropdown */}
      {showBankAccount && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {locale === 'ar' ? 'الحساب البنكي' : 'Bank Account'}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={bankAccountId || ''}
            onChange={(e) => onBankAccountChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled}
            className="input w-full dark:bg-slate-700 dark:border-slate-600"
          >
            <option value="">{locale === 'ar' ? 'اختر الحساب البنكي' : 'Select Bank Account'}</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                 {locale === 'ar' ? account.bank_name_ar : account.bank_name} - {account.account_number} {account.currency_code ? `(${account.currency_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Conditional Cash Box Dropdown */}
      {showCashBox && onCashBoxChange && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {locale === 'ar' ? 'الصندوق / الخزينة' : 'Cash Box / Treasury'}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={cashBoxId || ''}
            onChange={(e) => onCashBoxChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled}
            className="input w-full dark:bg-slate-700 dark:border-slate-600"
          >
            <option value="">{locale === 'ar' ? 'اختر الصندوق' : 'Select Cash Box'}</option>
            {cashBoxes.map((box) => (
              <option key={box.id} value={box.id}>
                 {locale === 'ar' && box.name_ar ? box.name_ar : box.name} {box.currency_code ? `(${box.currency_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
