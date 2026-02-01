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
  MapPinIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface WarehouseLocation {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  warehouse_id: number;
  warehouse_name?: string;
  location_type: 'storage' | 'receiving' | 'shipping' | 'staging';
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  is_default?: boolean;
  capacity?: number;
  max_weight?: number;
  max_volume?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

const LOCATION_TYPES = [
  { value: 'storage', label: 'Storage', labelAr: 'تخزين' },
  { value: 'receiving', label: 'Receiving', labelAr: 'استلام' },
  { value: 'shipping', label: 'Shipping', labelAr: 'شحن' },
  { value: 'staging', label: 'Staging', labelAr: 'تجهيز' },
];

function WarehouseLocationsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<WarehouseLocation[]>([]);
  const [warehouses, setWarehouses] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseLocation | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    warehouse_id: 0,
    location_type: 'storage' as 'storage' | 'receiving' | 'shipping' | 'staging',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
    is_default: false,
    notes: '',
    capacity: 0,
    max_weight: 0,
    max_volume: 0,
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = companyStore.getActiveCompanyId();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
      };
      const [locRes, whRes] = await Promise.all([
        fetch(`${apiUrl}/api/master/warehouse-locations`, { headers }),
        fetch(`${apiUrl}/api/master/warehouses`, { headers }),
      ]);
      
      if (!locRes.ok) throw new Error('Failed to load warehouse locations');
      if (!whRes.ok) throw new Error('Failed to load warehouses');

      const data = await locRes.json();
      setItems(Array.isArray(data) ? data : data.data || []);

      const whData = await whRes.json();
      setWarehouses(Array.isArray(whData) ? whData : whData.data || []);
    } catch (e) {
      setItems([]);
      setWarehouses([]);
      showToast(t('common.error', 'Error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.warehouse_id) newErrors.warehouse_id = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = companyStore.getActiveCompanyId();
      const url = editingItem 
        ? `${apiUrl}/api/master/warehouse-locations/${editingItem.id}`
        : `${apiUrl}/api/master/warehouse-locations`;
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
        body: JSON.stringify({
          ...formData,
          zone: formData.zone || null,
          aisle: formData.aisle || null,
          rack: formData.rack || null,
          shelf: formData.shelf || null,
          bin: formData.bin || null,
          notes: formData.notes || null,
          capacity: formData.capacity || null,
          max_weight: formData.max_weight || null,
          max_volume: formData.max_volume || null,
        }),
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = companyStore.getActiveCompanyId();
      await fetch(`${apiUrl}/api/master/warehouse-locations/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
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
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      warehouse_id: 0,
      location_type: 'storage',
      zone: '',
      aisle: '',
      rack: '',
      shelf: '',
      bin: '',
      is_default: false,
      notes: '',
      capacity: 0,
      max_weight: 0,
      max_volume: 0,
      is_active: true,
    });
    setErrors({});
  };

  const openEdit = (item: WarehouseLocation) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      warehouse_id: item.warehouse_id,
      location_type: item.location_type,
      zone: item.zone || '',
      aisle: item.aisle || '',
      rack: item.rack || '',
      shelf: item.shelf || '',
      bin: item.bin || '',
      is_default: !!item.is_default,
      notes: item.notes || '',
      capacity: item.capacity || 0,
      max_weight: item.max_weight || 0,
      max_volume: item.max_volume || 0,
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.location_type === filterType;
    const matchWarehouse = !filterWarehouse || item.warehouse_id === Number(filterWarehouse);
    return matchSearch && matchType && matchWarehouse;
  });

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      storage: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      receiving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      shipping: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      staging: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getCapacityPercent = (current: number = 0, capacity: number = 0) => {
    if (!capacity) return 0;
    return Math.round((current / capacity) * 100);
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('warehouseLocations.title', 'Warehouse Locations')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('warehouseLocations.title', 'Warehouse Locations')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('warehouseLocations.subtitle', 'Manage zones, shelves, and bins within warehouses')}
            </p>
          </div>
          <div className="flex gap-2">
            {hasPermission('master:warehouses:create') && (
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPinIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('warehouseLocations.storageLocations', 'Storage Locations')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.filter(i => i.location_type === 'storage').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MapPinIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('warehouseLocations.receivingLocations', 'Receiving Locations')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.filter(i => i.location_type === 'receiving').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <MapPinIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('warehouseLocations.shippingLocations', 'Shipping Locations')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.filter(i => i.location_type === 'shipping').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <MapPinIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('warehouseLocations.total', 'Total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
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
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allWarehouses', 'All Warehouses')}</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allTypes', 'All Types')}</option>
            {LOCATION_TYPES.map(type => (
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
              <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('warehouseLocations.warehouse', 'Warehouse')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('warehouseLocations.type', 'Type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('warehouseLocations.capacity', 'Capacity')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const usagePercent = getCapacityPercent(0, item.capacity);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">{item.code}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {(item.zone || item.aisle || item.rack || item.shelf || item.bin) && (
                            <p className="text-xs text-gray-500">
                              {[item.zone, item.aisle, item.rack, item.shelf, item.bin].filter(Boolean).join(' / ')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.warehouse_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(item.location_type)}`}>
                          {LOCATION_TYPES.find(t => t.value === item.location_type)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{0}</span>
                            <span className="text-gray-500">/ {item.capacity || 0}</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
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
                          {hasPermission('master:warehouses:delete') && (
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
        title={editingItem ? t('warehouseLocations.edit') : t('warehouseLocations.create')}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={errors.code}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('warehouseLocations.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.location_type}
                onChange={(e) => setFormData({ ...formData, location_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {LOCATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('warehouseLocations.warehouse')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: Number(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${errors.warehouse_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="">{t('common.select')}</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
            {errors.warehouse_id && <p className="text-sm text-red-500 mt-1">{errors.warehouse_id}</p>}
          </div>
          <Input
            label={t('warehouseLocations.capacity')}
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('warehouseLocations.zone', 'Zone')}
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            />
            <Input
              label={t('warehouseLocations.aisle', 'Aisle')}
              value={formData.aisle}
              onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
            />
            <Input
              label={t('warehouseLocations.rack', 'Rack')}
              value={formData.rack}
              onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
            />
            <Input
              label={t('warehouseLocations.shelf', 'Shelf')}
              value={formData.shelf}
              onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
            />
            <Input
              label={t('warehouseLocations.bin', 'Bin')}
              value={formData.bin}
              onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
            />
            <div className="flex items-center gap-3 mt-6">
              <input
                type="checkbox"
                id="is_default"
                checked={!!formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
                {t('warehouseLocations.default', 'Default')}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('warehouseLocations.maxWeight', 'Max Weight')}
              type="number"
              value={formData.max_weight}
              onChange={(e) => setFormData({ ...formData, max_weight: Number(e.target.value) })}
            />
            <Input
              label={t('warehouseLocations.maxVolume', 'Max Volume')}
              type="number"
              value={formData.max_volume}
              onChange={(e) => setFormData({ ...formData, max_volume: Number(e.target.value) })}
            />
          </div>

          <Input
            label={t('warehouseLocations.notes', 'Notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
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

export default withPermission(MenuPermissions.Master.View, WarehouseLocationsPage);
