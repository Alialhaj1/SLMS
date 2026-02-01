import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type LcStatus = 'draft' | 'issued' | 'amended' | 'closed' | 'cancelled';

interface LetterOfCredit {
  id: number;
  lcNo: string;
  applicant: string;
  applicantAr: string;
  beneficiary: string;
  beneficiaryAr: string;
  issuingBank: string;
  amount: number;
  currency: 'SAR' | 'USD' | 'EUR';
  issueDate: string;
  expiryDate: string;
  status: LcStatus;
}

const mockLcs: LetterOfCredit[] = [
  { id: 1, lcNo: 'LC-2025-001', applicant: 'Al-Faisal Trading', applicantAr: 'شركة الفيصل للتجارة', beneficiary: 'International Parts', beneficiaryAr: 'قطع دولية', issuingBank: 'National Bank', amount: 250000, currency: 'USD', issueDate: '2025-10-01', expiryDate: '2026-01-01', status: 'issued' },
  { id: 2, lcNo: 'LC-2025-002', applicant: 'Global Import Export', applicantAr: 'الاستيراد والتصدير العالمية', beneficiary: 'Warehouse Partners', beneficiaryAr: 'شركاء المستودعات', issuingBank: 'Saudi Bank', amount: 1200000, currency: 'SAR', issueDate: '2025-11-15', expiryDate: '2026-02-15', status: 'amended' },
  { id: 3, lcNo: 'LC-2025-003', applicant: 'Premium Shipping LLC', applicantAr: 'الشحن المتميز ذ.م.م', beneficiary: 'Gulf Supplies', beneficiaryAr: 'إمدادات الخليج', issuingBank: 'Gulf Bank', amount: 180000, currency: 'SAR', issueDate: '2025-07-01', expiryDate: '2025-12-31', status: 'closed' },
  { id: 4, lcNo: 'LC-2026-001', applicant: 'Saudi Logistics Co.', applicantAr: 'الشركة السعودية للخدمات اللوجستية', beneficiary: 'Blue Freight Co.', beneficiaryAr: 'شركة الشحن الأزرق', issuingBank: 'National Bank', amount: 95000, currency: 'USD', issueDate: '2025-12-20', expiryDate: '2026-03-20', status: 'draft' },
  { id: 5, lcNo: 'LC-2025-004', applicant: 'Legacy Customer', applicantAr: 'عميل قديم', beneficiary: 'Legacy Vendor', beneficiaryAr: 'مورد قديم', issuingBank: 'Old Bank', amount: 50000, currency: 'SAR', issueDate: '2025-05-01', expiryDate: '2025-08-01', status: 'cancelled' },
];

export default function LetterOfCreditPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [lcs] = useState<LetterOfCredit[]>(mockLcs);
  const [selectedStatus, setSelectedStatus] = useState<'all' | LcStatus>('all');
  const [selected, setSelected] = useState<LetterOfCredit | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    lcNo: '',
    applicant: '',
    applicantAr: '',
    beneficiary: '',
    beneficiaryAr: '',
    issuingBank: '',
    amount: '',
    currency: 'USD' as LetterOfCredit['currency'],
    issueDate: '',
    expiryDate: '',
    status: 'draft' as LcStatus,
  });

  const filtered = useMemo(() => {
    return lcs.filter(l => selectedStatus === 'all' || l.status === selectedStatus);
  }, [lcs, selectedStatus]);

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency }).format(amount);
  };

  const getStatusBadge = (status: LcStatus) => {
    const styles: Record<LcStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      amended: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<LcStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      issued: { en: 'Issued', ar: 'صادر' },
      amended: { en: 'Amended', ar: 'معدل' },
      closed: { en: 'Closed', ar: 'مغلق' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const issuedCount = lcs.filter(l => l.status === 'issued' || l.status === 'amended').length;
  const draftCount = lcs.filter(l => l.status === 'draft').length;
  const totalValueUsd = lcs.reduce((sum, l) => sum + (l.currency === 'USD' ? l.amount : 0), 0);
  const banksCount = new Set(lcs.map(l => l.issuingBank)).size;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ lcNo: '', applicant: '', applicantAr: '', beneficiary: '', beneficiaryAr: '', issuingBank: '', amount: '', currency: 'USD', issueDate: '', expiryDate: '', status: 'draft' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'خطابات الاعتماد - SLMS' : 'Letter of Credit - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'خطابات الاعتماد' : 'Letter of Credit'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة LC: الإصدار، التعديل، الإغلاق والتتبع' : 'Manage LCs: issue, amend, close, and track'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'LC جديد' : 'New LC'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><DocumentCheckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'صادر/معدل' : 'Issued/Amended'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{issuedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"><DocumentCheckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسودة' : 'Draft'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{draftCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيمة USD' : 'USD Value'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatMoney(totalValueUsd, 'USD')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><CalendarDaysIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'البنوك' : 'Banks'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{banksCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="issued">{locale === 'ar' ? 'صادر' : 'Issued'}</option>
              <option value="amended">{locale === 'ar' ? 'معدل' : 'Amended'}</option>
              <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
              <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
            </select>

            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">LC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الطالب' : 'Applicant'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستفيد' : 'Beneficiary'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البنك' : 'Bank'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإصدار' : 'Issued'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الانتهاء' : 'Expiry'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.lcNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? l.applicantAr : l.applicant}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? l.beneficiaryAr : l.beneficiary}</td>
                    <td className="px-4 py-3 text-gray-500">{l.issuingBank}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatMoney(l.amount, l.currency)}</td>
                    <td className="px-4 py-3 text-gray-500">{l.issueDate}</td>
                    <td className="px-4 py-3 text-gray-500">{l.expiryDate}</td>
                    <td className="px-4 py-3">{getStatusBadge(l.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(l)}><EyeIcon className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل LC' : 'LC Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.lcNo}</h3>
                <p className="text-sm text-gray-500">{selected.issuingBank}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الطالب' : 'Applicant'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.applicantAr : selected.applicant}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المستفيد' : 'Beneficiary'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.beneficiaryAr : selected.beneficiary}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المبلغ' : 'Amount'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(selected.amount, selected.currency)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الصلاحية' : 'Validity'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.issueDate} → {selected.expiryDate}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم الإصدار (تجريبي)' : 'Issued (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إصدار' : 'Issue'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإلغاء (تجريبي)' : 'Cancelled (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'LC جديد' : 'New LC'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="LC" value={formData.lcNo} onChange={(e) => setFormData({ ...formData, lcNo: e.target.value })} placeholder="LC-..." />
            <Input label={locale === 'ar' ? 'البنك' : 'Issuing Bank'} value={formData.issuingBank} onChange={(e) => setFormData({ ...formData, issuingBank: e.target.value })} />
            <Input label={locale === 'ar' ? 'الطالب (EN)' : 'Applicant (EN)'} value={formData.applicant} onChange={(e) => setFormData({ ...formData, applicant: e.target.value })} />
            <Input label={locale === 'ar' ? 'الطالب (AR)' : 'Applicant (AR)'} value={formData.applicantAr} onChange={(e) => setFormData({ ...formData, applicantAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'المستفيد (EN)' : 'Beneficiary (EN)'} value={formData.beneficiary} onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })} />
            <Input label={locale === 'ar' ? 'المستفيد (AR)' : 'Beneficiary (AR)'} value={formData.beneficiaryAr} onChange={(e) => setFormData({ ...formData, beneficiaryAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'المبلغ' : 'Amount'} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })} className="input">
                <option value="USD">USD</option>
                <option value="SAR">SAR</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'} value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'} value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="issued">{locale === 'ar' ? 'صادر' : 'Issued'}</option>
                <option value="amended">{locale === 'ar' ? 'معدل' : 'Amended'}</option>
                <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
                <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
