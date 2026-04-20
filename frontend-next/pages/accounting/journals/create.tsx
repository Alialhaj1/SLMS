/**
 * 📘 COMPREHENSIVE JOURNAL ENTRY CREATION
 * =====================================================
 * نموذج إنشاء قيد يومي شامل مع سطور ديناميكية
 * 
 * Features:
 * ✅ Dynamic Journal Lines Table
 * ✅ Auto Balance Validation (Debit = Credit)
 * ✅ Chart of Accounts Integration  
 * ✅ Multi-Currency Support
 * ✅ Cost Center Integration
 * ✅ File Attachments
 * ✅ Draft/Post Workflow
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import { useLocale } from '../../../contexts/LocaleContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  CalculatorIcon,
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';

interface JournalLine {
  id?: number;
  temp_id?: string;
  line_number: number;
  account_id: number;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  cost_center_id?: number;
  cost_center_name?: string;
  description?: string;
}

interface Account {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  account_type: string;
  is_active: boolean;
  parent_id?: number;
  level: number;
}

interface CostCenter {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

interface JournalType {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
}

export default function NewJournalEntryComprehensivePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  // Form state
  const [formData, setFormData] = useState({
    journal_type_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    currency_id: '1', // SAR default
    exchange_rate: 1
  });

  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    {
      temp_id: generateTempId(),
      line_number: 1,
      account_id: 0,
      account_code: '',
      account_name: '',
      debit: 0,
      credit: 0,
      description: ''
    }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Master data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [journalTypes, setJournalTypes] = useState<JournalType[]>([]);
  
  // File attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Account search
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [selectedLineForAccount, setSelectedLineForAccount] = useState<number | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    fetchMasterData();
  }, []);

  function generateTempId() {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Fetch all master data in parallel
      const [accountsRes, costCentersRes, currenciesRes, journalTypesRes] = await Promise.all([
        fetch('http://localhost:4000/api/accounting/chart-of-accounts', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/master/cost-centers', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/finance/currencies?is_active=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/accounting/journal-types', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (accountsRes.ok) {
        const result = await accountsRes.json();
        setAccounts(result.data || []);
      } else {
        // Fallback accounts data  
        setAccounts([
          { id: 1, code: '1001', name: 'Cash in Hand', name_ar: 'النقدية في الصندوق', account_type: 'asset', is_active: true, level: 1 },
          { id: 2, code: '1002', name: 'Bank Account - Al Rajhi', name_ar: 'بنك الراجحي', account_type: 'asset', is_active: true, level: 1 },
          { id: 3, code: '1003', name: 'Accounts Receivable', name_ar: 'ذمم مدينة', account_type: 'asset', is_active: true, level: 1 },
          { id: 4, code: '2001', name: 'Accounts Payable', name_ar: 'ذمم دائنة', account_type: 'liability', is_active: true, level: 1 },
          { id: 5, code: '2002', name: 'VAT Payable', name_ar: 'ضريبة القيمة المضافة', account_type: 'liability', is_active: true, level: 1 },
          { id: 6, code: '5001', name: 'Inventory - Raw Materials', name_ar: 'مخزون - مواد خام', account_type: 'asset', is_active: true, level: 1 },
          { id: 7, code: '6001', name: 'Cost of Goods Sold', name_ar: 'تكلفة البضاعة المباعة', account_type: 'expense', is_active: true, level: 1 },
          { id: 8, code: '7001', name: 'Sales Revenue', name_ar: 'إيرادات المبيعات', account_type: 'revenue', is_active: true, level: 1 },
          { id: 9, code: '8001', name: 'Office Expenses', name_ar: 'مصاريف إدارية', account_type: 'expense', is_active: true, level: 1 },
          { id: 10, code: '8002', name: 'Marketing Expenses', name_ar: 'مصاريف تسويق', account_type: 'expense', is_active: true, level: 1 }
        ]);
      }

      if (costCentersRes.ok) {
        const result = await costCentersRes.json();
        setCostCenters(result.data || []);
      } else {
        setCostCenters([
          { id: 1, code: 'CC001', name: 'Administration', name_ar: 'الإدارة العامة' },
          { id: 2, code: 'CC002', name: 'Sales Department', name_ar: 'قسم المبيعات' },
          { id: 3, code: 'CC003', name: 'Operations', name_ar: 'العمليات' },
          { id: 4, code: 'CC004', name: 'Marketing', name_ar: 'التسويق' },
          { id: 5, code: 'CC005', name: 'Warehouse', name_ar: 'المستودع' }
        ]);
      }

      if (currenciesRes.ok) {
        const result = await currenciesRes.json();
        setCurrencies(result.data || []);
      } else {
        setCurrencies([
          { id: 1, code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
          { id: 2, code: 'USD', name: 'US Dollar', symbol: '$' },
          { id: 3, code: 'EUR', name: 'Euro', symbol: '€' },
          { id: 4, code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' }
        ]);
      }

      if (journalTypesRes.ok) {
        const result = await journalTypesRes.json();
        setJournalTypes(result.data || []);
      } else {
        setJournalTypes([
          { id: 1, name: 'Manual Entry', name_ar: 'قيد يدوي', code: 'MAN' },
          { id: 2, name: 'Adjustment Entry', name_ar: 'قيد تسوية', code: 'ADJ' },
          { id: 3, name: 'Correction Entry', name_ar: 'قيد تصحيحي', code: 'COR' },
          { id: 4, name: 'Closing Entry', name_ar: 'قيد إقفال', code: 'CLO' },
          { id: 5, name: 'Opening Balance', name_ar: 'رصيد افتتاحي', code: 'OPN' }
        ]);
      }

    } catch (error) {
      console.error('Error fetching master data:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل تحميل البيانات الأساسية' : 'Failed to load master data' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = journalLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = journalLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01; // Allow for rounding
    
    return { totalDebit, totalCredit, isBalanced };
  }, [journalLines]);

  // Filter accounts for search
  const filteredAccounts = useMemo(() => {
    if (!accountSearchTerm) return accounts.filter(acc => acc.is_active);
    
    const searchLower = accountSearchTerm.toLowerCase();
    return accounts.filter(acc => 
      acc.is_active && (
        acc.code.toLowerCase().includes(searchLower) ||
        acc.name.toLowerCase().includes(searchLower) ||
        (acc.name_ar && acc.name_ar.includes(accountSearchTerm))
      )
    );
  }, [accounts, accountSearchTerm]);

  const addLine = () => {
    const newLine: JournalLine = {
      temp_id: generateTempId(),
      line_number: journalLines.length + 1,
      account_id: 0,
      account_code: '',
      account_name: '',
      debit: 0,
      credit: 0,
      description: ''
    };
    setJournalLines([...journalLines, newLine]);
  };

  const removeLine = (index: number) => {
    if (journalLines.length <= 1) {
      showToast({ type: 'warning', message: isArabic ? 'يجب أن يحتوي القيد على سطر واحد على الأقل' : 'Journal entry must have at least one line' });
      return;
    }
    
    const newLines = journalLines.filter((_, i) => i !== index);
    // Renumber lines
    newLines.forEach((line, i) => {
      line.line_number = i + 1;
    });
    setJournalLines(newLines);
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...journalLines];
    const line = newLines[index];
    
    if (field === 'debit') {
      line.debit = Number(value) || 0;
      // Auto-clear credit if debit is entered
      if (line.debit > 0) line.credit = 0;
    } else if (field === 'credit') {
      line.credit = Number(value) || 0;
      // Auto-clear debit if credit is entered
      if (line.credit > 0) line.debit = 0;
    } else {
      (line as any)[field] = value;
    }
    
    setJournalLines(newLines);
  };

  const selectAccountForLine = (account: Account) => {
    if (selectedLineForAccount === null) return;
    
    const newLines = [...journalLines];
    const line = newLines[selectedLineForAccount];
    
    line.account_id = account.id;
    line.account_code = account.code;
    line.account_name = isArabic ? account.name_ar || account.name : account.name;
    
    setJournalLines(newLines);
    setShowAccountModal(false);
    setSelectedLineForAccount(null);
    setAccountSearchTerm('');
  };

  const openAccountSelection = (lineIndex: number) => {
    setSelectedLineForAccount(lineIndex);
    setShowAccountModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Basic validation
    if (!formData.journal_type_id) {
      newErrors.journal_type_id = isArabic ? 'نوع القيد مطلوب' : 'Journal type is required';
    }
    
    if (!formData.date) {
      newErrors.date = isArabic ? 'التاريخ مطلوب' : 'Date is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = isArabic ? 'وصف القيد مطلوب' : 'Description is required';
    }

    // Lines validation
    if (journalLines.length === 0) {
      newErrors.lines = isArabic ? 'يجب إضافة سطور للقيد' : 'Journal lines are required';
    }

    // Check for valid accounts
    const invalidLines = journalLines.filter(line => !line.account_id || (!line.debit && !line.credit));
    if (invalidLines.length > 0) {
      newErrors.lines = isArabic ? 'جميع السطور يجب أن تحتوي على حساب ومبلغ' : 'All lines must have account and amount';
    }

    // Balance validation
    if (!totals.isBalanced) {
      newErrors.balance = isArabic ? `القيد غير متوازن - الفرق: ${Math.abs(totals.totalDebit - totals.totalCredit).toFixed(2)}` : `Entry not balanced - Difference: ${Math.abs(totals.totalDebit - totals.totalCredit).toFixed(2)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDraft = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/accounting/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          status: 'draft',
          lines: journalLines,
          attachments: attachments.map(f => f.name) // File upload would be separate API
        })
      });

      if (!response.ok) throw new Error('فشل حفظ القيد');
      
      const result = await response.json();
      showToast({ type: 'success', message: isArabic ? 'تم حفظ القيد كمسودة' : 'Journal entry saved as draft' });
      router.push('/accounting/journals');
    } catch (error) {
      console.error('Error saving journal entry:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل حفظ القيد' : 'Failed to save journal entry' });
    } finally {
      setSaving(false);
    }
  };

  const postEntry = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/accounting/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          status: 'posted',
          lines: journalLines,
          attachments: attachments.map(f => f.name)
        })
      });

      if (!response.ok) throw new Error('فشل ترحيل القيد');
      
      const result = await response.json();
      showToast({ type: 'success', message: isArabic ? 'تم ترحيل القيد بنجاح' : 'Journal entry posted successfully' });
      router.push('/accounting/journals');
    } catch (error) {
      console.error('Error posting journal entry:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل ترحيل القيد' : 'Failed to post journal entry' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType.toLowerCase()) {
      case 'asset':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'liability':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'equity':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'revenue':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expense':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (!hasPermission('journal_entries:create')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isArabic ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isArabic ? 'ليس لديك صلاحية لإنشاء قيود يومية' : 'You do not have permission to create journal entries'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'قيد جديد - نظام إدارة اللوجستيات الذكي' : 'New Journal Entry - SLMS'}</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push('/accounting/journals')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {isArabic ? 'رجوع' : 'Back'}
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              {isArabic ? 'قيد يومي جديد' : 'New Journal Entry'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isArabic ? 'إنشاء قيد محاسبي يدوي بسطور ديناميكية وتوازن تلقائي' : 'Create manual accounting journal entry with dynamic lines and auto-balance'}
            </p>
          </div>
        </div>

        {/* Balance Status Card */}
        <div className={`p-4 rounded-lg border-l-4 ${totals.isBalanced ? 
          'bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-600' : 
          'bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {totals.isBalanced ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
              <div>
                <p className={`font-semibold ${totals.isBalanced ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {totals.isBalanced ? 
                    (isArabic ? '✓ القيد متوازن' : '✓ Entry is balanced') :
                    (isArabic ? '⚠ القيد غير متوازن!' : '⚠ Entry not balanced!')}
                </p>
                {errors.balance && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.balance}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-8 text-sm">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {isArabic ? 'إجمالي المدين' : 'Total Debit'}
                </div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(totals.totalDebit)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {isArabic ? 'إجمالي الدائن' : 'Total Credit'}
                </div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {formatCurrency(totals.totalCredit)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {isArabic ? 'الفرق' : 'Difference'}
                </div>
                <div className={`text-xl font-bold mt-1 ${totals.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Journal Header Form */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                <BuildingLibraryIcon className="w-5 h-5" />
                {isArabic ? 'معلومات القيد' : 'Journal Information'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {isArabic ? 'نوع القيد' : 'Journal Type'} *
                  </label>
                  <select
                    value={formData.journal_type_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, journal_type_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{isArabic ? 'اختر نوع القيد' : 'Select journal type'}</option>
                    {journalTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {isArabic ? type.name_ar || type.name : type.name}
                      </option>
                    ))}
                  </select>
                  {errors.journal_type_id && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.journal_type_id}</p>
                  )}
                </div>

                <Input
                  label={isArabic ? 'تاريخ القيد' : 'Journal Date'}
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  error={errors.date}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {isArabic ? 'وصف القيد' : 'Description'} *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={isArabic ? 'وصف مختصر للقيد...' : 'Brief description of the entry...'}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.description}</p>
                  )}
                </div>

                <Input
                  label={isArabic ? 'المرجع الخارجي' : 'External Reference'}
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder={isArabic ? 'رقم المستند، الفاتورة، إلخ (اختياري)' : 'Document #, Invoice #, etc. (optional)'}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isArabic ? 'العملة' : 'Currency'}
                    </label>
                    <select
                      value={formData.currency_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {currencies.map(currency => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label={isArabic ? 'سعر التحويل' : 'Exchange Rate'}
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={formData.exchange_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate: Number(e.target.value) || 1 }))}
                  />
                </div>

                {/* File Attachments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {isArabic ? 'مرفقات' : 'Attachments'}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAttachments(prev => [...prev, ...files]);
                      }}
                      className="hidden"
                      id="attachments"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="attachments" className="cursor-pointer flex flex-col items-center">
                      <PaperClipIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {isArabic ? 'اختر الملفات أو اسحبها هنا' : 'Choose files or drag them here'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        PDF, DOC, XLS, Images
                      </span>
                    </label>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                          <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <DocumentArrowUpIcon className="w-4 h-4" />
                            {file.name}
                          </span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={postEntry}
                  loading={saving}
                  disabled={!totals.isBalanced || loading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  {isArabic ? 'ترحيل القيد' : 'Post Entry'}
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={saveDraft}
                  loading={saving}
                  disabled={loading}
                  className="w-full"
                >
                  {isArabic ? 'حفظ كمسودة' : 'Save as Draft'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Journal Lines Table */}
        <div className="xl:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <BanknotesIcon className="w-5 h-5" />
                  {isArabic ? 'سطور القيد' : 'Journal Lines'}
                </h3>
                <Button variant="primary" size="sm" onClick={addLine}>
                  <PlusIcon className="w-4 h-4" />
                  {isArabic ? 'إضافة سطر' : 'Add Line'}
                </Button>
              </div>
              {errors.lines && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errors.lines}</p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                      {isArabic ? '#' : '#'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[300px]">
                      {isArabic ? 'الحساب' : 'Account'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                      {isArabic ? 'مدين' : 'Debit'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                      {isArabic ? 'دائن' : 'Credit'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                      {isArabic ? 'مركز التكلفة' : 'Cost Center'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[250px]">
                      {isArabic ? 'الوصف' : 'Description'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                      {isArabic ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {journalLines.map((line, index) => (
                    <tr key={line.temp_id || line.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {line.line_number}
                      </td>
                      
                      <td className="px-4 py-3">
                        {line.account_id ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {line.account_code}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded capitalize ${getAccountTypeColor(accounts.find(a => a.id === line.account_id)?.account_type || '')}`}>
                                {accounts.find(a => a.id === line.account_id)?.account_type}
                              </span>
                            </div>
                            <button
                              onClick={() => openAccountSelection(index)}
                              className="text-left text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {line.account_name}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openAccountSelection(index)}
                            className="w-full text-left px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600"
                          >
                            {isArabic ? 'اختر حساب...' : 'Select account...'}
                          </button>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit || ''}
                          onChange={(e) => updateLine(index, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-right border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit || ''}
                          onChange={(e) => updateLine(index, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-right border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      <td className="px-4 py-3">
                        <select
                          value={line.cost_center_id || ''}
                          onChange={(e) => {
                            const selectedCC = costCenters.find(cc => cc.id === Number(e.target.value));
                            if (selectedCC) {
                              updateLine(index, 'cost_center_id', selectedCC.id);
                              const newLines = [...journalLines];
                              newLines[index].cost_center_name = isArabic ? selectedCC.name_ar || selectedCC.name : selectedCC.name;
                              setJournalLines(newLines);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">{isArabic ? 'مركز التكلفة (اختياري)' : 'Cost center (optional)'}</option>
                          {costCenters.map(cc => (
                            <option key={cc.id} value={cc.id}>
                              {cc.code} - {isArabic ? cc.name_ar || cc.name : cc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={line.description || ''}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          placeholder={isArabic ? 'وصف السطر (اختياري)' : 'Line description (optional)'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeLine(index)}
                          disabled={journalLines.length <= 1}
                          title={isArabic ? 'حذف السطر' : 'Delete line'}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-right text-gray-900 dark:text-gray-100 font-bold">
                      {isArabic ? 'الإجمالي:' : 'Total:'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(totals.totalDebit)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totals.totalCredit)}
                      </div>
                    </td>
                    <td colSpan={3} className="px-4 py-4">
                      <div className={`text-right text-lg font-bold ${totals.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isArabic ? 'فرق:' : 'Diff:'} {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Account Selection Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setSelectedLineForAccount(null);
          setAccountSearchTerm('');
        }}
        size="lg"
        title={isArabic ? 'اختيار الحساب' : 'Select Account'}
      >
        <div className="space-y-4">
          <Input
            label={isArabic ? 'البحث في الحسابات' : 'Search Accounts'}
            value={accountSearchTerm}
            onChange={(e) => setAccountSearchTerm(e.target.value)}
            placeholder={isArabic ? 'ادخل رمز أو اسم الحساب...' : 'Enter account code or name...'}
            autoFocus
          />
          
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {filteredAccounts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {isArabic ? 'لا توجد حسابات مطابقة' : 'No matching accounts'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAccounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => selectAccountForLine(account)}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-blue-50 dark:focus:bg-blue-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {account.code}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded capitalize ${getAccountTypeColor(account.account_type)}`}>
                            {account.account_type}
                          </span>
                        </div>
                        <div className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
                          {isArabic ? account.name_ar || account.name : account.name}
                        </div>
                        {isArabic && account.name_ar && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {account.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}