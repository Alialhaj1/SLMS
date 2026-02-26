import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, LinkIcon } from '@heroicons/react/24/outline';

interface ShipmentAccountingRule {
  id: number;
  shipment_type: string;
  revenue_account: string;
  expense_account: string;
  tax_treatment: string;
}

export default function ShipmentAccountingMapPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const [items, setItems] = useState<ShipmentAccountingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/accounting/shipment-mapping', {
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

  const filtered = items.filter(i =>
    i.shipment_type.toLowerCase().includes(search.toLowerCase()) ||
    i.revenue_account.toLowerCase().includes(search.toLowerCase())
  );

  const taxBadge = (t: string) => {
    const colors: Record<string, string> = {
      'VAT': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Exempt': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Zero-rated': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[t] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>{t}</span>;
  };

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'ربط الشحنات بالحسابات - SLMS' : 'Shipment Accounting Map - SLMS'}</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <LinkIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'ربط الشحنات بالحسابات' : 'Shipment Accounting Map'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'قواعد ربط أنواع الشحنات بالحسابات المحاسبية' : 'Define mapping rules between shipment types and accounting'}
              </p>
            </div>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <PlusIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'إضافة قاعدة' : 'Add Rule'}
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
              <LinkIcon className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              {locale === 'ar' ? 'لا توجد قواعد ربط' : 'No mapping rules defined'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Shipment Type', 'Revenue Account', 'Expense Account', 'Tax Treatment', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.shipment_type}</td>
                    <td className="px-4 py-3 text-sm font-mono text-green-700 dark:text-green-400">{item.revenue_account}</td>
                    <td className="px-4 py-3 text-sm font-mono text-red-700 dark:text-red-400">{item.expense_account}</td>
                    <td className="px-4 py-3">{taxBadge(item.tax_treatment)}</td>
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
