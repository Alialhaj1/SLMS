import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withAnyPermission } from '../../utils/withPermission';
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
  ReceiptPercentIcon,
  MagnifyingGlassIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

interface TaxRate {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  tax_type_id: number;
  tax_type_code?: string;
  rate: number;
  min_amount?: number;
  max_amount?: number;
  effective_from: string;
  effective_to?: string;
  region?: string;
  item_category?: string;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

const TAX_TYPE_CODES = [
  { value: 'VAT-STD', label: 'Standard VAT (15%)', rate: 15 },
  { value: 'VAT-ZERO', label: 'Zero-Rated VAT', rate: 0 },
  { value: 'VAT-EXEMPT', label: 'VAT Exempt', rate: 0 },
  { value: 'CUSTOMS-GEN', label: 'General Customs', rate: 5 },
  { value: 'EXCISE-TOB', label: 'Tobacco Excise', rate: 100 },
  { value: 'EXCISE-SUGAR', label: 'Sugary Drinks', rate: 50 },
  { value: 'WHT-DIV', label: 'Withholding - Dividends', rate: 5 },
  { value: 'WHT-ROYALTY', label: 'Withholding - Royalties', rate: 15 },
  { value: 'ZAKAT', label: 'Zakat', rate: 2.5 },
];

function TaxRatesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const canCreate =
    hasPermission(MenuPermissions.Tax.Rates.Create as any) ||
    hasPermission('master:tax:create' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Create as any);
  const canEdit =
    hasPermission(MenuPermissions.Tax.Rates.Edit as any) ||
    hasPermission('master:tax:update' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Edit as any);
  const canDelete =
    hasPermission(MenuPermissions.Tax.Rates.Delete as any) ||
    hasPermission('master:tax:delete' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Delete as any);

  const [items, setItems] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTaxType, setFilterTaxType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxRate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    tax_type_id: 1,
    tax_type_code: 'VAT-STD',
    rate: 15,
    min_amount: 0,
    max_amount: 0,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    region: '',
    item_category: '',
    is_default: false,
    is_active: true,
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
      const res = await apiClient.get('/api/tax-rates');
      const payload: any = res?.data ?? res;
      setItems(Array.isArray(payload) ? payload : payload?.data || []);
    } catch (e) {
      showToast(t('common.error', 'Failed to load data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.rate < 0) newErrors.rate = t('validation.positiveNumber');
    if (!formData.effective_from) newErrors.effective_from = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.put(`/api/tax-rates/${editingItem.id}`, formData);
      } else {
        await apiClient.post('/api/tax-rates', formData);
      }
      showToast(t('common.success', 'Success'), 'success');
      await fetchData();
      setShowModal(false);
      resetForm();
    } catch (e) {
      showToast(t('common.error', 'Failed to save'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/tax-rates/${deletingId}`);
      setItems(items.filter(i => i.id !== deletingId));
      showToast(t('common.deleted', 'Deleted'), 'success');
    } catch (e) {
      showToast(t('common.error', 'Failed to delete'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', tax_type_id: 1, tax_type_code: 'VAT-STD', rate: 15, min_amount: 0, max_amount: 0, effective_from: new Date().toISOString().split('T')[0], effective_to: '', region: '', item_category: '', is_default: false, is_active: true, notes: '' });
    setErrors({});
  };

  const openEdit = (item: TaxRate) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      tax_type_id: item.tax_type_id,
      tax_type_code: item.tax_type_code || 'VAT-STD',
      rate: item.rate,
      min_amount: item.min_amount || 0,
      max_amount: item.max_amount || 0,
      effective_from: item.effective_from,
      effective_to: item.effective_to || '',
      region: item.region || '',
      item_category: item.item_category || '',
      is_default: item.is_default,
      is_active: item.is_active,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleTaxTypeChange = (typeCode: string) => {
    const taxType = TAX_TYPE_CODES.find(t => t.value === typeCode);
    setFormData({
      ...formData,
      tax_type_code: typeCode,
      rate: taxType?.rate || 0,
    });
  };

  const taxTypes = [...new Set(items.map(i => i.tax_type_code))].filter(Boolean);

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterTaxType || item.tax_type_code === filterTaxType;
    return matchSearch && matchType;
  });

  const getRateColor = (rate: number) => {
    if (rate === 0) return 'text-green-600 dark:text-green-400';
    if (rate <= 5) return 'text-blue-600 dark:text-blue-400';
    if (rate <= 15) return 'text-yellow-600 dark:text-yellow-400';
    if (rate <= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('taxRates.title', 'Tax Rates')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('taxRates.title', 'Tax Rates')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('taxRates.subtitle', 'Configure tax rates by type, region, and category')}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('taxRates.new', 'New Tax Rate')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <ReceiptPercentIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CalculatorIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxRates.defaultRates', 'Default')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.is_default).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ReceiptPercentIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxRates.zeroRates', 'Zero Rates')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.rate === 0).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <ReceiptPercentIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxRates.highRates', 'High (>50%)')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.rate > 50).length}
              </p>
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
            value={filterTaxType}
            onChange={(e) => setFilterTaxType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allTypes', 'All Tax Types')}</option>
            {taxTypes.map(type => (
              <option key={type} value={type}>{type}</option>
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
              <ReceiptPercentIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxRates.taxType', 'Tax Type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxRates.rate', 'Rate')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxRates.effectiveDate', 'Effective')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxRates.default', 'Default')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        {(item.region || item.item_category) && (
                          <div className="flex gap-1 mt-1">
                            {item.region && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                {item.region}
                              </span>
                            )}
                            {item.item_category && (
                              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                                {item.item_category}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded">
                        {item.tax_type_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-2xl font-bold ${getRateColor(item.rate)}`}>
                        {item.rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>{item.effective_from}</p>
                        {item.effective_to && (
                          <p className="text-xs text-gray-400">to {item.effective_to}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.is_default && (
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                          ✓ Default
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {item.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
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
        title={editingItem ? t('taxRates.edit') : t('taxRates.create')}
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
              placeholder="e.g., VAT-STD-15"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('taxRates.taxType', 'Tax Type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tax_type_code}
                onChange={(e) => handleTaxTypeChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {TAX_TYPE_CODES.map(type => (
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
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('taxRates.rate', 'Tax Rate')} (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="w-24">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="200"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                  error={errors.rate}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('taxRates.effectiveFrom', 'Effective From')}
              type="date"
              value={formData.effective_from}
              onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              error={errors.effective_from}
              required
            />
            <Input
              label={t('taxRates.effectiveTo', 'Effective To')}
              type="date"
              value={formData.effective_to}
              onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('taxRates.region', 'Region')}
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder="e.g., GCC, Export"
            />
            <Input
              label={t('taxRates.itemCategory', 'Item Category')}
              value={formData.item_category}
              onChange={(e) => setFormData({ ...formData, item_category: e.target.value })}
              placeholder="e.g., Food, Electronics"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('taxRates.minAmount', 'Min Amount')}
              type="number"
              value={formData.min_amount || ''}
              onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
              placeholder="0"
            />
            <Input
              label={t('taxRates.maxAmount', 'Max Amount')}
              type="number"
              value={formData.max_amount || ''}
              onChange={(e) => setFormData({ ...formData, max_amount: Number(e.target.value) })}
              placeholder="No limit"
            />
          </div>

          <Input
            label={t('common.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                {t('taxRates.default', 'Default Rate')}
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

export default withAnyPermission(
  [
    MenuPermissions.Tax.Rates.View as any,
    MenuPermissions.Tax.View as any,
    MenuPermissions.MasterData.Taxes.View as any,
    'master:tax:view' as any,
  ],
  TaxRatesPage
);
