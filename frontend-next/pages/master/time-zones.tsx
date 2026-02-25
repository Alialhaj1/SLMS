/**
 * 🕐 Time Zones Management
 * المناطق الزمنية
 */

import { useState } from 'react';
import Head from 'next/head';
import { ClockIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface TimeZone {
  id: number;
  timezone_code: string;
  timezone_name: string;
  utc_offset: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TimeZonesPage() {
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
  } = useMasterData<TimeZone>('/api/time-zones');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimeZone | null>(null);
  const [formData, setFormData] = useState({
    timezone_code: '',
    timezone_name: '',
    utc_offset: '+00:00',
    is_active: true
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      timezone_code: '',
      timezone_name: '',
      utc_offset: '+00:00',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        timezone_code: item.timezone_code,
        timezone_name: item.timezone_name,
        utc_offset: item.utc_offset,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Time zone updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Time zone created successfully', 'success');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this time zone?')) {
      try {
        await remove(id);
        showToast('Time zone deleted successfully', 'success');
        refresh();
      } catch (error) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'timezone_code',
      label: 'Code / الرمز',
      render: (item: TimeZone) => item?.timezone_code || '-'
    },
    {
      key: 'timezone_name',
      label: 'Name / الاسم',
      render: (item: TimeZone) => item?.timezone_name || '-'
    },
    {
      key: 'utc_offset',
      label: 'UTC Offset / الفرق عن التوقيت العالمي',
      render: (item: TimeZone) => (
        <span className="font-mono">{item?.utc_offset || '-'}</span>
      )
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: TimeZone) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>Time Zones | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Time Zones
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                المناطق الزمنية
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            disabled={loading}
          >
            + Add Zone / إضافة منطقة
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
          canEdit={can('time_zones:edit')}
          canDelete={can('time_zones:delete')}
          emptyMessage="No zones yet. Click 'Add Zone' to create one. / لا توجد مناطق بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Time Zone' : 'Add Time Zone'}
      >
        <div className="space-y-4">
          <Input
            label="Time Zone Code / رمز المنطقة"
            value={formData.timezone_code}
            onChange={(e) => setFormData({ ...formData, timezone_code: e.target.value })}
            placeholder="e.g., Asia/Riyadh"
            required
          />
          <Input
            label="Time Zone Name / اسم المنطقة"
            value={formData.timezone_name}
            onChange={(e) => setFormData({ ...formData, timezone_name: e.target.value })}
            placeholder="e.g., Arabian Standard Time"
            required
          />
          <Input
            label="UTC Offset / الفرق عن UTC"
            value={formData.utc_offset}
            onChange={(e) => setFormData({ ...formData, utc_offset: e.target.value })}
            placeholder="e.g., +03:00"
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
