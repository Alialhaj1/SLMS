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
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  GiftIcon,
  HomeIcon,
  TruckIcon,
  PhoneIcon,
  AcademicCapIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Allowance {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'basic' | 'housing' | 'transport' | 'food' | 'communication' | 'education' | 'medical' | 'hazard' | 'overtime' | 'bonus' | 'other';
  calculation_type: 'fixed' | 'percentage' | 'formula';
  fixed_amount?: number;
  percentage_of_basic?: number;
  min_amount?: number;
  max_amount?: number;
  currency: string;
  is_taxable: boolean;
  is_part_of_eos: boolean;
  is_part_of_gosi: boolean;
  applicable_to: 'all' | 'specific_grades' | 'specific_departments' | 'specific_contracts';
  applicable_values?: string[];
  payment_frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  requires_approval: boolean;
  gl_account_code?: string;
  employee_count: number;
  total_monthly: number;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const ALLOWANCE_CATEGORIES = [
  { value: 'basic', label: 'Basic', labelAr: 'أساسي', icon: CurrencyDollarIcon, color: 'blue' },
  { value: 'housing', label: 'Housing', labelAr: 'سكن', icon: HomeIcon, color: 'green' },
  { value: 'transport', label: 'Transport', labelAr: 'نقل', icon: TruckIcon, color: 'yellow' },
  { value: 'food', label: 'Food', labelAr: 'طعام', icon: GiftIcon, color: 'orange' },
  { value: 'communication', label: 'Communication', labelAr: 'اتصالات', icon: PhoneIcon, color: 'purple' },
  { value: 'education', label: 'Education', labelAr: 'تعليم', icon: AcademicCapIcon, color: 'indigo' },
  { value: 'medical', label: 'Medical', labelAr: 'طبي', icon: UserGroupIcon, color: 'red' },
  { value: 'hazard', label: 'Hazard', labelAr: 'مخاطر', icon: GiftIcon, color: 'pink' },
  { value: 'overtime', label: 'Overtime', labelAr: 'إضافي', icon: GiftIcon, color: 'cyan' },
  { value: 'bonus', label: 'Bonus', labelAr: 'مكافأة', icon: GiftIcon, color: 'amber' },
  { value: 'other', label: 'Other', labelAr: 'أخرى', icon: GiftIcon, color: 'gray' },
];

function AllowancesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Allowance | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    category: Allowance['category'];
    calculation_type: Allowance['calculation_type'];
    fixed_amount: number;
    percentage_of_basic: number;
    min_amount: number;
    max_amount: number;
    currency: string;
    is_taxable: boolean;
    is_part_of_eos: boolean;
    is_part_of_gosi: boolean;
    applicable_to: Allowance['applicable_to'];
    payment_frequency: Allowance['payment_frequency'];
    requires_approval: boolean;
    gl_account_code: string;
    is_active: boolean;
    description: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    category: 'basic',
    calculation_type: 'fixed',
    fixed_amount: 0,
    percentage_of_basic: 0,
    min_amount: 0,
    max_amount: 0,
    currency: 'SAR',
    is_taxable: false,
    is_part_of_eos: true,
    is_part_of_gosi: true,
    applicable_to: 'all',
    payment_frequency: 'monthly',
    requires_approval: false,
    gl_account_code: '',
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
      const res = await fetch('http://localhost:4000/api/allowances', {
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
      { id: 1, code: 'HOUSING', name: 'Housing Allowance', name_ar: 'بدل سكن', category: 'housing', calculation_type: 'percentage', percentage_of_basic: 25, currency: 'SAR', is_taxable: false, is_part_of_eos: true, is_part_of_gosi: true, applicable_to: 'all', payment_frequency: 'monthly', requires_approval: false, gl_account_code: '520010', employee_count: 120, total_monthly: 180000, is_active: true, description: 'Standard housing allowance - 25% of basic salary', created_at: '2024-01-01' },
      { id: 2, code: 'TRANSPORT', name: 'Transport Allowance', name_ar: 'بدل نقل', category: 'transport', calculation_type: 'fixed', fixed_amount: 1500, currency: 'SAR', is_taxable: false, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'all', payment_frequency: 'monthly', requires_approval: false, gl_account_code: '520020', employee_count: 115, total_monthly: 172500, is_active: true, description: 'Fixed monthly transport allowance', created_at: '2024-01-01' },
      { id: 3, code: 'FOOD', name: 'Food Allowance', name_ar: 'بدل طعام', category: 'food', calculation_type: 'fixed', fixed_amount: 500, currency: 'SAR', is_taxable: false, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'all', payment_frequency: 'monthly', requires_approval: false, gl_account_code: '520030', employee_count: 120, total_monthly: 60000, is_active: true, created_at: '2024-01-01' },
      { id: 4, code: 'MOBILE', name: 'Mobile Allowance', name_ar: 'بدل جوال', category: 'communication', calculation_type: 'fixed', fixed_amount: 300, currency: 'SAR', is_taxable: false, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'specific_grades', payment_frequency: 'monthly', requires_approval: false, gl_account_code: '520040', employee_count: 45, total_monthly: 13500, is_active: true, description: 'For grades 12 and above', created_at: '2024-01-01' },
      { id: 5, code: 'HAZARD', name: 'Hazard Pay', name_ar: 'بدل مخاطر', category: 'hazard', calculation_type: 'percentage', percentage_of_basic: 15, min_amount: 500, max_amount: 3000, currency: 'SAR', is_taxable: true, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'specific_departments', payment_frequency: 'monthly', requires_approval: true, gl_account_code: '520050', employee_count: 25, total_monthly: 37500, is_active: true, description: 'For warehouse and logistics staff handling hazardous materials', created_at: '2024-01-01' },
      { id: 6, code: 'EDUCATION', name: 'Education Allowance', name_ar: 'بدل تعليم', category: 'education', calculation_type: 'fixed', fixed_amount: 2000, currency: 'SAR', is_taxable: false, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'specific_contracts', payment_frequency: 'annual', requires_approval: true, gl_account_code: '520060', employee_count: 30, total_monthly: 5000, is_active: true, description: 'Annual education support for children', created_at: '2024-01-01' },
      { id: 7, code: 'REMOTE', name: 'Remote Work Allowance', name_ar: 'بدل عمل عن بعد', category: 'other', calculation_type: 'fixed', fixed_amount: 500, currency: 'SAR', is_taxable: false, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'specific_departments', payment_frequency: 'monthly', requires_approval: false, gl_account_code: '520070', employee_count: 20, total_monthly: 10000, is_active: true, description: 'For IT and admin staff working remotely', created_at: '2024-01-01' },
      { id: 8, code: 'EID-BONUS', name: 'Eid Bonus', name_ar: 'مكافأة عيد', category: 'bonus', calculation_type: 'fixed', fixed_amount: 1000, currency: 'SAR', is_taxable: false, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'all', payment_frequency: 'one_time', requires_approval: true, gl_account_code: '520080', employee_count: 120, total_monthly: 0, is_active: true, description: 'Annual Eid al-Fitr bonus', created_at: '2024-01-01' },
      { id: 9, code: 'OVERTIME', name: 'Overtime Allowance', name_ar: 'بدل إضافي', category: 'overtime', calculation_type: 'formula', currency: 'SAR', is_taxable: true, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'all', payment_frequency: 'monthly', requires_approval: true, gl_account_code: '520090', employee_count: 80, total_monthly: 95000, is_active: true, description: 'Calculated per overtime hours @ 1.5x hourly rate', created_at: '2024-01-01' },
      { id: 10, code: 'CAR', name: 'Car Allowance', name_ar: 'بدل سيارة', category: 'transport', calculation_type: 'fixed', fixed_amount: 3000, currency: 'SAR', is_taxable: false, is_part_of_eos: false, is_part_of_gosi: false, applicable_to: 'specific_grades', payment_frequency: 'monthly', requires_approval: false, gl_account_code: '520025', employee_count: 15, total_monthly: 45000, is_active: true, description: 'For managers grade 15+', created_at: '2024-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.calculation_type === 'fixed' && !formData.fixed_amount) newErrors.fixed_amount = t('validation.required');
    if (formData.calculation_type === 'percentage' && !formData.percentage_of_basic) newErrors.percentage_of_basic = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/allowances/${editingItem.id}`
        : 'http://localhost:4000/api/allowances';
      
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
      const newItem: Allowance = {
        id: editingItem?.id || Date.now(),
        ...formData,
        fixed_amount: formData.calculation_type === 'fixed' ? formData.fixed_amount : undefined,
        percentage_of_basic: formData.calculation_type === 'percentage' ? formData.percentage_of_basic : undefined,
        min_amount: formData.min_amount || undefined,
        max_amount: formData.max_amount || undefined,
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
      showToast(t('allowances.cannotDeleteWithEmployees', 'Cannot delete allowance assigned to employees'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/allowances/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', category: 'basic', calculation_type: 'fixed', fixed_amount: 0, percentage_of_basic: 0, min_amount: 0, max_amount: 0, currency: 'SAR', is_taxable: false, is_part_of_eos: true, is_part_of_gosi: true, applicable_to: 'all', payment_frequency: 'monthly', requires_approval: false, gl_account_code: '', is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: Allowance) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      calculation_type: item.calculation_type,
      fixed_amount: item.fixed_amount || 0,
      percentage_of_basic: item.percentage_of_basic || 0,
      min_amount: item.min_amount || 0,
      max_amount: item.max_amount || 0,
      currency: item.currency,
      is_taxable: item.is_taxable,
      is_part_of_eos: item.is_part_of_eos,
      is_part_of_gosi: item.is_part_of_gosi,
      applicable_to: item.applicable_to,
      payment_frequency: item.payment_frequency,
      requires_approval: item.requires_approval,
      gl_account_code: item.gl_account_code || '',
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

  const totalMonthly = items.reduce((sum, a) => sum + a.total_monthly, 0);
  const activeCount = items.filter(a => a.is_active).length;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      housing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      transport: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      food: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      communication: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      education: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      medical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      hazard: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      overtime: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      bonus: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[category] || colors.other;
  };

  const getCategoryLabel = (category: string) => {
    return ALLOWANCE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const formatAmount = (item: Allowance) => {
    if (item.calculation_type === 'fixed') {
      return `${item.fixed_amount?.toLocaleString()} ${item.currency}`;
    } else if (item.calculation_type === 'percentage') {
      return `${item.percentage_of_basic}% of Basic`;
    } else {
      return 'Formula';
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('allowances.title', 'Allowances')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('allowances.title', 'Allowances')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('allowances.subtitle', 'Configure salary allowance types and rates')}
            </p>
          </div>
          {hasPermission('master:hr:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('allowances.new', 'New Allowance')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <GiftIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('allowances.types', 'Types')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('allowances.monthlyTotal', 'Monthly Total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{(totalMonthly / 1000).toFixed(0)}K SAR</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <HomeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('allowances.housing', 'Housing')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.filter(a => a.category === 'housing').reduce((s, a) => s + a.total_monthly, 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <TruckIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('allowances.transport', 'Transport')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.filter(a => a.category === 'transport').reduce((s, a) => s + a.total_monthly, 0).toLocaleString()}</p>
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
            <option value="">{t('allowances.allCategories', 'All Categories')}</option>
            {ALLOWANCE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length} | Active: {activeCount}
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
              <GiftIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('allowances.allowance', 'Allowance')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('allowances.category', 'Category')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('allowances.amount', 'Amount')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('allowances.frequency', 'Frequency')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('allowances.applicability', 'Applicable')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('allowances.employees', 'Employees')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('allowances.monthlyTotal', 'Monthly')}</th>
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
                          {item.is_taxable && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">Tax</span>
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
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{item.payment_frequency.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs ${item.applicable_to === 'all' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {item.applicable_to === 'all' ? 'All' : item.applicable_to.replace('specific_', '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.employee_count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.total_monthly.toLocaleString()}</span>
                      <p className="text-xs text-gray-400">{item.currency}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission('master:hr:update') && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('master:hr:delete') && item.employee_count === 0 && (
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
        title={editingItem ? t('allowances.edit') : t('allowances.create')}
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
              placeholder="e.g., HOUSING"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('allowances.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {ALLOWANCE_CATEGORIES.map(cat => (
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
                {t('allowances.calculationType', 'Calculation Type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.calculation_type}
                onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">% of Basic</option>
                <option value="formula">Formula</option>
              </select>
            </div>
            {formData.calculation_type === 'fixed' && (
              <Input
                label={t('allowances.fixedAmount', 'Fixed Amount')}
                type="number"
                min="0"
                value={formData.fixed_amount}
                onChange={(e) => setFormData({ ...formData, fixed_amount: Number(e.target.value) })}
                error={errors.fixed_amount}
              />
            )}
            {formData.calculation_type === 'percentage' && (
              <Input
                label={t('allowances.percentage', '% of Basic')}
                type="number"
                min="0"
                max="100"
                value={formData.percentage_of_basic}
                onChange={(e) => setFormData({ ...formData, percentage_of_basic: Number(e.target.value) })}
                error={errors.percentage_of_basic}
              />
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('allowances.frequency', 'Payment Frequency')}
              </label>
              <select
                value={formData.payment_frequency}
                onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="one_time">One-Time</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('allowances.minAmount', 'Min Amount')}
              type="number"
              min="0"
              value={formData.min_amount}
              onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
            />
            <Input
              label={t('allowances.maxAmount', 'Max Amount')}
              type="number"
              min="0"
              value={formData.max_amount}
              onChange={(e) => setFormData({ ...formData, max_amount: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('allowances.applicableTo', 'Applicable To')}
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
            <Input
              label={t('allowances.glAccount', 'GL Account Code')}
              value={formData.gl_account_code}
              onChange={(e) => setFormData({ ...formData, gl_account_code: e.target.value })}
              placeholder="e.g., 520010"
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('allowances.inclusions', 'Inclusions & Flags')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'is_taxable', label: 'Taxable' },
                { key: 'is_part_of_eos', label: 'Part of EOS' },
                { key: 'is_part_of_gosi', label: 'Part of GOSI' },
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
        message={t('allowances.deleteWarning', 'This allowance type will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, AllowancesPage);
