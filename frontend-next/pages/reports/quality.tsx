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
import { CheckBadgeIcon, EyeIcon, ArrowDownTrayIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
type FindingStatus = 'open' | 'in_progress' | 'closed';

interface QualityFinding {
  id: number;
  ref: string;
  area: string;
  areaAr: string;
  severity: FindingSeverity;
  status: FindingStatus;
  date: string;
  inspector: string;
  inspectorAr: string;
  notes: string;
  notesAr: string;
}

const mockFindings: QualityFinding[] = [
  { id: 1, ref: 'QF-2025-0121', area: 'Loading Bay', areaAr: 'منطقة التحميل', severity: 'high', status: 'open', date: '2025-12-05', inspector: 'Quality Team', inspectorAr: 'فريق الجودة', notes: 'Missing pallet labels', notesAr: 'نقص في ملصقات الطبالي' },
  { id: 2, ref: 'QF-2025-0125', area: 'Cold Storage', areaAr: 'التخزين المبرد', severity: 'critical', status: 'in_progress', date: '2025-12-10', inspector: 'QA Supervisor', inspectorAr: 'مشرف الجودة', notes: 'Temperature log gap', notesAr: 'انقطاع في سجل الحرارة' },
  { id: 3, ref: 'QF-2025-0130', area: 'Packing', areaAr: 'التعبئة', severity: 'medium', status: 'closed', date: '2025-12-18', inspector: 'Quality Team', inspectorAr: 'فريق الجودة', notes: 'Damaged cartons reported', notesAr: 'تم الإبلاغ عن تلف كراتين' },
];

export default function QualityReportsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Reports.Quality.View]);
  const canExport = hasAnyPermission([MenuPermissions.Reports.Quality.Export]);

  const [items] = useState<QualityFinding[]>(mockFindings);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<'all' | FindingSeverity>('all');
  const [status, setStatus] = useState<'all' | FindingStatus>('all');
  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');
  const [selected, setSelected] = useState<QualityFinding | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((f) => {
      const sevOk = severity === 'all' || f.severity === severity;
      const stOk = status === 'all' || f.status === status;
      const qOk = !q || f.ref.toLowerCase().includes(q) || f.area.toLowerCase().includes(q) || f.areaAr.toLowerCase().includes(q);
      return sevOk && stOk && qOk;
    });
  }, [items, search, severity, status]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((f) => f.status === 'open').length;
    const critical = filtered.filter((f) => f.severity === 'critical').length;
    const closed = filtered.filter((f) => f.status === 'closed').length;
    return { total, open, critical, closed };
  }, [filtered]);

  const severityBadge = (s: FindingSeverity) => {
    const styles: Record<FindingSeverity, string> = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<FindingSeverity, { en: string; ar: string }> = {
      low: { en: 'Low', ar: 'منخفض' },
      medium: { en: 'Medium', ar: 'متوسط' },
      high: { en: 'High', ar: 'مرتفع' },
      critical: { en: 'Critical', ar: 'حرج' },
    };
    return <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>{locale === 'ar' ? labels[s].ar : labels[s].en}</span>;
  };

  const statusBadge = (s: FindingStatus) => {
    const styles: Record<FindingStatus, string> = {
      open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    const labels: Record<FindingStatus, { en: string; ar: string }> = {
      open: { en: 'Open', ar: 'مفتوح' },
      in_progress: { en: 'In Progress', ar: 'قيد المعالجة' },
      closed: { en: 'Closed', ar: 'مغلق' },
    };
    return <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>{locale === 'ar' ? labels[s].ar : labels[s].en}</span>;
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'تقارير الجودة - SLMS' : 'Quality Reports - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض تقارير الجودة.' : "You don't have permission to view quality reports."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير الجودة - SLMS' : 'Quality Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckBadgeIcon className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'تقارير الجودة' : 'Quality Reports'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متابعة الملاحظات ونتائج التدقيق' : 'Track findings and audit results'}</p>
            </div>
          </div>
          {canExport && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input label={locale === 'ar' ? 'من' : 'From'} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label={locale === 'ar' ? 'إلى' : 'To'} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="open">{locale === 'ar' ? 'مفتوح' : 'Open'}</option>
                <option value="in_progress">{locale === 'ar' ? 'قيد المعالجة' : 'In Progress'}</option>
                <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الخطورة' : 'Severity'}</label>
              <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="low">{locale === 'ar' ? 'منخفض' : 'Low'}</option>
                <option value="medium">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
                <option value="high">{locale === 'ar' ? 'مرتفع' : 'High'}</option>
                <option value="critical">{locale === 'ar' ? 'حرج' : 'Critical'}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 max-w-md">
            <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالمرجع أو المنطقة...' : 'Search by ref or area...'} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مفتوح' : 'Open'}</p>
            <p className="text-2xl font-bold text-red-600">{kpis.open}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'حرج' : 'Critical'}</p>
            <p className="text-2xl font-bold text-red-600">{kpis.critical}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مغلق' : 'Closed'}</p>
            <p className="text-2xl font-bold text-green-600">{kpis.closed}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? `الفترة: ${from} إلى ${to}` : `Period: ${from} to ${to}`}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Ref'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المنطقة' : 'Area'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الخطورة' : 'Severity'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المدقق' : 'Inspector'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.ref}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? f.areaAr : f.area}</td>
                    <td className="px-4 py-3">{severityBadge(f.severity)}</td>
                    <td className="px-4 py-3">{statusBadge(f.status)}</td>
                    <td className="px-4 py-3 text-gray-500">{f.date}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? f.inspectorAr : f.inspector}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(f)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الملاحظة' : 'Finding Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.ref}</h3>
                <p className="text-sm text-gray-500">{selected.date} — {locale === 'ar' ? selected.areaAr : selected.area}</p>
              </div>
              <div className="flex gap-2">
                {severityBadge(selected.severity)}
                {statusBadge(selected.status)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المدقق' : 'Inspector'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.inspectorAr : selected.inspector}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المنطقة' : 'Area'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.areaAr : selected.area}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.notesAr : selected.notes}</p>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
