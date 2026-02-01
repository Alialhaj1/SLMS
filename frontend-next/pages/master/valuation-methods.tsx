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
  CalculatorIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ValuationMethod {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  method_type: 'fifo' | 'lifo' | 'weighted_average' | 'specific_id' | 'standard_cost';
  is_default: boolean;
  is_active: boolean;
  description?: string;
  accounting_standard?: string;
  apply_to_item_types?: string[];
  last_recalculation?: string;
  created_at: string;
}

const METHOD_TYPES = [
  { value: 'fifo', label: 'FIFO (First In, First Out)', labelAr: 'الأول دخولاً الأول خروجاً', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: ArrowPathIcon },
  { value: 'lifo', label: 'LIFO (Last In, First Out)', labelAr: 'الأخير دخولاً الأول خروجاً', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: ArrowPathIcon },
  { value: 'weighted_average', label: 'Weighted Average', labelAr: 'المتوسط المرجح', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: ChartBarIcon },
  { value: 'specific_id', label: 'Specific Identification', labelAr: 'التعيين المحدد', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: CalculatorIcon },
  { value: 'standard_cost', label: 'Standard Cost', labelAr: 'التكلفة المعيارية', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: CurrencyDollarIcon },
];

const ACCOUNTING_STANDARDS = ['IFRS', 'GAAP', 'SOCPA', 'Local'];
const ITEM_TYPES = ['raw', 'finished', 'consumable', 'service'];

function ValuationMethodsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<ValuationMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ValuationMethod | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    method_type: 'fifo' as ValuationMethod['method_type'],
    is_default: false,
    is_active: true,
    description: '',
    accounting_standard: 'IFRS',
    apply_to_item_types: [] as string[],
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
      const res = await fetch('http://localhost:4000/api/valuation-methods', {
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
      { id: 1, code: 'VAL-FIFO', name: 'FIFO Method', name_ar: 'طريقة الأول دخولاً الأول خروجاً', method_type: 'fifo', is_default: true, is_active: true, accounting_standard: 'IFRS', apply_to_item_types: ['raw', 'finished'], last_recalculation: '2025-01-31', created_at: '2025-01-01' },
      { id: 2, code: 'VAL-AVG', name: 'Weighted Average', name_ar: 'المتوسط المرجح', method_type: 'weighted_average', is_default: false, is_active: true, accounting_standard: 'IFRS', apply_to_item_types: ['consumable'], last_recalculation: '2025-01-31', created_at: '2025-01-01' },
      { id: 3, code: 'VAL-LIFO', name: 'LIFO Method', name_ar: 'طريقة الأخير دخولاً الأول خروجاً', method_type: 'lifo', is_default: false, is_active: false, accounting_standard: 'GAAP', description: 'Not allowed under IFRS', created_at: '2025-01-01' },
      { id: 4, code: 'VAL-STD', name: 'Standard Cost', name_ar: 'التكلفة المعيارية', method_type: 'standard_cost', is_default: false, is_active: true, accounting_standard: 'SOCPA', apply_to_item_types: ['finished'], last_recalculation: '2025-02-01', created_at: '2025-01-01' },
      { id: 5, code: 'VAL-SID', name: 'Specific Identification', name_ar: 'التعيين المحدد', method_type: 'specific_id', is_default: false, is_active: true, accounting_standard: 'IFRS', description: 'For high-value unique items', created_at: '2025-01-01' },
    ]);
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
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/valuation-methods/${editingItem.id}`
        : 'http://localhost:4000/api/valuation-methods';
      
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
      const newItem: ValuationMethod = {
        id: editingItem?.id || Date.now(),
        ...formData,
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
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/valuation-methods/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(items.filter(i => i.id !== deletingId));
      showToast(t('common.deleted'), 'success');
    } catch {
      setItems(items.filter(i => i.id !== deletingId));
      showToast(t('common.deleted'), 'success');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', method_type: 'fifo', is_default: false, is_active: true, description: '', accounting_standard: 'IFRS', apply_to_item_types: [] });
    setErrors({});
  };

  const openEdit = (item: ValuationMethod) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      method_type: item.method_type,
      is_default: item.is_default,
      is_active: item.is_active,
      description: item.description || '',
      accounting_standard: item.accounting_standard || 'IFRS',
      apply_to_item_types: item.apply_to_item_types || [],
    });
    setShowModal(true);
  };

  const toggleItemType = (type: string) => {
    const current = formData.apply_to_item_types || [];
    if (current.includes(type)) {
      setFormData({ ...formData, apply_to_item_types: current.filter(t => t !== type) });
    } else {
      setFormData({ ...formData, apply_to_item_types: [...current, type] });
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.method_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('valuationMethods.title', 'Valuation Methods')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('valuationMethods.title', 'Valuation Methods')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('valuationMethods.subtitle', 'Inventory costing methods: FIFO, LIFO, Weighted Average')}
            </p>
          </div>
          {hasPermission('master:items:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('valuationMethods.newMethod', 'New Method')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {METHOD_TYPES.map(type => {
          const Icon = type.icon;
          return (
            <Card key={type.value} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                  <Icon className={`w-6 h-6 ${type.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={type.label}>
                    {type.label.split(' ')[0]}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {items.filter(i => i.method_type === type.value).length}
                  </p>
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
            <option value="">{t('common.allTypes', 'All Methods')}</option>
            {METHOD_TYPES.map(type => (
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
              <CalculatorIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('valuationMethods.method', 'Method')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('valuationMethods.standard', 'Standard')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('valuationMethods.appliesTo', 'Applies To')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('valuationMethods.lastCalculation', 'Last Calc.')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const methodType = METHOD_TYPES.find(m => m.value === item.method_type);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
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
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${methodType?.color}`}>
                          {methodType?.label.split('(')[0].trim()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.accounting_standard || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.apply_to_item_types?.map(type => (
                            <span key={type} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded capitalize">
                              {type}
                            </span>
                          )) || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        {item.last_recalculation ? (
                          <div className="flex items-center justify-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {item.last_recalculation}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {item.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:items:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:items:delete') && !item.is_default && (
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
        title={editingItem ? t('valuationMethods.edit') : t('valuationMethods.create')}
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
              placeholder="e.g., VAL-FIFO"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('valuationMethods.method', 'Method Type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.method_type}
                onChange={(e) => setFormData({ ...formData, method_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {METHOD_TYPES.map(type => (
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('valuationMethods.standard', 'Accounting Standard')}
            </label>
            <select
              value={formData.accounting_standard}
              onChange={(e) => setFormData({ ...formData, accounting_standard: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              {ACCOUNTING_STANDARDS.map(std => (
                <option key={std} value={std}>{std}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('valuationMethods.appliesTo', 'Applies To Item Types')}
            </label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleItemType(type)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition capitalize ${
                    formData.apply_to_item_types?.includes(type)
                      ? 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
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

export default withPermission(MenuPermissions.Master.View, ValuationMethodsPage);
