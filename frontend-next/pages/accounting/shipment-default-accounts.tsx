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
import { ClipboardDocumentListIcon, EyeIcon } from '@heroicons/react/24/outline';

type DefaultAccountRow = {
  id: number;
  costType: string;
  debitAccount: string;
  creditAccount: string;
};

const mockDefaults: DefaultAccountRow[] = [
  { id: 1, costType: 'FREIGHT', debitAccount: '5100 - Freight Expense', creditAccount: '2100 - Accrued Liabilities' },
  { id: 2, costType: 'CUSTOMS', debitAccount: '5200 - Customs Expense', creditAccount: '2100 - Accrued Liabilities' },
];

export default function ShipmentDefaultAccountsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentAccountingBridge.Manage]);

  const [items] = useState<DefaultAccountRow[]>(mockDefaults);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DefaultAccountRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState({ costType: '', debitAccount: '', creditAccount: '' });

  const title = t('menu.logistics.shipmentAccounting.defaultAccounts');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (r) =>
        !q ||
        r.costType.toLowerCase().includes(q) ||
        r.debitAccount.toLowerCase().includes(q) ||
        r.creditAccount.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  const openEdit = (row: DefaultAccountRow) => {
    setSelected(row);
    setFormData({ costType: row.costType, debitAccount: row.debitAccount, creditAccount: row.creditAccount });
    setEditOpen(true);
  };

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'ربط أنواع تكاليف الشحنة بحسابات افتراضية'
                  : 'Map shipment cost types to default accounts'}
              </p>
            </div>
          </div>

          <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'حفظ (تجريبي)' : 'Save (demo)', 'info')}>
            {locale === 'ar' ? 'حفظ' : 'Save'}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث...' : 'Search...'} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'نوع التكلفة' : 'Cost Type'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مدين' : 'Debit'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'دائن' : 'Credit'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.costType}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.debitAccount}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.creditAccount}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected && !editOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">
        {selected && (
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white font-medium">{selected.costType}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.debitAccount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{selected.creditAccount}</div>
          </div>
        )}
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={locale === 'ar' ? 'تعديل' : 'Edit'} size="md">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'نوع التكلفة' : 'Cost Type'} value={formData.costType} onChange={(e) => setFormData({ ...formData, costType: e.target.value })} />
          <Input label={locale === 'ar' ? 'مدين' : 'Debit'} value={formData.debitAccount} onChange={(e) => setFormData({ ...formData, debitAccount: e.target.value })} />
          <Input label={locale === 'ar' ? 'دائن' : 'Credit'} value={formData.creditAccount} onChange={(e) => setFormData({ ...formData, creditAccount: e.target.value })} />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              onClick={() => {
                showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
                setEditOpen(false);
              }}
            >
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
