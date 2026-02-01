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
import { ShieldCheckIcon, EyeIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMasterData } from '../../hooks/useMasterData';

type CustomsExemption = {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  notes_en?: string | null;
  notes_ar?: string | null;
  is_active?: boolean;
};

export default function CustomsExemptionsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.Delete]);

  const { data: items, loading, fetchList, create, update, remove, pagination } = useMasterData<CustomsExemption>({
    endpoint: '/api/customs-exemptions',
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomsExemption | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CustomsExemption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomsExemption | null>(null);
  const [formData, setFormData] = useState({ code: '', name_en: '', name_ar: '' });
  const [editFormData, setEditFormData] = useState({ code: '', name_en: '', name_ar: '' });

  const title = t('menu.logistics.customsDuties.exemptions');

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
          <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <ShieldCheckIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إعفاءات تؤثر على احتساب الرسوم' : 'Exemptions that affect duty calculation'}
              </p>
            </div>
          </div>

          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة إعفاء' : 'Add Exemption'}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
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
                items.map((x) => (
                  <tr key={x.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{x.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? x.name_ar : x.name_en}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(x)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>

                        {canEdit && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditing(x);
                              setEditFormData({
                                code: x.code || '',
                                name_en: x.name_en || '',
                                name_ar: x.name_ar || '',
                              });
                              setEditOpen(true);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}

                        {canDelete && (
                          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(x)}>
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
            <div className="text-sm text-gray-600 dark:text-gray-300">{locale === 'ar' ? selected.name_ar : selected.name_en}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? selected.notes_ar : selected.notes_en}</div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={canEdit && editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        title={locale === 'ar' ? 'تعديل إعفاء' : 'Edit Exemption'}
        size="md"
      >
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={editFormData.code} onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={editFormData.name_en} onChange={(e) => setEditFormData({ ...editFormData, name_en: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={editFormData.name_ar} onChange={(e) => setEditFormData({ ...editFormData, name_ar: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              loading={loading}
              onClick={async () => {
                if (!editing) return;

                const payload = {
                  code: editFormData.code.trim(),
                  name_en: editFormData.name_en.trim(),
                  name_ar: editFormData.name_ar.trim(),
                };

                if (!payload.code || !payload.name_en || !payload.name_ar) {
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'إعفاء جديد' : 'New Exemption'} size="md">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} />
          <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              loading={loading}
              onClick={async () => {
                const payload = {
                  code: formData.code.trim(),
                  name_en: formData.name_en.trim(),
                  name_ar: formData.name_ar.trim(),
                };

                if (!payload.code || !payload.name_en || !payload.name_ar) {
                  showToast(locale === 'ar' ? 'الرجاء تعبئة جميع الحقول' : 'Please fill all fields', 'error');
                  return;
                }

                const created = await create(payload as any);
                if (created) {
                  setFormData({ code: '', name_en: '', name_ar: '' });
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
