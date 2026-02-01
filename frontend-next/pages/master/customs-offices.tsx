/**
 * 🏛️ Customs Offices Management
 * مكاتب الجمارك
 */

import { useState } from 'react';
import Head from 'next/head';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
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

interface CustomsOffice {
  id: number;
  office_code: string;
  name_en: string;
  name_ar: string;
  country_id: number;
  city_id: number;
  address_en?: string | null;
  address_ar?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CustomsOfficesPage() {
  const { showToast } = useToast();
  const { locale } = useLocale();
  const { can } = usePermissions();

  const canView = can('customs_offices:view');
  const canCreate = can('customs_offices:create');
  const canEdit = can('customs_offices:edit');
  const canDelete = can('customs_offices:delete');
  
  const {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refresh
  } = useMasterData<CustomsOffice>('/api/customs-offices');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomsOffice | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState<CustomsOffice | null>(null);
  const [formData, setFormData] = useState({
    office_code: '',
    name_en: '',
    name_ar: '',
    country_id: 1,
    city_id: 1,
    address_en: '',
    contact_phone: '',
    contact_email: '',
    is_active: true
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      office_code: '',
      name_en: '',
      name_ar: '',
      country_id: 1,
      city_id: 1,
      address_en: '',
      contact_phone: '',
      contact_email: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        office_code: item.office_code,
        name_en: item.name_en,
        name_ar: item.name_ar,
        country_id: item.country_id,
        city_id: item.city_id || 1,
        address_en: item.address_en || '',
        contact_phone: item.contact_phone || '',
        contact_email: item.contact_email || '',
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Customs office updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Customs office created successfully', 'success');
      }
      setIsModalOpen(false);
      refresh();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDeleteRequest = (id: number) => {
    const item = data.find(d => d.id === id) ?? null;
    setOfficeToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!officeToDelete) return;
    setDeleting(true);
    try {
      await remove(officeToDelete.id);
      showToast('Customs office deleted successfully', 'success');
      refresh();
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setOfficeToDelete(null);
    }
  };

  const columns = [
    {
      key: 'office_code',
      label: 'Code / الرمز',
      render: (item: CustomsOffice) => item?.office_code || '-'
    },
    {
      key: 'name_en',
      label: 'Name (EN) / الاسم',
      render: (item: CustomsOffice) => {
        if (!item) return '-';
        const display = locale === 'ar' ? item.name_ar : item.name_en;
        return display || item.name_en || item.name_ar || '-';
      }
    },
    {
      key: 'contact_phone',
      label: 'Phone / الهاتف',
      render: (item: CustomsOffice) => item?.contact_phone || '-'
    },
    {
      key: 'contact_email',
      label: 'Email / البريد',
      render: (item: CustomsOffice) => item?.contact_email || '-'
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: CustomsOffice) => (
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
          <title>Customs Offices | SLMS</title>
        </Head>
        <div className="text-center py-12">
          <BuildingOfficeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to view customs offices.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Customs Offices | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Customs Offices
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                مكاتب الجمارك
              </p>
            </div>
          </div>
          {canCreate && (
            <Button
              onClick={handleAdd}
              variant="primary"
              disabled={loading}
            >
              + Add Office / إضافة مكتب
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
          emptyMessage="No offices yet. Click 'Add Office' to create one. / لا توجد مكاتب بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Customs Office' : 'Add Customs Office'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Office Code / رمز المكتب"
            value={formData.office_code}
            onChange={(e) => setFormData({ ...formData, office_code: e.target.value })}
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
          <Input
            label="Address / العنوان"
            value={formData.address_en}
            onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
            multiline
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone / الهاتف"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
            <Input
              label="Email / البريد الإلكتروني"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
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
          setOfficeToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Customs Office"
        message={
          officeToDelete
            ? `This will delete "${(locale === 'ar' ? officeToDelete.name_ar : officeToDelete.name_en) || officeToDelete.name_en || officeToDelete.name_ar}". This action cannot be undone.`
            : 'This action cannot be undone.'
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
