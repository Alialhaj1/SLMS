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
  CodeBracketSquareIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface TaxCode {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  applies_to: 'sales' | 'purchases' | 'both';
  vat_rate: number;
  customs_rate?: number;
  excise_rate?: number;
  withholding_rate?: number;
  is_zero_rated: boolean;
  is_exempt: boolean;
  is_reverse_charge: boolean;
  zatca_code?: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
}

const APPLIES_TO = [
  { value: 'sales', label: 'Sales Only', labelAr: 'مبيعات فقط' },
  { value: 'purchases', label: 'Purchases Only', labelAr: 'مشتريات فقط' },
  { value: 'both', label: 'Both', labelAr: 'كلاهما' },
];

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes('T')) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

function TaxCodesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const canCreate =
    hasPermission(MenuPermissions.Tax.Codes.Create as any) ||
    hasPermission('master:tax:create' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Create as any);
  const canEdit =
    hasPermission(MenuPermissions.Tax.Codes.Edit as any) ||
    hasPermission('master:tax:update' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Edit as any);
  const canDelete =
    hasPermission(MenuPermissions.Tax.Codes.Delete as any) ||
    hasPermission('master:tax:delete' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Delete as any);

  const [items, setItems] = useState<TaxCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxCode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    description: string;
    applies_to: TaxCode['applies_to'];
    vat_rate: number;
    customs_rate: number;
    excise_rate: number;
    withholding_rate: number;
    is_zero_rated: boolean;
    is_exempt: boolean;
    is_reverse_charge: boolean;
    zatca_code: string;
    effective_from: string;
    effective_to: string;
    is_active: boolean;
  }>({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    applies_to: 'both',
    vat_rate: 15,
    customs_rate: 0,
    excise_rate: 0,
    withholding_rate: 0,
    is_zero_rated: false,
    is_exempt: false,
    is_reverse_charge: false,
    zatca_code: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    is_active: true,
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
      const res = await apiClient.get('/api/tax-codes');
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
    if (!formData.effective_from) newErrors.effective_from = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.put(`/api/tax-codes/${editingItem.id}`, formData);
      } else {
        await apiClient.post('/api/tax-codes', formData);
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
      await apiClient.delete(`/api/tax-codes/${deletingId}`);
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
    setFormData({ code: '', name: '', name_ar: '', description: '', applies_to: 'both', vat_rate: 15, customs_rate: 0, excise_rate: 0, withholding_rate: 0, is_zero_rated: false, is_exempt: false, is_reverse_charge: false, zatca_code: '', effective_from: new Date().toISOString().split('T')[0], effective_to: '', is_active: true });
    setErrors({});
  };

  const openEdit = (item: TaxCode) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      description: item.description || '',
      applies_to: item.applies_to,
      vat_rate: item.vat_rate,
      customs_rate: item.customs_rate || 0,
      excise_rate: item.excise_rate || 0,
      withholding_rate: item.withholding_rate || 0,
      is_zero_rated: item.is_zero_rated,
      is_exempt: item.is_exempt,
      is_reverse_charge: item.is_reverse_charge,
      zatca_code: item.zatca_code || '',
      effective_from: toDateInputValue(item.effective_from),
      effective_to: toDateInputValue(item.effective_to),
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.applies_to === filterType;
    return matchSearch && matchType;
  });

  const getTaxBadgeClass = (item: TaxCode) => {
    if (item.is_exempt) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    if (item.is_zero_rated) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (item.is_reverse_charge) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const getTotalRate = (item: TaxCode) => {
    return item.vat_rate + (item.customs_rate || 0) + (item.excise_rate || 0);
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('taxCodes.title', 'Tax Codes')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('taxCodes.title', 'Tax Codes')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('taxCodes.subtitle', 'Combined tax treatment codes for transactions')}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('taxCodes.new', 'New Tax Code')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CodeBracketSquareIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <ClipboardDocumentListIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxCodes.standard', 'Standard')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => !i.is_zero_rated && !i.is_exempt).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CodeBracketSquareIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxCodes.zeroRated', 'Zero')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.is_zero_rated).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <CodeBracketSquareIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxCodes.exempt', 'Exempt')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.is_exempt).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CodeBracketSquareIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxCodes.reverseCharge', 'Reverse')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.is_reverse_charge).length}
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('taxCodes.allApplies', 'All Applications')}</option>
            {APPLIES_TO.map(type => (
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
              <CodeBracketSquareIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxCodes.appliesTo', 'Applies To')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxCodes.vatRate', 'VAT')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxCodes.otherTaxes', 'Other')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxCodes.type', 'Type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxCodes.zatca', 'ZATCA')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-sm font-bold rounded ${getTaxBadgeClass(item)}`}>
                        {item.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        {item.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.description}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.applies_to === 'sales' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        item.applies_to === 'purchases' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {APPLIES_TO.find(a => a.value === item.applies_to)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {item.vat_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1 text-xs">
                        {item.customs_rate && item.customs_rate > 0 && (
                          <span className="text-orange-600 dark:text-orange-400">C: {item.customs_rate}%</span>
                        )}
                        {item.excise_rate && item.excise_rate > 0 && (
                          <span className="text-red-600 dark:text-red-400">E: {item.excise_rate}%</span>
                        )}
                        {item.withholding_rate && item.withholding_rate > 0 && (
                          <span className="text-purple-600 dark:text-purple-400">W: {item.withholding_rate}%</span>
                        )}
                        {(!item.customs_rate || item.customs_rate === 0) && (!item.excise_rate || item.excise_rate === 0) && (!item.withholding_rate || item.withholding_rate === 0) && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {item.is_zero_rated && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">Zero</span>
                        )}
                        {item.is_exempt && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">Exempt</span>
                        )}
                        {item.is_reverse_charge && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">RC</span>
                        )}
                        {!item.is_zero_rated && !item.is_exempt && !item.is_reverse_charge && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Std</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.zatca_code ? (
                        <span className="px-2 py-1 text-xs font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 rounded">
                          {item.zatca_code}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
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
        title={editingItem ? t('taxCodes.edit') : t('taxCodes.create')}
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
              placeholder="e.g., S, Z, E"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('taxCodes.appliesTo', 'Applies To')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {APPLIES_TO.map(type => (
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

          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {/* Tax Rates */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">{t('taxCodes.taxRates', 'Tax Rates')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label={t('taxCodes.vatRate', 'VAT Rate (%)')}
                type="number"
                step="0.01"
                min="0"
                value={formData.vat_rate}
                onChange={(e) => setFormData({ ...formData, vat_rate: Number(e.target.value) })}
              />
              <Input
                label={t('taxCodes.customsRate', 'Customs (%)')}
                type="number"
                step="0.01"
                min="0"
                value={formData.customs_rate}
                onChange={(e) => setFormData({ ...formData, customs_rate: Number(e.target.value) })}
              />
              <Input
                label={t('taxCodes.exciseRate', 'Excise (%)')}
                type="number"
                step="0.01"
                min="0"
                value={formData.excise_rate}
                onChange={(e) => setFormData({ ...formData, excise_rate: Number(e.target.value) })}
              />
              <Input
                label={t('taxCodes.withholdingRate', 'Withholding (%)')}
                type="number"
                step="0.01"
                min="0"
                value={formData.withholding_rate}
                onChange={(e) => setFormData({ ...formData, withholding_rate: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_zero_rated"
                checked={formData.is_zero_rated}
                onChange={(e) => setFormData({ ...formData, is_zero_rated: e.target.checked, is_exempt: false })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_zero_rated" className="text-sm text-gray-700 dark:text-gray-300">
                {t('taxCodes.zeroRated', 'Zero Rated')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_exempt"
                checked={formData.is_exempt}
                onChange={(e) => setFormData({ ...formData, is_exempt: e.target.checked, is_zero_rated: false })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_exempt" className="text-sm text-gray-700 dark:text-gray-300">
                {t('taxCodes.exempt', 'Exempt')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_reverse_charge"
                checked={formData.is_reverse_charge}
                onChange={(e) => setFormData({ ...formData, is_reverse_charge: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_reverse_charge" className="text-sm text-gray-700 dark:text-gray-300">
                {t('taxCodes.reverseCharge', 'Reverse Charge')}
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

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('taxCodes.zatcaCode', 'ZATCA Code')}
              value={formData.zatca_code}
              onChange={(e) => setFormData({ ...formData, zatca_code: e.target.value.toUpperCase() })}
              placeholder="e.g., S, Z, E, O"
            />
            <Input
              label={t('taxCodes.effectiveFrom', 'Effective From')}
              type="date"
              value={formData.effective_from}
              onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              error={errors.effective_from}
              required
            />
            <Input
              label={t('taxCodes.effectiveTo', 'Effective To')}
              type="date"
              value={formData.effective_to}
              onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
            />
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
    MenuPermissions.Tax.Codes.View as any,
    MenuPermissions.Tax.View as any,
    MenuPermissions.MasterData.Taxes.View as any,
    'master:tax:view' as any,
  ],
  TaxCodesPage
);
