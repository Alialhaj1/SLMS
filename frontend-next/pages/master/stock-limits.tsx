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
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface StockLimit {
  id: number;
  item_id: number;
  item_name?: string;
  item_code?: string;
  warehouse_id: number;
  warehouse_name?: string;
  minimum_qty: number;
  maximum_qty: number;
  reorder_point: number;
  reorder_qty: number;
  current_qty?: number;
  status: 'normal' | 'low' | 'critical' | 'overstock';
  is_active: boolean;
  created_at: string;
}

function StockLimitsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<StockLimit[]>([]);
  const [products, setProducts] = useState<{id: number; name: string; code: string}[]>([]);
  const [warehouses, setWarehouses] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockLimit | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    item_id: 0,
    warehouse_id: 0,
    minimum_qty: 0,
    maximum_qty: 0,
    reorder_point: 0,
    reorder_qty: 0,
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
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
      };
      const [limitsRes, itemsRes, whRes] = await Promise.all([
        fetch('http://localhost:4000/api/stock-limits', { headers }),
        fetch('http://localhost:4000/api/master/items', { headers }),
        fetch('http://localhost:4000/api/warehouses', { headers }),
      ]);
      
      if (!limitsRes.ok) throw new Error('Failed to load stock limits');
      if (!itemsRes.ok) throw new Error('Failed to load items');
      if (!whRes.ok) throw new Error('Failed to load warehouses');

      const limitsData = await limitsRes.json();
      setItems(Array.isArray(limitsData) ? limitsData : limitsData.data || []);

      const itemsData = await itemsRes.json();
      setProducts(Array.isArray(itemsData) ? itemsData : itemsData.data || []);

      const whData = await whRes.json();
      setWarehouses(Array.isArray(whData) ? whData : whData.data || []);
    } catch (e) {
      setItems([]);
      setProducts([]);
      setWarehouses([]);
      showToast(t('common.error', 'Error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.item_id) newErrors.item_id = t('validation.required');
    if (!formData.warehouse_id) newErrors.warehouse_id = t('validation.required');
    if (formData.minimum_qty < 0) newErrors.minimum_qty = t('validation.positive');
    if (formData.maximum_qty < formData.minimum_qty) newErrors.maximum_qty = t('validation.maxGreaterMin', 'Must be greater than minimum');
    if (formData.reorder_point < formData.minimum_qty) newErrors.reorder_point = t('validation.reorderGreaterMin', 'Must be >= minimum');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const url = editingItem 
        ? `http://localhost:4000/api/stock-limits/${editingItem.id}`
        : 'http://localhost:4000/api/stock-limits';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
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
      const res = await fetch(`http://localhost:4000/api/stock-limits/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to delete');
      showToast(t('common.deleted'), 'success');
      fetchData();
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
    setFormData({ item_id: 0, warehouse_id: 0, minimum_qty: 0, maximum_qty: 0, reorder_point: 0, reorder_qty: 0, is_active: true });
    setErrors({});
  };

  const openEdit = (item: StockLimit) => {
    setEditingItem(item);
    setFormData({
      item_id: item.item_id,
      warehouse_id: item.warehouse_id,
      minimum_qty: item.minimum_qty,
      maximum_qty: item.maximum_qty,
      reorder_point: item.reorder_point,
      reorder_qty: item.reorder_qty,
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchWarehouse = !filterWarehouse || item.warehouse_id === Number(filterWarehouse);
    return matchSearch && matchStatus && matchWarehouse;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      normal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      low: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      overstock: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStockPercent = (current: number = 0, max: number = 0) => {
    if (!max) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const statusCounts = {
    normal: items.filter(i => i.status === 'normal').length,
    low: items.filter(i => i.status === 'low').length,
    critical: items.filter(i => i.status === 'critical').length,
    overstock: items.filter(i => i.status === 'overstock').length,
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('stockLimits.title', 'Stock Limits')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('stockLimits.title', 'Stock Limits')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('stockLimits.subtitle', 'Configure minimum, maximum & reorder levels')}
            </p>
          </div>
          <div className="flex gap-2">
            {hasPermission('master:items:create') && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                {t('common.add')}
              </Button>
            )}
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5" />
              {t('common.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CubeIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockLimits.normal', 'Normal')}</p>
              <p className="text-xl font-bold text-green-600">{statusCounts.normal}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockLimits.low', 'Low Stock')}</p>
              <p className="text-xl font-bold text-amber-600">{statusCounts.low}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockLimits.critical', 'Critical')}</p>
              <p className="text-xl font-bold text-red-600">{statusCounts.critical}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockLimits.overstock', 'Overstock')}</p>
              <p className="text-xl font-bold text-purple-600">{statusCounts.overstock}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allWarehouses', 'All Warehouses')}</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allStatuses', 'All Status')}</option>
            <option value="normal">{t('stockLimits.normal', 'Normal')}</option>
            <option value="low">{t('stockLimits.low', 'Low Stock')}</option>
            <option value="critical">{t('stockLimits.critical', 'Critical')}</option>
            <option value="overstock">{t('stockLimits.overstock', 'Overstock')}</option>
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
              <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.item')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.warehouse')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('stockLimits.min', 'Min')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('stockLimits.max', 'Max')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('stockLimits.reorderPoint', 'Reorder Point')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('stockLimits.currentStock', 'Current')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const stockPercent = getStockPercent(item.current_qty, item.maximum_qty);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.item_name}</p>
                          <p className="text-xs text-gray-500">{item.item_code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.warehouse_name}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{item.minimum_qty}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{item.maximum_qty}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{item.reorder_point}</td>
                      <td className="px-6 py-4">
                        <div className="w-24">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold">{item.current_qty || 0}</span>
                            <span className="text-gray-500">{stockPercent}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                item.status === 'critical' ? 'bg-red-500' :
                                item.status === 'low' ? 'bg-amber-500' :
                                item.status === 'overstock' ? 'bg-purple-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                          {item.status === 'normal' ? t('stockLimits.normal') :
                           item.status === 'low' ? t('stockLimits.low') :
                           item.status === 'critical' ? t('stockLimits.critical') :
                           t('stockLimits.overstock')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:items:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:items:delete') && (
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
        title={editingItem ? t('stockLimits.edit') : t('stockLimits.create')}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.item')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.item_id}
                onChange={(e) => setFormData({ ...formData, item_id: Number(e.target.value) })}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${errors.item_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">{t('common.select')}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.item_id && <p className="text-sm text-red-500 mt-1">{errors.item_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.warehouse')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: Number(e.target.value) })}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${errors.warehouse_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">{t('common.select')}</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              {errors.warehouse_id && <p className="text-sm text-red-500 mt-1">{errors.warehouse_id}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('stockLimits.minimumQty', 'Minimum Quantity')}
              type="number"
              value={formData.minimum_qty}
              onChange={(e) => setFormData({ ...formData, minimum_qty: Number(e.target.value) })}
              error={errors.minimum_qty}
              required
            />
            <Input
              label={t('stockLimits.maximumQty', 'Maximum Quantity')}
              type="number"
              value={formData.maximum_qty}
              onChange={(e) => setFormData({ ...formData, maximum_qty: Number(e.target.value) })}
              error={errors.maximum_qty}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('stockLimits.reorderPoint', 'Reorder Point')}
              type="number"
              value={formData.reorder_point}
              onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
              error={errors.reorder_point}
            />
            <Input
              label={t('stockLimits.reorderQty', 'Reorder Quantity')}
              type="number"
              value={formData.reorder_qty}
              onChange={(e) => setFormData({ ...formData, reorder_qty: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">{t('common.active')}</label>
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

export default withPermission(MenuPermissions.Master.View, StockLimitsPage);
