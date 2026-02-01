import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { useMasterData } from '../../hooks/useMasterData';
import { CurrencyDollarIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

type CarrierQuote = {
  id: number;
  carrier: string;
  origin: string;
  destination: string;
  serviceLevel: 'standard' | 'express';
  transitDays: number;
  amount: number;
  currency: 'SAR' | 'USD' | 'EUR';
  validUntil: string; // YYYY-MM-DD
  notes?: string;
};

type CarrierQuoteApi = {
  id: number;
  carrier: string;
  origin: string;
  destination: string;
  service_level: 'standard' | 'express';
  transit_days: number;
  amount: number;
  currency: string;
  valid_until: string;
  notes: string | null;
};

type CarrierQuoteForm = Omit<CarrierQuote, 'id'> & { id?: number };

const toYmd = (value?: string | null) => {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
};

export default function CarrierQuotesPage() {
  const { t, locale } = useTranslation();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.CarrierQuotes.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.CarrierQuotes.Manage]);

  const title = t('menu.logistics.shipmentManagement.carrierQuotes');

  const { data, loading, fetchList, create, update, remove } = useMasterData<CarrierQuoteApi>({
    endpoint: '/api/carrier-quotes',
  });

  const items: CarrierQuote[] = useMemo(() => {
    return (data || []).map((r) => ({
      id: r.id,
      carrier: r.carrier,
      origin: r.origin,
      destination: r.destination,
      serviceLevel: r.service_level,
      transitDays: r.transit_days,
      amount: r.amount,
      currency: (r.currency?.toUpperCase?.() || 'SAR') as CarrierQuote['currency'],
      validUntil: toYmd(r.valid_until),
      notes: r.notes || undefined,
    }));
  }, [data]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CarrierQuoteForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (!q) return true;
      return (
        r.carrier.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  useEffect(() => {
    if (!canView) return;
    const handle = setTimeout(() => {
      fetchList({ page: 1, pageSize: 100, search });
    }, 250);
    return () => clearTimeout(handle);
  }, [canView, fetchList, search]);

  const openCreate = () => {
    setErrors({});
    setEditing({
      carrier: '',
      origin: '',
      destination: '',
      serviceLevel: 'standard',
      transitDays: 7,
      amount: 0,
      currency: 'SAR',
      validUntil: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (row: CarrierQuote) => {
    setErrors({});
    setEditing({ ...row });
    setIsModalOpen(true);
  };

  const validate = (row: CarrierQuoteForm) => {
    const nextErrors: Record<string, string> = {};
    if (!row.carrier.trim()) nextErrors.carrier = locale === 'ar' ? 'اسم شركة النقل مطلوب' : 'Carrier is required';
    if (!row.origin.trim()) nextErrors.origin = locale === 'ar' ? 'نقطة الانطلاق مطلوبة' : 'Origin is required';
    if (!row.destination.trim()) nextErrors.destination = locale === 'ar' ? 'الوجهة مطلوبة' : 'Destination is required';
    if (!row.validUntil) nextErrors.validUntil = locale === 'ar' ? 'تاريخ الصلاحية مطلوب' : 'Valid until is required';
    if (Number.isNaN(row.amount) || row.amount <= 0) nextErrors.amount = locale === 'ar' ? 'المبلغ يجب أن يكون أكبر من 0' : 'Amount must be > 0';
    if (Number.isNaN(row.transitDays) || row.transitDays <= 0) nextErrors.transitDays = locale === 'ar' ? 'أيام العبور يجب أن تكون أكبر من 0' : 'Transit days must be > 0';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const upsert = async () => {
    if (!editing) return;
    if (!validate(editing)) return;

    const payload = {
      carrier: editing.carrier.trim(),
      origin: editing.origin.trim(),
      destination: editing.destination.trim(),
      service_level: editing.serviceLevel,
      transit_days: editing.transitDays,
      amount: editing.amount,
      currency: editing.currency,
      valid_until: editing.validUntil,
      notes: editing.notes?.trim() || null,
    };

    if (editing.id) {
      const result = await update(editing.id, payload);
      if (!result) return;
    } else {
      const result = await create(payload);
      if (!result) return;
    }

    setIsModalOpen(false);
    setEditing(null);
  };

  const requestDelete = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId == null) return;
    const ok = await remove(deletingId);
    if (!ok) return;
    setConfirmOpen(false);
    setDeletingId(null);
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <CurrencyDollarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
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
              <CurrencyDollarIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'مقارنة عروض شركات النقل'
                  : 'Compare carrier quotes'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة عرض' : 'Add Quote'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'شركة/من/إلى...' : 'Carrier/origin/destination...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'شركة النقل' : 'Carrier'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'من' : 'Origin'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إلى' : 'Destination'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الخدمة' : 'Service'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المدة' : 'Transit'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'السعر' : 'Price'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'صالح حتى' : 'Valid until'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.carrier}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.origin}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.destination}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {r.serviceLevel === 'express' ? (locale === 'ar' ? 'سريع' : 'Express') : (locale === 'ar' ? 'قياسي' : 'Standard')}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.transitDays} {locale === 'ar' ? 'يوم' : 'days'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.amount.toLocaleString()} {r.currency}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.validUntil}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="danger" onClick={() => requestDelete(r.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
          setErrors({});
        }}
        title={locale === 'ar' ? (editing?.id ? 'تعديل عرض' : 'إضافة عرض') : (editing?.id ? 'Edit Quote' : 'Add Quote')}
        size="lg"
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'شركة النقل *' : 'Carrier *'}
                value={editing.carrier}
                onChange={(e) => setEditing({ ...editing, carrier: e.target.value })}
                error={errors.carrier}
              />
              <Input
                label={locale === 'ar' ? 'المبلغ *' : 'Amount *'}
                type="number"
                value={String(editing.amount)}
                onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })}
                error={errors.amount}
              />
              <Input
                label={locale === 'ar' ? 'من *' : 'Origin *'}
                value={editing.origin}
                onChange={(e) => setEditing({ ...editing, origin: e.target.value })}
                error={errors.origin}
              />
              <Input
                label={locale === 'ar' ? 'إلى *' : 'Destination *'}
                value={editing.destination}
                onChange={(e) => setEditing({ ...editing, destination: e.target.value })}
                error={errors.destination}
              />
              <Input
                label={locale === 'ar' ? 'أيام العبور *' : 'Transit days *'}
                type="number"
                value={String(editing.transitDays)}
                onChange={(e) => setEditing({ ...editing, transitDays: Number(e.target.value) })}
                error={errors.transitDays}
              />
              <Input
                label={locale === 'ar' ? 'صالح حتى *' : 'Valid until *'}
                type="date"
                value={editing.validUntil}
                onChange={(e) => setEditing({ ...editing, validUntil: e.target.value })}
                error={errors.validUntil}
              />
              <div className="md:col-span-2">
                <Input
                  label={locale === 'ar' ? 'ملاحظات' : 'Notes'}
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={upsert} loading={loading}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        title={locale === 'ar' ? 'حذف العرض' : 'Delete Quote'}
        message={locale === 'ar' ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Are you sure? This action cannot be undone.'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={loading}
      />
    </MainLayout>
  );
}
