/**
 * ✍️ Digital Signatures Management
 * التوقيعات الرقمية
 */

import { useState } from 'react';
import Head from 'next/head';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface DigitalSignature {
  id: number;
  signature_name: string;
  signer_name: string;
  signer_title: string;
  signature_type: string;
  signature_data: string;
  certificate_serial: string;
  certificate_issuer: string;
  valid_from: string;
  valid_until: string;
  is_default: boolean;
  is_active: boolean;
  company_id?: number;
  created_at: string;
  updated_at: string;
}

export default function DigitalSignaturesPage() {
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
  } = useMasterData<DigitalSignature>({ endpoint: '/api/digital-signatures', autoFetch: true, pageSize: 20 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DigitalSignature | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    signature_name: '',
    signer_name: '',
    signer_title: '',
    signature_type: 'image',
    signature_data: '',
    certificate_serial: '',
    certificate_issuer: '',
    valid_from: '',
    valid_until: '',
    is_default: false,
    is_active: true
  });

  const signatureTypes = [
    { value: 'image', label: 'Image / صورة' },
    { value: 'certificate', label: 'Certificate / شهادة رقمية' },
    { value: 'biometric', label: 'Biometric / بيومترية' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      signature_name: '',
      signer_name: '',
      signer_title: '',
      signature_type: 'image',
      signature_data: '',
      certificate_serial: '',
      certificate_issuer: '',
      valid_from: '',
      valid_until: '',
      is_default: false,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        signature_name: item.signature_name,
        signer_name: item.signer_name,
        signer_title: item.signer_title || '',
        signature_type: item.signature_type,
        signature_data: item.signature_data || '',
        certificate_serial: item.certificate_serial || '',
        certificate_issuer: item.certificate_issuer || '',
        valid_from: item.valid_from?.split('T')[0] || '',
        valid_until: item.valid_until?.split('T')[0] || '',
        is_default: item.is_default,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Signature updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Signature created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await remove(deletingId);
      showToast('Signature deleted successfully', 'success');
      fetchList();
      setConfirmOpen(false);
      setDeletingId(null);
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'signature_name',
      label: 'Name / الاسم',
      render: (item: DigitalSignature) => item?.signature_name || '-'
    },
    {
      key: 'signer_name',
      label: 'Signer / الموقّع',
      render: (item: DigitalSignature) => item?.signer_name || '-'
    },
    {
      key: 'signer_title',
      label: 'Title / المنصب',
      render: (item: DigitalSignature) => item?.signer_title || '-'
    },
    {
      key: 'signature_type',
      label: 'Type / النوع',
      render: (item: DigitalSignature) => {
        if (!item) return '-';
        const type = signatureTypes.find(t => t.value === item.signature_type);
        return type?.label || item.signature_type;
      }
    },
    {
      key: 'valid_until',
      label: 'Valid Until / صالح حتى',
      render: (item: DigitalSignature) => {
        if (!item?.valid_until) return '-';
        const date = new Date(item.valid_until);
        const isExpired = date < new Date();
        return (
          <span className={isExpired ? 'text-red-600' : 'text-green-600'}>
            {date.toLocaleDateString()}
            {isExpired && ' (Expired)'}
          </span>
        );
      }
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: DigitalSignature) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>Digital Signatures | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <PencilSquareIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Digital Signatures
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                التوقيعات الرقمية
              </p>
            </div>
          </div>
          {can('digital_signatures:create') && (
            <Button
              onClick={handleAdd}
              variant="primary"
              disabled={loading}
            >
              + Add Signature / إضافة توقيع
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
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          showActions={can('digital_signatures:edit') || can('digital_signatures:delete')}
          canEdit={can('digital_signatures:edit')}
          canDelete={can('digital_signatures:delete')}
          emptyMessage="No signatures yet. Click 'Add Signature' to create one. / لا توجد توقيعات بعد"
        />
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          if (isDeleting) return;
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Signature"
        message="This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Signature' : 'Add Signature'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Signature Name / اسم التوقيع"
            value={formData.signature_name}
            onChange={(e) => setFormData({ ...formData, signature_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Signer Name / اسم الموقّع"
              value={formData.signer_name}
              onChange={(e) => setFormData({ ...formData, signer_name: e.target.value })}
              required
            />
            <Input
              label="Signer Title / منصب الموقّع"
              value={formData.signer_title}
              onChange={(e) => setFormData({ ...formData, signer_title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Signature Type / نوع التوقيع <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.signature_type}
              onChange={(e) => setFormData({ ...formData, signature_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {signatureTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {formData.signature_type === 'certificate' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Certificate Serial / الرقم التسلسلي"
                  value={formData.certificate_serial}
                  onChange={(e) => setFormData({ ...formData, certificate_serial: e.target.value })}
                />
                <Input
                  label="Certificate Issuer / جهة الإصدار"
                  value={formData.certificate_issuer}
                  onChange={(e) => setFormData({ ...formData, certificate_issuer: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From / صالح من"
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
            />
            <Input
              label="Valid Until / صالح حتى"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            />
          </div>

          <Input
            label="Signature Data / بيانات التوقيع (Base64 or URL)"
            value={formData.signature_data}
            onChange={(e) => setFormData({ ...formData, signature_data: e.target.value })}
            multiline
            rows={3}
          />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Default Signature / توقيع افتراضي</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active / نشط</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} variant="primary" className="flex-1" loading={loading}>
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
