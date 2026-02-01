/**
 * ⚓ Ports Management
 * الموانئ
 */

import { useState } from 'react';
import Head from 'next/head';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useLocale } from '../../contexts/LocaleContext';

interface Port {
  id: number;
  port_code: string;
  name_en: string;
  name_ar: string;
  country_id: number;
  city_id: number;
  port_type: string;
  latitude: number | string | null;
  longitude: number | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function toFixedOrNull(value: unknown, digits: number): string | null {
  if (value === null || value === undefined) return null;
  const asNumber = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(asNumber)) return null;
  return asNumber.toFixed(digits);
}

function toNumberOrZero(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const asNumber = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(asNumber) ? asNumber : 0;
}

export default function PortsPage() {
  const { showToast } = useToast();
  const { locale } = useLocale();
  const { can } = usePermissions();

  const canView = can('ports:view');
  const canCreate = can('ports:create');
  const canEdit = can('ports:edit');
  const canDelete = can('ports:delete');
  
  const {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refresh
  } = useMasterData<Port>('/api/ports');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Port | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [portToDelete, setPortToDelete] = useState<Port | null>(null);
  const [formData, setFormData] = useState({
    port_code: '',
    name_en: '',
    name_ar: '',
    country_id: 1,
    city_id: 1,
    port_type: 'sea',
    latitude: 0,
    longitude: 0,
    is_active: true
  });

  const portTypes = [
    { value: 'sea', label: 'Sea Port / ميناء بحري' },
    { value: 'air', label: 'Airport / مطار' },
    { value: 'land', label: 'Land Port / ميناء بري' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      port_code: '',
      name_en: '',
      name_ar: '',
      country_id: 1,
      city_id: 1,
      port_type: 'sea',
      latitude: 0,
      longitude: 0,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (!item) return;
    setEditingItem(item);
    setFormData({
      port_code: item.port_code,
      name_en: item.name_en,
      name_ar: item.name_ar,
      country_id: item.country_id,
      city_id: item.city_id || 1,
      port_type: item.port_type,
      latitude: toNumberOrZero(item.latitude),
      longitude: toNumberOrZero(item.longitude),
      is_active: item.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Port updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Port created successfully', 'success');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDeleteRequest = (id: number) => {
    const item = data.find(d => d.id === id) ?? null;
    setPortToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!portToDelete) return;
    setDeleting(true);
    try {
      await remove(portToDelete.id);
      showToast('Port deleted successfully', 'success');
      refresh();
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setPortToDelete(null);
    }
  };

  const columns = [
    {
      key: 'port_code',
      label: 'Code / الرمز',
      render: (item: Port) => item?.port_code || '-'
    },
    {
      key: 'name_en',
      label: 'Name (EN) / الاسم',
      render: (item: Port) => {
        if (!item) return '-';
        const display = locale === 'ar' ? item.name_ar : item.name_en;
        return display || item.name_en || item.name_ar || '-';
      }
    },
    {
      key: 'port_type',
      label: 'Type / النوع',
      render: (item: Port) => {
        if (!item) return '-';
        const type = portTypes.find(t => t.value === item.port_type);
        return type?.label || item.port_type;
      }
    },
    {
      key: 'coordinates',
      label: 'Coordinates / الإحداثيات',
      render: (item: Port) => {
        if (!item) return '-';
        const lat = toFixedOrNull(item.latitude, 4);
        const lon = toFixedOrNull(item.longitude, 4);
        if (!lat && !lon) return '-';
        return `${lat ?? '0.0000'}, ${lon ?? '0.0000'}`;
      }
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: Port) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{locale === 'ar' ? 'نشط' : 'Active'}</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</span>
      )
    }
  ];

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>Ports | SLMS</title>
        </Head>
        <div className="text-center py-12">
          <GlobeAltIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to view ports.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Ports | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <GlobeAltIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Ports
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                الموانئ
              </p>
            </div>
          </div>
          {canCreate && (
            <Button
              onClick={handleAdd}
              variant="primary"
              disabled={loading}
            >
              + Add Port / إضافة ميناء
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table Component */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <MasterDataTable
          data={data}
          columns={columns}
          loading={loading}
          error={error}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          canEdit={canEdit}
          canDelete={canDelete}
          emptyMessage="No ports yet. Click 'Add Port' to create one. / لا توجد موانئ بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Port' : 'Add Port'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Port Code / رمز الميناء"
            value={formData.port_code}
            onChange={(e) => setFormData({ ...formData, port_code: e.target.value })}
            placeholder="e.g., JED, RUH, DXB"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name (English) / الاسم بالإنجليزية"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              required
            />
            <Input
              label="Name (Arabic) / الاسم بالعربية"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Port Type / نوع الميناء <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.port_type}
              onChange={(e) => setFormData({ ...formData, port_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {portTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Country ID / معرف الدولة"
              type="number"
              value={formData.country_id}
              onChange={(e) => setFormData({ ...formData, country_id: parseInt(e.target.value) })}
              required
            />
            <Input
              label="City ID / معرف المدينة"
              type="number"
              value={formData.city_id}
              onChange={(e) => setFormData({ ...formData, city_id: parseInt(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude / خط العرض"
              type="number"
              step="0.0001"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
            />
            <Input
              label="Longitude / خط الطول"
              type="number"
              step="0.0001"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active / نشط</span>
          </label>
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} variant="primary" className="flex-1">
              {editingItem ? 'Update / تحديث' : 'Create / إنشاء'}
            </Button>
            <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="flex-1">
              Cancel / إلغاء
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
          setPortToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Port"
        message={portToDelete ? `This will delete "${portToDelete.name_en}". This action cannot be undone.` : 'This action cannot be undone.'}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
