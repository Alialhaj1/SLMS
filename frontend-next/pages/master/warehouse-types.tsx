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
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TruckIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';

interface WarehouseType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  gl_account_id?: number | null;
  gl_account_code?: string | null;
  gl_account_name?: string | null;
  gl_account_name_ar?: string | null;
  warehouse_category: 'main' | 'sub' | 'external' | 'transit' | 'quarantine';
  parent_id?: number;
  parent_name?: string;
  allows_sales: boolean;
  allows_purchases: boolean;
  allows_transfers: boolean;
  is_default: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const WAREHOUSE_CATEGORIES = [
  { value: 'main', label: 'Main Warehouse', labelAr: 'مستودع رئيسي', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: BuildingStorefrontIcon },
  { value: 'sub', label: 'Sub Warehouse', labelAr: 'مستودع فرعي', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: HomeModernIcon },
  { value: 'external', label: 'External Warehouse', labelAr: 'مستودع خارجي', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: MapPinIcon },
  { value: 'transit', label: 'Transit Warehouse', labelAr: 'مستودع عبور', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: TruckIcon },
  { value: 'quarantine', label: 'Quarantine', labelAr: 'حجر صحي', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: BuildingStorefrontIcon },
];

function WarehouseTypesPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchWithFallback = async (paths: string[], init: RequestInit) => {
    let lastRes: Response | null = null;
    for (const path of paths) {
      const res = await fetch(`${apiUrl}${path}`, init);
      lastRes = res;
      if (res.status !== 404) return res;
    }
    return lastRes;
  };

  const [items, setItems] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    warehouse_category: 'main' as WarehouseType['warehouse_category'],
    parent_id: 0,
    allows_sales: true,
    allows_purchases: true,
    allows_transfers: true,
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
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const res = await fetchWithFallback(['/api/master/warehouse-types', '/api/warehouse-types'], {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (res && res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        setItems([]);
        showToast(t('common.error', 'Error'), 'error');
      }
    } catch {
      setItems([]);
      showToast(t('common.error', 'Error'), 'error');
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
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();

      const path = editingItem
        ? `/api/master/warehouse-types/${editingItem.id}`
        : '/api/master/warehouse-types';

      const fallbackPath = editingItem
        ? `/api/warehouse-types/${editingItem.id}`
        : '/api/warehouse-types';

      const res = await fetchWithFallback([path, fallbackPath], {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!res) {
        showToast(t('common.error', 'Error'), 'error');
        return;
      }

      if (res.ok) {
        showToast(t('common.success'), 'success');
        await fetchData();
        setShowModal(false);
        resetForm();
      } else {
        showToast(t('common.error', 'Error'), 'error');
      }
    } catch {
      showToast(t('common.error', 'Error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();

      const res = await fetchWithFallback([
        `/api/master/warehouse-types/${deletingId}`,
        `/api/warehouse-types/${deletingId}`,
      ], {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (res && res.ok) {
        setItems(items.filter(i => i.id !== deletingId));
        showToast(t('common.deleted'), 'success');
      } else {
        showToast(t('common.error', 'Error'), 'error');
      }
    } catch {
      showToast(t('common.error', 'Error'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', warehouse_category: 'main', parent_id: 0, allows_sales: true, allows_purchases: true, allows_transfers: true, is_default: false, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: WarehouseType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      warehouse_category: item.warehouse_category,
      parent_id: item.parent_id || 0,
      allows_sales: item.allows_sales,
      allows_purchases: item.allows_purchases,
      allows_transfers: item.allows_transfers,
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
    const matchCategory = !filterCategory || item.warehouse_category === filterCategory;
    return matchSearch && matchCategory;
  });

  const mainWarehouses = items.filter(i => i.warehouse_category === 'main' && i.is_active);

  return (
    <MainLayout>
      <Head>
        <title>{t('warehouseTypes.title', 'Warehouse Types')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('warehouseTypes.title', 'Warehouse Types')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('warehouseTypes.subtitle', 'Main, sub, external, transit, and quarantine warehouses')}
            </p>
          </div>
          {hasPermission('master:warehouses:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('warehouseTypes.newType', 'New Warehouse Type')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {WAREHOUSE_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <Card key={cat.value} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cat.color.split(' ')[0]}`}>
                  <Icon className={`w-6 h-6 ${cat.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{cat.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {items.filter(i => i.warehouse_category === cat.value).length}
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
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allCategories', 'All Categories')}</option>
            {WAREHOUSE_CATEGORIES.map(cat => (
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
              <BuildingStorefrontIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('warehouseTypes.category', 'Category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('warehouseTypes.parent', 'Parent')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('warehouseTypes.allowedOperations', 'Allowed Operations')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
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
                        {item.gl_account_code && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span className="font-mono font-medium">{item.gl_account_code}</span>
                            {(locale === 'ar' ? item.gl_account_name_ar : item.gl_account_name) && (
                              <span>
                                {' '}
                                - {locale === 'ar' ? item.gl_account_name_ar : item.gl_account_name}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${WAREHOUSE_CATEGORIES.find(c => c.value === item.warehouse_category)?.color}`}>
                        {WAREHOUSE_CATEGORIES.find(c => c.value === item.warehouse_category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.parent_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {item.allows_sales && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">{t('common.sales')}</span>}
                        {item.allows_purchases && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">{t('common.purchases')}</span>}
                        {item.allows_transfers && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded">{t('common.transfers')}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {item.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission('master:warehouses:edit') && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('master:warehouses:delete') && !item.is_default && (
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
        title={editingItem ? t('warehouseTypes.edit') : t('warehouseTypes.create')}
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
              placeholder="e.g., MAIN-001"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('warehouseTypes.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.warehouse_category}
                onChange={(e) => setFormData({ ...formData, warehouse_category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {WAREHOUSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
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
          {formData.warehouse_category === 'sub' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('warehouseTypes.parent', 'Parent Warehouse')}
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData({ ...formData, parent_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">{t('common.select')}</option>
                {mainWarehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('warehouseTypes.allowedOperations', 'Allowed Operations')}
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allows_sales"
                  checked={formData.allows_sales}
                  onChange={(e) => setFormData({ ...formData, allows_sales: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="allows_sales" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('common.sales')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allows_purchases"
                  checked={formData.allows_purchases}
                  onChange={(e) => setFormData({ ...formData, allows_purchases: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="allows_purchases" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('common.purchases')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allows_transfers"
                  checked={formData.allows_transfers}
                  onChange={(e) => setFormData({ ...formData, allows_transfers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="allows_transfers" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('common.transfers')}
                </label>
              </div>
            </div>
          </div>
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

export default withPermission(MenuPermissions.Master.View, WarehouseTypesPage);
