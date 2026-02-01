import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { ScaleIcon, EyeIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMasterData } from '../../hooks/useMasterData';

type TariffRate = {
  id: number;
  hs_code: string;
  hs_description_en?: string | null;
  hs_description_ar?: string | null;
  country_code: string;
  duty_rate_percent: number;
  effective_from: string;
  effective_to?: string | null;
  notes_en?: string | null;
  notes_ar?: string | null;
  rule_type?: 'DUTY' | 'EXEMPT' | 'PROHIBITED';
  is_active?: boolean;
};

type HSCode = {
  id: number;
  code: string;
  description_en: string;
  description_ar: string;
  is_active: boolean;
};

export default function CustomsTariffRatesPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.CustomsTariffs.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.CustomsTariffs.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Logistics.CustomsTariffs.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.Logistics.CustomsTariffs.Delete]);
  const canPickHsCodes = hasAnyPermission([MenuPermissions.Logistics.HSCodes.View]);

  const { data: items, loading, fetchList, create, update, remove, pagination } = useMasterData<TariffRate>({
    endpoint: '/api/customs-tariffs',
  });
  const { data: hsCodes, loading: hsLoading, fetchList: fetchHsCodes, pagination: hsPagination } = useMasterData<HSCode>({
    endpoint: '/api/hs-codes',
  });
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [selected, setSelected] = useState<TariffRate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TariffRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TariffRate | null>(null);
  const [formData, setFormData] = useState({ hs_code: '', country_code: 'SA', duty_rate_percent: '5', effective_from: '2025-01-01', effective_to: '', notes_en: '', notes_ar: '' });
  const [editFormData, setEditFormData] = useState({ hs_code: '', country_code: 'SA', duty_rate_percent: '5', effective_from: '2025-01-01', effective_to: '', notes_en: '', notes_ar: '' });

  const [hsPickerOpen, setHsPickerOpen] = useState(false);
  const [hsPickerTarget, setHsPickerTarget] = useState<'create' | 'edit'>('create');
  const [hsSearch, setHsSearch] = useState('');
  const [hsPageSize, setHsPageSize] = useState<number>(20);

  const title = t('menu.logistics.customsDuties.tariffs');

  useEffect(() => {
    if (!router.isReady) return;
    const hs = router.query.hs_code;
    if (typeof hs === 'string' && hs.trim()) {
      setSearch(hs.trim());
    }
  }, [router.isReady, router.query.hs_code]);

  useEffect(() => {
    if (!canView) return;
    const timeout = setTimeout(() => {
      fetchList({ search, page: 1, pageSize });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canView, fetchList, pageSize, search]);

  useEffect(() => {
    if (!hsPickerOpen || !canPickHsCodes) return;
    const timeout = setTimeout(() => {
      fetchHsCodes({ search: hsSearch, page: 1, pageSize: hsPageSize, filters: { is_active: true } });
    }, 250);
    return () => clearTimeout(timeout);
  }, [canPickHsCodes, fetchHsCodes, hsPageSize, hsPickerOpen, hsSearch]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <ScaleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <ScaleIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تعريف نسب الرسوم حسب رمز HS' : 'Maintain duty rates by HS code'}
              </p>
            </div>
          </div>

          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة تعريفة' : 'Add Rate'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={locale === 'ar' ? 'بحث' : 'Search'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'عدد الصفوف' : 'Rows'}
              </label>
              <select
                className="input w-full"
                value={String(pageSize)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'ALL') {
                    const allCount = pagination.totalItems || 1000;
                    setPageSize(allCount);
                    fetchList({ search, page: 1, pageSize: allCount });
                  } else {
                    const next = Number(v);
                    setPageSize(next);
                    fetchList({ search, page: 1, pageSize: next });
                  }
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="ALL">{locale === 'ar' ? 'الكل' : 'All'}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'يمكنك التصفح عبر الصفحات أيضاً' : 'You can also navigate pages'}
              </p>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 self-end">
              {locale === 'ar'
                ? `الإجمالي: ${pagination.totalItems}`
                : `Total: ${pagination.totalItems}`}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">HS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الدولة' : 'Country'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النسبة' : 'Rate'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'بدء النفاذ' : 'Effective'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لا توجد بيانات' : 'No data'}
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.hs_code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? r.hs_description_ar || '-' : r.hs_description_en || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.country_code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.duty_rate_percent}%</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.effective_from}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.rule_type || 'DUTY'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>

                        {canEdit && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditing(r);
                              setEditFormData({
                                hs_code: r.hs_code || '',
                                country_code: r.country_code || 'SA',
                                duty_rate_percent: String(r.duty_rate_percent ?? ''),
                                effective_from: r.effective_from || '',
                                effective_to: r.effective_to || '',
                                notes_en: r.notes_en || '',
                                notes_ar: r.notes_ar || '',
                              });
                              setEditOpen(true);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}

                        {canDelete && (
                          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>
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
                onClick={() => fetchList({ page: pagination.currentPage - 1, search, pageSize })}
              >
                {locale === 'ar' ? 'السابق' : 'Prev'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={loading || pagination.currentPage >= pagination.totalPages}
                onClick={() => fetchList({ page: pagination.currentPage + 1, search, pageSize })}
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
            <div className="text-gray-900 dark:text-white font-medium">{selected.hs_code}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{locale === 'ar' ? selected.hs_description_ar || '-' : selected.hs_description_en || '-'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الدولة' : 'Country'}: {selected.country_code}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النوع' : 'Type'}: {selected.rule_type || 'DUTY'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'النسبة' : 'Rate'}: {selected.duty_rate_percent}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'بدء النفاذ' : 'Effective from'}: {selected.effective_from}</div>
            {selected.effective_to && <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'انتهاء النفاذ' : 'Effective to'}: {selected.effective_to}</div>}
            {(selected.notes_en || selected.notes_ar) && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? selected.notes_ar : selected.notes_en}</div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={canEdit && editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        title={locale === 'ar' ? 'تعديل تعريفة' : 'Edit Tariff Rate'}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="HS" value={editFormData.hs_code} onChange={(e) => setEditFormData({ ...editFormData, hs_code: e.target.value })} />
            </div>
            {canPickHsCodes && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setHsPickerTarget('edit');
                  setHsSearch(editFormData.hs_code || '');
                  setHsPickerOpen(true);
                }}
              >
                {locale === 'ar' ? 'اختيار' : 'Pick'}
              </Button>
            )}
          </div>
          <Input label={locale === 'ar' ? 'الدولة' : 'Country'} value={editFormData.country_code} onChange={(e) => setEditFormData({ ...editFormData, country_code: e.target.value })} />
          <Input label={locale === 'ar' ? 'النسبة %' : 'Duty Rate %'} value={editFormData.duty_rate_percent} onChange={(e) => setEditFormData({ ...editFormData, duty_rate_percent: e.target.value })} />
          <Input label={locale === 'ar' ? 'بدء النفاذ' : 'Effective From'} value={editFormData.effective_from} onChange={(e) => setEditFormData({ ...editFormData, effective_from: e.target.value })} />
          <Input label={locale === 'ar' ? 'انتهاء النفاذ (اختياري)' : 'Effective To (optional)'} value={editFormData.effective_to} onChange={(e) => setEditFormData({ ...editFormData, effective_to: e.target.value })} />
          <Input label={locale === 'ar' ? 'ملاحظات (EN)' : 'Notes (EN)'} value={editFormData.notes_en} onChange={(e) => setEditFormData({ ...editFormData, notes_en: e.target.value })} />
          <Input label={locale === 'ar' ? 'ملاحظات (AR)' : 'Notes (AR)'} value={editFormData.notes_ar} onChange={(e) => setEditFormData({ ...editFormData, notes_ar: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              loading={loading}
              onClick={async () => {
                if (!editing) return;
                const duty = Number(editFormData.duty_rate_percent);
                const payload = {
                  hs_code: editFormData.hs_code.trim(),
                  country_code: editFormData.country_code.trim(),
                  duty_rate_percent: duty,
                  effective_from: editFormData.effective_from,
                  effective_to: editFormData.effective_to || null,
                  notes_en: editFormData.notes_en || null,
                  notes_ar: editFormData.notes_ar || null,
                };

                if (!payload.hs_code || !payload.country_code || !payload.effective_from || !Number.isFinite(payload.duty_rate_percent)) {
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

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'تعريفة جديدة' : 'New Tariff Rate'} size="md">
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="HS" value={formData.hs_code} onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })} />
            </div>
            {canPickHsCodes && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setHsPickerTarget('create');
                  setHsSearch(formData.hs_code || '');
                  setHsPickerOpen(true);
                }}
              >
                {locale === 'ar' ? 'اختيار' : 'Pick'}
              </Button>
            )}
          </div>
          <Input label={locale === 'ar' ? 'الدولة' : 'Country'} value={formData.country_code} onChange={(e) => setFormData({ ...formData, country_code: e.target.value })} />
          <Input label={locale === 'ar' ? 'النسبة %' : 'Duty Rate %'} value={formData.duty_rate_percent} onChange={(e) => setFormData({ ...formData, duty_rate_percent: e.target.value })} />
          <Input label={locale === 'ar' ? 'بدء النفاذ' : 'Effective From'} value={formData.effective_from} onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })} />
          <Input label={locale === 'ar' ? 'انتهاء النفاذ (اختياري)' : 'Effective To (optional)'} value={formData.effective_to} onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })} />
          <Input label={locale === 'ar' ? 'ملاحظات (EN)' : 'Notes (EN)'} value={formData.notes_en} onChange={(e) => setFormData({ ...formData, notes_en: e.target.value })} />
          <Input label={locale === 'ar' ? 'ملاحظات (AR)' : 'Notes (AR)'} value={formData.notes_ar} onChange={(e) => setFormData({ ...formData, notes_ar: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              loading={loading}
              onClick={async () => {
                const duty = Number(formData.duty_rate_percent);
                const payload = {
                  hs_code: formData.hs_code.trim(),
                  country_code: formData.country_code.trim(),
                  duty_rate_percent: duty,
                  effective_from: formData.effective_from,
                  effective_to: formData.effective_to || null,
                  notes_en: formData.notes_en || null,
                  notes_ar: formData.notes_ar || null,
                };

                if (!payload.hs_code || !payload.country_code || !payload.effective_from || !Number.isFinite(payload.duty_rate_percent)) {
                  showToast(locale === 'ar' ? 'الرجاء تعبئة جميع الحقول' : 'Please fill all fields', 'error');
                  return;
                }

                const created = await create(payload as any);
                if (created) {
                  setFormData({ hs_code: '', country_code: 'SA', duty_rate_percent: '5', effective_from: '2025-01-01', effective_to: '', notes_en: '', notes_ar: '' });
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

      <Modal
        isOpen={hsPickerOpen}
        onClose={() => setHsPickerOpen(false)}
        title={locale === 'ar' ? 'اختيار رمز HS' : 'Pick HS Code'}
        size="lg"
      >
        <div className="space-y-3">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={hsSearch}
            onChange={(e) => setHsSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'رمز أو وصف...' : 'Code or description...'}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {locale === 'ar' ? 'عدد الصفوف' : 'Rows'}
              </div>
              <select
                className="input"
                value={String(hsPageSize)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setHsPageSize(next);
                  fetchHsCodes({ search: hsSearch, page: 1, pageSize: next, filters: { is_active: true } });
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {locale === 'ar'
                ? `الصفحة ${hsPagination.currentPage} من ${hsPagination.totalPages}`
                : `Page ${hsPagination.currentPage} of ${hsPagination.totalPages}`}
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">HS</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {hsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : hsCodes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'لا توجد نتائج' : 'No results'}
                    </td>
                  </tr>
                ) : (
                  hsCodes.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{r.code}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        {locale === 'ar' ? r.description_ar : r.description_en}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (hsPickerTarget === 'create') {
                              setFormData((prev) => ({ ...prev, hs_code: r.code }));
                            } else {
                              setEditFormData((prev) => ({ ...prev, hs_code: r.code }));
                            }
                            setHsPickerOpen(false);
                          }}
                        >
                          {locale === 'ar' ? 'اختيار' : 'Select'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={hsLoading || hsPagination.currentPage <= 1}
              onClick={() =>
                fetchHsCodes({
                  search: hsSearch,
                  page: hsPagination.currentPage - 1,
                  pageSize: hsPageSize,
                  filters: { is_active: true },
                })
              }
            >
              {locale === 'ar' ? 'السابق' : 'Prev'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={hsLoading || hsPagination.currentPage >= hsPagination.totalPages}
              onClick={() =>
                fetchHsCodes({
                  search: hsSearch,
                  page: hsPagination.currentPage + 1,
                  pageSize: hsPageSize,
                  filters: { is_active: true },
                })
              }
            >
              {locale === 'ar' ? 'التالي' : 'Next'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
