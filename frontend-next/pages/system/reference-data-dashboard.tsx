import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { CircleStackIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface RefTable {
  key: string;
  label: string;
  icon: string;
  endpoint: string;
  href: string;
  count: number | null;
}

const refTables: Omit<RefTable, 'count'>[] = [
  { key: 'countries', label: 'Countries', icon: '🌍', endpoint: '/api/master/countries', href: '/master/countries' },
  { key: 'currencies', label: 'Currencies', icon: '💱', endpoint: '/api/master/currencies', href: '/master/currencies' },
  { key: 'units', label: 'Units of Measure', icon: '📏', endpoint: '/api/master/units', href: '/master/units' },
  { key: 'ports', label: 'Ports', icon: '⚓', endpoint: '/api/master/ports', href: '/master/ports' },
  { key: 'expense_types', label: 'Expense Types', icon: '💰', endpoint: '/api/master/expense-types', href: '/master/expense-types' },
  { key: 'shipment_types', label: 'Shipment Types', icon: '🚢', endpoint: '/api/master/shipment-types', href: '/master/shipment-types' },
  { key: 'container_types', label: 'Container Types', icon: '📦', endpoint: '/api/master/container-types', href: '/master/container-types' },
  { key: 'payment_methods', label: 'Payment Methods', icon: '💳', endpoint: '/api/master/payment-methods', href: '/master/payment-methods' },
  { key: 'document_types', label: 'Document Types', icon: '📄', endpoint: '/api/master/document-types', href: '/master/document-types' },
  { key: 'banks', label: 'Banks', icon: '🏦', endpoint: '/api/master/banks', href: '/master/banks' },
  { key: 'incoterms', label: 'Incoterms', icon: '📋', endpoint: '/api/master/incoterms', href: '/master/incoterms' },
  { key: 'hs_codes', label: 'HS Codes', icon: '🏷️', endpoint: '/api/master/hs-codes', href: '/master/hs-codes' },
];

export default function ReferenceDataDashboardPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [tables, setTables] = useState<RefTable[]>(refTables.map((r) => ({ ...r, count: null })));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCounts = async () => {
    const token = localStorage.getItem('accessToken');
    const results = await Promise.allSettled(
      refTables.map(async (ref) => {
        const res = await fetch(`http://localhost:4000${ref.endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return { key: ref.key, count: null };
        const data = await res.json();
        const count = data.total ?? data.data?.length ?? (Array.isArray(data) ? data.length : 0);
        return { key: ref.key, count };
      })
    );
    setTables((prev) =>
      prev.map((t) => {
        const result = results.find((_, i) => refTables[i].key === t.key);
        if (result && result.status === 'fulfilled') return { ...t, count: result.value.count };
        return t;
      })
    );
  };

  useEffect(() => {
    fetchCounts().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCounts();
    setRefreshing(false);
    showToast('success', 'Counts refreshed');
  };

  const totalRecords = tables.reduce((sum, t) => sum + (t.count || 0), 0);
  const populatedTables = tables.filter((t) => t.count !== null && t.count > 0).length;

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('referenceData.title') || 'Reference Data Dashboard'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CircleStackIcon className="w-7 h-7 text-blue-500" />
              {t('referenceData.title') || 'Reference Data Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('referenceData.subtitle') || 'Overview of all master data tables and record counts'}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Counts
          </button>
        </div>

        {/* Summary */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Total Tables</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tables.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Populated Tables</p>
              <p className="text-2xl font-bold text-green-600">{populatedTables}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Total Records</p>
              <p className="text-2xl font-bold text-blue-600">{totalRecords.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Reference Table Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />) : tables.map((table) => (
            <Link
              key={table.key}
              href={table.href}
              className="block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{table.icon}</span>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{table.label}</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {table.count !== null ? table.count.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {table.count !== null ? (table.count === 0 ? 'No records' : 'records') : 'Unable to load'}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
