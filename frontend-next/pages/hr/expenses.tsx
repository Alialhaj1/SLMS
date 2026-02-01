/**
 * 🧾 Employee Expenses Management - إدارة مصروفات الموظفين
 * ========================================================
 * إدارة مطالبات مصروفات الموظفين والتعويضات
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  ReceiptPercentIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface ExpenseClaim {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_name_ar: string;
  department: string;
  department_ar: string;
  category: 'travel' | 'meals' | 'transport' | 'supplies' | 'communication' | 'training' | 'other';
  description: string;
  description_ar: string;
  amount: number;
  expense_date: string;
  submission_date: string;
  receipt_attached: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  approved_by?: string;
  approval_date?: string;
  payment_date?: string;
  rejection_reason?: string;
}

export default function EmployeeExpensesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseClaim | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const canManage = hasPermission('expenses:manage');
  const canApprove = hasPermission('expenses:approve');

  const categories = [
    { value: 'travel', label: 'Travel', label_ar: 'سفر', icon: '✈️' },
    { value: 'meals', label: 'Meals', label_ar: 'وجبات', icon: '🍽️' },
    { value: 'transport', label: 'Transport', label_ar: 'مواصلات', icon: '🚗' },
    { value: 'supplies', label: 'Office Supplies', label_ar: 'مستلزمات مكتبية', icon: '📎' },
    { value: 'communication', label: 'Communication', label_ar: 'اتصالات', icon: '📱' },
    { value: 'training', label: 'Training', label_ar: 'تدريب', icon: '📚' },
    { value: 'other', label: 'Other', label_ar: 'أخرى', icon: '📋' },
  ];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      setExpenses([
        {
          id: 1, employee_id: 101, employee_name: 'Ahmed Al-Farsi', employee_name_ar: 'أحمد الفارسي',
          department: 'Sales', department_ar: 'المبيعات', category: 'travel',
          description: 'Client meeting in Riyadh', description_ar: 'اجتماع عميل في الرياض',
          amount: 2500, expense_date: '2024-01-10', submission_date: '2024-01-12',
          receipt_attached: true, status: 'approved', approved_by: 'Manager', approval_date: '2024-01-13'
        },
        {
          id: 2, employee_id: 102, employee_name: 'Sara Hassan', employee_name_ar: 'سارة حسن',
          department: 'Marketing', department_ar: 'التسويق', category: 'meals',
          description: 'Team lunch meeting', description_ar: 'غداء اجتماع الفريق',
          amount: 450, expense_date: '2024-01-15', submission_date: '2024-01-15',
          receipt_attached: true, status: 'submitted'
        },
        {
          id: 3, employee_id: 103, employee_name: 'Khalid Omar', employee_name_ar: 'خالد عمر',
          department: 'IT', department_ar: 'تقنية المعلومات', category: 'training',
          description: 'AWS Certification course', description_ar: 'دورة شهادة AWS',
          amount: 3500, expense_date: '2024-01-08', submission_date: '2024-01-10',
          receipt_attached: true, status: 'paid', approved_by: 'HR Manager', approval_date: '2024-01-11', payment_date: '2024-01-18'
        },
        {
          id: 4, employee_id: 104, employee_name: 'Fatima Al-Qahtani', employee_name_ar: 'فاطمة القحطاني',
          department: 'Finance', department_ar: 'المالية', category: 'transport',
          description: 'Uber to client site', description_ar: 'أوبر إلى موقع العميل',
          amount: 85, expense_date: '2024-01-17', submission_date: '2024-01-17',
          receipt_attached: false, status: 'rejected', rejection_reason: 'No receipt attached'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!selectedExpense) return;
    try {
      if (selectedExpense.id === 0) {
        setExpenses(prev => [...prev, { 
          ...selectedExpense, 
          id: Date.now(),
          submission_date: new Date().toISOString().split('T')[0],
          status: 'draft'
        }]);
      } else {
        setExpenses(prev => prev.map(e => e.id === selectedExpense.id ? selectedExpense : e));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleSubmit = (expense: ExpenseClaim) => {
    setExpenses(prev => prev.map(e => 
      e.id === expense.id ? { ...e, status: 'submitted', submission_date: new Date().toISOString().split('T')[0] } : e
    ));
    showToast('Expense submitted for approval', 'success');
  };

  const handleApprove = (expense: ExpenseClaim) => {
    setExpenses(prev => prev.map(e => 
      e.id === expense.id ? { ...e, status: 'approved', approval_date: new Date().toISOString().split('T')[0] } : e
    ));
    showToast('Expense approved', 'success');
  };

  const handleReject = (expense: ExpenseClaim) => {
    setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, status: 'rejected' } : e));
    showToast('Expense rejected', 'info');
  };

  const handleMarkPaid = (expense: ExpenseClaim) => {
    setExpenses(prev => prev.map(e => 
      e.id === expense.id ? { ...e, status: 'paid', payment_date: new Date().toISOString().split('T')[0] } : e
    ));
    showToast('Expense marked as paid', 'success');
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    setExpenses(prev => prev.filter(e => e.id !== selectedExpense.id));
    showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    setConfirmDelete(false);
    setSelectedExpense(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'submitted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || '📋';
  };

  const filteredExpenses = expenses.filter(exp => {
    if (filterStatus !== 'all' && exp.status !== filterStatus) return false;
    if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return exp.employee_name.toLowerCase().includes(query) ||
             exp.employee_name_ar.includes(query) ||
             exp.description.toLowerCase().includes(query);
    }
    return true;
  });

  const pendingApproval = expenses.filter(e => e.status === 'submitted');
  const totalPending = pendingApproval.reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('hr.expenses') || 'Employee Expenses'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <ReceiptPercentIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('hr.expenses') || 'Employee Expenses'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة مطالبات مصروفات الموظفين' : 'Manage employee expense claims'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedExpense({
                id: 0, employee_id: 0, employee_name: '', employee_name_ar: '',
                department: '', department_ar: '', category: 'other',
                description: '', description_ar: '', amount: 0,
                expense_date: new Date().toISOString().split('T')[0],
                submission_date: '', receipt_attached: false, status: 'draft'
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              New Expense
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{pendingApproval.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending Approval</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalPending.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending Amount (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalApproved.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Approved (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{expenses.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Claims</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{locale === 'ar' ? c.label_ar : c.label}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Receipt</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? exp.employee_name_ar : exp.employee_name}
                            </p>
                            <p className="text-xs text-gray-500">{exp.expense_date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span>{getCategoryIcon(exp.category)}</span>
                          <span className="text-sm">{categories.find(c => c.value === exp.category)?.[locale === 'ar' ? 'label_ar' : 'label']}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                        {locale === 'ar' ? exp.description_ar : exp.description}
                      </td>
                      <td className="px-4 py-3 text-end font-medium">{exp.amount.toLocaleString()} SAR</td>
                      <td className="px-4 py-3 text-center">
                        {exp.receipt_attached ? (
                          <PhotoIcon className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-xs text-red-500">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(exp.status))}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          {exp.status === 'draft' && (
                            <button onClick={() => handleSubmit(exp)}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Submit">
                              <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {exp.status === 'submitted' && canApprove && (
                            <>
                              <button onClick={() => handleApprove(exp)}
                                className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Approve">
                                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                              </button>
                              <button onClick={() => handleReject(exp)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Reject">
                                <XCircleIcon className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                          {exp.status === 'approved' && canApprove && (
                            <button onClick={() => handleMarkPaid(exp)}
                              className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Mark Paid">
                              <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          <button onClick={() => { setSelectedExpense(exp); setIsModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <PencilIcon className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => { setSelectedExpense(exp); setConfirmDelete(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <TrashIcon className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedExpense?.id ? 'Edit Expense' : 'New Expense Claim'} size="lg">
        {selectedExpense && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Employee Name (EN)" value={selectedExpense.employee_name}
                onChange={(e) => setSelectedExpense({ ...selectedExpense, employee_name: e.target.value })} />
              <Input label="Employee Name (AR)" value={selectedExpense.employee_name_ar} dir="rtl"
                onChange={(e) => setSelectedExpense({ ...selectedExpense, employee_name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select value={selectedExpense.category}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, category: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {locale === 'ar' ? c.label_ar : c.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Amount (SAR)" type="number" value={selectedExpense.amount}
                onChange={(e) => setSelectedExpense({ ...selectedExpense, amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Expense Date" type="date" value={selectedExpense.expense_date}
                onChange={(e) => setSelectedExpense({ ...selectedExpense, expense_date: e.target.value })} />
              <div className="flex items-center gap-2 pt-8">
                <input type="checkbox" id="receipt" checked={selectedExpense.receipt_attached}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, receipt_attached: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300" />
                <label htmlFor="receipt" className="text-sm">Receipt Attached</label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Description (EN)" value={selectedExpense.description}
                onChange={(e) => setSelectedExpense({ ...selectedExpense, description: e.target.value })} />
              <Input label="Description (AR)" value={selectedExpense.description_ar} dir="rtl"
                onChange={(e) => setSelectedExpense({ ...selectedExpense, description_ar: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveExpense}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteExpense} title="Delete Expense"
        message="Are you sure you want to delete this expense claim?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
