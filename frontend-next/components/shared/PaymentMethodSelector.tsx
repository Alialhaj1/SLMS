import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  requires_bank_account: boolean;
  requires_reference: boolean;
  requires_cheque_number: boolean;
  requires_due_date: boolean;
  payment_type: 'CASH' | 'BANK' | 'CHEQUE' | 'CREDIT' | string;
  payment_behavior?: 'cash' | 'bank' | 'check' | 'credit' | 'digital' | 'lc' | 'sadad' | 'offset' | 'barter' | 'bg' | 'crypto' | string;
  clearing_days?: number;
  min_amount?: number;
  max_amount?: number;
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

/** Behavior info exposed to parent forms */
export interface PaymentBehaviorInfo {
  behavior: string;
  requiresReference: boolean;
  requiresBankAccount: boolean;
  requiresChequeNumber: boolean;
  requiresDueDate: boolean;
  showBankAccount: boolean;
  showCashBox: boolean;
  showChequeFields: boolean;
  showReferenceField: boolean;
  showDueDateField: boolean;
  showLcField: boolean;
  clearingDays: number;
  minAmount: number | null;
  maxAmount: number | null;
}

interface PaymentMethodSelectorProps {
  paymentMethodId: number | string | null;
  bankAccountId?: number | string | null;
  cashBoxId?: number | string | null;
  chequeNumber?: string;
  chequeDate?: string;
  referenceNumber?: string;
  dueDate?: string;
  onPaymentMethodChange: (methodId: number, type: string, behavior?: string) => void;
  onBankAccountChange: (accountId: number | null) => void;
  onCashBoxChange?: (boxId: number | null) => void;
  onChequeNumberChange?: (value: string) => void;
  onChequeDateChange?: (value: string) => void;
  onReferenceChange?: (value: string) => void;
  onDueDateChange?: (value: string) => void;
  /** Callback with full behavior info when method changes */
  onBehaviorChange?: (info: PaymentBehaviorInfo | null) => void;
  companyId: number;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  locale?: string;
  /** If true, render inline fields (cheque, reference, due date) inside this component */
  showInlineFields?: boolean;
}

export default function PaymentMethodSelector({
  paymentMethodId,
  bankAccountId,
  cashBoxId,
  chequeNumber,
  chequeDate,
  referenceNumber,
  dueDate,
  onPaymentMethodChange,
  onBankAccountChange,
  onCashBoxChange,
  onChequeNumberChange,
  onChequeDateChange,
  onReferenceChange,
  onDueDateChange,
  onBehaviorChange,
  companyId,
  label,
  required = false,
  error,
  disabled = false,
  locale = 'en',
  showInlineFields = false,
}: PaymentMethodSelectorProps) {

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [loading, setLoading] = useState(false);
  
  const selectedMethod = paymentMethods.find(m => m.id === Number(paymentMethodId));
  
  // Derive visibility from payment_behavior (primary) or payment_type (fallback)
  const beh = selectedMethod?.payment_behavior || '';
  const ptype = selectedMethod?.payment_type || '';
  
  const showBankAccount = beh === 'bank' || beh === 'check' || beh === 'credit' || beh === 'digital' || beh === 'bg'
    || selectedMethod?.requires_bank_account
    || ptype === 'BANK' || ptype === 'CHEQUE';
  const showCashBox = beh === 'cash' || ptype === 'CASH';
  const showChequeFields = beh === 'check' || ptype === 'CHEQUE';
  const showReferenceField = beh === 'bank' || beh === 'sadad' || beh === 'digital' || selectedMethod?.requires_reference;
  const showDueDateField = beh === 'check' || beh === 'lc' || beh === 'bg' || selectedMethod?.requires_due_date;
  const showLcField = beh === 'lc';

  const isAr = locale === 'ar';

  /** Build behavior info for the currently selected method */
  const buildBehaviorInfo = useCallback((method: PaymentMethod | undefined): PaymentBehaviorInfo | null => {
    if (!method) return null;
    const b = method.payment_behavior || '';
    const pt = method.payment_type || '';
    return {
      behavior: b,
      requiresReference: method.requires_reference || false,
      requiresBankAccount: method.requires_bank_account || false,
      requiresChequeNumber: method.requires_cheque_number || false,
      requiresDueDate: method.requires_due_date || false,
      showBankAccount: b === 'bank' || b === 'check' || b === 'credit' || b === 'digital' || b === 'bg' || method.requires_bank_account || pt === 'BANK' || pt === 'CHEQUE',
      showCashBox: b === 'cash' || pt === 'CASH',
      showChequeFields: b === 'check' || pt === 'CHEQUE',
      showReferenceField: b === 'bank' || b === 'sadad' || b === 'digital' || method.requires_reference,
      showDueDateField: b === 'check' || b === 'lc' || b === 'bg' || method.requires_due_date,
      showLcField: b === 'lc',
      clearingDays: method.clearing_days || 0,
      minAmount: method.min_amount ?? null,
      maxAmount: method.max_amount ?? null,
    };
  }, []);

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
            fetch(`/api/finance/payment-methods?company_id=${companyId}&is_active=true`, { headers: getHeaders() }),
            fetch(`/api/finance/bank-accounts?company_id=${companyId}&is_active=true`, { headers: getHeaders() }),
            fetch(`/api/finance/cash-boxes?company_id=${companyId}&is_active=true`, { headers: getHeaders() })
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
        onPaymentMethodChange(0, '', '');
        if (onBehaviorChange) onBehaviorChange(null);
        return;
    }
    const method = paymentMethods.find(m => m.id === id);
    if (method) {
      const b = method.payment_behavior || '';
      const pt = method.payment_type || '';
      onPaymentMethodChange(method.id, pt, b);
      
      // Fire behavior info callback
      if (onBehaviorChange) {
        onBehaviorChange(buildBehaviorInfo(method));
      }
      
      // Reset dependent fields based on behavior
      const needsBank = b === 'bank' || b === 'check' || b === 'credit' || b === 'digital' || b === 'bg' || method.requires_bank_account;
      const needsCash = b === 'cash' || pt === 'CASH';
      const needsCheque = b === 'check';
      const needsRef = b === 'bank' || b === 'sadad' || b === 'digital' || method.requires_reference;
      const needsDue = b === 'check' || b === 'lc' || b === 'bg' || method.requires_due_date;
      
      // Clear bank account if not needed
      if (!needsBank) {
        onBankAccountChange(null);
      }
      
      // Clear cash box if not needed
      if (!needsCash && onCashBoxChange) {
        onCashBoxChange(null);
      }
      
      // Clear cheque fields if not needed
      if (!needsCheque) {
        if (onChequeNumberChange) onChequeNumberChange('');
        if (onChequeDateChange) onChequeDateChange('');
      }
      
      // Clear reference if not needed
      if (!needsRef && onReferenceChange) {
        onReferenceChange('');
      }
      
      // Clear due date if not needed
      if (!needsDue && onDueDateChange) {
        onDueDateChange('');
      }
    }
  };

  // Fire behavior info when methods load and we have a pre-selected method
  useEffect(() => {
    if (paymentMethodId && paymentMethods.length > 0 && onBehaviorChange) {
      const method = paymentMethods.find(m => m.id === Number(paymentMethodId));
      onBehaviorChange(buildBehaviorInfo(method));
    }
  }, [paymentMethods, paymentMethodId]);

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

      {/* Inline Behavior-Driven Fields */}
      {showInlineFields && selectedMethod && (
        <div className="animate-fadeIn space-y-3">
          {/* Cheque Number + Date (for check behavior) */}
          {showChequeFields && (
            <div className="grid grid-cols-2 gap-3 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'رقم الشيك' : 'Cheque Number'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={chequeNumber || ''}
                  onChange={(e) => onChequeNumberChange?.(e.target.value)}
                  disabled={disabled}
                  placeholder={isAr ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                  className="input w-full dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'تاريخ الشيك' : 'Cheque Date'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="date"
                  value={chequeDate || ''}
                  onChange={(e) => onChequeDateChange?.(e.target.value)}
                  disabled={disabled}
                  className="input w-full dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
            </div>
          )}

          {/* Reference Number (for bank, sadad, digital) */}
          {showReferenceField && !showChequeFields && onReferenceChange && (
            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'رقم المرجع / الحوالة' : 'Reference / Transfer Number'}
                {selectedMethod.requires_reference && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={referenceNumber || ''}
                onChange={(e) => onReferenceChange(e.target.value)}
                disabled={disabled}
                placeholder={isAr ? 'رقم التحويل أو المرجع' : 'Transfer or reference number'}
                className="input w-full dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
          )}

          {/* Due Date (for check, lc, bg) */}
          {showDueDateField && onDueDateChange && (
            <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                {selectedMethod.requires_due_date && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="date"
                value={dueDate || ''}
                onChange={(e) => onDueDateChange(e.target.value)}
                disabled={disabled}
                className="input w-full dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
          )}

          {/* Behavior indicator badge */}
          {beh && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className={clsx(
                'px-2 py-0.5 rounded-full font-medium',
                beh === 'cash' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                beh === 'bank' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                beh === 'check' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                beh === 'credit' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                beh === 'digital' && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
                beh === 'lc' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                beh === 'sadad' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                (beh === 'offset' || beh === 'barter') && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                beh === 'bg' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
              )}>
                {beh.toUpperCase()}
              </span>
              {selectedMethod.clearing_days !== undefined && selectedMethod.clearing_days > 0 && (
                <span>{isAr ? `مقاصة: ${selectedMethod.clearing_days} يوم` : `Clearing: ${selectedMethod.clearing_days} days`}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
