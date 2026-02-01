/**
 * 📞 Contact Methods Management
 * طرق الاتصال
 */

import { useState } from 'react';
import Head from 'next/head';
import { PhoneIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface ContactMethod {
  id: number;
  method_code: string;
  method_name_en: string;
  method_name_ar: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ContactMethodsPage() {
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
  } = useMasterData<ContactMethod>('/api/contact-methods');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContactMethod | null>(null);
  const [formData, setFormData] = useState({
    method_code: '',
    method_name_en: '',
    method_name_ar: '',
    is_active: true
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      method_code: '',
      method_name_en: '',
      method_name_ar: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        method_code: item.method_code,
        method_name_en: item.method_name_en,
        method_name_ar: item.method_name_ar,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Contact method updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Contact method created successfully', 'success');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this contact method?')) {
      try {
        await remove(id);
        showToast('Contact method deleted successfully', 'success');
        refresh();
      } catch (error) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'method_code',
      label: 'Code / الرمز',
      render: (item: ContactMethod) => item?.method_code || '-'
    },
    {
      key: 'method_name_en',
      label: 'Name (EN) / الاسم',
      render: (item: ContactMethod) => item?.method_name_en || '-'
    },
    {
      key: 'method_name_ar',
      label: 'Name (AR) / الاسم بالعربية',
      render: (item: ContactMethod) => item?.method_name_ar || '-'
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: ContactMethod) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>Contact Methods | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <PhoneIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Contact Methods
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                طرق الاتصال
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            disabled={loading}
          >
            + Add Method / إضافة طريقة
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
          canEdit={can('contact_methods:edit')}
          canDelete={can('contact_methods:delete')}
          emptyMessage="No contact methods yet. Click 'Add Method' to create one. / لا توجد طرق اتصال بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Contact Method' : 'Add Contact Method'}
      >
        <div className="space-y-4">
          <Input
            label="Method Code / رمز الطريقة"
            value={formData.method_code}
            onChange={(e) => setFormData({ ...formData, method_code: e.target.value })}
            placeholder="e.g., PHONE, EMAIL, WHATSAPP"
            required
          />
          <Input
            label="Name (English) / الاسم بالإنجليزية"
            value={formData.method_name_en}
            onChange={(e) => setFormData({ ...formData, method_name_en: e.target.value })}
            required
          />
          <Input
            label="Name (Arabic) / الاسم بالعربية"
            value={formData.method_name_ar}
            onChange={(e) => setFormData({ ...formData, method_name_ar: e.target.value })}
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
