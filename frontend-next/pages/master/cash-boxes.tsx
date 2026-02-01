import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Card from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import apiClient from '../../lib/apiClient';
import {
  BanknotesIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CashBox {
  id: number;
  code: string;
  name: string;
  name_ar?: string | null;
  currency_code: string;
  gl_account_code: string;
  opening_balance: number;
  current_balance: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

type CashBoxFormData = {
  code: string;
  name: string;
  name_ar: string;
  currency_code: string;
  gl_account_code: string;
  is_default: boolean;
  is_active: boolean;
  notes: string;
};

export default function CashBoxesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Finance.CashBoxes.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Finance.CashBoxes.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Finance.CashBoxes.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.Finance.CashBoxes.Delete]);

  const hasFetched = useRef(false);

  const [items, setItems] = useState<CashBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CashBox | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<CashBoxFormData>({
    code: '',
    name: '',
    name_ar: '',
    currency_code: 'SAR',
    gl_account_code: '',
    is_default: false,
    is_active: true,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result: any = await apiClient.get('/api/cash-boxes');
      const rows: CashBox[] = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.data?.data)
            ? result.data.data
            : [];
      setItems(rows);
    } catch {
      setItems([]);
      showToast(t('common.failedToLoad', 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => {
      const hay = [i.code, i.name, i.name_ar || '', i.gl_account_code, i.currency_code].join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [items, searchTerm]);

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (!formData.code.trim()) next.code = t('validation.required');
    if (!formData.name.trim()) next.name = t('validation.required');
    if (!formData.gl_account_code.trim()) next.gl_account_code = t('validation.required');
    if (!formData.currency_code.trim()) next.currency_code = t('validation.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    resetForm();
    setEditingItem(null);
    setShowModal(true);
  };

  const openEdit = (item: CashBox) => {
    if (!canEdit) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      currency_code: item.currency_code,
      gl_account_code: item.gl_account_code,
      is_default: item.is_default,
      is_active: item.is_active,
      notes: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      currency_code: 'SAR',
      gl_account_code: '',
      is_default: false,
      is_active: true,
      notes: '',
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar || undefined,
        currency_code: formData.currency_code,
        gl_account_code: formData.gl_account_code,
        is_default: formData.is_default,
        is_active: formData.is_active,
        notes: formData.notes || undefined,
      };

      if (editingItem) {
        await apiClient.put(`/api/cash-boxes/${editingItem.id}`, payload);
      } else {
        await apiClient.post('/api/cash-boxes', payload);
      }

      showToast(t('common.success'), 'success');
      setShowModal(false);
      resetForm();
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل الحفظ' : 'Failed to save', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find((i) => i.id === deletingId);
    if (item?.is_default) {
      showToast(locale === 'ar' ? 'لا يمكن حذف الافتراضي' : 'Cannot delete default', 'error');
      setConfirmOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/cash-boxes/${deletingId}`);
      showToast(t('common.deleted', 'Deleted'), 'success');
      setConfirmOpen(false);
      setDeletingId(null);
      await fetchData();
    } catch {
      showToast(locale === 'ar' ? 'فشل الحذف' : 'Failed to delete', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'الصناديق - SLMS' : 'Cash Boxes - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <BanknotesIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض الصناديق.' : "You don't have permission to view cash boxes."}
          </p>
        </div>
      </MainLayout>
    );
  }

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.is_active).length;
  const defaultCount = items.filter((i) => i.is_default).length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الصناديق - SLMS' : 'Cash Boxes - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'الصناديق' : 'Cash Boxes'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'إدارة الصناديق وربطها بشجرة الحسابات'
                  : 'Manage cash boxes linked to the chart of accounts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void fetchData()}>
              <ArrowPathIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            {canCreate && (
              <Button onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                {locale === 'ar' ? 'صندوق جديد' : 'New Cash Box'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
              </div>
              <EyeIconSafe />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
              </div>
              <CheckBadgeIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'افتراضي' : 'Default'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{defaultCount}</p>
              </div>
              <BanknotesIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={locale === 'ar' ? 'بحث بالكود/الاسم/الحساب...' : 'Search by code/name/account...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? `عرض ${filtered.length} من ${items.length}` : `Showing ${filtered.length} of ${items.length}`}
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الكود' : 'Code'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الحساب' : 'GL Account'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'العملة' : 'Currency'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                      {t('common.loading', 'Loading...')}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                      {locale === 'ar' ? 'لا توجد بيانات' : 'No data'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{item.code}</span>
                          {item.is_default && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {locale === 'ar' ? 'افتراضي' : 'Default'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                        <div>
                          <div className="font-medium">{locale === 'ar' ? item.name_ar || item.name : item.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? item.name : item.name_ar || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{item.gl_account_code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{item.currency_code}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.is_active ? (
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300')}>
                            <CheckBadgeIcon className="h-4 w-4" />
                            {locale === 'ar' ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')}>
                            <XCircleIcon className="h-4 w-4" />
                            {locale === 'ar' ? 'غير نشط' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="inline-flex gap-2">
                          {canEdit && (
                            <button
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              onClick={() => openEdit(item)}
                              aria-label={locale === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => requestDelete(item.id)}
                              aria-label={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingItem ? (locale === 'ar' ? 'تعديل صندوق' : 'Edit Cash Box') : (locale === 'ar' ? 'صندوق جديد' : 'New Cash Box')}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'الكود *' : 'Code *'}
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                error={errors.code}
                disabled={Boolean(editingItem)}
              />
              <Input
                label={locale === 'ar' ? 'العملة *' : 'Currency *'}
                value={formData.currency_code}
                onChange={(e) => setFormData((p) => ({ ...p, currency_code: e.target.value }))}
                error={errors.currency_code}
                helperText={locale === 'ar' ? 'مثال: SAR' : 'Example: SAR'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'الاسم (EN) *' : 'Name (EN) *'}
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                error={errors.name}
              />
              <Input
                label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'}
                value={formData.name_ar}
                onChange={(e) => setFormData((p) => ({ ...p, name_ar: e.target.value }))}
              />
            </div>

            <Input
              label={locale === 'ar' ? 'كود الحساب في شجرة الحسابات *' : 'GL Account Code (COA) *'}
              value={formData.gl_account_code}
              onChange={(e) => setFormData((p) => ({ ...p, gl_account_code: e.target.value }))}
              error={errors.gl_account_code}
              helperText={locale === 'ar' ? 'مثال: 1111' : 'Example: 1111'}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData((p) => ({ ...p, is_default: e.target.checked }))}
                />
                {locale === 'ar' ? 'تعيين كافتراضي' : 'Set as default'}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                />
                {locale === 'ar' ? 'نشط' : 'Active'}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSubmit} loading={isSubmitting}>
                {locale === 'ar' ? 'حفظ' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleDelete}
          title={locale === 'ar' ? 'حذف صندوق' : 'Delete Cash Box'}
          message={locale === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'This action cannot be undone.'}
          confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
          variant="danger"
          loading={isDeleting}
        />
      </div>
    </MainLayout>
  );
}

function EyeIconSafe() {
  return <BanknotesIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />;
}
