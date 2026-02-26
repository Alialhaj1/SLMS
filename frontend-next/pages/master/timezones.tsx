import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { MagnifyingGlassIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface TimezoneRecord {
  id: number;
  timezone_id: string;
  display_name: string;
  utc_offset: string;
  dst_offset: string;
  region: string;
}

export default function TimezonesPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const [items, setItems] = useState<TimezoneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/master/timezones', {
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

  const regions = [...new Set(items.map(i => i.region))].sort();

  const filtered = items.filter(i => {
    const matchSearch = i.display_name.toLowerCase().includes(search.toLowerCase()) ||
      i.timezone_id.toLowerCase().includes(search.toLowerCase());
    const matchRegion = regionFilter === 'all' || i.region === regionFilter;
    return matchSearch && matchRegion;
  });

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'المناطق الزمنية - SLMS' : 'Timezones - SLMS'}</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <GlobeAltIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'المناطق الزمنية' : 'Timezones'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'عرض وإدارة المناطق الزمنية' : 'Browse and manage timezone definitions'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث بالاسم أو المعرف...' : 'Search by name or ID...'}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{locale === 'ar' ? 'جميع المناطق' : 'All Regions'}</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <GlobeAltIcon className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              {locale === 'ar' ? 'لا توجد نتائج' : 'No timezones found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Timezone ID', 'Display Name', 'UTC Offset', 'DST Offset', 'Region'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{item.timezone_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.display_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-mono rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">{item.utc_offset}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{item.dst_offset}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300">{item.region}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {locale === 'ar' ? `${filtered.length} منطقة زمنية` : `${filtered.length} timezone(s)`}
        </div>
      </div>
    </MainLayout>
  );
}
