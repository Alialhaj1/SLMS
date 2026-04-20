import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import apiClient from '@/lib/apiClient';
import { LinkIcon, MagnifyingGlassIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AccountingMapRow {
  id: number;
  cost_type_code: string;
  expense_type_name: string;
  expense_type_name_ar: string;
  category: string;
  is_vat_exempt: boolean;
  default_vat_rate: number;
  debit_account_id: number;
  debit_account_code: string;
  debit_account_name: string;
  credit_account_id: number;
  credit_account_code: string;
  credit_account_name: string;
}

interface Account {
  id: number;
  code: string;
  name: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; labelAr: string; color: string; icon: string }> = {
  FREIGHT: { label: 'Freight', labelAr: 'شحن', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: '🚢' },
  CUSTOMS: { label: 'Customs', labelAr: 'جمارك', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: '🏛️' },
  CLEARANCE: { label: 'Clearance', labelAr: 'تخليص', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: '📋' },
  PORT: { label: 'Port', labelAr: 'ميناء', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', icon: '⚓' },
  INSURANCE: { label: 'Insurance', labelAr: 'تأمين', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: '🛡️' },
  INSPECTION: { label: 'Inspection', labelAr: 'فحص', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: '🔬' },
  CERTIFICATION: { label: 'Certification', labelAr: 'شهادات', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', icon: '📜' },
  DOCUMENTATION: { label: 'Documentation', labelAr: 'توثيق', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: '📄' },
  WAREHOUSE: { label: 'Warehouse', labelAr: 'مستودع', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: '🏭' },
  DELIVERY: { label: 'Delivery', labelAr: 'توصيل', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', icon: '🚛' },
  TREATMENT: { label: 'Treatment', labelAr: 'معالجة', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', icon: '🧪' },
  FINANCE: { label: 'Finance', labelAr: 'مالية', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: '🏦' },
};

export default function ShipmentAccountingMapPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const [items, setItems] = useState<AccountingMapRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDebitId, setEditDebitId] = useState<number>(0);
  const [editCreditId, setEditCreditId] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mapRes, accRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: AccountingMapRow[] }>('/api/shipment-accounting/accounting-map'),
        apiClient.get<{ success: boolean; data: Account[] }>('/api/accounts?limit=500'),
      ]);
      setItems(mapRes.data || []);
      setAccounts(accRes.data || []);
    } catch {
      showToast('error', locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    if (!q) return true;
    return i.cost_type_code.toLowerCase().includes(q) ||
      i.expense_type_name.toLowerCase().includes(q) ||
      (i.expense_type_name_ar || '').includes(q) ||
      (i.debit_account_code || '').toLowerCase().includes(q) ||
      (i.credit_account_code || '').toLowerCase().includes(q);
  });

  const startEdit = (row: AccountingMapRow) => {
    setEditingId(row.id);
    setEditDebitId(row.debit_account_id);
    setEditCreditId(row.credit_account_id);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/shipment-accounting/accounting-map/${editingId}`, {
        debit_account_id: editDebitId,
        credit_account_id: editCreditId,
      });
      showToast('success', locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      setEditingId(null);
      await fetchData();
    } catch {
      showToast('error', locale === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getCat = (cat: string) => CATEGORY_CONFIG[cat] || { label: cat || 'Other', labelAr: cat || 'أخرى', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: '📦' };

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'ربط المصاريف بالحسابات' : 'Expense → Account Mapping'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <LinkIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'ربط أنواع المصاريف بالحسابات' : 'Expense Type → Account Mapping'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'حساب المدين والدائن الافتراضي لكل نوع مصروف' : 'Default debit & credit accounts per expense type'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg">
            {items.length} {locale === 'ar' ? 'ربط' : 'mappings'}
          </span>
        </div>

        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم أو الحساب...' : 'Search by code, name, or account...'}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-r-transparent" />
              <p className="mt-3 text-sm text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <LinkIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{locale === 'ar' ? 'لا توجد ربطات' : 'No mappings found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {[
                      locale === 'ar' ? 'الفئة' : 'Category',
                      locale === 'ar' ? 'نوع المصروف' : 'Expense Type',
                      locale === 'ar' ? 'حساب المدين (مصروف)' : 'Debit (Expense)',
                      locale === 'ar' ? 'حساب الدائن (التزام)' : 'Credit (Liability)',
                      locale === 'ar' ? 'ضريبة' : 'VAT',
                      locale === 'ar' ? 'إجراءات' : 'Actions',
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map(row => {
                    const cat = getCat(row.category);
                    const isEditing = editingId === row.id;
                    return (
                      <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isEditing ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cat.color}`}>
                            {cat.icon} {locale === 'ar' ? cat.labelAr : cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">{row.cost_type_code}</div>
                          <div className="text-xs text-gray-500">{locale === 'ar' ? row.expense_type_name_ar : row.expense_type_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select value={editDebitId} onChange={e => setEditDebitId(Number(e.target.value))}
                              className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 border-indigo-300 dark:border-indigo-600">
                              <option value={0}>--</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </select>
                          ) : (
                            <div>
                              <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400 font-medium">{row.debit_account_code || '—'}</span>
                              {row.debit_account_name && <div className="text-xs text-gray-500 truncate max-w-[200px]">{row.debit_account_name}</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select value={editCreditId} onChange={e => setEditCreditId(Number(e.target.value))}
                              className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 border-indigo-300 dark:border-indigo-600">
                              <option value={0}>--</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </select>
                          ) : (
                            <div>
                              <span className="font-mono text-sm text-rose-700 dark:text-rose-400 font-medium">{row.credit_account_code || '—'}</span>
                              {row.credit_account_name && <div className="text-xs text-gray-500 truncate max-w-[200px]">{row.credit_account_name}</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${row.is_vat_exempt ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            {row.is_vat_exempt ? (locale === 'ar' ? 'معفى' : 'Exempt') : `${Number(row.default_vat_rate)}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button onClick={saveEdit} disabled={saving} className="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"><CheckIcon className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-white bg-gray-500 hover:bg-gray-600 rounded-lg"><XMarkIcon className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(row)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
