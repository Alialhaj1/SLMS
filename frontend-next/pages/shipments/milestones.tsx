import { useEffect, useMemo, useState } from 'react';
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
import { useMasterData } from '../../hooks/useMasterData';
import {
  CalendarDaysIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

type ShipmentMilestoneRow = {
  id: number;
  shipmentRef: string;
  origin?: string;
  destination?: string;
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  status: 'created' | 'booked' | 'shipped' | 'arrived' | 'under_clearance' | 'released' | 'delivered' | 'closed';
};

type ShipmentMilestoneApi = {
  id: number;
  shipment_reference: string;
  origin: string | null;
  destination: string | null;
  status: string | null;
  etd_planned: string | null;
  eta_planned: string | null;
  atd_actual: string | null;
  ata_actual: string | null;
  notes: string | null;
};

const toYmd = (value?: string | null) => {
  if (!value) return undefined;
  // API may return ISO timestamps; inputs expect YYYY-MM-DD
  return value.length >= 10 ? value.slice(0, 10) : value;
};

const normalizeStatus = (value?: string | null): ShipmentMilestoneRow['status'] => {
  const v = (value || '').toLowerCase();
  const allowed: ShipmentMilestoneRow['status'][] = [
    'created',
    'booked',
    'shipped',
    'arrived',
    'under_clearance',
    'released',
    'delivered',
    'closed',
  ];
  return (allowed.includes(v as any) ? (v as any) : 'created') as ShipmentMilestoneRow['status'];
};

const parseDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const diffDays = (a?: string, b?: string) => {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return null;
  const ms = db.getTime() - da.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export default function ShipmentMilestonesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentMilestones.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.ShipmentMilestones.Manage]);

  const title = t('menu.logistics.shipmentManagement.milestones');

  const { data, loading, fetchList, create, update, remove } = useMasterData<ShipmentMilestoneApi>({
    endpoint: '/api/shipment-milestones',
  });

  const items: ShipmentMilestoneRow[] = useMemo(() => {
    return (data || []).map((r) => ({
      id: r.id,
      shipmentRef: r.shipment_reference,
      origin: r.origin || undefined,
      destination: r.destination || undefined,
      status: normalizeStatus(r.status),
      etd: toYmd(r.etd_planned),
      eta: toYmd(r.eta_planned),
      atd: toYmd(r.atd_actual),
      ata: toYmd(r.ata_actual),
    }));
  }, [data]);

  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editing, setEditing] = useState<ShipmentMilestoneRow | null>(null);
  const [deleting, setDeleting] = useState<ShipmentMilestoneRow | null>(null);

  const [form, setForm] = useState({
    shipmentRef: '',
    origin: '',
    destination: '',
    status: 'created' as ShipmentMilestoneRow['status'],
    etd: '',
    eta: '',
    atd: '',
    ata: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ shipmentRef: '', origin: '', destination: '', status: 'created', etd: '', eta: '', atd: '', ata: '' });
    setIsModalOpen(true);
  };

  const openEdit = (row: ShipmentMilestoneRow) => {
    setEditing(row);
    setForm({
      shipmentRef: row.shipmentRef,
      origin: row.origin || '',
      destination: row.destination || '',
      status: row.status,
      etd: row.etd || '',
      eta: row.eta || '',
      atd: row.atd || '',
      ata: row.ata || '',
    });
    setIsModalOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (!q) return true;
      return (
        r.shipmentRef.toLowerCase().includes(q) ||
        (r.origin || '').toLowerCase().includes(q) ||
        (r.destination || '').toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
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

  const statusLabel = (status: ShipmentMilestoneRow['status']) => {
    const map: Record<ShipmentMilestoneRow['status'], { en: string; ar: string }> = {
      created: { en: 'Created', ar: 'تم الإنشاء' },
      booked: { en: 'Booked', ar: 'تم الحجز' },
      shipped: { en: 'Shipped', ar: 'تم الشحن' },
      arrived: { en: 'Arrived', ar: 'وصلت' },
      under_clearance: { en: 'Under Clearance', ar: 'تحت التخليص' },
      released: { en: 'Released', ar: 'تم الإفراج' },
      delivered: { en: 'Delivered', ar: 'تم التسليم' },
      closed: { en: 'Closed', ar: 'مقفلة' },
    };
    return locale === 'ar' ? map[status].ar : map[status].en;
  };

  const validate = () => {
    if (!form.shipmentRef.trim()) {
      showToast(locale === 'ar' ? 'رقم الشحنة مطلوب' : 'Shipment reference is required', 'error');
      return false;
    }

    const dateFields: Array<[string, string]> = [
      ['ETD', form.etd],
      ['ETA', form.eta],
      ['ATD', form.atd],
      ['ATA', form.ata],
    ];

    for (const [label, value] of dateFields) {
      if (!value) continue;
      if (!parseDate(value)) {
        showToast(
          locale === 'ar' ? `تاريخ غير صالح: ${label}` : `Invalid date: ${label}`,
          'error'
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (!validate()) return;

    const payload = {
      shipment_reference: form.shipmentRef.trim(),
      origin: form.origin.trim() || null,
      destination: form.destination.trim() || null,
      status: form.status,
      etd_planned: form.etd || null,
      eta_planned: form.eta || null,
      atd_actual: form.atd || null,
      ata_actual: form.ata || null,
    };

    if (editing) {
      const result = await update(editing.id, payload);
      if (!result) return;
    } else {
      const result = await create(payload);
      if (!result) return;
    }

    setEditing(null);
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!canManage || !deleting) return;
    const ok = await remove(deleting.id);
    if (!ok) return;
    setDeleting(null);
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <CalendarDaysIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
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
              <CalendarDaysIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'إدارة تواريخ الشحن (ETD/ETA/ATD/ATA) ومقارنة المخطط بالفعلي'
                  : 'Manage shipment dates (ETD/ETA/ATD/ATA) and compare planned vs actual'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالشحنة/الحالة...' : 'Search by shipment/status...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ETD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ETA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ATD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ATA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'فرق الوصول' : 'ETA vs ATA'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => {
                const variance = diffDays(r.eta, r.ata);
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.shipmentRef}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.etd || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.eta || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.atd || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.ata || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{variance === null ? '-' : `${variance} ${locale === 'ar' ? 'يوم' : 'days'}`}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{statusLabel(r.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'عرض' : 'View', 'info')}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                              <PencilSquareIcon className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={canManage && isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
          setForm({ shipmentRef: '', origin: '', destination: '', status: 'created', etd: '', eta: '', atd: '', ata: '' });
        }}
        title={locale === 'ar' ? (editing ? 'تعديل' : 'إضافة') : (editing ? 'Edit' : 'Add')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={locale === 'ar' ? 'رقم الشحنة' : 'Shipment Ref'}
              value={form.shipmentRef}
              onChange={(e) => setForm((p) => ({ ...p, shipmentRef: e.target.value }))}
              placeholder="SHP-..."
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                className="input"
              >
                <option value="created">{statusLabel('created')}</option>
                <option value="booked">{statusLabel('booked')}</option>
                <option value="shipped">{statusLabel('shipped')}</option>
                <option value="arrived">{statusLabel('arrived')}</option>
                <option value="under_clearance">{statusLabel('under_clearance')}</option>
                <option value="released">{statusLabel('released')}</option>
                <option value="delivered">{statusLabel('delivered')}</option>
                <option value="closed">{statusLabel('closed')}</option>
              </select>
            </div>
            <Input
              label={locale === 'ar' ? 'المنشأ' : 'Origin'}
              value={form.origin}
              onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))}
              placeholder={locale === 'ar' ? 'مثال: شنغهاي' : 'e.g., Shanghai'}
            />
            <Input
              label={locale === 'ar' ? 'الوجهة' : 'Destination'}
              value={form.destination}
              onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
              placeholder={locale === 'ar' ? 'مثال: جدة' : 'e.g., Jeddah'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ETD"
              value={form.etd}
              onChange={(e) => setForm((p) => ({ ...p, etd: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="ETA"
              value={form.eta}
              onChange={(e) => setForm((p) => ({ ...p, eta: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="ATD"
              value={form.atd}
              onChange={(e) => setForm((p) => ({ ...p, atd: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="ATA"
              value={form.ata}
              onChange={(e) => setForm((p) => ({ ...p, ata: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setIsModalOpen(false);
                setEditing(null);
                setForm({ shipmentRef: '', origin: '', destination: '', status: 'created', etd: '', eta: '', atd: '', ata: '' });
              }}
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button fullWidth onClick={handleSave} loading={loading}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={loading}
        title={locale === 'ar' ? 'حذف' : 'Delete'}
        message={
          locale === 'ar'
            ? `هل أنت متأكد من حذف سجل الشحنة "${deleting?.shipmentRef}"؟` 
            : `Are you sure you want to delete "${deleting?.shipmentRef}"?`
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
      />
    </MainLayout>
  );
}
