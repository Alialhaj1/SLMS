import React, { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import CurrencySelector from '@/components/shared/CurrencySelector';
import ExchangeRateField from '@/components/ui/ExchangeRateField';
import { companyStore } from '@/lib/companyStore';
import { 
  PlusIcon, 
  EyeIcon, 
  CheckIcon, 
  XMarkIcon,
  LockClosedIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ShipmentExpense {
  id: number;
  expense_type_code: string;
  expense_type_name_en: string;
  expense_type_name_ar: string;
  expense_type_account: string;
  amount: number;
  currency_code: string;
  currency_symbol: string;
  exchange_rate: number;
  amount_local: number;
  distribution_method: string;
  expense_date: string;
  reference_number: string;
  description: string;
  approval_status: string;
  posted: boolean;
  items_distributed: number;
}

interface ExpenseType {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  account_number: string;
  category: string;
  default_distribution_method: string;
}

interface Currency {
  id: number;
  code: string;
  symbol: string;
}

interface ShipmentExpensesTabProps {
  shipmentId: number;
  projectId: number;
  isLocked: boolean;
}

export default function ShipmentExpensesTab({ 
  shipmentId, 
  projectId, 
  isLocked 
}: ShipmentExpensesTabProps) {
  const { locale } = useLocale();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  
  const [expenses, setExpenses] = useState<ShipmentExpense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [distributionModalOpen, setDistributionModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ShipmentExpense | null>(null);
  const [distribution, setDistribution] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  
  const getCompanyId = () => companyStore.getActiveCompanyId();
  
  const [formData, setFormData] = useState({
    expense_type_id: '',
    amount: '',
    currency_id: '',
    exchange_rate: '1.0',
    distribution_method: 'VALUE',
    expense_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    description: '',
    notes: ''
  });

  const canCreate = hasPermission('shipments:expenses:create') && !isLocked;
  const canUpdate = hasPermission('shipments:expenses:update') && !isLocked;
  const canDelete = hasPermission('shipments:expenses:delete') && !isLocked;
  const canApprove = hasPermission('shipments:expenses:approve');
  const canPost = hasPermission('shipments:expenses:post');

  useEffect(() => {
    fetchExpenses();
    fetchExpenseTypes();
    fetchCurrencies();
  }, [shipmentId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipments/${shipmentId}/expenses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast(locale === 'ar' ? 'فشل تحميل المصاريف' : 'Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseTypes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/master/shipment-expense-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setExpenseTypes(data.data);
      }
    } catch (error) {
      console.error('Error fetching expense types:', error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/master/currencies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setCurrencies(data.data);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipments/${shipmentId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          ...formData
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast(locale === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully', 'success');
        setModalOpen(false);
        fetchExpenses();
        resetForm();
      } else {
        showToast(data.error?.message || (locale === 'ar' ? 'فشل إضافة المصروف' : 'Failed to add expense'), 'error');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      showToast(locale === 'ar' ? 'فشل إضافة المصروف' : 'Failed to add expense', 'error');
    }
  };

  const handleApprove = async (expenseId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipments/${shipmentId}/expenses/${expenseId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast(locale === 'ar' ? 'تم اعتماد المصروف' : 'Expense approved', 'success');
        fetchExpenses();
      } else {
        showToast(data.error?.message || (locale === 'ar' ? 'فشل اعتماد المصروف' : 'Failed to approve'), 'error');
      }
    } catch (error) {
      console.error('Error approving expense:', error);
      showToast(locale === 'ar' ? 'فشل اعتماد المصروف' : 'Failed to approve expense', 'error');
    }
  };

  const handlePost = async (expenseId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipments/${shipmentId}/expenses/${expenseId}/post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast(locale === 'ar' ? 'تم ترحيل المصروف للمحاسبة' : 'Expense posted successfully', 'success');
        fetchExpenses();
      } else {
        showToast(data.error?.message || (locale === 'ar' ? 'فشل ترحيل المصروف' : 'Failed to post'), 'error');
      }
    } catch (error) {
      console.error('Error posting expense:', error);
      showToast(locale === 'ar' ? 'فشل ترحيل المصروف' : 'Failed to post expense', 'error');
    }
  };

  const viewDistribution = async (expense: ShipmentExpense) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `http://localhost:4000/api/shipments/${shipmentId}/expenses/${expense.id}/distribution`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        setDistribution(data.data);
        setSelectedExpense(expense);
        setDistributionModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching distribution:', error);
      showToast(locale === 'ar' ? 'فشل تحميل التوزيع' : 'Failed to load distribution', 'error');
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `http://localhost:4000/api/shipments/${shipmentId}/expenses/${expenseToDelete}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        showToast(locale === 'ar' ? 'تم حذف المصروف' : 'Expense deleted', 'success');
        fetchExpenses();
      } else {
        showToast(data.error?.message || (locale === 'ar' ? 'فشل الحذف' : 'Failed to delete'), 'error');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast(locale === 'ar' ? 'فشل حذف المصروف' : 'Failed to delete expense', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      expense_type_id: '',
      amount: '',
      currency_id: '',
      exchange_rate: '1.0',
      distribution_method: 'VALUE',
      expense_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      description: '',
      notes: ''
    });
    setSelectedCurrencyCode(null);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount_local || 0)), 0);
  const postedExpenses = expenses.filter(e => e.posted).reduce((sum, e) => sum + parseFloat(String(e.amount_local || 0)), 0);
  const pendingExpenses = expenses.filter(e => !e.posted).reduce((sum, e) => sum + parseFloat(String(e.amount_local || 0)), 0);

  const getStatusBadge = (expense: ShipmentExpense) => {
    if (expense.posted) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <LockClosedIcon className="w-3 h-3 mr-1" />
          {locale === 'ar' ? 'مرحّل' : 'Posted'}
        </span>
      );
    }
    
    if (expense.approval_status === 'approved') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <CheckIcon className="w-3 h-3 mr-1" />
          {locale === 'ar' ? 'معتمد' : 'Approved'}
        </span>
      );
    }
    
    if (expense.approval_status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XMarkIcon className="w-3 h-3 mr-1" />
          {locale === 'ar' ? 'مرفوض' : 'Rejected'}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        {locale === 'ar' ? 'معلق' : 'Pending'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {locale === 'ar' ? 'مصاريف الشحنة' : 'Shipment Expenses'}
        </h3>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            {locale === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
            {locale === 'ar' ? 'إجمالي المصاريف' : 'Total Expenses'}
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {totalExpenses.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1">
            {locale === 'ar' ? 'المصاريف المرحلة' : 'Posted Expenses'}
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {postedExpenses.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
            {locale === 'ar' ? 'المصاريف المعلقة' : 'Pending Expenses'}
          </div>
          <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
            {pendingExpenses.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'نوع المصروف' : 'Expense Type'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'العملة' : 'Currency'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'طريقة التوزيع' : 'Distribution'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الحالة' : 'Status'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لا توجد مصاريف' : 'No expenses found'}
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {locale === 'ar' ? expense.expense_type_name_ar : expense.expense_type_name_en}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {expense.expense_type_code} • {expense.expense_type_account}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {parseFloat(String(expense.amount_local)).toFixed(2)}
                      </div>
                      {expense.exchange_rate !== 1 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {parseFloat(String(expense.amount)).toFixed(2)} × {expense.exchange_rate}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {expense.currency_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {expense.distribution_method}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {expense.items_distributed} {locale === 'ar' ? 'صنف' : 'items'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(expense)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewDistribution(expense)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title={locale === 'ar' ? 'عرض التوزيع' : 'View Distribution'}
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        
                        {!expense.posted && expense.approval_status === 'pending' && canApprove && (
                          <button
                            onClick={() => handleApprove(expense.id)}
                            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title={locale === 'ar' ? 'اعتماد' : 'Approve'}
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                        )}
                        
                        {!expense.posted && expense.approval_status === 'approved' && canPost && (
                          <button
                            onClick={() => handlePost(expense.id)}
                            className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                            title={locale === 'ar' ? 'ترحيل' : 'Post'}
                          >
                            <LockClosedIcon className="w-5 h-5" />
                          </button>
                        )}
                        
                        {!expense.posted && canDelete && (
                          <button
                            onClick={() => {
                              setExpenseToDelete(expense.id);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title={locale === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={locale === 'ar' ? 'إضافة مصروف شحنة' : 'Add Shipment Expense'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'نوع المصروف' : 'Expense Type'} *
              </label>
              <select
                value={formData.expense_type_id}
                onChange={(e) => {
                  const typeId = e.target.value;
                  const selectedType = expenseTypes.find(t => t.id === parseInt(typeId));
                  setFormData({
                    ...formData,
                    expense_type_id: typeId,
                    distribution_method: selectedType?.default_distribution_method || 'VALUE'
                  });
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'اختر النوع' : 'Select Type'}</option>
                {expenseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {locale === 'ar' ? type.name_ar : type.name_en} ({type.account_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المبلغ' : 'Amount'} *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'العملة' : 'Currency'} *
              </label>
              <CurrencySelector
                value={formData.currency_id ? parseInt(formData.currency_id) : null}
                onChange={(id) => setFormData({ ...formData, currency_id: id ? String(id) : '' })}
                onCurrencyCodeChange={setSelectedCurrencyCode}
                companyId={getCompanyId()}
              />
            </div>

            {/* Exchange Rate - auto-fetched from exchange rates table */}
            <ExchangeRateField
              currencyCode={selectedCurrencyCode}
              value={formData.exchange_rate}
              onChange={(value) => setFormData({ ...formData, exchange_rate: value })}
              hideWhenBaseCurrency={true}
              label={locale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'طريقة التوزيع' : 'Distribution Method'} *
              </label>
              <select
                value={formData.distribution_method}
                onChange={(e) => setFormData({ ...formData, distribution_method: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="WEIGHT">{locale === 'ar' ? 'حسب الوزن' : 'By Weight'}</option>
                <option value="QTY">{locale === 'ar' ? 'حسب الكمية' : 'By Quantity'}</option>
                <option value="VALUE">{locale === 'ar' ? 'حسب القيمة' : 'By Value'}</option>
                <option value="EQUAL">{locale === 'ar' ? 'توزيع متساوي' : 'Equal Distribution'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'تاريخ المصروف' : 'Expense Date'} *
              </label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'رقم المرجع' : 'Reference Number'}
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الوصف' : 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit">
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Distribution Modal */}
      <Modal
        isOpen={distributionModalOpen}
        onClose={() => {
          setDistributionModalOpen(false);
          setDistribution(null);
          setSelectedExpense(null);
        }}
        title={locale === 'ar' ? 'توزيع المصروف على الأصناف' : 'Expense Distribution'}
        size="xl"
      >
        {distribution && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {locale === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {parseFloat(distribution.total_amount).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {locale === 'ar' ? 'طريقة التوزيع' : 'Distribution Method'}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {distribution.distribution_method}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'الصنف' : 'Item'}
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'الأساس' : 'Base'}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'النسبة' : 'Percentage'}
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'المبلغ الموزع' : 'Allocated Amount'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {distribution.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        <div>{locale === 'ar' ? item.item_name_ar : item.item_name}</div>
                        <div className="text-xs text-gray-500">{item.item_code}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">
                        {parseFloat(item.distribution_base).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-gray-900 dark:text-white">
                        {parseFloat(item.distribution_percentage).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {parseFloat(item.allocated_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right text-gray-900 dark:text-white">
                      {locale === 'ar' ? 'الإجمالي' : 'Total'}
                    </td>
                    <td className="px-4 py-2 text-sm font-bold text-right text-gray-900 dark:text-white">
                      {parseFloat(distribution.total_distributed).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف مصروف' : 'Delete Expense'}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
