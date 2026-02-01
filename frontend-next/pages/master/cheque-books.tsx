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
import apiClient from '../../lib/apiClient';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ChequeBook {
  id: number;
  code: string;
  bank_account_id: number;
  bank_account_code?: string;
  bank_name: string;
  series_name: string;
  cheque_prefix?: string;
  start_number: number;
  end_number: number;
  current_number: number;
  total_leaves: number;
  used_leaves: number;
  cancelled_leaves: number;
  available_leaves: number;
  issue_date: string;
  expiry_date?: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  is_default: boolean;
  notes?: string;
  created_at: string;
}

const STATUS_CONFIG = {
  active: { label: 'Active', labelAr: 'نشط', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircleIcon },
  completed: { label: 'Completed', labelAr: 'مكتمل', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: BookOpenIcon },
  expired: { label: 'Expired', labelAr: 'منتهي', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: ExclamationTriangleIcon },
  cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: XCircleIcon },
};

function ChequeBooksPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<ChequeBook[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: number; code: string; bank_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ChequeBook | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    bank_account_id: 0,
    series_name: '',
    cheque_prefix: '',
    start_number: 1,
    end_number: 50,
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    is_default: false,
    notes: '',
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
      const [booksRes, accountsRes] = await Promise.all([
        apiClient.get('/api/cheque-books') as any,
        apiClient.get('/api/bank-accounts') as any,
      ]);

      const books: ChequeBook[] = Array.isArray(booksRes)
        ? booksRes
        : Array.isArray(booksRes?.data)
          ? booksRes.data
          : Array.isArray(booksRes?.data?.data)
            ? booksRes.data.data
            : [];

      const accountsRaw: any[] = Array.isArray(accountsRes)
        ? accountsRes
        : Array.isArray(accountsRes?.data)
          ? accountsRes.data
          : Array.isArray(accountsRes?.data?.data)
            ? accountsRes.data.data
            : [];

      const accounts = accountsRaw
        .filter((a) => a && typeof a.id === 'number')
        .map((a) => ({ id: a.id as number, code: String(a.code ?? ''), bank_name: String(a.bank_name ?? '') }));

      setItems(books);
      setBankAccounts(accounts);
    } catch {
      setItems([]);
      setBankAccounts([]);
      showToast(t('common.failedToLoad', 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.bank_account_id) newErrors.bank_account_id = t('validation.required');
    if (!formData.series_name.trim()) newErrors.series_name = t('validation.required');
    if (formData.start_number < 1) newErrors.start_number = t('validation.positive');
    if (formData.end_number <= formData.start_number) newErrors.end_number = t('chequeBooks.endMustBeGreater', 'End must be greater than start');
    if (!formData.issue_date) newErrors.issue_date = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        bank_account_id: formData.bank_account_id,
        series_name: formData.series_name,
        cheque_prefix: formData.cheque_prefix || undefined,
        start_number: formData.start_number,
        end_number: formData.end_number,
        issue_date: formData.issue_date,
        expiry_date: formData.expiry_date || undefined,
        is_default: formData.is_default,
        notes: formData.notes || undefined,
      };

      if (editingItem) {
        await apiClient.put(`/api/cheque-books/${editingItem.id}`, payload);
      } else {
        await apiClient.post('/api/cheque-books', payload);
      }

      showToast(t('common.success'), 'success');
      await fetchData();
      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find(i => i.id === deletingId);
    if (item?.used_leaves && item.used_leaves > 0) {
      showToast(t('chequeBooks.cannotDeleteUsed', 'Cannot delete cheque book with issued cheques'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/cheque-books/${deletingId}`);
      showToast(t('common.deleted'), 'success');
      await fetchData();
    } catch {
      showToast(t('common.failedToDelete', 'Failed to delete'), 'error');
    }
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', bank_account_id: 0, series_name: '', cheque_prefix: '', start_number: 1, end_number: 50, issue_date: new Date().toISOString().split('T')[0], expiry_date: '', is_default: false, notes: '' });
    setErrors({});
  };

  const openEdit = (item: ChequeBook) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      bank_account_id: item.bank_account_id,
      series_name: item.series_name,
      cheque_prefix: item.cheque_prefix || '',
      start_number: item.start_number,
      end_number: item.end_number,
      issue_date: item.issue_date,
      expiry_date: item.expiry_date || '',
      is_default: item.is_default,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.series_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bank_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchBank = !filterBank || item.bank_account_id === Number(filterBank);
    return matchSearch && matchStatus && matchBank;
  });

  const activeBooks = items.filter(i => i.status === 'active').length;
  const totalLeaves = items.reduce((sum, i) => sum + i.total_leaves, 0);
  const usedLeaves = items.reduce((sum, i) => sum + i.used_leaves, 0);
  const availableLeaves = items.filter(i => i.status === 'active').reduce((sum, i) => sum + i.available_leaves, 0);

  const getUsagePercentage = (item: ChequeBook) => {
    return Math.round((item.used_leaves / item.total_leaves) * 100);
  };

  const formatChequeNumber = (prefix: string | undefined, number: number) => {
    return prefix ? `${prefix}-${number}` : String(number);
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('chequeBooks.title', 'Cheque Books')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('chequeBooks.title', 'Cheque Books')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('chequeBooks.subtitle', 'Track cheque book inventory and usage')}
            </p>
          </div>
          {hasPermission(MenuPermissions.Finance.ChequeBooks.Create) && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('chequeBooks.new', 'New Cheque Book')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('chequeBooks.activeBooks', 'Active Books')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeBooks}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DocumentTextIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('chequeBooks.totalLeaves', 'Total Leaves')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalLeaves}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CheckCircleIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('chequeBooks.usedLeaves', 'Used')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{usedLeaves}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <DocumentTextIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('chequeBooks.available', 'Available')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{availableLeaves}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('chequeBooks.allStatuses', 'All Statuses')}</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('chequeBooks.allBanks', 'All Banks')}</option>
            {bankAccounts.map(bank => (
              <option key={bank.id} value={bank.id}>{bank.bank_name}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
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
              <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chequeBooks.series', 'Series')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chequeBooks.bank', 'Bank')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chequeBooks.range', 'Cheque Range')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chequeBooks.current', 'Current')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chequeBooks.usage', 'Usage')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('chequeBooks.expiry', 'Expiry')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const statusConfig = STATUS_CONFIG[item.status];
                  const StatusIcon = statusConfig.icon;
                  const usagePercent = getUsagePercentage(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</span>
                          {item.is_default && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.series_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.bank_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.bank_account_code}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <code className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {formatChequeNumber(item.cheque_prefix, item.start_number)} - {formatChequeNumber(item.cheque_prefix, item.end_number)}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <code className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {formatChequeNumber(item.cheque_prefix, item.current_number)}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500 dark:text-gray-400">
                              {item.used_leaves}/{item.total_leaves}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{usagePercent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${usagePercent}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-400">{item.cancelled_leaves} cancelled</span>
                            <span className="text-green-600 dark:text-green-400">{item.available_leaves} left</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.expiry_date ? (
                          <span className={`text-sm ${new Date(item.expiry_date) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission(MenuPermissions.Finance.ChequeBooks.Edit) && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission(MenuPermissions.Finance.ChequeBooks.Delete) && item.used_leaves === 0 && (
                            <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('chequeBooks.edit') : t('chequeBooks.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder={t('common.autoGenerated', 'Auto-generated')}
              disabled
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('chequeBooks.bankAccount', 'Bank Account')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.bank_account_id}
                onChange={(e) => setFormData({ ...formData, bank_account_id: Number(e.target.value) })}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${errors.bank_account_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                disabled={!!editingItem}
              >
                <option value={0}>{t('common.select')}</option>
                {bankAccounts.map(bank => (
                  <option key={bank.id} value={bank.id}>{bank.code} - {bank.bank_name}</option>
                ))}
              </select>
              {errors.bank_account_id && <p className="text-red-500 text-xs mt-1">{errors.bank_account_id}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('chequeBooks.seriesName', 'Series Name')}
              value={formData.series_name}
              onChange={(e) => setFormData({ ...formData, series_name: e.target.value })}
              error={errors.series_name}
              required
              placeholder="e.g., Main Series 2025"
            />
            <Input
              label={t('chequeBooks.chequePrefix', 'Cheque Prefix')}
              value={formData.cheque_prefix}
              onChange={(e) => setFormData({ ...formData, cheque_prefix: e.target.value.toUpperCase() })}
              placeholder="e.g., ARB"
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5" />
              {t('chequeBooks.chequeRange', 'Cheque Number Range')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('chequeBooks.startNumber', 'Start Number')}
                type="number"
                min="1"
                value={formData.start_number}
                onChange={(e) => setFormData({ ...formData, start_number: Number(e.target.value) })}
                error={errors.start_number}
                required
                disabled={!!editingItem && editingItem.used_leaves > 0}
              />
              <Input
                label={t('chequeBooks.endNumber', 'End Number')}
                type="number"
                min="1"
                value={formData.end_number}
                onChange={(e) => setFormData({ ...formData, end_number: Number(e.target.value) })}
                error={errors.end_number}
                required
                disabled={!!editingItem && editingItem.used_leaves > 0}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('chequeBooks.totalLeavesCalc', 'Total leaves')}: <strong>{formData.end_number - formData.start_number + 1}</strong>
              {formData.cheque_prefix && (
                <span className="ml-4">
                  {t('chequeBooks.preview', 'Preview')}: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{formatChequeNumber(formData.cheque_prefix, formData.start_number)}</code> - <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{formatChequeNumber(formData.cheque_prefix, formData.end_number)}</code>
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('chequeBooks.issueDate', 'Issue Date')}
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              error={errors.issue_date}
              required
            />
            <Input
              label={t('chequeBooks.expiryDate', 'Expiry Date')}
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
                {t('chequeBooks.setDefault', 'Set as Default')}
              </label>
            </div>
          </div>

          <Input
            label={t('common.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
        message={t('chequeBooks.deleteWarning', 'This cheque book will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Finance.ChequeBooks.View, ChequeBooksPage);
