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
  DocumentDuplicateIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ClearanceDocStatus = 'draft' | 'submitted' | 'under_review' | 'cleared' | 'rejected';

interface ClearanceDocument {
  id: number;
  referenceNo: string;
  shipmentRef: string;
  importer: string;
  importerAr: string;
  port: string;
  portAr: string;
  submittedAt?: string;
  clearedAt?: string;
  status: ClearanceDocStatus;
}

const mockDocs: ClearanceDocument[] = [
  {
    id: 1,
    referenceNo: 'CD-2025-00021',
    shipmentRef: 'SHP-90812',
    importer: 'Al Riyadh Trading',
    importerAr: 'تجارة الرياض',
    port: 'Jeddah Port',
    portAr: 'ميناء جدة',
    submittedAt: '2025-12-10',
    clearedAt: '2025-12-12',
    status: 'cleared',
  },
  {
    id: 2,
    referenceNo: 'CD-2025-00034',
    shipmentRef: 'SHP-91341',
    importer: 'Gulf Retail Group',
    importerAr: 'مجموعة الخليج للتجزئة',
    port: 'Dammam Port',
    portAr: 'ميناء الدمام',
    submittedAt: '2025-12-20',
    clearedAt: undefined,
    status: 'under_review',
  },
  {
    id: 3,
    referenceNo: 'CD-2025-00039',
    shipmentRef: 'SHP-91602',
    importer: 'Northern Supplies',
    importerAr: 'إمدادات الشمال',
    port: 'Riyadh Dry Port',
    portAr: 'الميناء الجاف بالرياض',
    submittedAt: '2025-12-24',
    clearedAt: undefined,
    status: 'submitted',
  },
  {
    id: 4,
    referenceNo: 'CD-2025-00005',
    shipmentRef: 'SHP-88010',
    importer: 'Desert Electronics',
    importerAr: 'إلكترونيات الصحراء',
    port: 'Jeddah Port',
    portAr: 'ميناء جدة',
    submittedAt: '2025-11-02',
    clearedAt: undefined,
    status: 'rejected',
  },
];

export default function ClearanceDocumentsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.Customs.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.Customs.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Logistics.Customs.Edit]);

  const [items] = useState<ClearanceDocument[]>(mockDocs);
  const [status, setStatus] = useState<'all' | ClearanceDocStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ClearanceDocument | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    referenceNo: '',
    shipmentRef: '',
    importer: '',
    importerAr: '',
    port: '',
    portAr: '',
    status: 'draft' as ClearanceDocStatus,
    submittedAt: '',
  });

  const statusLabel = (s: ClearanceDocStatus) => {
    const labels: Record<ClearanceDocStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      submitted: { en: 'Submitted', ar: 'مرسل' },
      under_review: { en: 'Under Review', ar: 'قيد المراجعة' },
      cleared: { en: 'Cleared', ar: 'مخلّص' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
    };
    return locale === 'ar' ? labels[s].ar : labels[s].en;
  };

  const statusBadge = (s: ClearanceDocStatus) => {
    const styles: Record<ClearanceDocStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      cleared: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>
        {statusLabel(s)}
      </span>
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      const sOk = status === 'all' || d.status === status;
      const qOk =
        !q ||
        d.referenceNo.toLowerCase().includes(q) ||
        d.shipmentRef.toLowerCase().includes(q) ||
        d.importer.toLowerCase().includes(q) ||
        d.importerAr.toLowerCase().includes(q) ||
        d.port.toLowerCase().includes(q) ||
        d.portAr.toLowerCase().includes(q);
      return sOk && qOk;
    });
  }, [items, status, search]);

  const totalCount = items.length;
  const clearedCount = items.filter((i) => i.status === 'cleared').length;
  const pendingCount = items.filter((i) => i.status === 'submitted' || i.status === 'under_review').length;
  const rejectedCount = items.filter((i) => i.status === 'rejected').length;

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
    showToast(locale === 'ar' ? 'تم إنشاء المستند (تجريبي)' : 'Document created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ referenceNo: '', shipmentRef: '', importer: '', importerAr: '', port: '', portAr: '', status: 'draft', submittedAt: '' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'مستندات التخليص - SLMS' : 'Clearance Documents - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <DocumentDuplicateIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض مستندات التخليص.' : "You don't have permission to view clearance documents."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مستندات التخليص - SLMS' : 'Clearance Documents - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <DocumentDuplicateIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'مستندات التخليص' : 'Clearance Documents'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متابعة مستندات التخليص الجمركي وحالاتها' : 'Track customs clearance documents and statuses'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'مستند جديد' : 'New Document'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد الإجراء' : 'In Progress'}</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مخلّص' : 'Cleared'}</p>
            <p className="text-2xl font-bold text-green-600">{clearedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</p>
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-80">
                <Input
                  label={locale === 'ar' ? 'بحث' : 'Search'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === 'ar' ? 'بحث بالمرجع أو رقم الشحنة أو المستورد...' : 'Search by reference, shipment, or importer...'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                  <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                  <option value="submitted">{locale === 'ar' ? 'مرسل' : 'Submitted'}</option>
                  <option value="under_review">{locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}</option>
                  <option value="cleared">{locale === 'ar' ? 'مخلّص' : 'Cleared'}</option>
                  <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستورد' : 'Importer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المنفذ' : 'Port'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ الإرسال' : 'Submitted'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ التخليص' : 'Cleared'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.referenceNo}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{d.shipmentRef}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? d.importerAr : d.importer}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? d.portAr : d.port}</td>
                    <td className="px-4 py-3 text-gray-500">{d.submittedAt || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.clearedAt || '-'}</td>
                    <td className="px-4 py-3">{statusBadge(d.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(d)}>
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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل المستند' : 'Document Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.referenceNo}</h3>
                <p className="text-sm text-gray-500">{selected.shipmentRef}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المستورد' : 'Importer'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.importerAr : selected.importer}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المنفذ' : 'Port'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.portAr : selected.port}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الإرسال' : 'Submitted At'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.submittedAt || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ التخليص' : 'Cleared At'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.clearedAt || '-'}</p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
                <Button onClick={() => showToast(locale === 'ar' ? 'تم تعليمها كمخلّصة (تجريبي)' : 'Marked as cleared (demo)', 'success')}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تخليص' : 'Clear'}
                </Button>
                <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تم تعليمها قيد المراجعة (تجريبي)' : 'Marked under review (demo)', 'info')}>
                  <ClockIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}
                </Button>
                <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الرفض (تجريبي)' : 'Rejected (demo)', 'error')}>
                  <XCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'رفض' : 'Reject'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'مستند تخليص جديد' : 'New Clearance Document'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'المرجع' : 'Reference No.'} value={formData.referenceNo} onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })} placeholder="CD-2025-00040" />
            <Input label={locale === 'ar' ? 'رقم الشحنة' : 'Shipment Ref'} value={formData.shipmentRef} onChange={(e) => setFormData({ ...formData, shipmentRef: e.target.value })} placeholder="SHP-99999" />
            <Input label={locale === 'ar' ? 'المستورد (EN)' : 'Importer (EN)'} value={formData.importer} onChange={(e) => setFormData({ ...formData, importer: e.target.value })} />
            <Input label={locale === 'ar' ? 'المستورد (AR)' : 'Importer (AR)'} value={formData.importerAr} onChange={(e) => setFormData({ ...formData, importerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'المنفذ (EN)' : 'Port (EN)'} value={formData.port} onChange={(e) => setFormData({ ...formData, port: e.target.value })} />
            <Input label={locale === 'ar' ? 'المنفذ (AR)' : 'Port (AR)'} value={formData.portAr} onChange={(e) => setFormData({ ...formData, portAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="submitted">{locale === 'ar' ? 'مرسل' : 'Submitted'}</option>
                <option value="under_review">{locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'تاريخ الإرسال' : 'Submitted At'} type="date" value={formData.submittedAt} onChange={(e) => setFormData({ ...formData, submittedAt: e.target.value })} />
          </div>

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 mt-0.5" />
              <p className="text-sm">{locale === 'ar' ? 'هذه واجهة تجريبية. الربط مع API سيتم لاحقاً.' : 'This is a demo UI. API integration will come later.'}</p>
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
