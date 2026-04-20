import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import apiClient from '@/lib/apiClient';
import { Cog6ToothIcon, MagnifyingGlassIcon, PlusIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DefaultAccount {
  id: number;
  cost_type_code: string;
  debit_account_id: number;
  debit_account_code: string;
  debit_account_name: string;
  credit_account_id: number;
  credit_account_code: string;
  credit_account_name: string;
  is_active: boolean;
}

interface Account {
  id: number;
  code: string;
  name: string;
}

const KNOWN_CODES: Record<string, { en: string; ar: string }> = {
  FRT_SEA: { en: 'Sea Freight', ar: 'شحن بحري' },
  FRT_AIR: { en: 'Air Freight', ar: 'شحن جوي' },
  FRT_LAND: { en: 'Land Freight', ar: 'شحن بري' },
  CUSTOMS_DUTY: { en: 'Customs Duty', ar: 'رسوم جمركية' },
  CUSTOMS_FINE: { en: 'Customs Fine', ar: 'غرامة جمركية' },
  INSURANCE: { en: 'Insurance', ar: 'تأمين' },
  CLEARANCE: { en: 'Clearance', ar: 'تخليص' },
  DEMURRAGE: { en: 'Demurrage', ar: 'أرضية' },
  THC: { en: 'Terminal Handling', ar: 'مناولة ميناء' },
  DELIVERY: { en: 'Delivery', ar: 'توصيل' },
  DOCUMENTATION: { en: 'Documentation', ar: 'توثيق' },
  INSPECTION: { en: 'Inspection', ar: 'فحص' },
  FUMIGATION: { en: 'Fumigation', ar: 'تبخير' },
  SABER: { en: 'SABER Certification', ar: 'شهادة سابر' },
  SFDA: { en: 'SFDA Fees', ar: 'رسوم هيئة الغذاء' },
  WAREHOUSE: { en: 'Warehousing', ar: 'تخزين' },
  PORT_CHARGES: { en: 'Port Charges', ar: 'رسوم ميناء' },
  TRANSPORT_LOCAL: { en: 'Local Transport', ar: 'نقل محلي' },
  BANK_CHARGES: { en: 'Bank Charges', ar: 'رسوم بنكية' },
  LC_CHARGES: { en: 'LC Charges', ar: 'رسوم اعتماد' },
  WEIGHING: { en: 'Weighing', ar: 'وزن' },
  PACKING: { en: 'Packing', ar: 'تعبئة' },
};

export default function ShipmentDefaultAccountsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const [items, setItems] = useState<DefaultAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDebitId, setEditDebitId] = useState<number>(0);
  const [editCreditId, setEditCreditId] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // For adding new entry
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDebitId, setNewDebitId] = useState<number>(0);
  const [newCreditId, setNewCreditId] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [daRes, accRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: DefaultAccount[] }>('/api/shipment-accounting/default-accounts'),
        apiClient.get<{ success: boolean; data: Account[] }>('/api/accounts?limit=500'),
      ]);
      setItems(daRes.data || []);
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
      (i.debit_account_code || '').toLowerCase().includes(q) ||
      (i.credit_account_code || '').toLowerCase().includes(q);
  });

  const startEdit = (r: DefaultAccount) => {
    setEditingId(r.id);
    setEditDebitId(r.debit_account_id);
    setEditCreditId(r.credit_account_id);
  };

  const saveEdit = async (code: string) => {
    setSaving(true);
    try {
      await apiClient.post('/api/shipment-accounting/default-accounts', {
        cost_type_code: code,
        debit_account_id: editDebitId,
        credit_account_id: editCreditId,
      });
      showToast('success', locale === 'ar' ? 'تم الحفظ' : 'Saved');
      setEditingId(null);
      await fetchData();
    } catch {
      showToast('error', locale === 'ar' ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addEntry = async () => {
    if (!newCode || !newDebitId || !newCreditId) {
      showToast('error', locale === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields required');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/api/shipment-accounting/default-accounts', {
        cost_type_code: newCode,
        debit_account_id: newDebitId,
        credit_account_id: newCreditId,
      });
      showToast('success', locale === 'ar' ? 'تمت الإضافة' : 'Added');
      setShowAdd(false);
      setNewCode(''); setNewDebitId(0); setNewCreditId(0);
      await fetchData();
    } catch {
      showToast('error', locale === 'ar' ? 'فشلت الإضافة' : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const getCodeLabel = (code: string) => {
    const k = KNOWN_CODES[code];
    return k ? (locale === 'ar' ? k.ar : k.en) : code;
  };

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'حسابات المصاريف الافتراضية' : 'Default Expense Accounts'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <Cog6ToothIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'حسابات المصاريف الافتراضية' : 'Default Expense Accounts'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تعيين حسابات مدين ودائن افتراضية لأكواد المصاريف' : 'Assign default debit & credit accounts for cost type codes'}
              </p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl shadow hover:shadow-md font-medium text-sm">
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'إضافة ربط' : 'Add Mapping'}
          </button>
        </div>

        {showAdd && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">
              {locale === 'ar' ? 'إضافة ربط جديد' : 'Add New Mapping'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder={locale === 'ar' ? 'كود المصروف (مثال FRT_SEA)' : 'Cost code (e.g. FRT_SEA)'}
                className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              <select value={newDebitId} onChange={e => setNewDebitId(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value={0}>{locale === 'ar' ? '-- حساب المدين --' : '-- Debit Account --'}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <select value={newCreditId} onChange={e => setNewCreditId(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value={0}>{locale === 'ar' ? '-- حساب الدائن --' : '-- Credit Account --'}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={addEntry} disabled={saving} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving ? '...' : (locale === 'ar' ? 'حفظ' : 'Save')}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-r-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Cog6ToothIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد حسابات افتراضية' : 'No default accounts found'}</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium">
                {locale === 'ar' ? 'أضف الأول' : 'Add first one'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {[locale === 'ar' ? 'كود المصروف' : 'Cost Code', locale === 'ar' ? 'الوصف' : 'Description', locale === 'ar' ? 'حساب المدين' : 'Debit Account', locale === 'ar' ? 'حساب الدائن' : 'Credit Account', locale === 'ar' ? 'الحالة' : 'Status', locale === 'ar' ? 'إجراءات' : 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map(row => {
                    const isEditing = editingId === row.id;
                    return (
                      <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isEditing ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-white">{row.cost_type_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{getCodeLabel(row.cost_type_code)}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select value={editDebitId} onChange={e => setEditDebitId(Number(e.target.value))}
                              className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 border-amber-300">
                              <option value={0}>--</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </select>
                          ) : (
                            <div className="text-sm">
                              <span className="font-mono text-emerald-700 dark:text-emerald-400">{row.debit_account_code || '—'}</span>
                              {row.debit_account_name && <div className="text-xs text-gray-500 truncate max-w-[180px]">{row.debit_account_name}</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select value={editCreditId} onChange={e => setEditCreditId(Number(e.target.value))}
                              className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 border-amber-300">
                              <option value={0}>--</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </select>
                          ) : (
                            <div className="text-sm">
                              <span className="font-mono text-rose-700 dark:text-rose-400">{row.credit_account_code || '—'}</span>
                              {row.credit_account_name && <div className="text-xs text-gray-500 truncate max-w-[180px]">{row.credit_account_name}</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${row.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                            {row.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button onClick={() => saveEdit(row.cost_type_code)} disabled={saving} className="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"><CheckIcon className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-white bg-gray-500 hover:bg-gray-600 rounded-lg"><XMarkIcon className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(row)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg">
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
