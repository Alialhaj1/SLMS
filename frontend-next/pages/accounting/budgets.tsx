import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import withPermission from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import apiClient from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  CalculatorIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface BudgetItem {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  fiscalYear: number;
  department: string;
  departmentAr: string;
  category: 'revenue' | 'expense' | 'capital';
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  status: 'draft' | 'pending' | 'approved' | 'active' | 'closed';
  startDate: string;
  endDate: string;
  notes: string;
}
function BudgetsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission(MenuPermissions.Accounting.Budgets.Create);
  const canEdit = hasPermission(MenuPermissions.Accounting.Budgets.Edit);
  const canDelete = hasPermission(MenuPermissions.Accounting.Budgets.Delete);

  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('2024');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    fiscalYear: new Date().getFullYear().toString(),
    department: '',
    departmentAr: '',
    category: 'expense' as BudgetItem['category'],
    budgetedAmount: '',
    status: 'draft' as BudgetItem['status'],
    startDate: '',
    endDate: '',
    notes: '',
  });

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear !== 'all') params.set('year', filterYear);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const url = params.toString() ? `/api/budgets?${params.toString()}` : '/api/budgets';
      const resp = await apiClient.get<any>(url);
      const rows = Array.isArray(resp) ? resp : resp.data || [];
      const mapped: BudgetItem[] = rows.map((r: any) => ({
        id: Number(r.id),
        code: String(r.code),
        name: String(r.name || ''),
        nameAr: String(r.name_ar || ''),
        fiscalYear: Number(r.fiscal_year),
        department: String(r.department || ''),
        departmentAr: String(r.department_ar || ''),
        category: String(r.category) as any,
        budgetedAmount: Number(r.budgeted_amount || 0),
        actualAmount: Number(r.actual_amount || 0),
        variance: Number(r.variance || 0),
        variancePercent: Number(r.variance_percent || 0),
        status: String(r.status) as any,
        startDate: r.start_date ? String(r.start_date).slice(0, 10) : '',
        endDate: r.end_date ? String(r.end_date).slice(0, 10) : '',
        notes: String(r.notes || ''),
      }));
      setBudgets(mapped);
    } catch (e: any) {
      setBudgets([]);
      showToast(e?.message || (locale === 'ar' ? 'فشل التحميل' : 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear, filterCategory, filterStatus, searchQuery]);

  const filteredBudgets = budgets;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Draft', labelAr: 'مسودة' },
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', label: 'Pending', labelAr: 'معلق' },
      approved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'Approved', labelAr: 'معتمد' },
      active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Active', labelAr: 'نشط' },
      closed: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-200', label: 'Closed', labelAr: 'مغلق' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      revenue: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Revenue', labelAr: 'إيرادات' },
      expense: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Expense', labelAr: 'مصروفات' },
      capital: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'Capital', labelAr: 'رأسمالي' },
    };
    const config = categoryConfig[category] || categoryConfig.expense;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/budgets/${selectedBudget.id}`);
      showToast(locale === 'ar' ? 'تم حذف الموازنة بنجاح' : 'Budget deleted successfully', 'success');
      setConfirmDelete(false);
      setSelectedBudget(null);
      fetchBudgets();
    } catch (e: any) {
      showToast(e?.message || (locale === 'ar' ? 'فشل الحذف' : 'Failed to delete'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setSelectedBudget(null);
    setFormData({
      code: '',
      name: '',
      nameAr: '',
      fiscalYear: new Date().getFullYear().toString(),
      department: '',
      departmentAr: '',
      category: 'expense',
      budgetedAmount: '',
      status: 'draft',
      startDate: '',
      endDate: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (b: BudgetItem) => {
    setSelectedBudget(b);
    setFormData({
      code: b.code,
      name: b.name,
      nameAr: b.nameAr,
      fiscalYear: String(b.fiscalYear),
      department: b.department,
      departmentAr: b.departmentAr,
      category: b.category,
      budgetedAmount: String(b.budgetedAmount),
      status: b.status,
      startDate: b.startDate,
      endDate: b.endDate,
      notes: b.notes,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const year = Number(formData.fiscalYear);
    const budgetedAmount = Number(formData.budgetedAmount || 0);

    if (!selectedBudget && !formData.code.trim()) {
      showToast(locale === 'ar' ? 'الكود مطلوب' : 'Code is required', 'error');
      return;
    }
    if (!formData.name.trim()) {
      showToast(locale === 'ar' ? 'الاسم مطلوب' : 'Name is required', 'error');
      return;
    }
    if (!Number.isInteger(year)) {
      showToast(locale === 'ar' ? 'السنة المالية غير صحيحة' : 'Invalid fiscal year', 'error');
      return;
    }
    if (!Number.isFinite(budgetedAmount) || budgetedAmount < 0) {
      showToast(locale === 'ar' ? 'المبلغ المخطط غير صحيح' : 'Invalid budgeted amount', 'error');
      return;
    }

    setSaving(true);
    try {
      if (selectedBudget) {
        await apiClient.put(`/api/budgets/${selectedBudget.id}`, {
          name: formData.name,
          name_ar: formData.nameAr || null,
          department: formData.department || null,
          department_ar: formData.departmentAr || null,
          category: formData.category,
          budgeted_amount: budgetedAmount,
          status: formData.status,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          notes: formData.notes || null,
        });
      } else {
        await apiClient.post('/api/budgets', {
          code: formData.code,
          name: formData.name,
          name_ar: formData.nameAr || null,
          fiscal_year: year,
          department: formData.department || null,
          department_ar: formData.departmentAr || null,
          category: formData.category,
          budgeted_amount: budgetedAmount,
          status: formData.status,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          notes: formData.notes || null,
        });
      }
      showToast(locale === 'ar' ? 'تم حفظ الموازنة' : 'Budget saved', 'success');
      setIsModalOpen(false);
      fetchBudgets();
    } catch (e: any) {
      showToast(e?.message || (locale === 'ar' ? 'فشل الحفظ' : 'Failed to save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalBudgeted = budgets.filter(b => b.status === 'active').reduce((sum, b) => sum + b.budgetedAmount, 0);
  const totalActual = budgets.filter(b => b.status === 'active').reduce((sum, b) => sum + b.actualAmount, 0);
  const totalVariance = totalBudgeted - totalActual;

  const stats = [
    {
      label: locale === 'ar' ? 'إجمالي الموازنات' : 'Total Budgets',
      value: budgets.length.toString(),
      icon: CalculatorIcon,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: locale === 'ar' ? 'المبلغ المخطط' : 'Budgeted Amount',
      value: formatCurrency(totalBudgeted),
      icon: ChartBarIcon,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: locale === 'ar' ? 'المبلغ الفعلي' : 'Actual Amount',
      value: formatCurrency(totalActual),
      icon: DocumentDuplicateIcon,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: locale === 'ar' ? 'الفرق' : 'Variance',
      value: formatCurrency(totalVariance),
      icon: totalVariance >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
      color: totalVariance >= 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الموازنات - SLMS' : 'Budgets - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CalculatorIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'الموازنات' : 'Budgets'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة الموازنات المالية والتخطيط' : 'Manage financial budgets and planning'}
              </p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'إضافة موازنة' : 'Add Budget'}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل السنوات' : 'All Years'}</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2025">2025</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
              <option value="revenue">{locale === 'ar' ? 'إيرادات' : 'Revenue'}</option>
              <option value="expense">{locale === 'ar' ? 'مصروفات' : 'Expense'}</option>
              <option value="capital">{locale === 'ar' ? 'رأسمالي' : 'Capital'}</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
              <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
              <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="p-8 text-center">
              <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد موازنات' : 'No budgets found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الموازنة' : 'Budget'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القسم' : 'Department'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المخطط' : 'Budgeted'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفعلي' : 'Actual'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفرق %' : 'Variance %'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBudgets.map((budget) => (
                    <tr key={budget.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{budget.code}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{locale === 'ar' ? budget.nameAr : budget.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{budget.fiscalYear}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{locale === 'ar' ? budget.departmentAr : budget.department}</td>
                      <td className="px-4 py-3">{getCategoryBadge(budget.category)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(budget.budgetedAmount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(budget.actualAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {budget.variancePercent >= 0 ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                          )}
                          <span className={clsx('text-sm font-medium', budget.variancePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                            {budget.variancePercent > 0 ? '+' : ''}{budget.variancePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(budget.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedBudget(budget); setIsDetailModalOpen(true); }}
                            className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                            title={locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          >
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEdit(budget)}
                              className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                              title={locale === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => { setSelectedBudget(budget); setConfirmDelete(true); }}
                              className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={locale === 'ar' ? 'تفاصيل الموازنة' : 'Budget Details'}
        size="lg"
      >
        {selectedBudget && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الكود' : 'Code'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBudget.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'السنة المالية' : 'Fiscal Year'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBudget.fiscalYear}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'القسم' : 'Department'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedBudget.departmentAr : selectedBudget.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الحالة' : 'Status'}</p>
                {getStatusBadge(selectedBudget.status)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نسبة الاستخدام' : 'Usage Rate'}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedBudget.budgetedAmount > 0 ? ((selectedBudget.actualAmount / selectedBudget.budgetedAmount) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={clsx(
                    'h-full rounded-full transition-all',
                    selectedBudget.actualAmount > selectedBudget.budgetedAmount ? 'bg-red-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${Math.min((selectedBudget.actualAmount / selectedBudget.budgetedAmount) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المخطط' : 'Budgeted'}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedBudget.budgetedAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفعلي' : 'Actual'}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedBudget.actualAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرق' : 'Variance'}</p>
                <p className={clsx('text-lg font-bold', selectedBudget.variance >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(selectedBudget.variance)}
                </p>
              </div>
            </div>

            {selectedBudget.notes && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                <p className="text-gray-900 dark:text-white">{selectedBudget.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBudget ? (locale === 'ar' ? 'تعديل الموازنة' : 'Edit Budget') : (locale === 'ar' ? 'إضافة موازنة' : 'Add Budget')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'الكود' : 'Code'}
              placeholder="BUD-2025-001"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              disabled={!!selectedBudget}
            />
            <Input
              label={locale === 'ar' ? 'السنة المالية' : 'Fiscal Year'}
              placeholder="2025"
              value={formData.fiscalYear}
              onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
              inputMode="numeric"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
              placeholder="Budget name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label={locale === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
              placeholder="اسم الموازنة"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'القسم (EN)' : 'Department (EN)'}
              placeholder={locale === 'ar' ? 'مثال: Sales' : 'e.g. Sales'}
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              label={locale === 'ar' ? 'القسم (AR)' : 'Department (AR)'}
              placeholder={locale === 'ar' ? 'مثال: المبيعات' : 'e.g. المبيعات'}
              value={formData.departmentAr}
              onChange={(e) => setFormData({ ...formData, departmentAr: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الفئة' : 'Category'}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <option value="revenue">{locale === 'ar' ? 'إيرادات' : 'Revenue'}</option>
                <option value="expense">{locale === 'ar' ? 'مصروفات' : 'Expense'}</option>
                <option value="capital">{locale === 'ar' ? 'رأسمالي' : 'Capital'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
              </select>
            </div>
          </div>

          <Input
            label={locale === 'ar' ? 'المبلغ المخطط' : 'Budgeted Amount'}
            type="number"
            placeholder="0.00"
            value={formData.budgetedAmount}
            onChange={(e) => setFormData({ ...formData, budgetedAmount: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'تاريخ البداية' : 'Start Date'} type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ النهاية' : 'End Date'} type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
          </div>
          <Input
            label={locale === 'ar' ? 'ملاحظات' : 'Notes'}
            placeholder={locale === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف الموازنة' : 'Delete Budget'}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذه الموازنة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this budget? This action cannot be undone.'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Accounting.Budgets.View, BudgetsPage);
