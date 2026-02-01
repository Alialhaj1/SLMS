import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentDuplicateIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  TruckIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ShippingDocument {
  id: number;
  documentNumber: string;
  shipmentRef: string;
  type: 'bill-of-lading' | 'packing-list' | 'commercial-invoice' | 'certificate-of-origin' | 'customs-declaration';
  status: 'draft' | 'pending' | 'approved' | 'issued' | 'expired';
  issueDate: string;
  expiryDate: string | null;
  origin: string;
  destination: string;
}

const mockDocuments: ShippingDocument[] = [
  { id: 1, documentNumber: 'BL-2024-001', shipmentRef: 'SHP-001', type: 'bill-of-lading', status: 'issued', issueDate: '2024-01-15', expiryDate: null, origin: 'Shanghai', destination: 'Jeddah' },
  { id: 2, documentNumber: 'PL-2024-002', shipmentRef: 'SHP-001', type: 'packing-list', status: 'issued', issueDate: '2024-01-15', expiryDate: null, origin: 'Shanghai', destination: 'Jeddah' },
  { id: 3, documentNumber: 'CI-2024-003', shipmentRef: 'SHP-002', type: 'commercial-invoice', status: 'approved', issueDate: '2024-01-20', expiryDate: null, origin: 'Dubai', destination: 'Riyadh' },
  { id: 4, documentNumber: 'CO-2024-004', shipmentRef: 'SHP-002', type: 'certificate-of-origin', status: 'pending', issueDate: '2024-01-22', expiryDate: '2024-07-22', origin: 'Dubai', destination: 'Riyadh' },
  { id: 5, documentNumber: 'CD-2024-005', shipmentRef: 'SHP-003', type: 'customs-declaration', status: 'draft', issueDate: '2024-01-25', expiryDate: null, origin: 'Singapore', destination: 'Dammam' },
];

export default function ShippingDocumentsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [documents] = useState<ShippingDocument[]>(mockDocuments);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<ShippingDocument | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredDocuments = documents.filter(doc => {
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    return matchesType && matchesStatus;
  });

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'bill-of-lading': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'packing-list': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'commercial-invoice': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'certificate-of-origin': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'customs-declaration': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      'bill-of-lading': { en: 'Bill of Lading', ar: 'بوليصة الشحن' },
      'packing-list': { en: 'Packing List', ar: 'قائمة التعبئة' },
      'commercial-invoice': { en: 'Commercial Invoice', ar: 'الفاتورة التجارية' },
      'certificate-of-origin': { en: 'Certificate of Origin', ar: 'شهادة المنشأ' },
      'customs-declaration': { en: 'Customs Declaration', ar: 'البيان الجمركي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type]?.ar : labels[type]?.en}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      issued: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      approved: { en: 'Approved', ar: 'معتمد' },
      issued: { en: 'Issued', ar: 'صادر' },
      expired: { en: 'Expired', ar: 'منتهي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const totalDocs = documents.length;
  const issuedDocs = documents.filter(d => d.status === 'issued').length;
  const pendingDocs = documents.filter(d => d.status === 'pending' || d.status === 'draft').length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مستندات الشحن - SLMS' : 'Shipping Documents - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentDuplicateIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'مستندات الشحن' : 'Shipping Documents'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة وثائق الشحن والتصدير' : 'Manage shipping and export documents'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'مستند جديد' : 'New Document'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><DocumentTextIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المستندات' : 'Total Documents'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalDocs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'صادرة' : 'Issued'}</p>
                <p className="text-xl font-semibold text-green-600">{issuedDocs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><ClockIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد المعالجة' : 'In Progress'}</p>
                <p className="text-xl font-semibold text-yellow-600">{pendingDocs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><TruckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الشحنات' : 'Shipments'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{new Set(documents.map(d => d.shipmentRef)).size}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              <option value="bill-of-lading">{locale === 'ar' ? 'بوليصة الشحن' : 'Bill of Lading'}</option>
              <option value="packing-list">{locale === 'ar' ? 'قائمة التعبئة' : 'Packing List'}</option>
              <option value="commercial-invoice">{locale === 'ar' ? 'الفاتورة التجارية' : 'Commercial Invoice'}</option>
              <option value="certificate-of-origin">{locale === 'ar' ? 'شهادة المنشأ' : 'Certificate of Origin'}</option>
              <option value="customs-declaration">{locale === 'ar' ? 'البيان الجمركي' : 'Customs Declaration'}</option>
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
              <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
              <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
              <option value="issued">{locale === 'ar' ? 'صادر' : 'Issued'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم المستند' : 'Doc #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المسار' : 'Route'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{doc.documentNumber}</span>
                      <p className="text-xs text-gray-500">{doc.issueDate}</p>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(doc.type)}</td>
                    <td className="px-4 py-3 text-gray-500">{doc.shipmentRef}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">{doc.origin} → {doc.destination}</td>
                    <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedDocument(doc)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري التحميل...' : 'Downloading...', 'info')}><ArrowDownTrayIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'info')}><PrinterIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedDocument} onClose={() => setSelectedDocument(null)} title={locale === 'ar' ? 'تفاصيل المستند' : 'Document Details'} size="lg">
        {selectedDocument && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{selectedDocument.documentNumber}</h3>
              <div className="flex gap-2">{getTypeBadge(selectedDocument.type)}{getStatusBadge(selectedDocument.status)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الشحنة' : 'Shipment'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedDocument.shipmentRef}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedDocument.issueDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المنشأ' : 'Origin'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedDocument.origin}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الوجهة' : 'Destination'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedDocument.destination}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'جاري التحميل...' : 'Downloading...', 'info')}><ArrowDownTrayIcon className="h-4 w-4 mr-1" />PDF</Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'info')}><PrinterIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'طباعة' : 'Print'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={locale === 'ar' ? 'مستند جديد' : 'New Document'}>
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نموذج إنشاء مستند جديد' : 'Create new document form'}</p>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => { setShowCreateModal(false); showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
