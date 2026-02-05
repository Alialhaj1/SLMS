/**
 * 📋 LC TYPES PAGE - صفحة أنواع الاعتمادات المستندية
 * =====================================================
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LcType {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  description?: string;
  is_sight: boolean;
  is_usance: boolean;
  is_revolving: boolean;
  is_transferable: boolean;
  is_back_to_back: boolean;
  is_red_clause: boolean;
  is_green_clause: boolean;
  is_standby: boolean;
  is_active: boolean;
  display_order: number;
}

const API_BASE = '/api';

export default function LcTypesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  const [types, setTypes] = useState<LcType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<LcType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LcType | null>(null);
  const [saving, setSaving] = useState(false);

  const initialFormData = {
    code: '',
    name: '',
    name_ar: '',
    description: '',
    is_sight: false,
    is_usance: false,
    is_revolving: false,
    is_transferable: false,
    is_back_to_back: false,
    is_red_clause: false,
    is_green_clause: false,
    is_standby: false,
    display_order: 0,
  };
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getToken = () => localStorage.getItem('accessToken');

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTypes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching LC types:', error);
      showToast(isRTL ? 'فشل في جلب البيانات' : 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  }, [isRTL, showToast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code) newErrors.code = isRTL ? 'الرمز مطلوب' : 'Code is required';
    if (!formData.name) newErrors.name = isRTL ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
    if (!formData.name_ar) newErrors.name_ar = isRTL ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(isRTL ? 'تم إنشاء النوع بنجاح' : 'Type created successfully', 'success');
        setCreateOpen(false);
        setFormData(initialFormData);
        fetchTypes();
      } else {
        const err = await res.json();
        showToast(err.error?.message || (isRTL ? 'فشل في الإنشاء' : 'Failed to create'), 'error');
      }
    } catch (error) {
      showToast(isRTL ? 'فشل في الإنشاء' : 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected || !validateForm()) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/types/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(isRTL ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
        setEditOpen(false);
        setSelected(null);
        fetchTypes();
      } else {
        const err = await res.json();
        showToast(err.error?.message || (isRTL ? 'فشل في التحديث' : 'Failed to update'), 'error');
      }
    } catch (error) {
      showToast(isRTL ? 'فشل في التحديث' : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/types/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
        setDeleteConfirm(null);
        fetchTypes();
      } else {
        const err = await res.json();
        showToast(err.error?.message || (isRTL ? 'فشل في الحذف' : 'Failed to delete'), 'error');
      }
    } catch (error) {
      showToast(isRTL ? 'فشل في الحذف' : 'Failed to delete', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (type: LcType) => {
    setSelected(type);
    setFormData({
      code: type.code,
      name: type.name,
      name_ar: type.name_ar,
      description: type.description || '',
      is_sight: type.is_sight,
      is_usance: type.is_usance,
      is_revolving: type.is_revolving,
      is_transferable: type.is_transferable,
      is_back_to_back: type.is_back_to_back,
      is_red_clause: type.is_red_clause,
      is_green_clause: type.is_green_clause,
      is_standby: type.is_standby,
      display_order: type.display_order,
    });
    setEditOpen(true);
  };

  const canManage = hasPermission('lc_types:manage');

  const TypeForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={isRTL ? 'الرمز *' : 'Code *'}
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          error={errors.code}
        />
        <Input
          label={isRTL ? 'ترتيب العرض' : 'Display Order'}
          type="number"
          value={String(formData.display_order)}
          onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
        />
        <Input
          label={isRTL ? 'الاسم بالإنجليزية *' : 'English Name *'}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
        />
        <Input
          label={isRTL ? 'الاسم بالعربية *' : 'Arabic Name *'}
          value={formData.name_ar}
          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          error={errors.name_ar}
        />
      </div>
      <Input
        label={isRTL ? 'الوصف' : 'Description'}
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'is_sight', label: isRTL ? 'اعتماد بالاطلاع' : 'Sight LC' },
          { key: 'is_usance', label: isRTL ? 'اعتماد مؤجل' : 'Usance LC' },
          { key: 'is_revolving', label: isRTL ? 'اعتماد دوار' : 'Revolving' },
          { key: 'is_transferable', label: isRTL ? 'قابل للتحويل' : 'Transferable' },
          { key: 'is_back_to_back', label: isRTL ? 'ظهر لظهر' : 'Back-to-Back' },
          { key: 'is_red_clause', label: isRTL ? 'شرط أحمر' : 'Red Clause' },
          { key: 'is_green_clause', label: isRTL ? 'شرط أخضر' : 'Green Clause' },
          { key: 'is_standby', label: isRTL ? 'اعتماد ضمان' : 'Standby' },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(formData as any)[item.key]}
              onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'أنواع الاعتمادات المستندية - SLMS' : 'LC Types - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <TagIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'أنواع الاعتمادات المستندية' : 'LC Types'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? 'إدارة أنواع الاعتمادات المستندية' : 'Manage letter of credit types'}
              </p>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => { setFormData(initialFormData); setCreateOpen(true); }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {isRTL ? 'إضافة نوع' : 'Add Type'}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الرمز' : 'Code'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الخصائص' : 'Properties'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {types.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {type.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {isRTL ? type.name_ar : type.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {isRTL ? type.name : type.name_ar}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {type.is_sight && <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{isRTL ? 'اطلاع' : 'Sight'}</span>}
                        {type.is_usance && <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{isRTL ? 'مؤجل' : 'Usance'}</span>}
                        {type.is_revolving && <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">{isRTL ? 'دوار' : 'Revolving'}</span>}
                        {type.is_transferable && <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">{isRTL ? 'محول' : 'Transfer'}</span>}
                        {type.is_standby && <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">{isRTL ? 'ضمان' : 'Standby'}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
                            <button onClick={() => openEditModal(type)} className="text-indigo-600 hover:text-indigo-900">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteConfirm(type)} className="text-red-600 hover:text-red-900">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {types.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {isRTL ? 'لا توجد أنواع' : 'No types found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={isRTL ? 'إضافة نوع اعتماد' : 'Add LC Type'}
        size="lg"
      >
        <TypeForm />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleCreate} loading={saving}>
            {isRTL ? 'إنشاء' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={isRTL ? 'تعديل نوع اعتماد' : 'Edit LC Type'}
        size="lg"
      >
        <TypeForm />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleUpdate} loading={saving}>
            {isRTL ? 'تحديث' : 'Update'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={isRTL ? 'حذف نوع الاعتماد' : 'Delete LC Type'}
        message={isRTL ? 'هل أنت متأكد من حذف هذا النوع؟' : 'Are you sure you want to delete this type?'}
        confirmText={isRTL ? 'حذف' : 'Delete'}
        variant="danger"
        loading={saving}
      />
    </MainLayout>
  );
}
