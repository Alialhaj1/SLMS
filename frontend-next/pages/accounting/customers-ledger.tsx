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
import { BookOpenIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type LedgerType = 'invoice' | 'payment' | 'credit_note';

interface CustomerLedgerEntry {
  id: number;
  customer: string;
  customerAr: string;
  date: string;
  docNo: string;
  type: LedgerType;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
  description: string;
  descriptionAr: string;
}

const mockEntries: CustomerLedgerEntry[] = [
  {
    id: 1,
    customer: 'ACME Trading',
    customerAr: 'شركة أكمي للتجارة',
    date: '2025-01-03',
    docNo: 'INV-2025-0012',
    type: 'invoice',
    debit: 4500,
    credit: 0,
    balance: 4500,
    currency: 'SAR',
    description: 'Freight services',
    descriptionAr: 'خدمات شحن',
  },
  {
    id: 2,
    customer: 'ACME Trading',
    customerAr: 'شركة أكمي للتجارة',
    date: '2025-01-12',
    docNo: 'PAY-2025-0008',
    type: 'payment',
    debit: 0,
    credit: 2500,
    balance: 2000,
    currency: 'SAR',
    description: 'Bank transfer',
    descriptionAr: 'تحويل بنكي',
  },
  {
    id: 3,
    customer: 'Blue Port Logistics',
    customerAr: 'بلو بورت لوجستكس',
    date: '2025-01-14',
    docNo: 'INV-2025-0022',
    type: 'invoice',
    debit: 8200,
    credit: 0,
    balance: 8200,
    currency: 'SAR',
    description: 'Customs clearance',
    descriptionAr: 'تخليص جمركي',
  },
  {
    id: 4,
    customer: 'ACME Trading',
    customerAr: 'شركة أكمي للتجارة',
    date: '2025-01-20',
    docNo: 'CN-2025-0001',
    type: 'credit_note',
    debit: 0,
    credit: 500,
    balance: 1500,
    currency: 'SAR',
    description: 'Adjustment',
    descriptionAr: 'تسوية',
  },
];

export default function CustomersLedgerPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Accounting.CustomersLedger.View]);
  const canExport = hasAnyPermission([MenuPermissions.Accounting.CustomersLedger.Export]);

  const [items] = useState<CustomerLedgerEntry[]>(mockEntries);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | LedgerType>('all');
  const [selected, setSelected] = useState<CustomerLedgerEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      const typeOk = type === 'all' || e.type === type;
      const qOk =
        !q ||
        e.customer.toLowerCase().includes(q) ||
        e.customerAr.toLowerCase().includes(q) ||
        e.docNo.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.descriptionAr.toLowerCase().includes(q);
      return typeOk && qOk;
    });
  }, [items, search, type]);

  const totals = useMemo(() => {
    const debit = filtered.reduce((s, e) => s + e.debit, 0);
    const credit = filtered.reduce((s, e) => s + e.credit, 0);
    return { debit, credit };
  }, [filtered]);

  const typeBadge = (t: LedgerType) => {
    const styles: Record<LedgerType, string> = {
      invoice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      payment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      credit_note: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    const labels: Record<LedgerType, { en: string; ar: string }> = {
      invoice: { en: 'Invoice', ar: 'فاتورة' },
      payment: { en: 'Payment', ar: 'سداد' },
      credit_note: { en: 'Credit Note', ar: 'إشعار دائن' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[t])}>
        {locale === 'ar' ? labels[t].ar : labels[t].en}
      </span>
    );
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'دفتر الأستاذ للعملاء - SLMS' : 'Customers Ledger - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <BookOpenIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض دفتر الأستاذ للعملاء.' : "You don't have permission to view customers ledger."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'دفتر الأستاذ للعملاء - SLMS' : 'Customers Ledger - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpenIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'دفتر الأستاذ للعملاء' : 'Customers Ledger'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيود العملاء (مدين/دائن) مع الرصيد' : 'Customer entries (debit/credit) with balance'}</p>
            </div>
          </div>
          {canExport && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد القيود' : 'Entries'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{filtered.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المدين' : 'Total Debit'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.debit.toLocaleString()} {locale === 'ar' ? 'ر.س' : 'SAR'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.credit.toLocaleString()} {locale === 'ar' ? 'ر.س' : 'SAR'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-80">
                <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالعميل أو رقم المستند...' : 'Search by customer or document...'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="invoice">{locale === 'ar' ? 'فاتورة' : 'Invoice'}</option>
                  <option value="payment">{locale === 'ar' ? 'سداد' : 'Payment'}</option>
                  <option value="credit_note">{locale === 'ar' ? 'إشعار دائن' : 'Credit Note'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستند' : 'Document'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مدين' : 'Debit'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'دائن' : 'Credit'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرصيد' : 'Balance'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? e.customerAr : e.customer}</td>
                    <td className="px-4 py-3 text-gray-500">{e.date}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{e.docNo}</td>
                    <td className="px-4 py-3">{typeBadge(e.type)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{e.debit ? e.debit.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{e.credit ? e.credit.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{e.balance.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(e)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل القيد' : 'Entry Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.docNo}</h3>
              <p className="text-sm text-gray-500">{locale === 'ar' ? selected.customerAr : selected.customer} — {selected.date}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <div className="mt-1">{typeBadge(selected.type)}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الرصيد' : 'Balance'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.balance.toLocaleString()} {selected.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'مدين' : 'Debit'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.debit ? selected.debit.toLocaleString() : '-'} {selected.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'دائن' : 'Credit'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.credit ? selected.credit.toLocaleString() : '-'} {selected.currency}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'الوصف' : 'Description'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.descriptionAr : selected.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
