import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { QrCodeIcon, EyeIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMasterData } from '../../hooks/useMasterData';

type HSCode = {
  id: number;
  code: string;
  description_en: string;
  description_ar: string;
  is_active?: boolean;
};

export default function HSCodesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.HSCodes.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.HSCodes.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Logistics.HSCodes.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.Logistics.HSCodes.Delete]);

  const { data: items, loading, fetchList, create, update, remove, pagination } = useMasterData<HSCode>({
    endpoint: '/api/hs-codes',
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<HSCode | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<HSCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HSCode | null>(null);
  const [formData, setFormData] = useState({ code: '', description_en: '', description_ar: '' });
  const [editFormData, setEditFormData] = useState({ code: '', description_en: '', description_ar: '' });

  const title = t('menu.logistics.customsDuties.hsCodes');

  useEffect(() => {
    if (!canView) return;
    const timeout = setTimeout(() => {
      fetchList({ search, page: 1 });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canView, fetchList, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <QrCodeIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة رموز التعريفة الجمركية' : 'Manage HS codes (tariff classification)'}
              </p>
            </div>
          </div>

          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة رمز' : 'Add Code'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث...' : 'Search...'} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرمز' : 'Code'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لا توجد بيانات' : 'No data'}
                  </td>
                </tr>
              ) : (
                items.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{h.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? h.description_ar : h.description_en}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(h)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>

                        {canEdit && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditing(h);
                              setEditFormData({
                                code: h.code || '',
                                description_en: h.description_en || '',
                                description_ar: h.description_ar || '',
                              });
                              setEditOpen(true);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteTarget(h)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {locale === 'ar'
                ? `الصفحة ${pagination.currentPage} من ${pagination.totalPages} • الإجمالي ${pagination.totalItems}`
                : `Page ${pagination.currentPage} of ${pagination.totalPages} • Total ${pagination.totalItems}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={loading || pagination.currentPage <= 1}
                onClick={() => fetchList({ page: pagination.currentPage - 1, search })}
              >
                {locale === 'ar' ? 'السابق' : 'Prev'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={loading || pagination.currentPage >= pagination.totalPages}
                onClick={() => fetchList({ page: pagination.currentPage + 1, search })}
              >
                {locale === 'ar' ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected && !createOpen && !editOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white font-medium">{selected.code}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{locale === 'ar' ? selected.description_ar : selected.description_en}</div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={canEdit && editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        title={locale === 'ar' ? 'تعديل رمز HS' : 'Edit HS Code'}
        size="md"
      >
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'الرمز' : 'Code'} value={editFormData.code} onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })} />
          <Input label={locale === 'ar' ? 'الوصف (EN)' : 'Description (EN)'} value={editFormData.description_en} onChange={(e) => setEditFormData({ ...editFormData, description_en: e.target.value })} />
          <Input label={locale === 'ar' ? 'الوصف (AR)' : 'Description (AR)'} value={editFormData.description_ar} onChange={(e) => setEditFormData({ ...editFormData, description_ar: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              loading={loading}
              onClick={async () => {
                if (!editing) return;

                const payload = {
                  code: editFormData.code.trim(),
                  description_en: editFormData.description_en.trim(),
                  description_ar: editFormData.description_ar.trim(),
                };

                if (!payload.code || !payload.description_en || !payload.description_ar) {
                  showToast(locale === 'ar' ? 'الرجاء تعبئة جميع الحقول' : 'Please fill all fields', 'error');
                  return;
                }

                const updated = await update(editing.id, payload as any);
                if (updated) {
                  setEditOpen(false);
                  setEditing(null);
                }
              }}
            >
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'رمز HS جديد' : 'New HS Code'} size="md">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'الرمز' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <Input label={locale === 'ar' ? 'الوصف (EN)' : 'Description (EN)'} value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} />
          <Input label={locale === 'ar' ? 'الوصف (AR)' : 'Description (AR)'} value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              loading={loading}
              onClick={async () => {
                const payload = {
                  code: formData.code.trim(),
                  description_en: formData.description_en.trim(),
                  description_ar: formData.description_ar.trim(),
                };

                if (!payload.code || !payload.description_en || !payload.description_ar) {
                  showToast(locale === 'ar' ? 'الرجاء تعبئة جميع الحقول' : 'Please fill all fields', 'error');
                  return;
                }

                const created = await create(payload as any);
                if (created) {
                  setFormData({ code: '', description_en: '', description_ar: '' });
                  setCreateOpen(false);
                }
              }}
            >
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await remove(deleteTarget.id);
        }}
        title={locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
        message={
          locale === 'ar'
            ? 'هذا الإجراء لا يمكن التراجع عنه.'
            : 'This action cannot be undone.'
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        cancelText={locale === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        loading={loading}
      />
    </MainLayout>
  );
}
