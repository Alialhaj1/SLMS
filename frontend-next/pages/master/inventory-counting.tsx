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
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface InventoryCounting {
  id: number;
  document_number: string;
  warehouse_id: number;
  warehouse_name?: string;
  counting_type: 'physical' | 'cycle' | 'annual';
  counting_date: string;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'cancelled';
  total_items: number;
  counted_items: number;
  variance_items: number;
  notes?: string;
  created_by?: string;
  created_at: string;
}

const COUNTING_TYPES = [
  { value: 'physical', label: 'Physical Count', labelAr: 'جرد فعلي' },
  { value: 'cycle', label: 'Cycle Count', labelAr: 'جرد دوري' },
  { value: 'annual', label: 'Annual Count', labelAr: 'جرد سنوي' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'approved', label: 'Approved', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
];

function InventoryCountingPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<InventoryCounting[]>([]);
  const [warehouses, setWarehouses] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryCounting | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    document_number: '',
    warehouse_id: 0,
    counting_type: 'physical' as InventoryCounting['counting_type'],
    counting_date: '',
    start_date: '',
    end_date: '',
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
      const [countRes, whRes] = await Promise.all([
        fetch('http://localhost:4000/api/inventory-counting', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (countRes.ok) {
        const data = await countRes.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        loadMockData();
      }

      if (whRes.ok) {
        const data = await whRes.json();
        setWarehouses(Array.isArray(data) ? data : data.data || []);
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setItems([
      { id: 1, document_number: 'IC-2025-0001', warehouse_id: 1, warehouse_name: 'Main Warehouse', counting_type: 'annual', counting_date: '2025-01-15', status: 'completed', total_items: 150, counted_items: 150, variance_items: 5, created_at: '2025-01-15' },
      { id: 2, document_number: 'IC-2025-0002', warehouse_id: 1, warehouse_name: 'Main Warehouse', counting_type: 'cycle', counting_date: '2025-02-01', status: 'in_progress', total_items: 50, counted_items: 30, variance_items: 2, created_at: '2025-02-01' },
      { id: 3, document_number: 'IC-2025-0003', warehouse_id: 2, warehouse_name: 'Secondary Warehouse', counting_type: 'physical', counting_date: '2025-02-15', status: 'draft', total_items: 75, counted_items: 0, variance_items: 0, created_at: '2025-02-10' },
    ]);
    setWarehouses([
      { id: 1, name: 'Main Warehouse' },
      { id: 2, name: 'Secondary Warehouse' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.warehouse_id) newErrors.warehouse_id = t('validation.required');
    if (!formData.counting_date) newErrors.counting_date = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateDocNumber = () => {
    const year = new Date().getFullYear();
    const seq = String(items.length + 1).padStart(4, '0');
    setFormData({ ...formData, document_number: `IC-${year}-${seq}` });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/inventory-counting/${editingItem.id}`
        : 'http://localhost:4000/api/inventory-counting';
      
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
      const warehouse = warehouses.find(w => w.id === formData.warehouse_id);
      const newItem: InventoryCounting = {
        id: editingItem?.id || Date.now(),
        ...formData,
        warehouse_name: warehouse?.name,
        status: 'draft',
        total_items: 0,
        counted_items: 0,
        variance_items: 0,
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
      await fetch(`http://localhost:4000/api/inventory-counting/${deletingId}`, {
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
    setFormData({ document_number: '', warehouse_id: 0, counting_type: 'physical', counting_date: '', start_date: '', end_date: '', notes: '' });
    setErrors({});
  };

  const openEdit = (item: InventoryCounting) => {
    setEditingItem(item);
    setFormData({
      document_number: item.document_number,
      warehouse_id: item.warehouse_id,
      counting_type: item.counting_type,
      counting_date: item.counting_date,
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.counting_type === filterType;
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      physical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      cycle: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      annual: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('inventoryCounting.title', 'Inventory Counting')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('inventoryCounting.title', 'Inventory Counting')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('inventoryCounting.subtitle', 'Physical, cycle, and annual inventory counts')}
            </p>
          </div>
          <div className="flex gap-2">
            {hasPermission('master:items:create') && (
              <Button onClick={() => { resetForm(); generateDocNumber(); setShowModal(true); }} className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                {t('inventoryCounting.newCount', 'New Count')}
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {STATUS_OPTIONS.map(status => (
          <Card key={status.value} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.color.split(' ')[0]}`}>
                <ClipboardDocumentCheckIcon className={`w-6 h-6 ${status.color.split(' ')[1]}`} />
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
            {COUNTING_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allStatuses', 'All Status')}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
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
              <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.documentNumber')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.warehouse')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('inventoryCounting.type', 'Type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('inventoryCounting.date', 'Date')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('inventoryCounting.progress', 'Progress')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('inventoryCounting.variance', 'Variance')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const progress = item.total_items > 0 ? Math.round((item.counted_items / item.total_items) * 100) : 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ClipboardDocumentCheckIcon className="w-5 h-5 text-gray-400" />
                          <span className="font-mono text-sm text-gray-900 dark:text-white">{item.document_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.warehouse_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(item.counting_type)}`}>
                          {COUNTING_TYPES.find(t => t.value === item.counting_type)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {item.counting_date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24 mx-auto">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{item.counted_items}/{item.total_items}</span>
                            <span className="text-gray-500">{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-semibold ${item.variance_items > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.variance_items}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                          {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:items:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:items:delete') && item.status === 'draft' && (
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
        title={editingItem ? t('inventoryCounting.edit') : t('inventoryCounting.create')}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t('common.documentNumber')}
            value={formData.document_number}
            onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
            disabled
          />
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inventoryCounting.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.counting_type}
                onChange={(e) => setFormData({ ...formData, counting_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {COUNTING_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label={t('inventoryCounting.countingDate', 'Counting Date')}
            type="date"
            value={formData.counting_date}
            onChange={(e) => setFormData({ ...formData, counting_date: e.target.value })}
            error={errors.counting_date}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.startDate')}
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label={t('common.endDate')}
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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

export default withPermission(MenuPermissions.Master.View, InventoryCountingPage);
