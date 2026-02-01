import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type BolStatus = 'draft' | 'issued' | 'in_transit' | 'delivered' | 'cancelled';

interface BillOfLading {
  id: number;
  bolNo: string;
  shipmentRef: string;
  carrier: string;
  origin: string;
  destination: string;
  issueDate: string;
  eta: string;
  status: BolStatus;
}

const mockBols: BillOfLading[] = [
  { id: 1, bolNo: 'BOL-2025-001', shipmentRef: 'SHP-10021', carrier: 'Blue Freight Co.', origin: 'Riyadh', destination: 'Jeddah', issueDate: '2025-12-10', eta: '2025-12-13', status: 'in_transit' },
  { id: 2, bolNo: 'BOL-2025-002', shipmentRef: 'SHP-10045', carrier: 'Gulf Transport', origin: 'Dammam', destination: 'Riyadh', issueDate: '2025-11-22', eta: '2025-11-24', status: 'delivered' },
  { id: 3, bolNo: 'BOL-2025-003', shipmentRef: 'SHP-10066', carrier: 'Premium Shipping LLC', origin: 'Jeddah', destination: 'Dammam', issueDate: '2025-12-01', eta: '2025-12-03', status: 'issued' },
  { id: 4, bolNo: 'BOL-2026-001', shipmentRef: 'SHP-10102', carrier: 'Blue Freight Co.', origin: 'Riyadh', destination: 'Dammam', issueDate: '2025-12-28', eta: '2025-12-30', status: 'draft' },
  { id: 5, bolNo: 'BOL-2025-004', shipmentRef: 'SHP-09991', carrier: 'Legacy Carrier', origin: 'Riyadh', destination: 'Jeddah', issueDate: '2025-10-10', eta: '2025-10-12', status: 'cancelled' },
];

export default function BillOfLadingPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [bols] = useState<BillOfLading[]>(mockBols);
  const [selectedStatus, setSelectedStatus] = useState<'all' | BolStatus>('all');
  const [selected, setSelected] = useState<BillOfLading | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    bolNo: '',
    shipmentRef: '',
    carrier: '',
    origin: '',
    destination: '',
    issueDate: '',
    eta: '',
    status: 'draft' as BolStatus,
  });

  const filtered = useMemo(() => {
    return bols.filter(b => selectedStatus === 'all' || b.status === selectedStatus);
  }, [bols, selectedStatus]);

  const getStatusBadge = (status: BolStatus) => {
    const styles: Record<BolStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      in_transit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<BolStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      issued: { en: 'Issued', ar: 'صادر' },
      in_transit: { en: 'In Transit', ar: 'في الطريق' },
      delivered: { en: 'Delivered', ar: 'تم التسليم' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const inTransit = bols.filter(b => b.status === 'in_transit').length;
  const delivered = bols.filter(b => b.status === 'delivered').length;
  const draft = bols.filter(b => b.status === 'draft').length;
  const carriers = new Set(bols.map(b => b.carrier)).size;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ bolNo: '', shipmentRef: '', carrier: '', origin: '', destination: '', issueDate: '', eta: '', status: 'draft' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'بوليصة الشحن - SLMS' : 'Bill of Lading - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'بوليصة الشحن' : 'Bill of Lading'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إصدار وتتبع بوليصات الشحن المرتبطة بالشحنات' : 'Issue and track Bills of Lading linked to shipments'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'BOL جديد' : 'New BOL'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><TruckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'في الطريق' : 'In Transit'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{inTransit}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</p>
                <p className="text-xl font-semibold text-green-600">{delivered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"><DocumentTextIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسودة' : 'Draft'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{draft}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><CalendarDaysIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الناقلون' : 'Carriers'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{carriers}</p>
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
              <option value="in_transit">{locale === 'ar' ? 'في الطريق' : 'In Transit'}</option>
              <option value="delivered">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">BOL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الناقل' : 'Carrier'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المسار' : 'Route'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإصدار' : 'Issued'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ETA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.bolNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{b.shipmentRef}</td>
                    <td className="px-4 py-3 text-gray-500">{b.carrier}</td>
                    <td className="px-4 py-3 text-gray-500">{b.origin} → {b.destination}</td>
                    <td className="px-4 py-3 text-gray-500">{b.issueDate}</td>
                    <td className="px-4 py-3 text-gray-500">{b.eta}</td>
                    <td className="px-4 py-3">{getStatusBadge(b.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(b)}><EyeIcon className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل BOL' : 'BOL Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.bolNo}</h3>
                <p className="text-sm text-gray-500">{selected.shipmentRef} • {selected.origin} → {selected.destination}</p>
              </div>
              {getStatusBadge(selected.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الناقل' : 'Carrier'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.carrier}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإصدار' : 'Issued'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.issueDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">ETA</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.eta}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإجراء' : 'Action'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? 'تحديث/إلغاء/تصدير' : 'Update/Cancel/Export'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التحديث (تجريبي)' : 'Updated (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تحديث' : 'Update'}
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

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'BOL جديد' : 'New BOL'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="BOL" value={formData.bolNo} onChange={(e) => setFormData({ ...formData, bolNo: e.target.value })} placeholder="BOL-..." />
            <Input label={locale === 'ar' ? 'الشحنة' : 'Shipment Ref'} value={formData.shipmentRef} onChange={(e) => setFormData({ ...formData, shipmentRef: e.target.value })} placeholder="SHP-..." />
            <Input label={locale === 'ar' ? 'الناقل' : 'Carrier'} value={formData.carrier} onChange={(e) => setFormData({ ...formData, carrier: e.target.value })} />
            <Input label={locale === 'ar' ? 'الإصدار' : 'Issue Date'} value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'المنشأ' : 'Origin'} value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} />
            <Input label={locale === 'ar' ? 'الوجهة' : 'Destination'} value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} />
            <Input label="ETA" value={formData.eta} onChange={(e) => setFormData({ ...formData, eta: e.target.value })} placeholder="YYYY-MM-DD" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="issued">{locale === 'ar' ? 'صادر' : 'Issued'}</option>
                <option value="in_transit">{locale === 'ar' ? 'في الطريق' : 'In Transit'}</option>
                <option value="delivered">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
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
