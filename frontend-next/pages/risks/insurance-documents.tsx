import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ShieldCheckIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type PolicyStatus = 'active' | 'expired' | 'cancelled';
type PolicyType = 'cargo' | 'vehicle' | 'liability';

interface InsurancePolicy {
  id: number;
  policyNumber: string;
  provider: string;
  providerAr: string;
  type: PolicyType;
  startDate: string;
  endDate: string;
  premiumSar: number;
  status: PolicyStatus;
}

const mockPolicies: InsurancePolicy[] = [
  { id: 1, policyNumber: 'POL-CAR-2025-001', provider: 'National Insurance', providerAr: 'التأمين الوطني', type: 'cargo', startDate: '2025-01-01', endDate: '2025-12-31', premiumSar: 180000, status: 'active' },
  { id: 2, policyNumber: 'POL-VEH-2024-112', provider: 'Gulf Protect', providerAr: 'حماية الخليج', type: 'vehicle', startDate: '2024-07-01', endDate: '2025-06-30', premiumSar: 95000, status: 'active' },
  { id: 3, policyNumber: 'POL-LIA-2023-009', provider: 'Secure Cover', providerAr: 'غطاء آمن', type: 'liability', startDate: '2023-01-01', endDate: '2023-12-31', premiumSar: 42000, status: 'expired' },
];

const daysUntil = (dateIso: string) => {
  const target = new Date(dateIso + 'T00:00:00');
  const now = new Date();
  const diffMs = target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export default function InsuranceDocumentsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Risks.View, MenuPermissions.Risks.InsuranceDocuments.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Risks.Create, MenuPermissions.Risks.InsuranceDocuments.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Risks.Edit, MenuPermissions.Risks.InsuranceDocuments.Edit]);

  const [items] = useState<InsurancePolicy[]>(mockPolicies);
  const [selectedStatus, setSelectedStatus] = useState<'all' | PolicyStatus>('all');
  const [selectedType, setSelectedType] = useState<'all' | PolicyType>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring_30' | 'expired'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InsurancePolicy | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    policyNumber: '',
    provider: '',
    providerAr: '',
    type: 'cargo' as PolicyType,
    startDate: '',
    endDate: '',
    premiumSar: '0',
    status: 'active' as PolicyStatus,
  });

  const typeLabel = (t: PolicyType) => {
    const labels: Record<PolicyType, { en: string; ar: string }> = {
      cargo: { en: 'Cargo', ar: 'بضائع' },
      vehicle: { en: 'Vehicle', ar: 'مركبات' },
      liability: { en: 'Liability', ar: 'مسؤولية' },
    };
    return locale === 'ar' ? labels[t].ar : labels[t].en;
  };

  const statusBadge = (s: PolicyStatus) => {
    const styles: Record<PolicyStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<PolicyStatus, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'ساري' },
      expired: { en: 'Expired', ar: 'منتهي' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>
        {locale === 'ar' ? labels[s].ar : labels[s].en}
      </span>
    );
  };

  const expiryPill = (endDate: string) => {
    const d = daysUntil(endDate);
    if (d < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <XCircleIcon className="h-4 w-4" />
          {locale === 'ar' ? 'منتهي' : 'Expired'}
        </span>
      );
    }
    if (d <= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {locale === 'ar' ? `متبقي ${d} يوم` : `${d} days left`}
        </span>
      );
    }
    return <span className="text-xs text-gray-500">{locale === 'ar' ? `متبقي ${d} يوم` : `${d} days left`}</span>;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      const sOk = selectedStatus === 'all' || p.status === selectedStatus;
      const tOk = selectedType === 'all' || p.type === selectedType;

      const days = daysUntil(p.endDate);
      const expOk =
        expiryFilter === 'all' ||
        (expiryFilter === 'expired' && days < 0) ||
        (expiryFilter === 'expiring_30' && days >= 0 && days <= 30);

      const qOk =
        !q ||
        p.policyNumber.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q) ||
        p.providerAr.toLowerCase().includes(q);

      return sOk && tOk && expOk && qOk;
    });
  }, [items, selectedStatus, selectedType, expiryFilter, search]);

  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'active').length;
  const expiringSoonCount = items.filter((i) => i.status === 'active' && daysUntil(i.endDate) >= 0 && daysUntil(i.endDate) <= 30).length;

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تمت إضافة الوثيقة (تجريبي)' : 'Document added (demo)', 'success');
    setCreateOpen(false);
    setFormData({ policyNumber: '', provider: '', providerAr: '', type: 'cargo', startDate: '', endDate: '', premiumSar: '0', status: 'active' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'وثائق التأمين - SLMS' : 'Insurance Documents - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض وثائق التأمين.' : "You don't have permission to view insurance documents."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'وثائق التأمين - SLMS' : 'Insurance Documents - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'وثائق التأمين' : 'Insurance Documents'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متابعة الوثائق والمواعيد النهائية للتجديد' : 'Track policies and renewal deadlines'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'وثيقة جديدة' : 'New Document'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ساري' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تنتهي خلال 30 يوم' : 'Expiring in 30 days'}</p>
            <p className="text-2xl font-bold text-amber-600">{expiringSoonCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-72">
                <Input
                  label={locale === 'ar' ? 'بحث' : 'Search'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === 'ar' ? 'بحث برقم الوثيقة أو شركة التأمين...' : 'Search by policy number or provider...'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="cargo">{locale === 'ar' ? 'بضائع' : 'Cargo'}</option>
                  <option value="vehicle">{locale === 'ar' ? 'مركبات' : 'Vehicle'}</option>
                  <option value="liability">{locale === 'ar' ? 'مسؤولية' : 'Liability'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الانتهاء' : 'Expiry'}</label>
                <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="expiring_30">{locale === 'ar' ? 'خلال 30 يوم' : 'Within 30 days'}</option>
                  <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                  <option value="active">{locale === 'ar' ? 'ساري' : 'Active'}</option>
                  <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                  <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                </select>
              </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم الوثيقة' : 'Policy #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'شركة التأمين' : 'Provider'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البداية' : 'Start'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النهاية' : 'End'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القسط (ر.س)' : 'Premium (SAR)'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{p.policyNumber}</span>
                        <span className="mt-0.5">{expiryPill(p.endDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? p.providerAr : p.provider}</td>
                    <td className="px-4 py-3 text-gray-500">{typeLabel(p.type)}</td>
                    <td className="px-4 py-3 text-gray-500">{p.startDate}</td>
                    <td className="px-4 py-3 text-gray-500">{p.endDate}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{p.premiumSar.toLocaleString()}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(p)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل وثيقة التأمين' : 'Insurance Policy Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.policyNumber}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.providerAr : selected.provider}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{typeLabel(selected.type)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القسط (ر.س)' : 'Premium (SAR)'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.premiumSar.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'البداية' : 'Start Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.startDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النهاية' : 'End Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.endDate}</p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
                <Button onClick={() => showToast(locale === 'ar' ? 'تم التجديد (تجريبي)' : 'Renewed (demo)', 'success')}>
                  <ArrowPathIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تجديد' : 'Renew'}
                </Button>
                <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإلغاء (تجريبي)' : 'Cancelled (demo)', 'error')}>
                  <XCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'وثيقة تأمين جديدة' : 'New Insurance Document'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'رقم الوثيقة' : 'Policy Number'} value={formData.policyNumber} onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })} placeholder="POL-CAR-2026-001" />
            <Input label={locale === 'ar' ? 'القسط (ر.س)' : 'Premium (SAR)'} value={formData.premiumSar} onChange={(e) => setFormData({ ...formData, premiumSar: e.target.value })} placeholder="50000" />
            <Input label={locale === 'ar' ? 'شركة التأمين (EN)' : 'Provider (EN)'} value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} />
            <Input label={locale === 'ar' ? 'شركة التأمين (AR)' : 'Provider (AR)'} value={formData.providerAr} onChange={(e) => setFormData({ ...formData, providerAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="input">
                <option value="cargo">{locale === 'ar' ? 'بضائع' : 'Cargo'}</option>
                <option value="vehicle">{locale === 'ar' ? 'مركبات' : 'Vehicle'}</option>
                <option value="liability">{locale === 'ar' ? 'مسؤولية' : 'Liability'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'ساري' : 'Active'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
                <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'تاريخ البداية' : 'Start Date'} type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ النهاية' : 'End Date'} type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
