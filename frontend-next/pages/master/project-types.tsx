import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ProjectType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  sort_order: number;
  company_id?: number | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  description: '',
  description_ar: '',
  icon: 'folder',
  color: '#6366f1',
  sort_order: 0,
  is_active: true,
};

const colorOptions = [
  { value: '#3b82f6', name: 'Blue' },
  { value: '#10b981', name: 'Green' },
  { value: '#f59e0b', name: 'Yellow' },
  { value: '#ef4444', name: 'Red' },
  { value: '#8b5cf6', name: 'Purple' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#6366f1', name: 'Indigo' },
  { value: '#14b8a6', name: 'Teal' },
  { value: '#f97316', name: 'Orange' },
  { value: '#64748b', name: 'Slate' },
];

const iconOptions = [
  { value: 'folder', name: 'Folder' },
  { value: 'building', name: 'Building' },
  { value: 'truck', name: 'Truck' },
  { value: 'chart', name: 'Chart' },
  { value: 'computer', name: 'Computer' },
  { value: 'rocket', name: 'Rocket' },
  { value: 'wrench', name: 'Wrench' },
  { value: 'cube', name: 'Cube' },
];

export default function ProjectTypesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  const getApiErrorMessage = async (res: Response, fallback: string) => {
    try {
      const text = await res.text();
      if (!text) return fallback;
      try {
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed === 'string' && parsed.trim()) return parsed;
        if (parsed && typeof parsed === 'object') {
          const maybeError = (parsed as any).error;
          if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
          if (maybeError && typeof maybeError === 'object') {
            const msg = (maybeError as any).message;
            if (typeof msg === 'string' && msg.trim()) return msg;
          }
          const maybeMessage = (parsed as any).message;
          if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
        }
      } catch {
        // Not JSON
      }
      const trimmed = text.trim();
      if (trimmed.startsWith('<')) return fallback;
      return trimmed || fallback;
    } catch {
      return fallback;
    }
  };

  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProjectType, setEditingProjectType] = useState<ProjectType | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectTypeToDelete, setProjectTypeToDelete] = useState<ProjectType | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjectTypes();
  }, []);

  const fetchProjectTypes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showToast(locale === 'ar' ? 'فشل التحميل' : 'Failed to load', 'error');
        return;
      }

      const companyId = companyStore.getActiveCompanyId();
      if (!companyId) {
        showToast(locale === 'ar' ? 'يرجى اختيار شركة' : 'Please select a company', 'error');
        return;
      }

      const res = await fetch('http://localhost:4000/api/projects/types', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });
      if (res.ok) {
        const result = await res.json();
        setProjectTypes(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast(locale === 'ar' ? 'غير مصرح' : 'Unauthorized', 'error');
      } else {
        const message = await getApiErrorMessage(res, locale === 'ar' ? 'فشل تحميل أنواع المشاريع' : 'Failed to load project types');
        showToast(message, 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'فشل تحميل أنواع المشاريع' : 'Failed to load project types', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = locale === 'ar' ? 'الكود مطلوب' : 'Code is required';
    if (!formData.name.trim()) errors.name = locale === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (projectType?: ProjectType) => {
    if (projectType) {
      setEditingProjectType(projectType);
      setFormData({
        code: projectType.code,
        name: projectType.name,
        name_ar: projectType.name_ar || '',
        description: projectType.description || '',
        description_ar: projectType.description_ar || '',
        icon: projectType.icon || 'folder',
        color: projectType.color || '#6366f1',
        sort_order: projectType.sort_order || 0,
        is_active: projectType.is_active,
      });
    } else {
      setEditingProjectType(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProjectType(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast(locale === 'ar' ? 'يرجى تسجيل الدخول' : 'Please log in again', 'error');
      return;
    }

    const companyId = companyStore.getActiveCompanyId();
    if (!companyId) {
      showToast(locale === 'ar' ? 'يرجى اختيار شركة' : 'Please select a company', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingProjectType
        ? `http://localhost:4000/api/projects/types/${editingProjectType.id}`
        : 'http://localhost:4000/api/projects/types';
      const res = await fetch(url, {
        method: editingProjectType ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(
          editingProjectType
            ? (locale === 'ar' ? 'تم تحديث نوع المشروع بنجاح' : 'Project type updated successfully')
            : (locale === 'ar' ? 'تم إنشاء نوع المشروع بنجاح' : 'Project type created successfully'),
          'success'
        );
        handleCloseModal();
        fetchProjectTypes();
      } else {
        const message = await getApiErrorMessage(res, locale === 'ar' ? 'فشل حفظ نوع المشروع' : 'Failed to save project type');
        showToast(message, 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'فشل حفظ نوع المشروع' : 'Failed to save project type', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (projectType: ProjectType) => {
    setProjectTypeToDelete(projectType);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectTypeToDelete) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast(locale === 'ar' ? 'يرجى تسجيل الدخول' : 'Please log in again', 'error');
      return;
    }

    const companyId = companyStore.getActiveCompanyId();
    if (!companyId) {
      showToast(locale === 'ar' ? 'يرجى اختيار شركة' : 'Please select a company', 'error');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/projects/types/${projectTypeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });
      if (res.ok) {
        showToast(locale === 'ar' ? 'تم حذف نوع المشروع بنجاح' : 'Project type deleted successfully', 'success');
        fetchProjectTypes();
      } else {
        const message = await getApiErrorMessage(res, locale === 'ar' ? 'فشل حذف نوع المشروع' : 'Failed to delete project type');
        showToast(message, 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'فشل حذف نوع المشروع' : 'Failed to delete project type', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setProjectTypeToDelete(null);
    }
  };

  const filteredProjectTypes = projectTypes.filter((pt) => {
    const matchesSearch =
      pt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pt.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pt.name_ar && pt.name_ar.includes(searchTerm));
    const matchesActive = !showActiveOnly || pt.is_active;
    return matchesSearch && matchesActive;
  });

  const canView = hasPermission('projects:view' as any);
  const canCreate = hasPermission('projects:create' as any);
  const canEdit = hasPermission('projects:edit' as any);
  const canDelete = hasPermission('projects:delete' as any);

  if (!canView) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <FolderIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'ليس لديك صلاحية لعرض أنواع المشاريع' : "You don't have permission to view project types."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'أنواع المشاريع - SLMS' : 'Project Types - SLMS'}</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {locale === 'ar' ? 'أنواع المشاريع' : 'Project Types'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'إدارة أنواع المشاريع المختلفة' : 'Manage different project types'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
              {locale === 'ar' ? 'نوع مشروع جديد' : 'New Project Type'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ltr:pl-10 rtl:pr-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              {locale === 'ar' ? 'النشط فقط' : 'Active only'}
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          ) : filteredProjectTypes.length === 0 ? (
            <div className="p-8 text-center">
              <FolderIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'لا توجد أنواع مشاريع' : 'No project types found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {locale === 'ar' ? 'الكود' : 'Code'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {locale === 'ar' ? 'الاسم' : 'Name'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {locale === 'ar' ? 'اللون' : 'Color'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {locale === 'ar' ? 'الترتيب' : 'Order'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredProjectTypes.map((pt) => (
                    <tr key={pt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{pt.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: pt.color || '#6366f1' }}
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {locale === 'ar' ? pt.name_ar || pt.name : pt.name}
                            </div>
                            {pt.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                {locale === 'ar' ? pt.description_ar || pt.description : pt.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                          style={{ backgroundColor: pt.color || '#6366f1' }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                            pt.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          )}
                        >
                          {pt.is_active ? (
                            <>
                              <CheckIcon className="w-3 h-3" />
                              {locale === 'ar' ? 'نشط' : 'Active'}
                            </>
                          ) : (
                            <>
                              <XMarkIcon className="w-3 h-3" />
                              {locale === 'ar' ? 'غير نشط' : 'Inactive'}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {pt.sort_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenModal(pt)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                              title={locale === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(pt)}
                              className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingProjectType
          ? (locale === 'ar' ? 'تعديل نوع المشروع' : 'Edit Project Type')
          : (locale === 'ar' ? 'نوع مشروع جديد' : 'New Project Type')
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'الكود' : 'Code'}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              required
              disabled={!!editingProjectType}
            />
            <Input
              label={locale === 'ar' ? 'الترتيب' : 'Sort Order'}
              type="number"
              value={formData.sort_order.toString()}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              required
            />
            <Input
              label={locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                rows={2}
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الأيقونة' : 'Icon'}
              </label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {iconOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'اللون' : 'Color'}
              </label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: opt.value })}
                    className={clsx(
                      'w-8 h-8 rounded-lg border-2 transition-all',
                      formData.color === opt.value
                        ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-blue-500'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                    )}
                    style={{ backgroundColor: opt.value }}
                    title={opt.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            {locale === 'ar' ? 'نشط' : 'Active'}
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingProjectType
                ? (locale === 'ar' ? 'تحديث' : 'Update')
                : (locale === 'ar' ? 'إنشاء' : 'Create')
              }
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setProjectTypeToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={locale === 'ar' ? 'حذف نوع المشروع' : 'Delete Project Type'}
        message={
          locale === 'ar'
            ? `هل أنت متأكد من حذف نوع المشروع "${projectTypeToDelete?.name_ar || projectTypeToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to delete the project type "${projectTypeToDelete?.name}"? This action cannot be undone.`
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
