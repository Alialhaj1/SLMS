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
import {
  CalendarDaysIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ChequeStatus = 'overdue' | 'due_soon' | 'cleared';

interface ChequeDue {
  id: number;
  chequeNo: string;
  party: string;
  partyAr: string;
  bank: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: ChequeStatus;
}

const mockCheques: ChequeDue[] = [
  { id: 1, chequeNo: 'CHQ-091233', party: 'Al Noor Supplies', partyAr: 'النور للتوريدات', bank: 'Riyad Bank', amount: 5500, currency: 'SAR', dueDate: '2025-01-10', status: 'due_soon' },
  { id: 2, chequeNo: 'CHQ-091180', party: 'Gulf Retail', partyAr: 'جلف ريتيل', bank: 'Al Rajhi', amount: 9800, currency: 'SAR', dueDate: '2024-12-10', status: 'overdue' },
  { id: 3, chequeNo: 'CHQ-090999', party: 'Blue Port Logistics', partyAr: 'بلو بورت لوجستكس', bank: 'SNB', amount: 12000, currency: 'SAR', dueDate: '2024-11-20', status: 'cleared' },
];

export default function ChequesDuePage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Accounting.ChequesDue.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Accounting.ChequesDue.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Accounting.ChequesDue.Edit]);

  const [items] = useState<ChequeDue[]>(mockCheques);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ChequeStatus>('all');
  const [selected, setSelected] = useState<ChequeDue | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    chequeNo: '',
    party: '',
    partyAr: '',
    bank: '',
    amount: '0',
    currency: 'SAR',
    dueDate: '',
  });

  const statusBadge = (s: ChequeStatus) => {
    const styles: Record<ChequeStatus, string> = {
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      due_soon: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      cleared: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    const labels: Record<ChequeStatus, { en: string; ar: string }> = {
      overdue: { en: 'Overdue', ar: 'متأخر' },
      due_soon: { en: 'Due Soon', ar: 'مستحق قريباً' },
      cleared: { en: 'Cleared', ar: 'مقفل' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>
        {locale === 'ar' ? labels[s].ar : labels[s].en}
      </span>
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const sOk = status === 'all' || i.status === status;
      const qOk =
        !q ||
        i.chequeNo.toLowerCase().includes(q) ||
        i.party.toLowerCase().includes(q) ||
        i.partyAr.toLowerCase().includes(q) ||
        i.bank.toLowerCase().includes(q);
      return sOk && qOk;
    });
  }, [items, search, status]);

  const totalCount = items.length;
  const overdueCount = items.filter((i) => i.status === 'overdue').length;
  const dueSoonCount = items.filter((i) => i.status === 'due_soon').length;

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تمت الإضافة (تجريبي)' : 'Added (demo)', 'success');
    setCreateOpen(false);
    setFormData({ chequeNo: '', party: '', partyAr: '', bank: '', amount: '0', currency: 'SAR', dueDate: '' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'الشيكات المستحقة - SLMS' : 'Cheques Due - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <CalendarDaysIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض الشيكات المستحقة.' : "You don't have permission to view due cheques."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الشيكات المستحقة - SLMS' : 'Cheques Due - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'الشيكات المستحقة' : 'Cheques Due'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متابعة الشيكات حسب تاريخ الاستحقاق' : 'Track cheques by due date'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'شيك جديد' : 'New Cheque'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متأخر' : 'Overdue'}</p>
            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مستحق قريباً' : 'Due Soon'}</p>
            <p className="text-2xl font-bold text-amber-600">{dueSoonCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-80">
                <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث برقم الشيك أو الطرف أو البنك...' : 'Search by cheque, party, or bank...'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                  <option value="overdue">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
                  <option value="due_soon">{locale === 'ar' ? 'مستحق قريباً' : 'Due Soon'}</option>
                  <option value="cleared">{locale === 'ar' ? 'مقفل' : 'Cleared'}</option>
                </select>
              </div>
            </div>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم الشيك' : 'Cheque No.'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الطرف' : 'Party'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البنك' : 'Bank'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.chequeNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.partyAr : i.party}</td>
                    <td className="px-4 py-3 text-gray-500">{i.bank}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{i.amount.toLocaleString()} {i.currency}</td>
                    <td className="px-4 py-3 text-gray-500">{i.dueDate}</td>
                    <td className="px-4 py-3">{statusBadge(i.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(i)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل الشيك' : 'Cheque Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.chequeNo}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.partyAr : selected.party}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'البنك' : 'Bank'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.bank}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.amount.toLocaleString()} {selected.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.dueDate}</p>
              </div>
            </div>

            {canEdit && (
              <div className="pt-4 border-t dark:border-gray-700">
                <Button onClick={() => showToast(locale === 'ar' ? 'تمت التسوية (تجريبي)' : 'Marked cleared (demo)', 'success')}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تسوية' : 'Mark Cleared'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'شيك جديد' : 'New Cheque'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'رقم الشيك' : 'Cheque No.'} value={formData.chequeNo} onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })} placeholder="CHQ-091300" />
            <Input label={locale === 'ar' ? 'البنك' : 'Bank'} value={formData.bank} onChange={(e) => setFormData({ ...formData, bank: e.target.value })} placeholder="Riyad Bank" />
            <Input label={locale === 'ar' ? 'الطرف (EN)' : 'Party (EN)'} value={formData.party} onChange={(e) => setFormData({ ...formData, party: e.target.value })} />
            <Input label={locale === 'ar' ? 'الطرف (AR)' : 'Party (AR)'} value={formData.partyAr} onChange={(e) => setFormData({ ...formData, partyAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'المبلغ' : 'Amount'} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            <Input label={locale === 'ar' ? 'العملة' : 'Currency'} value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} placeholder="SAR" />
            <Input label={locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'} type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إضافة' : 'Add'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
