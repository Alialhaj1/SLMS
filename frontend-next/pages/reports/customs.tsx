import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarIcon,
  EyeIcon,
  ArrowPathIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CustomsReport {
  id: number;
  declarationNo: string;
  type: 'import' | 'export' | 're-export' | 'transit';
  portName: string;
  portNameAr: string;
  customsOffice: string;
  customsOfficeAr: string;
  shipmentCount: number;
  totalValue: number;
  dutiesCollected: number;
  status: 'pending' | 'cleared' | 'held' | 'rejected';
  date: string;
  clearanceTime: number;
}

const mockReports: CustomsReport[] = [
  { id: 1, declarationNo: 'DEC-2024-001', type: 'import', portName: 'Jeddah Islamic Port', portNameAr: 'ميناء جدة الإسلامي', customsOffice: 'Jeddah Customs', customsOfficeAr: 'جمارك جدة', shipmentCount: 45, totalValue: 2500000, dutiesCollected: 125000, status: 'cleared', date: '2024-01-28', clearanceTime: 2 },
  { id: 2, declarationNo: 'DEC-2024-002', type: 'export', portName: 'King Abdulaziz Port', portNameAr: 'ميناء الملك عبدالعزيز', customsOffice: 'Dammam Customs', customsOfficeAr: 'جمارك الدمام', shipmentCount: 32, totalValue: 1800000, dutiesCollected: 0, status: 'pending', date: '2024-01-28', clearanceTime: 0 },
  { id: 3, declarationNo: 'DEC-2024-003', type: 'import', portName: 'King Fahd Airport', portNameAr: 'مطار الملك فهد', customsOffice: 'Riyadh Customs', customsOfficeAr: 'جمارك الرياض', shipmentCount: 28, totalValue: 1200000, dutiesCollected: 60000, status: 'cleared', date: '2024-01-27', clearanceTime: 1 },
  { id: 4, declarationNo: 'DEC-2024-004', type: 'transit', portName: 'Al Batha Border', portNameAr: 'منفذ البطحاء', customsOffice: 'Border Customs', customsOfficeAr: 'جمارك الحدود', shipmentCount: 15, totalValue: 900000, dutiesCollected: 0, status: 'held', date: '2024-01-27', clearanceTime: 0 },
  { id: 5, declarationNo: 'DEC-2024-005', type: 're-export', portName: 'Jeddah Islamic Port', portNameAr: 'ميناء جدة الإسلامي', customsOffice: 'Jeddah Customs', customsOfficeAr: 'جمارك جدة', shipmentCount: 12, totalValue: 450000, dutiesCollected: 0, status: 'cleared', date: '2024-01-26', clearanceTime: 3 },
];

export default function CustomsReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [reports] = useState<CustomsReport[]>(mockReports);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CustomsReport | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredReports = reports.filter(report => {
    const matchesType = selectedType === 'all' || report.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    return matchesType && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    showToast(locale === 'ar' ? `جاري التصدير كـ ${format.toUpperCase()}...` : `Exporting as ${format.toUpperCase()}...`, 'info');
  };

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    showToast(locale === 'ar' ? 'تم تحديث التقارير' : 'Reports refreshed', 'success');
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      import: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      export: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      're-export': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      transit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      import: { en: 'Import', ar: 'استيراد' },
      export: { en: 'Export', ar: 'تصدير' },
      're-export': { en: 'Re-Export', ar: 'إعادة تصدير' },
      transit: { en: 'Transit', ar: 'ترانزيت' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type]?.ar : labels[type]?.en}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      cleared: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      held: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      cleared: { en: 'Cleared', ar: 'تم التخليص' },
      held: { en: 'Held', ar: 'محتجز' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const totalShipments = filteredReports.reduce((sum, r) => sum + r.shipmentCount, 0);
  const totalValue = filteredReports.reduce((sum, r) => sum + r.totalValue, 0);
  const totalDuties = filteredReports.reduce((sum, r) => sum + r.dutiesCollected, 0);
  const avgClearanceTime = filteredReports.filter(r => r.clearanceTime > 0).reduce((sum, r, _, arr) => sum + r.clearanceTime / arr.length, 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير الجمارك - SLMS' : 'Customs Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تقارير الجمارك' : 'Customs Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'البيانات الجمركية وتقارير التخليص' : 'Customs declarations and clearance reports'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRefresh} loading={loading}>
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('excel')}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <TruckIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الشحنات' : 'Total Shipments'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalShipments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي القيمة' : 'Total Value'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرسوم المحصلة' : 'Duties Collected'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalDuties)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط وقت التخليص' : 'Avg Clearance Time'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{avgClearanceTime.toFixed(1)} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="import">{locale === 'ar' ? 'استيراد' : 'Import'}</option>
                <option value="export">{locale === 'ar' ? 'تصدير' : 'Export'}</option>
                <option value="re-export">{locale === 'ar' ? 'إعادة تصدير' : 'Re-Export'}</option>
                <option value="transit">{locale === 'ar' ? 'ترانزيت' : 'Transit'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="cleared">{locale === 'ar' ? 'تم التخليص' : 'Cleared'}</option>
                <option value="held">{locale === 'ar' ? 'محتجز' : 'Held'}</option>
                <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
              </select>
            </div>
            <div className="flex-1" />
            <Button variant="secondary" onClick={() => setShowFilterModal(true)}>
              <FunnelIcon className="h-4 w-4 mr-1" />
              {locale === 'ar' ? 'تصفية متقدمة' : 'Advanced Filter'}
            </Button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم البيان' : 'Declaration No'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الميناء' : 'Port'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشحنات' : 'Shipments'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{report.declarationNo}</span>
                      <p className="text-xs text-gray-500">{report.date}</p>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(report.type)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-white">{locale === 'ar' ? report.portNameAr : report.portName}</span>
                      <p className="text-xs text-gray-500">{locale === 'ar' ? report.customsOfficeAr : report.customsOffice}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{report.shipmentCount}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{formatCurrency(report.totalValue)}</td>
                    <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedReport(report)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleExport('pdf')}>
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Advanced Filter Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title={locale === 'ar' ? 'تصفية متقدمة' : 'Advanced Filter'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'من تاريخ' : 'From Date'}</label>
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => setShowFilterModal(false)}>{locale === 'ar' ? 'تطبيق' : 'Apply'}</Button>
            <Button variant="secondary" onClick={() => { setDateRange({ from: '', to: '' }); setShowFilterModal(false); }}>{locale === 'ar' ? 'إعادة تعيين' : 'Reset'}</Button>
          </div>
        </div>
      </Modal>

      {/* Report Detail Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={locale === 'ar' ? 'تفاصيل التقرير' : 'Report Details'} size="lg">
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{selectedReport.declarationNo}</h3>
                <p className="text-sm text-gray-500">{selectedReport.date}</p>
              </div>
              {getStatusBadge(selectedReport.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="font-medium">{getTypeBadge(selectedReport.type)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الميناء' : 'Port'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedReport.portNameAr : selectedReport.portName}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'عدد الشحنات' : 'Shipments'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedReport.shipmentCount}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedReport.totalValue)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الرسوم المحصلة' : 'Duties'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedReport.dutiesCollected)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'وقت التخليص' : 'Clearance Time'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedReport.clearanceTime || '-'} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => handleExport('pdf')}>
                <PrinterIcon className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button variant="secondary" onClick={() => handleExport('excel')}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
