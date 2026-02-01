/**
 * 🗺️ Regions Management
 * المناطق
 */

import { useState } from 'react';
import Head from 'next/head';
import { MapIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface Region {
  id: number;
  region_code: string;
  region_name_en: string;
  region_name_ar: string;
  country_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function RegionsPage() {
  const { showToast } = useToast();
  const { can } = usePermissions();
  
  const {
    data,
    loading,
    error,
    create,
    update,
    remove,
    fetchList
  } = useMasterData<Region>({ endpoint: '/api/regions' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Region | null>(null);
  const [formData, setFormData] = useState({
    region_code: '',
    region_name_en: '',
    region_name_ar: '',
    country_id: 1,
    is_active: true
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      region_code: '',
      region_name_en: '',
      region_name_ar: '',
      country_id: 1,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        region_code: item.region_code,
        region_name_en: item.region_name_en,
        region_name_ar: item.region_name_ar,
        country_id: item.country_id,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Region updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Region created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this region?')) {
      try {
        await remove(id);
        showToast('Region deleted successfully', 'success');
        fetchList();
      } catch (error) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'region_code',
      label: 'Code / الرمز',
      render: (item: Region) => item?.region_code || '-'
    },
    {
      key: 'region_name_en',
      label: 'Name (EN) / الاسم',
      render: (item: Region) => item?.region_name_en || '-'
    },
    {
      key: 'region_name_ar',
      label: 'Name (AR) / الاسم بالعربية',
      render: (item: Region) => item?.region_name_ar || '-'
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: Region) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>Regions | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Regions
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                المناطق
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            disabled={loading}
          >
            + Add Region / إضافة منطقة
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
          canEdit={can('regions:edit')}
          canDelete={can('regions:delete')}
          emptyMessage="No regions yet. Click 'Add Region' to create one. / لا توجد مناطق بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Region' : 'Add Region'}
      >
        <div className="space-y-4">
          <Input
            label="Region Code / رمز المنطقة"
            value={formData.region_code}
            onChange={(e) => setFormData({ ...formData, region_code: e.target.value })}
            required
          />
          <Input
            label="Name (English) / الاسم بالإنجليزية"
            value={formData.region_name_en}
            onChange={(e) => setFormData({ ...formData, region_name_en: e.target.value })}
            required
          />
          <Input
            label="Name (Arabic) / الاسم بالعربية"
            value={formData.region_name_ar}
            onChange={(e) => setFormData({ ...formData, region_name_ar: e.target.value })}
            required
          />
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
