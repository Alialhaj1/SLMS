import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AuthGuard from '../components/AuthGuard';
import MainLayout from '../components/layout/MainLayout';
import { withPermission } from '../utils/withPermission';
import { MenuPermissions } from '../config/menu.permissions';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation.enhanced';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface Expense {
  id: number;
  description?: string;
  amount?: number;
  currency?: string;
  shipment_id?: number;
  created_at?: string;
  shipment_reference?: string;
  category?: string;
  status?: 'pending' | 'approved' | 'paid';
}

const Expenses: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDesc, setSortDesc] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({ description: '', amount: '', currency: 'USD', shipment_reference: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch expenses
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/shipments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load expenses');

      const shipments = await response.json();
      const allExpenses: Expense[] = [];

      (shipments.data || shipments).forEach((shipment: any) => {
        if (shipment.expenses && Array.isArray(shipment.expenses)) {
          shipment.expenses.forEach((expense: any) => {
            allExpenses.push({
              ...expense,
              shipment_reference: shipment.reference || shipment.id,
              status: expense.status || 'pending',
              category: expense.category || 'General',
            });
          });
        }
      });

      setExpenses(allExpenses);
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesSearch = !searchTerm || 
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.shipment_reference?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'amount') {
        comparison = (a.amount || 0) - (b.amount || 0);
      } else {
        comparison = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      return sortDesc ? -comparison : comparison;
    });

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount required';
    if (!formData.shipment_reference) newErrors.shipment_reference = 'Shipment is required';
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Mock save (backend integration needed)
      const newExpense: Expense = {
        id: editingExpense?.id || Math.random(),
        ...formData,
        amount: parseFloat(formData.amount),
        status: editingExpense?.status || 'pending',
        created_at: editingExpense?.created_at || new Date().toISOString(),
      };

      if (editingExpense) {
        setExpenses(expenses.map((e) => (e.id === editingExpense.id ? newExpense : e)));
        showToast(t('common.success'), 'success');
      } else {
        setExpenses([...expenses, newExpense]);
        showToast(t('common.success'), 'success');
      }

      setShowModal(false);
      setEditingExpense(null);
      setFormData({ description: '', amount: '', currency: 'USD', shipment_reference: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to save expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      // Mock delete (backend integration needed)
      setExpenses(expenses.filter((e) => e.id !== deletingId));
      showToast(t('common.success'), 'success');
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit modal
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      currency: expense.currency || 'USD',
      shipment_reference: expense.shipment_reference || '',
    });
    setShowModal(true);
  };

  // Total calculations
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingAmount = filteredExpenses
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <AuthGuard>
      <MainLayout>
        <Head>
          <title>Expenses - SLMS</title>
        </Head>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('expenses.title', 'Expenses')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('expenses.subtitle', 'Manage shipment expenses and costs')}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingExpense(null);
                setFormData({ description: '', amount: '', currency: 'USD', shipment_reference: '' });
                setFormErrors({});
                setShowModal(true);
              }}
              variant="primary"
              size="md"
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              {t('common.add', 'Add')} {t('expenses.title', 'Expense')}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {t('expenses.totalExpenses', 'Total Expenses')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ${totalAmount.toFixed(2)}
                </p>
              </div>
              <CurrencyDollarIcon className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {t('expenses.pendingApproval', 'Pending Approval')}
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  ${pendingAmount.toFixed(2)}
                </p>
              </div>
              <ArrowUpIcon className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  {t('expenses.count', 'Total Count')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {filteredExpenses.length}
                </p>
              </div>
              <CurrencyDollarIcon className="w-10 h-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('common.search', 'Search...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('common.all', 'All')}</option>
              <option value="pending">{t('expenses.pending', 'Pending')}</option>
              <option value="approved">{t('expenses.approved', 'Approved')}</option>
              <option value="paid">{t('expenses.paid', 'Paid')}</option>
            </select>

            <select
              value={`${sortBy}-${sortDesc ? 'desc' : 'asc'}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-');
                setSortBy(field as 'date' | 'amount');
                setSortDesc(dir === 'desc');
              }}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">{t('common.newestFirst', 'Newest First')}</option>
              <option value="date-asc">{t('common.oldestFirst', 'Oldest First')}</option>
              <option value="amount-desc">{t('common.highestFirst', 'Highest First')}</option>
              <option value="amount-asc">{t('common.lowestFirst', 'Lowest First')}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-3">{t('common.loading', 'Loading...')}</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <CurrencyDollarIcon className="w-16 h-16 text-gray-400 mx-auto mb-3 opacity-50" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">{t('common.noData', 'No expenses found')}</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                {t('expenses.noExpensesMessage', 'Add your first expense to get started')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.shipment', 'Shipment')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.description', 'Description')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.amount', 'Amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.status', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.date', 'Date')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {expense.shipment_reference}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        ${expense.amount?.toFixed(2)} {expense.currency}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            expense.status === 'paid'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : expense.status === 'approved'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                          }`}
                        >
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {expense.created_at ? new Date(expense.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right space-x-2 flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(expense.id);
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingExpense ? t('expenses.editExpense', 'Edit Expense') : t('expenses.addExpense', 'Add Expense')}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label={t('expenses.description', 'Description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={formErrors.description}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('expenses.amount', 'Amount')}
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                error={formErrors.amount}
                step="0.01"
                min="0"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('expenses.currency', 'Currency')}
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>

            <Input
              label={t('expenses.shipmentReference', 'Shipment Reference')}
              value={formData.shipment_reference}
              onChange={(e) => setFormData({ ...formData, shipment_reference: e.target.value })}
              error={formErrors.shipment_reference}
            />

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                variant="primary"
                loading={isSubmitting}
                className="flex-1"
              >
                {t('common.save', 'Save')}
              </Button>
              <Button
                onClick={() => setShowModal(false)}
                variant="secondary"
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
          title={t('expenses.deleteExpense', 'Delete Expense')}
          message={t('expenses.deleteMessage', 'Are you sure you want to delete this expense? This action cannot be undone.')}
          confirmText={t('common.delete', 'Delete')}
          variant="danger"
          loading={isDeleting}
        />
      </MainLayout>
    </AuthGuard>
  );
};

export default withPermission(MenuPermissions.Expenses.View, Expenses);
