import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { MagnifyingGlassIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ComplianceRule {
  id: number;
  rule_name: string;
  shipment_ref: string;
  category: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  details: string;
  checked_at: string;
}

export default function ShipmentCompliancePage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const [items, setItems] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/shipping/compliance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      showToast('error', locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(i => {
    const matchSearch = i.rule_name.toLowerCase().includes(search.toLowerCase()) ||
      i.shipment_ref.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const passCount = items.filter(i => i.status === 'pass').length;
  const failCount = items.filter(i => i.status === 'fail').length;
  const warnCount = items.filter(i => i.status === 'warning').length;

  const statusBadge = (s: string) => {
    const config: Record<string, { cls: string; icon: typeof CheckCircleIcon; label: string }> = {
      pass: { cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon, label: 'Pass' },
      fail: { cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircleIcon, label: 'Fail' },
      warning: { cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: ExclamationTriangleIcon, label: 'Warning' },
      pending: { cls: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: ShieldCheckIcon, label: 'Pending' },
    };
    const c = config[s] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${c.cls}`}>
        <c.icon className="h-3 w-3" />{c.label}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'الامتثال - SLMS' : 'Shipment Compliance - SLMS'}</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'فحص الامتثال' : 'Shipment Compliance'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'مراجعة قواعد الامتثال لكل شحنة' : 'Review compliance rules and pass/fail status per shipment'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircleIcon className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نجح' : 'Passed'}</p>
                <p className="text-xl font-bold text-green-600">{passCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><XCircleIcon className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'فشل' : 'Failed'}</p>
                <p className="text-xl font-bold text-red-600">{failCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تحذيرات' : 'Warnings'}</p>
                <p className="text-xl font-bold text-yellow-600">{warnCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث بالقاعدة أو رقم الشحنة...' : 'Search by rule or shipment...'}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{locale === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="pass">{locale === 'ar' ? 'نجح' : 'Pass'}</option>
            <option value="fail">{locale === 'ar' ? 'فشل' : 'Fail'}</option>
            <option value="warning">{locale === 'ar' ? 'تحذير' : 'Warning'}</option>
            <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <ShieldCheckIcon className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              {locale === 'ar' ? 'لا توجد نتائج' : 'No compliance records found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Rule', 'Shipment', 'Category', 'Status', 'Details', 'Checked'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.rule_name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">{item.shipment_ref}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.category}</td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{item.details}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.checked_at ? new Date(item.checked_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {locale === 'ar' ? `${filtered.length} سجل` : `${filtered.length} record(s)`}
        </div>
      </div>
    </MainLayout>
  );
}
