/**
 * 🚧 Border Points Management
 * النقاط الحدودية
 */

import { useState } from 'react';
import Head from 'next/head';
import { MapPinIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface BorderPoint {
  id: number;
  border_code: string;
  border_name_en: string;
  border_name_ar: string;
  country_id: number;
  border_type: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function BorderPointsPage() {
  const { showToast } = useToast();
  const { can } = usePermissions();
  
  const {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refresh
  } = useMasterData<BorderPoint>('/api/border-points');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BorderPoint | null>(null);
  const [formData, setFormData] = useState({
    border_code: '',
    border_name_en: '',
    border_name_ar: '',
    country_id: 1,
    border_type: 'land',
    latitude: 0,
    longitude: 0,
    is_active: true
  });

  const borderTypes = [
    { value: 'land', label: 'Land / بري' },
    { value: 'sea', label: 'Sea / بحري' },
    { value: 'air', label: 'Air / جوي' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      border_code: '',
      border_name_en: '',
      border_name_ar: '',
      country_id: 1,
      border_type: 'land',
      latitude: 0,
      longitude: 0,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        border_code: item.border_code,
        border_name_en: item.border_name_en,
        border_name_ar: item.border_name_ar,
        country_id: item.country_id,
        border_type: item.border_type,
        latitude: item.latitude || 0,
        longitude: item.longitude || 0,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Border point updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Border point created successfully', 'success');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this border point?')) {
      try {
        await remove(id);
        showToast('Border point deleted successfully', 'success');
        refresh();
      } catch (error) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'border_code',
      label: 'Code / الرمز',
      render: (item: BorderPoint) => item?.border_code || '-'
    },
    {
      key: 'border_name_en',
      label: 'Name (EN) / الاسم',
      render: (item: BorderPoint) => item?.border_name_en || '-'
    },
    {
      key: 'border_type',
      label: 'Type / النوع',
      render: (item: BorderPoint) => {
        if (!item) return '-';
        const type = borderTypes.find(t => t.value === item.border_type);
        return type?.label || item.border_type;
      }
    },
    {
      key: 'coordinates',
      label: 'Coordinates / الإحداثيات',
      render: (item: BorderPoint) => {
        if (!item || (!item.latitude && !item.longitude)) return '-';
        return `${item.latitude?.toFixed(4) || 0}, ${item.longitude?.toFixed(4) || 0}`;
      }
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: BorderPoint) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>Border Points | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPinIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Border Points
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                النقاط الحدودية
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            disabled={loading}
          >
            + Add Point / إضافة نقطة
          </Button>
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
          onDelete={handleDelete}
          canEdit={can('border_points:edit')}
          canDelete={can('border_points:delete')}
          emptyMessage="No points yet. Click 'Add Point' to create one. / لا توجد نقاط بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Border Point' : 'Add Border Point'}
      >
        <div className="space-y-4">
          <Input
            label="Border Code / رمز النقطة"
            value={formData.border_code}
            onChange={(e) => setFormData({ ...formData, border_code: e.target.value })}
            required
          />
          <Input
            label="Name (English) / الاسم بالإنجليزية"
            value={formData.border_name_en}
            onChange={(e) => setFormData({ ...formData, border_name_en: e.target.value })}
            required
          />
          <Input
            label="Name (Arabic) / الاسم بالعربية"
            value={formData.border_name_ar}
            onChange={(e) => setFormData({ ...formData, border_name_ar: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Border Type / نوع الحدود <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.border_type}
              onChange={(e) => setFormData({ ...formData, border_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {borderTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
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
          <Input
            label="Country ID / معرف الدولة"
            type="number"
            value={formData.country_id}
            onChange={(e) => setFormData({ ...formData, country_id: parseInt(e.target.value) })}
            required
          />
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
    </MainLayout>
  );
}
