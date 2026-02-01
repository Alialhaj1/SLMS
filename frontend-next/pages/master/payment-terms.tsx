/**
 * 💳 Payment Terms Management
 * شروط الدفع
 */

import { useState } from 'react';
import Head from 'next/head';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface PaymentTerm {
  id: number;
  term_code: string;
  term_name_en: string;
  term_name_ar: string;
  days_until_due: number;
  discount_percentage: number;
  discount_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function PaymentTermsPage() {
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
  } = useMasterData<PaymentTerm>('/api/payment-terms');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentTerm | null>(null);
  const [formData, setFormData] = useState({
    term_code: '',
    term_name_en: '',
    term_name_ar: '',
    days_until_due: 30,
    discount_percentage: 0,
    discount_days: 0,
    is_active: true
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      term_code: '',
      term_name_en: '',
      term_name_ar: '',
      days_until_due: 30,
      discount_percentage: 0,
      discount_days: 0,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        term_code: item.term_code,
        term_name_en: item.term_name_en,
        term_name_ar: item.term_name_ar,
        days_until_due: item.days_until_due || 30,
        discount_percentage: item.discount_percentage || 0,
        discount_days: item.discount_days || 0,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Payment term updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Payment term created successfully', 'success');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this payment term?')) {
      try {
        await remove(id);
        showToast('Payment term deleted successfully', 'success');
        refresh();
      } catch (error) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'term_code',
      label: 'Code / الرمز',
      render: (item: PaymentTerm) => item?.term_code || '-'
    },
    {
      key: 'term_name_en',
      label: 'Name (EN) / الاسم',
      render: (item: PaymentTerm) => item?.term_name_en || '-'
    },
    {
      key: 'days_until_due',
      label: 'Due Days / أيام الاستحقاق',
      render: (item: PaymentTerm) => {
        if (!item) return '-';
        return `${item.days_until_due} days`;
      }
    },
    {
      key: 'discount',
      label: 'Discount / الخصم',
      render: (item: PaymentTerm) => {
        if (!item || !item.discount_percentage) return '-';
        return `${item.discount_percentage}% (${item.discount_days} days)`;
      }
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: PaymentTerm) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>Payment Terms | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Payment Terms
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                شروط الدفع
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            disabled={loading}
          >
            + Add Term / إضافة شرط
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
          canEdit={can('payment_terms:edit')}
          canDelete={can('payment_terms:delete')}
          emptyMessage="No terms yet. Click 'Add Term' to create one. / لا توجد شروط بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Payment Term' : 'Add Payment Term'}
      >
        <div className="space-y-4">
          <Input
            label="Term Code / رمز الشرط"
            value={formData.term_code}
            onChange={(e) => setFormData({ ...formData, term_code: e.target.value })}
            placeholder="e.g., NET30, NET60, COD"
            required
          />
          <Input
            label="Name (English) / الاسم بالإنجليزية"
            value={formData.term_name_en}
            onChange={(e) => setFormData({ ...formData, term_name_en: e.target.value })}
            required
          />
          <Input
            label="Name (Arabic) / الاسم بالعربية"
            value={formData.term_name_ar}
            onChange={(e) => setFormData({ ...formData, term_name_ar: e.target.value })}
            required
          />
          <Input
            label="Days Until Due / أيام حتى الاستحقاق"
            type="number"
            value={formData.days_until_due}
            onChange={(e) => setFormData({ ...formData, days_until_due: parseInt(e.target.value) })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Discount % / نسبة الخصم"
              type="number"
              step="0.01"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
            />
            <Input
              label="Discount Days / أيام الخصم"
              type="number"
              value={formData.discount_days}
              onChange={(e) => setFormData({ ...formData, discount_days: parseInt(e.target.value) })}
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
    </MainLayout>
  );
}
