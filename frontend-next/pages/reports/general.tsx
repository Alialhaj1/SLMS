import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarIcon,
  ChartBarIcon,
  TableCellsIcon,
  EyeIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Report {
  id: number;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  categoryAr: string;
  type: 'table' | 'chart' | 'summary';
  lastRun: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on-demand';
}

const mockReports: Report[] = [
  { id: 1, name: 'Daily Operations Summary', nameAr: 'ملخص العمليات اليومية', description: 'Overview of daily shipments and activities', descriptionAr: 'نظرة عامة على الشحنات والأنشطة اليومية', category: 'Operations', categoryAr: 'العمليات', type: 'summary', lastRun: '2024-01-28 09:00', frequency: 'daily' },
  { id: 2, name: 'Weekly Performance Report', nameAr: 'تقرير الأداء الأسبوعي', description: 'Weekly metrics and KPIs', descriptionAr: 'المقاييس ومؤشرات الأداء الأسبوعية', category: 'Performance', categoryAr: 'الأداء', type: 'chart', lastRun: '2024-01-27 08:00', frequency: 'weekly' },
  { id: 3, name: 'Monthly Revenue Analysis', nameAr: 'تحليل الإيرادات الشهرية', description: 'Detailed revenue breakdown', descriptionAr: 'تفصيل الإيرادات المفصل', category: 'Financial', categoryAr: 'مالي', type: 'table', lastRun: '2024-01-01 06:00', frequency: 'monthly' },
  { id: 4, name: 'Shipment Status Report', nameAr: 'تقرير حالة الشحنات', description: 'Current status of all shipments', descriptionAr: 'الحالة الحالية لجميع الشحنات', category: 'Operations', categoryAr: 'العمليات', type: 'table', lastRun: '2024-01-28 10:30', frequency: 'on-demand' },
  { id: 5, name: 'Customer Activity Summary', nameAr: 'ملخص نشاط العملاء', description: 'Customer transactions and engagement', descriptionAr: 'معاملات العملاء والتفاعل', category: 'Customers', categoryAr: 'العملاء', type: 'summary', lastRun: '2024-01-26 14:00', frequency: 'weekly' },
  { id: 6, name: 'Inventory Movement Report', nameAr: 'تقرير حركة المخزون', description: 'Stock movements and levels', descriptionAr: 'حركات المخزون ومستوياته', category: 'Inventory', categoryAr: 'المخزون', type: 'table', lastRun: null, frequency: 'on-demand' },
];

const categories = ['All', 'Operations', 'Performance', 'Financial', 'Customers', 'Inventory'];
const categoriesAr = ['الكل', 'العمليات', 'الأداء', 'مالي', 'العملاء', 'المخزون'];

export default function GeneralReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [reports] = useState<Report[]>(mockReports);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const filteredReports = reports.filter(report => {
    const matchesCategory = selectedCategory === 'All' || report.category === selectedCategory;
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.nameAr.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleRunReport = async (report: Report) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    showToast(locale === 'ar' ? 'تم تشغيل التقرير بنجاح' : 'Report executed successfully', 'success');
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    showToast(locale === 'ar' ? `جاري التصدير كـ ${format.toUpperCase()}...` : `Exporting as ${format.toUpperCase()}...`, 'info');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chart': return <ChartBarIcon className="h-4 w-4" />;
      case 'table': return <TableCellsIcon className="h-4 w-4" />;
      default: return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      chart: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      table: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      summary: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      chart: { en: 'Chart', ar: 'رسم بياني' },
      table: { en: 'Table', ar: 'جدول' },
      summary: { en: 'Summary', ar: 'ملخص' },
    };
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {getTypeIcon(type)}
        {locale === 'ar' ? labels[type]?.ar : labels[type]?.en}
      </span>
    );
  };

  const getFrequencyBadge = (frequency: string) => {
    const styles: Record<string, string> = {
      daily: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      weekly: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      monthly: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'on-demand': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      daily: { en: 'Daily', ar: 'يومي' },
      weekly: { en: 'Weekly', ar: 'أسبوعي' },
      monthly: { en: 'Monthly', ar: 'شهري' },
      'on-demand': { en: 'On Demand', ar: 'عند الطلب' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[frequency])}>
        {locale === 'ar' ? labels[frequency]?.ar : labels[frequency]?.en}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'التقارير العامة - SLMS' : 'General Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'التقارير العامة' : 'General Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تقارير شاملة للعمليات والأداء' : 'Comprehensive operations and performance reports'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث في التقارير...' : 'Search reports...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat, idx) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {locale === 'ar' ? categoriesAr[idx] : cat}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setShowFilterModal(true)}>
              <FunnelIcon className="h-4 w-4 mr-1" />
              {locale === 'ar' ? 'تصفية متقدمة' : 'Advanced Filter'}
            </Button>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? report.nameAr : report.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{locale === 'ar' ? report.descriptionAr : report.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {getTypeBadge(report.type)}
                {getFrequencyBadge(report.frequency)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {report.lastRun ? report.lastRun : (locale === 'ar' ? 'لم يتم التشغيل' : 'Never run')}
                </span>
                <span>{locale === 'ar' ? report.categoryAr : report.category}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleRunReport(report)} loading={loading}>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  {locale === 'ar' ? 'تشغيل' : 'Run'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSelectedReport(report)}>
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {locale === 'ar' ? 'عرض' : 'View'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleExport('pdf')}>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد تقارير مطابقة' : 'No matching reports found'}</p>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title={locale === 'ar' ? 'تصفية متقدمة' : 'Advanced Filter'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'من تاريخ' : 'From Date'}
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {locale === 'ar' ? 'إلى تاريخ' : 'To Date'}
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => setShowFilterModal(false)}>{locale === 'ar' ? 'تطبيق' : 'Apply'}</Button>
            <Button variant="secondary" onClick={() => { setDateRange({ from: '', to: '' }); setShowFilterModal(false); }}>
              {locale === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Report Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={locale === 'ar' ? 'تفاصيل التقرير' : 'Report Details'} size="lg">
        {selectedReport && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{locale === 'ar' ? selectedReport.nameAr : selectedReport.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{locale === 'ar' ? selectedReport.descriptionAr : selectedReport.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedReport.categoryAr : selectedReport.category}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'التكرار' : 'Frequency'}</p>
                <p className="font-medium">{getFrequencyBadge(selectedReport.frequency)}</p>
              </div>
            </div>
            <div className="border-t dark:border-gray-700 pt-4 flex gap-2">
              <Button onClick={() => handleRunReport(selectedReport)}>{locale === 'ar' ? 'تشغيل الآن' : 'Run Now'}</Button>
              <Button variant="secondary" onClick={() => handleExport('excel')}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button variant="secondary" onClick={() => handleExport('pdf')}>
                <PrinterIcon className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
