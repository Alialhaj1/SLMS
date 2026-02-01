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
  CreditCardIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  payment_type: 'cash' | 'bank_transfer' | 'cheque' | 'credit_card' | 'digital_wallet' | 'credit' | 'other';
  gl_account_id?: number;
  gl_account_code?: string;
  requires_reference: boolean;
  requires_bank: boolean;
  processing_days: number;
  transaction_fee_percent?: number;
  transaction_fee_fixed?: number;
  is_default: boolean;
  is_active: boolean;
  icon?: string;
  description?: string;
  created_at: string;
}

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash', labelAr: 'نقدي', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: BanknotesIcon },
  { value: 'bank_transfer', label: 'Bank Transfer', labelAr: 'تحويل بنكي', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: BuildingLibraryIcon },
  { value: 'cheque', label: 'Cheque', labelAr: 'شيك', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: DocumentTextIcon },
  { value: 'credit_card', label: 'Credit Card', labelAr: 'بطاقة ائتمان', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: CreditCardIcon },
  { value: 'digital_wallet', label: 'Digital Wallet', labelAr: 'محفظة رقمية', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: DevicePhoneMobileIcon },
  { value: 'credit', label: 'Credit/On Account', labelAr: 'آجل', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: DocumentTextIcon },
  { value: 'other', label: 'Other', labelAr: 'أخرى', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: CreditCardIcon },
];

function PaymentMethodsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentMethod | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    payment_type: 'cash' as PaymentMethod['payment_type'],
    gl_account_code: '',
    requires_reference: false,
    requires_bank: false,
    processing_days: 0,
    transaction_fee_percent: 0,
    transaction_fee_fixed: 0,
    is_default: false,
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
      const result = await apiClient.get<{ success: boolean; data: PaymentMethod[]; total: number }>(
        '/api/payment-methods',
        { cache: 'no-store' }
      );
      setItems(result.data || []);
    } catch {
      showToast(t('common.fetchError', 'Failed to load data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.put(`/api/payment-methods/${editingItem.id}`, formData);
      } else {
        await apiClient.post('/api/payment-methods', formData);
      }

      showToast(t('common.success'), 'success');
      fetchData();
      setShowModal(false);
      resetForm();
    } catch {
      showToast(t('common.saveError', 'Failed to save'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/payment-methods/${deletingId}`);
      setItems(items.filter(i => i.id !== deletingId));
      showToast(t('common.deleted'), 'success');
    } catch {
      showToast(t('common.deleteError', 'Failed to delete'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', payment_type: 'cash', gl_account_code: '', requires_reference: false, requires_bank: false, processing_days: 0, transaction_fee_percent: 0, transaction_fee_fixed: 0, is_default: false, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: PaymentMethod) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      payment_type: item.payment_type,
      gl_account_code: item.gl_account_code || '',
      requires_reference: item.requires_reference,
      requires_bank: item.requires_bank,
      processing_days: item.processing_days,
      transaction_fee_percent: item.transaction_fee_percent || 0,
      transaction_fee_fixed: item.transaction_fee_fixed || 0,
      is_default: item.is_default,
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.payment_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('paymentMethods.title', 'Payment Methods')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('paymentMethods.title', 'Payment Methods')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('paymentMethods.subtitle', 'Cash, bank transfer, cheque, credit card, digital wallets')}
            </p>
          </div>
          {hasPermission('master:customers:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('paymentMethods.new', 'New Payment Method')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        {PAYMENT_TYPES.map(type => {
          const Icon = type.icon;
          const count = items.filter(i => i.payment_type === type.value).length;
          return (
            <Card key={type.value} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                  <Icon className={`w-5 h-5 ${type.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{type.label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allTypes', 'All Types')}</option>
            {PAYMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
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
              <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('paymentMethods.glAccount', 'GL Account')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('paymentMethods.processingDays', 'Processing')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('paymentMethods.fees', 'Fees')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('paymentMethods.requirements', 'Requirements')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const type = PAYMENT_TYPES.find(t => t.value === item.payment_type);
                  const Icon = type?.icon || CreditCardIcon;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${type?.color.split(' ')[1]}`} />
                          <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{item.code}</span>
                          {item.is_default && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                              {t('common.default')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${type?.color}`}>
                          {type?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-sm text-gray-600 dark:text-gray-400">
                        {item.gl_account_code || '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        {item.processing_days} {t('common.days')}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {(item.transaction_fee_percent || item.transaction_fee_fixed) ? (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            {item.transaction_fee_percent ? `${item.transaction_fee_percent}%` : ''}
                            {item.transaction_fee_percent && item.transaction_fee_fixed ? ' + ' : ''}
                            {item.transaction_fee_fixed ? `$${item.transaction_fee_fixed}` : ''}
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">{t('paymentMethods.noFees', 'No Fees')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          {item.requires_reference && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">Ref#</span>
                          )}
                          {item.requires_bank && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">Bank</span>
                          )}
                          {!item.requires_reference && !item.requires_bank && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {item.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:customers:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:customers:delete') && !item.is_default && (
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
        title={editingItem ? t('paymentMethods.edit') : t('paymentMethods.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., CASH"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {PAYMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('paymentMethods.glAccount', 'GL Account Code')}
              value={formData.gl_account_code}
              onChange={(e) => setFormData({ ...formData, gl_account_code: e.target.value })}
              placeholder="e.g., 1001"
            />
            <Input
              label={t('paymentMethods.processingDays', 'Processing Days')}
              type="number"
              min="0"
              value={formData.processing_days}
              onChange={(e) => setFormData({ ...formData, processing_days: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('paymentMethods.feePercent', 'Fee (%)')}
              type="number"
              min="0"
              step="0.01"
              value={formData.transaction_fee_percent}
              onChange={(e) => setFormData({ ...formData, transaction_fee_percent: Number(e.target.value) })}
            />
            <Input
              label={t('paymentMethods.feeFixed', 'Fixed Fee')}
              type="number"
              min="0"
              step="0.01"
              value={formData.transaction_fee_fixed}
              onChange={(e) => setFormData({ ...formData, transaction_fee_fixed: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_reference"
                checked={formData.requires_reference}
                onChange={(e) => setFormData({ ...formData, requires_reference: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="requires_reference" className="text-sm text-gray-700 dark:text-gray-300">
                {t('paymentMethods.requiresRef', 'Requires Reference #')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_bank"
                checked={formData.requires_bank}
                onChange={(e) => setFormData({ ...formData, requires_bank: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="requires_bank" className="text-sm text-gray-700 dark:text-gray-300">
                {t('paymentMethods.requiresBank', 'Requires Bank Selection')}
              </label>
            </div>
          </div>
          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
                {t('common.default')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                {t('common.active')}
              </label>
            </div>
          </div>
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
        message={t('common.deleteMessage')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, PaymentMethodsPage);
