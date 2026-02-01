import { useEffect, useMemo, useRef, useState } from 'react';
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
import apiClient from '../../lib/apiClient';
import {
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type BankStatus = 'active' | 'inactive';

interface Bank {
  id: number;
  code: string;
  name: string;
  name_ar?: string | null;
  swift_code?: string | null;
  country_name?: string | null;
  country_name_ar?: string | null;
  is_active: boolean;
}

export default function BanksPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, MenuPermissions.MasterData.Banks.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, MenuPermissions.MasterData.Banks.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, MenuPermissions.MasterData.Banks.Edit]);

  const hasFetched = useRef(false);
  const [items, setItems] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | BankStatus>('all');
  const [selectedCountry, setSelectedCountry] = useState<'all' | 'Saudi Arabia' | 'UAE'>('all');
  const [selected, setSelected] = useState<Bank | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    swift: '',
    country: 'Saudi Arabia' as 'Saudi Arabia' | 'UAE',
    countryAr: 'السعودية',
    status: 'active' as BankStatus,
  });

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const result: any = await apiClient.get('/api/banks');
      const rows: Bank[] = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.data?.data)
            ? result.data.data
            : [];
      setItems(rows);
    } catch {
      setItems([]);
      showToast(locale === 'ar' ? 'فشل تحميل البنوك' : 'Failed to load banks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const status: BankStatus = i.is_active ? 'active' : 'inactive';
      const country = i.country_name || '';
      const sOk = selectedStatus === 'all' || status === selectedStatus;
      const cOk = selectedCountry === 'all' || country === selectedCountry;
      return sOk && cOk;
    });
  }, [items, selectedStatus, selectedCountry]);

  const totalCount = items.length;
  const activeCount = items.filter(i => i.is_active).length;
  const countryCount = new Set(items.map(i => i.country_name || '')).size;

  const getStatusBadge = (status: BankStatus) => {
    const styles: Record<BankStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<BankStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      try {
        await apiClient.post('/api/banks', {
          code: formData.code,
          name: formData.name,
          name_ar: formData.nameAr || null,
          swift_code: formData.swift || null,
          country_id: null,
          is_active: formData.status === 'active',
        });
        showToast(locale === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully', 'success');
        setCreateOpen(false);
        setFormData({ code: '', name: '', nameAr: '', swift: '', country: 'Saudi Arabia', countryAr: 'السعودية', status: 'active' });
        await fetchBanks();
      } catch {
        showToast(locale === 'ar' ? 'فشل إنشاء البنك' : 'Failed to create bank', 'error');
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleToggleActive = async (bank: Bank, isActive: boolean) => {
    if (!canEdit) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    try {
      await apiClient.put(`/api/banks/${bank.id}`, { is_active: isActive });
      showToast(locale === 'ar' ? 'تم التحديث' : 'Updated', 'success');
      await fetchBanks();
      setSelected(null);
    } catch {
      showToast(locale === 'ar' ? 'فشل التحديث' : 'Failed to update', 'error');
    }
  };

  const requestDelete = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/banks/${deletingId}`);
      showToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
      setConfirmOpen(false);
      setDeletingId(null);
      setSelected(null);
      await fetchBanks();
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
          <title>{locale === 'ar' ? 'البنوك - SLMS' : 'Banks - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <BanknotesIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض البنوك.' : "You don't have permission to view banks."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'البنوك - SLMS' : 'Banks - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'البنوك' : 'Banks'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة البنوك وأكواد SWIFT' : 'Manage banks and SWIFT codes'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'بنك جديد' : 'New Bank'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{loading ? '—' : activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الدول' : 'Countries'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : countryCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الدول' : 'All countries'}</option>
                <option value="Saudi Arabia">{locale === 'ar' ? 'السعودية' : 'Saudi Arabia'}</option>
                <option value="UAE">{locale === 'ar' ? 'الإمارات' : 'UAE'}</option>
              </select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SWIFT</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الدولة' : 'Country'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? (i.name_ar || i.name) : i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{i.swift_code || ''}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? (i.country_name_ar || i.country_name || '') : (i.country_name || '')}</td>
                    <td className="px-4 py-3">{getStatusBadge(i.is_active ? 'active' : 'inactive')}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(i)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل البنك' : 'Bank Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.code}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? (selected.name_ar || selected.name) : selected.name}</p>
              </div>
              {getStatusBadge(selected.is_active ? 'active' : 'inactive')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">SWIFT</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.swift_code || '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الدولة' : 'Country'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? (selected.country_name_ar || selected.country_name || '—') : (selected.country_name || '—')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              {canEdit && (
                <>
                  <Button onClick={() => void handleToggleActive(selected, true)}>
                    <CheckCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تفعيل' : 'Activate'}
                  </Button>
                  <Button variant="danger" onClick={() => void handleToggleActive(selected, false)}>
                    <XCircleIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'تعطيل' : 'Deactivate'}
                  </Button>
                  <Button variant="danger" onClick={() => requestDelete(selected.id)}>
                    <TrashIcon className="h-4 w-4" />
                    {locale === 'ar' ? 'حذف' : 'Delete'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          if (isDeleting) return;
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف بنك' : 'Delete Bank'}
        message={locale === 'ar' ? 'سيتم حذف هذا البنك. لا يمكن التراجع عن هذا الإجراء.' : 'This bank will be deleted. This action cannot be undone.'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={isDeleting}
      />

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'بنك جديد' : 'New Bank'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="NCB" />
            <Input label="SWIFT" value={formData.swift} onChange={(e) => setFormData({ ...formData, swift: e.target.value })} placeholder="XXXXXXXX" />
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الدولة' : 'Country'}</label>
              <select
                value={formData.country}
                onChange={(e) => {
                  const nextCountry = e.target.value as any;
                  setFormData({
                    ...formData,
                    country: nextCountry,
                    countryAr: nextCountry === 'Saudi Arabia' ? 'السعودية' : 'الإمارات',
                  });
                }}
                className="input"
              >
                <option value="Saudi Arabia">{locale === 'ar' ? 'السعودية' : 'Saudi Arabia'}</option>
                <option value="UAE">{locale === 'ar' ? 'الإمارات' : 'UAE'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate} loading={isSubmitting}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
