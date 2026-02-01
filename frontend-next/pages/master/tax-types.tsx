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
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface TaxType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'vat' | 'customs' | 'excise' | 'withholding' | 'zakat' | 'other';
  calculation_method: 'percentage' | 'fixed' | 'tiered';
  default_rate?: number;
  applies_to: string[];
  tax_authority?: string;
  reporting_frequency: 'monthly' | 'quarterly' | 'annually';
  gl_account_payable?: string;
  gl_account_receivable?: string;
  is_recoverable: boolean;
  is_inclusive: boolean;
  round_method: 'normal' | 'up' | 'down';
  effective_date?: string;
  expiry_date?: string;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'vat', label: 'Value Added Tax', labelAr: 'ضريبة القيمة المضافة', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'customs', label: 'Customs Duty', labelAr: 'رسوم جمركية', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'excise', label: 'Excise Tax', labelAr: 'ضريبة انتقائية', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'withholding', label: 'Withholding Tax', labelAr: 'ضريبة مستقطعة', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'zakat', label: 'Zakat', labelAr: 'زكاة', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'other', label: 'Other', labelAr: 'أخرى', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
];

const CALCULATION_METHODS = [
  { value: 'percentage', label: 'Percentage', labelAr: 'نسبة مئوية' },
  { value: 'fixed', label: 'Fixed Amount', labelAr: 'مبلغ ثابت' },
  { value: 'tiered', label: 'Tiered/Graduated', labelAr: 'متدرج' },
];

const APPLIES_TO_OPTIONS = [
  { value: 'sales', label: 'Sales' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'imports', label: 'Imports' },
  { value: 'exports', label: 'Exports' },
  { value: 'services', label: 'Services' },
  { value: 'income', label: 'Income' },
  { value: 'assets', label: 'Assets' },
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

function TaxTypesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const canCreate =
    hasPermission(MenuPermissions.Tax.Types.Create as any) ||
    hasPermission('master:tax:create' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Create as any);
  const canEdit =
    hasPermission(MenuPermissions.Tax.Types.Edit as any) ||
    hasPermission('master:tax:update' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Edit as any);
  const canDelete =
    hasPermission(MenuPermissions.Tax.Types.Delete as any) ||
    hasPermission('master:tax:delete' as any) ||
    hasPermission(MenuPermissions.MasterData.Taxes.Delete as any);

  const [items, setItems] = useState<TaxType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    category: 'vat' as TaxType['category'],
    calculation_method: 'percentage' as TaxType['calculation_method'],
    default_rate: 15,
    applies_to: [] as string[],
    tax_authority: 'ZATCA',
    reporting_frequency: 'monthly' as TaxType['reporting_frequency'],
    gl_account_payable: '',
    gl_account_receivable: '',
    is_recoverable: true,
    is_inclusive: false,
    round_method: 'normal' as TaxType['round_method'],
    effective_date: '',
    expiry_date: '',
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
      const res = await apiClient.get('/api/tax-types');
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.put(`/api/tax-types/${editingItem.id}`, formData);
      } else {
        await apiClient.post('/api/tax-types', formData);
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
      await apiClient.delete(`/api/tax-types/${deletingId}`);
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
    setFormData({ code: '', name: '', name_ar: '', category: 'vat', calculation_method: 'percentage', default_rate: 15, applies_to: [], tax_authority: 'ZATCA', reporting_frequency: 'monthly', gl_account_payable: '', gl_account_receivable: '', is_recoverable: true, is_inclusive: false, round_method: 'normal', effective_date: '', expiry_date: '', is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: TaxType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      calculation_method: item.calculation_method,
      default_rate: item.default_rate || 0,
      applies_to: item.applies_to || [],
      tax_authority: item.tax_authority || 'ZATCA',
      reporting_frequency: item.reporting_frequency,
      gl_account_payable: item.gl_account_payable || '',
      gl_account_receivable: item.gl_account_receivable || '',
      is_recoverable: item.is_recoverable,
      is_inclusive: item.is_inclusive,
      round_method: item.round_method,
      effective_date: toDateInputValue(item.effective_date),
      expiry_date: toDateInputValue(item.expiry_date),
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const toggleAppliesTo = (option: string) => {
    if (formData.applies_to.includes(option)) {
      setFormData({ ...formData, applies_to: formData.applies_to.filter(a => a !== option) });
    } else {
      setFormData({ ...formData, applies_to: [...formData.applies_to, option] });
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('taxTypes.title', 'Tax Types')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('taxTypes.title', 'Tax Types')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('taxTypes.subtitle', 'VAT, customs, excise, withholding, and zakat definitions')}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('taxTypes.new', 'New Tax Type')}
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
              <ReceiptPercentIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxTypes.vat', 'VAT')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.category === 'vat').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <BanknotesIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxTypes.excise', 'Excise')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.category === 'excise').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <CalculatorIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxTypes.zakat', 'Zakat')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.category === 'zakat').length}
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
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allCategories', 'All Categories')}</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
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
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxTypes.category', 'Category')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxTypes.rate', 'Rate')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxTypes.appliesTo', 'Applies To')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('taxTypes.recoverable', 'Recoverable')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const cat = CATEGORIES.find(c => c.value === item.category);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cat?.color}`}>
                          {cat?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {item.default_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {item.applies_to?.slice(0, 3).map(a => (
                            <span key={a} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded capitalize">
                              {a}
                            </span>
                          ))}
                          {item.applies_to?.length > 3 && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded">
                              +{item.applies_to.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.is_recoverable ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            {t('common.yes')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                            {t('common.no')}
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
        title={editingItem ? t('taxTypes.edit') : t('taxTypes.create')}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., VAT-STD"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('taxTypes.category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('taxTypes.calculationMethod', 'Calculation')}
              </label>
              <select
                value={formData.calculation_method}
                onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {CALCULATION_METHODS.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
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
            <Input
              label={t('taxTypes.defaultRate', 'Default Rate %')}
              type="number"
              step="0.01"
              value={formData.default_rate}
              onChange={(e) => setFormData({ ...formData, default_rate: Number(e.target.value) })}
            />
            <Input
              label={t('taxTypes.taxAuthority', 'Tax Authority')}
              value={formData.tax_authority}
              onChange={(e) => setFormData({ ...formData, tax_authority: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('taxTypes.reportingFrequency', 'Reporting')}
              </label>
              <select
                value={formData.reporting_frequency}
                onChange={(e) => setFormData({ ...formData, reporting_frequency: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('taxTypes.appliesTo', 'Applies To')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {APPLIES_TO_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleAppliesTo(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition ${
                    formData.applies_to.includes(option.value)
                      ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400'
                      : 'bg-gray-50 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('taxTypes.glPayable', 'GL Account Payable')}
              value={formData.gl_account_payable}
              onChange={(e) => setFormData({ ...formData, gl_account_payable: e.target.value })}
              placeholder="e.g., 2100-001"
            />
            <Input
              label={t('taxTypes.glReceivable', 'GL Account Receivable')}
              value={formData.gl_account_receivable}
              onChange={(e) => setFormData({ ...formData, gl_account_receivable: e.target.value })}
              placeholder="e.g., 1200-001"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_recoverable"
                checked={formData.is_recoverable}
                onChange={(e) => setFormData({ ...formData, is_recoverable: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_recoverable" className="text-sm text-gray-700 dark:text-gray-300">
                {t('taxTypes.recoverable', 'Recoverable')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_inclusive"
                checked={formData.is_inclusive}
                onChange={(e) => setFormData({ ...formData, is_inclusive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_inclusive" className="text-sm text-gray-700 dark:text-gray-300">
                {t('taxTypes.inclusive', 'Tax Inclusive')}
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
    MenuPermissions.Tax.Types.View as any,
    MenuPermissions.Tax.View as any,
    MenuPermissions.MasterData.Taxes.View as any,
    'master:tax:view' as any,
  ],
  TaxTypesPage
);
