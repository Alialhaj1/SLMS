import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Card from '../../components/ui/Card';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MinusCircleIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ShieldExclamationIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Deduction {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'tax' | 'gosi' | 'loan' | 'advance' | 'absence' | 'penalty' | 'insurance' | 'charity' | 'other';
  calculation_type: 'fixed' | 'percentage' | 'formula' | 'days';
  fixed_amount?: number;
  percentage_of_basic?: number;
  percentage_of_gross?: number;
  days_based_on?: string;
  min_amount?: number;
  max_amount?: number;
  currency: string;
  is_pre_tax: boolean;
  is_recurring: boolean;
  max_installments?: number;
  applicable_to: 'all' | 'specific_grades' | 'specific_departments' | 'specific_contracts';
  requires_approval: boolean;
  gl_account_code?: string;
  employee_count: number;
  total_monthly: number;
  is_mandatory: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const DEDUCTION_CATEGORIES = [
  { value: 'tax', label: 'Tax', labelAr: 'ضريبة', icon: ReceiptPercentIcon, color: 'red' },
  { value: 'gosi', label: 'GOSI', labelAr: 'تأمينات', icon: ShieldExclamationIcon, color: 'blue' },
  { value: 'loan', label: 'Loan', labelAr: 'قرض', icon: BanknotesIcon, color: 'yellow' },
  { value: 'advance', label: 'Advance', labelAr: 'سلفة', icon: BanknotesIcon, color: 'orange' },
  { value: 'absence', label: 'Absence', labelAr: 'غياب', icon: MinusCircleIcon, color: 'purple' },
  { value: 'penalty', label: 'Penalty', labelAr: 'جزاء', icon: ShieldExclamationIcon, color: 'pink' },
  { value: 'insurance', label: 'Insurance', labelAr: 'تأمين', icon: ShieldExclamationIcon, color: 'cyan' },
  { value: 'charity', label: 'Charity', labelAr: 'تبرع', icon: DocumentTextIcon, color: 'green' },
  { value: 'other', label: 'Other', labelAr: 'أخرى', icon: MinusCircleIcon, color: 'gray' },
];

function DeductionsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Deduction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    category: Deduction['category'];
    calculation_type: Deduction['calculation_type'];
    fixed_amount: number;
    percentage_of_basic: number;
    percentage_of_gross: number;
    days_based_on: string;
    min_amount: number;
    max_amount: number;
    currency: string;
    is_pre_tax: boolean;
    is_recurring: boolean;
    max_installments: number;
    applicable_to: Deduction['applicable_to'];
    requires_approval: boolean;
    gl_account_code: string;
    is_mandatory: boolean;
    is_active: boolean;
    description: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    category: 'other',
    calculation_type: 'fixed',
    fixed_amount: 0,
    percentage_of_basic: 0,
    percentage_of_gross: 0,
    days_based_on: '',
    min_amount: 0,
    max_amount: 0,
    currency: 'SAR',
    is_pre_tax: false,
    is_recurring: true,
    max_installments: 0,
    applicable_to: 'all',
    requires_approval: false,
    gl_account_code: '',
    is_mandatory: false,
    is_active: true,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/deductions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setItems([
      { id: 1, code: 'GOSI-EMP', name: 'GOSI - Employee Share', name_ar: 'التأمينات الاجتماعية - حصة الموظف', category: 'gosi', calculation_type: 'percentage', percentage_of_basic: 9.75, currency: 'SAR', is_pre_tax: true, is_recurring: true, applicable_to: 'all', requires_approval: false, gl_account_code: '213010', employee_count: 120, total_monthly: 87750, is_mandatory: true, is_active: true, description: 'GOSI employee contribution - 9.75% of basic + housing', created_at: '2024-01-01' },
      { id: 2, code: 'GOSI-CO', name: 'GOSI - Company Share', name_ar: 'التأمينات الاجتماعية - حصة الشركة', category: 'gosi', calculation_type: 'percentage', percentage_of_basic: 11.75, currency: 'SAR', is_pre_tax: true, is_recurring: true, applicable_to: 'all', requires_approval: false, gl_account_code: '520210', employee_count: 120, total_monthly: 105750, is_mandatory: true, is_active: true, description: 'GOSI company contribution - 11.75% of basic + housing', created_at: '2024-01-01' },
      { id: 3, code: 'LOAN', name: 'Employee Loan', name_ar: 'قرض الموظف', category: 'loan', calculation_type: 'fixed', currency: 'SAR', is_pre_tax: false, is_recurring: true, max_installments: 24, applicable_to: 'all', requires_approval: true, gl_account_code: '135010', employee_count: 15, total_monthly: 22500, is_mandatory: false, is_active: true, description: 'Personal loans with up to 24 monthly installments', created_at: '2024-01-01' },
      { id: 4, code: 'ADVANCE', name: 'Salary Advance', name_ar: 'سلفة راتب', category: 'advance', calculation_type: 'fixed', currency: 'SAR', is_pre_tax: false, is_recurring: true, max_installments: 3, applicable_to: 'all', requires_approval: true, gl_account_code: '135020', employee_count: 8, total_monthly: 6000, is_mandatory: false, is_active: true, description: 'Salary advance deducted over 1-3 months', created_at: '2024-01-01' },
      { id: 5, code: 'ABS-DAY', name: 'Absence Deduction', name_ar: 'خصم غياب', category: 'absence', calculation_type: 'days', days_based_on: 'Daily rate x days absent', currency: 'SAR', is_pre_tax: false, is_recurring: false, applicable_to: 'all', requires_approval: false, gl_account_code: '520110', employee_count: 5, total_monthly: 3750, is_mandatory: false, is_active: true, description: 'Deduction for unapproved absences', created_at: '2024-01-01' },
      { id: 6, code: 'LATE', name: 'Late Penalty', name_ar: 'جزاء تأخير', category: 'penalty', calculation_type: 'formula', currency: 'SAR', is_pre_tax: false, is_recurring: false, applicable_to: 'all', requires_approval: false, gl_account_code: '520120', employee_count: 10, total_monthly: 2500, is_mandatory: false, is_active: true, description: 'Calculated based on late hours accumulated', created_at: '2024-01-01' },
      { id: 7, code: 'MED-INS', name: 'Medical Insurance - Upgrade', name_ar: 'تأمين طبي - ترقية', category: 'insurance', calculation_type: 'fixed', fixed_amount: 200, currency: 'SAR', is_pre_tax: false, is_recurring: true, applicable_to: 'all', requires_approval: false, gl_account_code: '520220', employee_count: 25, total_monthly: 5000, is_mandatory: false, is_active: true, description: 'Optional medical insurance upgrade contribution', created_at: '2024-01-01' },
      { id: 8, code: 'CHARITY', name: 'Charity Donation', name_ar: 'تبرع خيري', category: 'charity', calculation_type: 'fixed', currency: 'SAR', is_pre_tax: false, is_recurring: true, applicable_to: 'all', requires_approval: false, gl_account_code: '217010', employee_count: 30, total_monthly: 3000, is_mandatory: false, is_active: true, description: 'Voluntary charity donation from salary', created_at: '2024-01-01' },
      { id: 9, code: 'CAR-LOAN', name: 'Car Loan', name_ar: 'قرض سيارة', category: 'loan', calculation_type: 'fixed', fixed_amount: 2500, currency: 'SAR', is_pre_tax: false, is_recurring: true, max_installments: 48, applicable_to: 'specific_grades', requires_approval: true, gl_account_code: '135030', employee_count: 5, total_monthly: 12500, is_mandatory: false, is_active: true, description: 'Company car loan for eligible employees', created_at: '2024-01-01' },
      { id: 10, code: 'DISCIP', name: 'Disciplinary Deduction', name_ar: 'خصم تأديبي', category: 'penalty', calculation_type: 'percentage', percentage_of_basic: 10, min_amount: 100, max_amount: 3000, currency: 'SAR', is_pre_tax: false, is_recurring: false, applicable_to: 'all', requires_approval: true, gl_account_code: '520130', employee_count: 2, total_monthly: 600, is_mandatory: false, is_active: true, description: 'Disciplinary action deduction - 10% of basic with limits', created_at: '2024-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.calculation_type === 'fixed' && !formData.fixed_amount && !editingItem) newErrors.fixed_amount = t('validation.required');
    if (formData.calculation_type === 'percentage' && !formData.percentage_of_basic && !formData.percentage_of_gross) newErrors.percentage_of_basic = t('deductions.percentRequired', 'Percentage is required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/deductions/${editingItem.id}`
        : 'http://localhost:4000/api/deductions';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error();
      }
    } catch {
      const newItem: Deduction = {
        id: editingItem?.id || Date.now(),
        ...formData,
        fixed_amount: formData.calculation_type === 'fixed' ? formData.fixed_amount : undefined,
        percentage_of_basic: formData.percentage_of_basic || undefined,
        percentage_of_gross: formData.percentage_of_gross || undefined,
        days_based_on: formData.days_based_on || undefined,
        min_amount: formData.min_amount || undefined,
        max_amount: formData.max_amount || undefined,
        max_installments: formData.max_installments || undefined,
        gl_account_code: formData.gl_account_code || undefined,
        description: formData.description || undefined,
        employee_count: editingItem?.employee_count || 0,
        total_monthly: editingItem?.total_monthly || 0,
        created_at: new Date().toISOString(),
      };
      if (editingItem) {
        setItems(items.map(i => i.id === editingItem.id ? newItem : i));
      } else {
        setItems([...items, newItem]);
      }
      showToast(t('common.success'), 'success');
      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find(i => i.id === deletingId);
    if (item && item.employee_count > 0) {
      showToast(t('deductions.cannotDeleteWithEmployees', 'Cannot delete deduction assigned to employees'), 'error');
      setConfirmOpen(false);
      return;
    }
    if (item?.is_mandatory) {
      showToast(t('deductions.cannotDeleteMandatory', 'Cannot delete mandatory deduction type'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/deductions/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* continue */ }
    setItems(items.filter(i => i.id !== deletingId));
    showToast(t('common.deleted'), 'success');
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', category: 'other', calculation_type: 'fixed', fixed_amount: 0, percentage_of_basic: 0, percentage_of_gross: 0, days_based_on: '', min_amount: 0, max_amount: 0, currency: 'SAR', is_pre_tax: false, is_recurring: true, max_installments: 0, applicable_to: 'all', requires_approval: false, gl_account_code: '', is_mandatory: false, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: Deduction) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      calculation_type: item.calculation_type,
      fixed_amount: item.fixed_amount || 0,
      percentage_of_basic: item.percentage_of_basic || 0,
      percentage_of_gross: item.percentage_of_gross || 0,
      days_based_on: item.days_based_on || '',
      min_amount: item.min_amount || 0,
      max_amount: item.max_amount || 0,
      currency: item.currency,
      is_pre_tax: item.is_pre_tax,
      is_recurring: item.is_recurring,
      max_installments: item.max_installments || 0,
      applicable_to: item.applicable_to,
      requires_approval: item.requires_approval,
      gl_account_code: item.gl_account_code || '',
      is_mandatory: item.is_mandatory,
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalMonthly = items.reduce((sum, d) => sum + d.total_monthly, 0);
  const gosiTotal = items.filter(d => d.category === 'gosi').reduce((s, d) => s + d.total_monthly, 0);
  const loansTotal = items.filter(d => d.category === 'loan' || d.category === 'advance').reduce((s, d) => s + d.total_monthly, 0);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      tax: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      gosi: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      loan: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      advance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      absence: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      penalty: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      insurance: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      charity: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[category] || colors.other;
  };

  const getCategoryLabel = (category: string) => {
    return DEDUCTION_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const formatAmount = (item: Deduction) => {
    if (item.calculation_type === 'fixed') {
      return item.fixed_amount ? `${item.fixed_amount.toLocaleString()} ${item.currency}` : 'Variable';
    } else if (item.calculation_type === 'percentage') {
      if (item.percentage_of_basic) return `${item.percentage_of_basic}% of Basic`;
      if (item.percentage_of_gross) return `${item.percentage_of_gross}% of Gross`;
      return 'Percentage';
    } else if (item.calculation_type === 'days') {
      return 'Per Day';
    } else {
      return 'Formula';
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('deductions.title', 'Deductions')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('deductions.title', 'Deductions')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('deductions.subtitle', 'Configure salary deduction types and rates')}
            </p>
          </div>
          {hasPermission('master:hr:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('deductions.new', 'New Deduction')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <MinusCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('deductions.types', 'Types')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <BanknotesIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('deductions.monthlyTotal', 'Monthly Total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{(totalMonthly / 1000).toFixed(0)}K SAR</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ShieldExclamationIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('deductions.gosi', 'GOSI')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{gosiTotal.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <BanknotesIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('deductions.loans', 'Loans/Advances')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{loansTotal.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('deductions.allCategories', 'All Categories')}</option>
            {DEDUCTION_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length} | Mandatory: {items.filter(d => d.is_mandatory).length}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <MinusCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('deductions.deduction', 'Deduction')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('deductions.category', 'Category')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('deductions.amount', 'Amount/Rate')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('deductions.type', 'Type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('deductions.employees', 'Employees')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('deductions.monthlyTotal', 'Monthly')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                          {item.is_mandatory && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">Mandatory</span>
                          )}
                          {item.is_pre_tax && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Pre-Tax</span>
                          )}
                          {item.requires_approval && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">Approval</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(item)}
                      </span>
                      {item.min_amount && item.max_amount && (
                        <p className="text-xs text-gray-400">{item.min_amount.toLocaleString()} - {item.max_amount.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm">
                        <span className={`${item.is_recurring ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {item.is_recurring ? 'Recurring' : 'One-time'}
                        </span>
                        {item.max_installments && (
                          <p className="text-xs text-gray-400">{item.max_installments} max inst.</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.employee_count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">-{item.total_monthly.toLocaleString()}</span>
                      <p className="text-xs text-gray-400">{item.currency}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission('master:hr:update') && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('master:hr:delete') && item.employee_count === 0 && !item.is_mandatory && (
                          <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('deductions.edit') : t('deductions.create')}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., GOSI-EMP"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deductions.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {DEDUCTION_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
            <Input
              label={t('common.nameAr')}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deductions.calculationType', 'Calculation Type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.calculation_type}
                onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
                <option value="days">Days-based</option>
                <option value="formula">Formula</option>
              </select>
            </div>
            {formData.calculation_type === 'fixed' && (
              <Input
                label={t('deductions.fixedAmount', 'Fixed Amount')}
                type="number"
                min="0"
                value={formData.fixed_amount}
                onChange={(e) => setFormData({ ...formData, fixed_amount: Number(e.target.value) })}
                error={errors.fixed_amount}
              />
            )}
            {formData.calculation_type === 'percentage' && (
              <Input
                label={t('deductions.percentOfBasic', '% of Basic')}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.percentage_of_basic}
                onChange={(e) => setFormData({ ...formData, percentage_of_basic: Number(e.target.value) })}
                error={errors.percentage_of_basic}
              />
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deductions.applicableTo', 'Applicable To')}
              </label>
              <select
                value={formData.applicable_to}
                onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">All Employees</option>
                <option value="specific_grades">Specific Grades</option>
                <option value="specific_departments">Specific Departments</option>
                <option value="specific_contracts">Specific Contracts</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('deductions.minAmount', 'Min Amount')}
              type="number"
              min="0"
              value={formData.min_amount}
              onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
            />
            <Input
              label={t('deductions.maxAmount', 'Max Amount')}
              type="number"
              min="0"
              value={formData.max_amount}
              onChange={(e) => setFormData({ ...formData, max_amount: Number(e.target.value) })}
            />
            <Input
              label={t('deductions.maxInstallments', 'Max Installments')}
              type="number"
              min="0"
              value={formData.max_installments}
              onChange={(e) => setFormData({ ...formData, max_installments: Number(e.target.value) })}
              placeholder="For loans"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('deductions.glAccount', 'GL Account Code')}
              value={formData.gl_account_code}
              onChange={(e) => setFormData({ ...formData, gl_account_code: e.target.value })}
              placeholder="e.g., 213010"
            />
            {formData.calculation_type === 'days' && (
              <Input
                label={t('deductions.daysFormula', 'Days Calculation')}
                value={formData.days_based_on}
                onChange={(e) => setFormData({ ...formData, days_based_on: e.target.value })}
                placeholder="e.g., Daily rate x days"
              />
            )}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('deductions.flags', 'Deduction Flags')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'is_pre_tax', label: 'Pre-Tax' },
                { key: 'is_recurring', label: 'Recurring' },
                { key: 'is_mandatory', label: 'Mandatory' },
                { key: 'requires_approval', label: 'Requires Approval' },
              ].map(flag => (
                <div key={flag.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={flag.key}
                    checked={formData[flag.key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [flag.key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor={flag.key} className="text-sm text-gray-700 dark:text-gray-300">
                    {flag.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">{t('common.active')}</label>
          </div>

          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('deductions.deleteWarning', 'This deduction type will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, DeductionsPage);
