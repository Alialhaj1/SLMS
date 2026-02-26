import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface TransactionDefault {
  id: number;
  transaction_type: string;
  default_account_code: string;
  payment_terms: string;
  tax_code: string;
  warehouse: string;
}

export default function TransactionDefaultsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const [items, setItems] = useState<TransactionDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/master/transaction-defaults', {
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

  const handleFieldChange = (id: number, field: keyof TransactionDefault, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('http://localhost:4000/api/master/transaction-defaults', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: items }),
      });
      showToast('success', locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
    } catch {
      showToast('error', locale === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500';

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'الإعدادات الافتراضية للمعاملات - SLMS' : 'Transaction Defaults - SLMS'}</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Cog6ToothIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'الإعدادات الافتراضية للمعاملات' : 'Transaction Defaults'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تعيين الإعدادات الافتراضية لكل نوع معاملة' : 'Configure default settings per transaction type'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave} disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            {locale === 'ar' ? 'لا توجد إعدادات' : 'No transaction defaults configured'}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {item.transaction_type}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {locale === 'ar' ? 'رمز الحساب الافتراضي' : 'Default Account Code'}
                    </label>
                    <input
                      type="text" value={item.default_account_code}
                      onChange={e => handleFieldChange(item.id, 'default_account_code', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {locale === 'ar' ? 'شروط الدفع' : 'Payment Terms'}
                    </label>
                    <input
                      type="text" value={item.payment_terms}
                      onChange={e => handleFieldChange(item.id, 'payment_terms', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {locale === 'ar' ? 'رمز الضريبة' : 'Tax Code'}
                    </label>
                    <input
                      type="text" value={item.tax_code}
                      onChange={e => handleFieldChange(item.id, 'tax_code', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {locale === 'ar' ? 'المستودع' : 'Warehouse'}
                    </label>
                    <input
                      type="text" value={item.warehouse}
                      onChange={e => handleFieldChange(item.id, 'warehouse', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
