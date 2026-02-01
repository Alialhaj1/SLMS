/**
 * 👥 Customer Groups Management
 * مجموعات العملاء
 */

import { useState } from 'react';
import Head from 'next/head';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface CustomerGroup {
  id: number;
  group_code: string;
  group_name_en: string;
  group_name_ar: string;
  discount_percentage: number;
  credit_limit: number;
  payment_terms_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CustomerGroupsPage() {
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
  } = useMasterData<CustomerGroup>('/api/customer-groups');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerGroup | null>(null);
  const [formData, setFormData] = useState({
    group_code: '',
    group_name_en: '',
    group_name_ar: '',
    discount_percentage: 0,
    credit_limit: 0,
    payment_terms_days: 30,
    is_active: true
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      group_code: '',
      group_name_en: '',
      group_name_ar: '',
      discount_percentage: 0,
      credit_limit: 0,
      payment_terms_days: 30,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        group_code: item.group_code,
        group_name_en: item.group_name_en,
        group_name_ar: item.group_name_ar,
        discount_percentage: item.discount_percentage || 0,
        credit_limit: item.credit_limit || 0,
        payment_terms_days: item.payment_terms_days || 30,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Customer group updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Customer group created successfully', 'success');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer group?')) {
      try {
        await remove(id);
        showToast('Customer group deleted successfully', 'success');
        refresh();
      } catch (error) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'group_code',
      label: 'Code / الرمز',
      render: (item: CustomerGroup) => item?.group_code || '-'
    },
    {
      key: 'group_name_en',
      label: 'Name (EN) / الاسم',
      render: (item: CustomerGroup) => item?.group_name_en || '-'
    },
    {
      key: 'discount_percentage',
      label: 'Discount / الخصم',
      render: (item: CustomerGroup) => {
        if (!item || !item.discount_percentage) return '-';
        return `${item.discount_percentage}%`;
      }
    },
    {
      key: 'credit_limit',
      label: 'Credit Limit / الحد الائتماني',
      render: (item: CustomerGroup) => {
        if (!item || !item.credit_limit) return '-';
        return new Intl.NumberFormat('en-US').format(item.credit_limit);
      }
    },
    {
      key: 'payment_terms_days',
      label: 'Payment Terms / شروط الدفع',
      render: (item: CustomerGroup) => {
        if (!item) return '-';
        return `${item.payment_terms_days} days`;
      }
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: CustomerGroup) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>Customer Groups | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Customer Groups
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                مجموعات العملاء
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            disabled={loading}
          >
            + Add Group / إضافة مجموعة
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
          canEdit={can('customer_groups:edit')}
          canDelete={can('customer_groups:delete')}
          emptyMessage="No groups yet. Click 'Add Group' to create one. / لا توجد مجموعات بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Customer Group' : 'Add Customer Group'}
      >
        <div className="space-y-4">
          <Input
            label="Group Code / رمز المجموعة"
            value={formData.group_code}
            onChange={(e) => setFormData({ ...formData, group_code: e.target.value })}
            placeholder="e.g., VIP, WHOLESALE, RETAIL"
            required
          />
          <Input
            label="Name (English) / الاسم بالإنجليزية"
            value={formData.group_name_en}
            onChange={(e) => setFormData({ ...formData, group_name_en: e.target.value })}
            required
          />
          <Input
            label="Name (Arabic) / الاسم بالعربية"
            value={formData.group_name_ar}
            onChange={(e) => setFormData({ ...formData, group_name_ar: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Discount % / نسبة الخصم"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
            />
            <Input
              label="Payment Terms (Days) / شروط الدفع"
              type="number"
              min="0"
              value={formData.payment_terms_days}
              onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) })}
            />
          </div>
          <Input
            label="Credit Limit / الحد الائتماني"
            type="number"
            step="0.01"
            min="0"
            value={formData.credit_limit}
            onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) })}
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
