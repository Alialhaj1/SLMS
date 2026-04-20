import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PrepaidPolicy {
  id: number;
  name: string;
  category: string;
  amortization_period: number;
  method: 'straight-line' | 'usage-based';
  status: 'active' | 'inactive';
}

export default function PrepaidPoliciesPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const [items, setItems] = useState<PrepaidPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/master/prepaid-policies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      const raw = json.data;
      setItems(Array.isArray(raw) ? raw : raw?.data || []);
    } catch {
      showToast('error', locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(i =>
    (i.name || i.name_en || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s: string) => {
    const cls = s === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{s}</span>;
  };

  const methodBadge = (m: string) => {
    const cls = m === 'straight-line'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    const label = m === 'straight-line' ? 'Straight-line' : 'Usage-based';
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{label}</span>;
  };

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'سياسات المصروفات المدفوعة مقدماً - SLMS' : 'Prepaid Expense Policies - SLMS'}</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'سياسات المصروفات المدفوعة مقدماً' : 'Prepaid Expense Policies'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'إدارة سياسات إطفاء المصروفات المدفوعة مقدماً' : 'Manage prepaid expense amortization policies'}
            </p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <PlusIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'إضافة سياسة' : 'Add Policy'}
          </button>
        </div>

        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'لا توجد بيانات' : 'No records found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Name', 'Category', 'Period (Months)', 'Method', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.amortization_period}</td>
                    <td className="px-4 py-3">{methodBadge(item.method)}</td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-400 hover:text-blue-600"><PencilIcon className="h-4 w-4" /></button>
                        <button className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
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
