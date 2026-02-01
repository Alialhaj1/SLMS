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
  QrCodeIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface SerialNumber {
  id: number;
  serial_number: string;
  item_id: number;
  item_name?: string;
  item_code?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  batch_number?: string;
  status: 'available' | 'sold' | 'reserved' | 'damaged' | 'returned';
  purchase_date?: string;
  expiry_date?: string;
  warranty_end_date?: string;
  notes?: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', labelAr: 'متاح', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'sold', label: 'Sold', labelAr: 'مباع', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'reserved', label: 'Reserved', labelAr: 'محجوز', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'damaged', label: 'Damaged', labelAr: 'تالف', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'returned', label: 'Returned', labelAr: 'مرتجع', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

function SerialNumbersPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<SerialNumber[]>([]);
  const [products, setProducts] = useState<{id: number; name: string; code: string}[]>([]);
  const [warehouses, setWarehouses] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SerialNumber | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    serial_number: '',
    item_id: 0,
    warehouse_id: 0,
    batch_number: '',
    status: 'available' as SerialNumber['status'],
    purchase_date: '',
    expiry_date: '',
    warranty_end_date: '',
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
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setItems([]);
        setProducts([]);
        setWarehouses([]);
        return;
      }

      const companyId = companyStore.getActiveCompanyId();
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
      };
      const [snRes, itemsRes, whRes] = await Promise.all([
        fetch('http://localhost:4000/api/serial-numbers', { headers }),
        fetch('http://localhost:4000/api/master/items', { headers }),
        fetch('http://localhost:4000/api/warehouses', { headers }),
      ]);
      
      if (!snRes.ok) throw new Error('Failed to load serial numbers');
      if (!itemsRes.ok) throw new Error('Failed to load items');
      if (!whRes.ok) throw new Error('Failed to load warehouses');

      const snData = await snRes.json();
      setItems(Array.isArray(snData) ? snData : snData.data || []);

      const itemsData = await itemsRes.json();
      setProducts(Array.isArray(itemsData) ? itemsData : itemsData.data || []);

      const whData = await whRes.json();
      setWarehouses(Array.isArray(whData) ? whData : whData.data || []);
    } catch (err) {
      console.error('Failed to load serial numbers data:', err);
      setItems([]);
      setProducts([]);
      setWarehouses([]);
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.serial_number.trim()) newErrors.serial_number = t('validation.required');
    if (!formData.item_id) newErrors.item_id = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showToast(t('common.error'), 'error');
        throw new Error('Missing access token');
      }

      const companyId = companyStore.getActiveCompanyId();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
      };
      const url = editingItem 
        ? `http://localhost:4000/api/serial-numbers/${editingItem.id}`
        : 'http://localhost:4000/api/serial-numbers';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers,
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
      const product = products.find(p => p.id === formData.item_id);
      const warehouse = warehouses.find(w => w.id === formData.warehouse_id);
      const newItem: SerialNumber = {
        id: editingItem?.id || Date.now(),
        ...formData,
        item_name: product?.name,
        item_code: product?.code,
        warehouse_name: warehouse?.name,
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
      if (!token) {
        showToast(t('common.error'), 'error');
        throw new Error('Missing access token');
      }

      const companyId = companyStore.getActiveCompanyId();
      await fetch(`http://localhost:4000/api/serial-numbers/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': companyId.toString() } : {}),
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
    setFormData({ serial_number: '', item_id: 0, warehouse_id: 0, batch_number: '', status: 'available', purchase_date: '', expiry_date: '', warranty_end_date: '', notes: '' });
    setErrors({});
  };

  const openEdit = (item: SerialNumber) => {
    setEditingItem(item);
    setFormData({
      serial_number: item.serial_number,
      item_id: item.item_id,
      warehouse_id: item.warehouse_id || 0,
      batch_number: item.batch_number || '',
      status: item.status,
      purchase_date: item.purchase_date || '',
      expiry_date: item.expiry_date || '',
      warranty_end_date: item.warranty_end_date || '',
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchItem = !filterItem || item.item_id === Number(filterItem);
    return matchSearch && matchStatus && matchItem;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const generateSerialNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    setFormData({ ...formData, serial_number: `SN-${year}-${random}` });
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('serialNumbers.title', 'Serial Numbers')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('serialNumbers.title', 'Serial Numbers')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('serialNumbers.subtitle', 'Track individual items by serial number')}
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
              <PrinterIcon className="w-5 h-5" />
              {t('serialNumbers.printLabels', 'Print Labels')}
            </Button>
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5" />
              {t('common.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {STATUS_OPTIONS.map(status => (
          <Card key={status.value} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.color.split(' ')[0]}`}>
                <QrCodeIcon className={`w-6 h-6 ${status.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{status.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {items.filter(i => i.status === status.value).length}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('serialNumbers.searchPlaceholder', 'Search by serial, item...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allItems', 'All Items')}</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allStatuses', 'All Statuses')}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length} {t('common.of')} {items.length}
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
              <QrCodeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('serialNumbers.serialNumber', 'Serial Number')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.item')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.warehouse')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('serialNumbers.warranty', 'Warranty')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <QrCodeIcon className="w-5 h-5 text-gray-400" />
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{item.serial_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.item_name}</p>
                        <p className="text-xs text-gray-500">{item.item_code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.warehouse_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                        {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.warranty_end_date ? (
                        <span className={new Date(item.warranty_end_date) < new Date() ? 'text-red-600' : 'text-green-600'}>
                          {item.warranty_end_date}
                        </span>
                      ) : '-'}
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
        title={editingItem ? t('serialNumbers.edit') : t('serialNumbers.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label={t('serialNumbers.serialNumber')}
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                error={errors.serial_number}
                required
              />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={generateSerialNumber} className="mb-0">
                {t('serialNumbers.generate', 'Generate')}
              </Button>
            </div>
          </div>
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
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
              {errors.item_id && <p className="text-sm text-red-500 mt-1">{errors.item_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.warehouse')}
              </label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">{t('common.select')}</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('serialNumbers.batchNumber', 'Batch Number')}
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('serialNumbers.purchaseDate', 'Purchase Date')}
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
            />
            <Input
              label={t('serialNumbers.expiryDate', 'Expiry Date')}
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
            <Input
              label={t('serialNumbers.warrantyEndDate', 'Warranty End')}
              type="date"
              value={formData.warranty_end_date}
              onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
            />
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
        message={t('common.deleteMessage')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, SerialNumbersPage);
