import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  UsersIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface HRReport {
  id: number;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: 'payroll' | 'attendance' | 'leave' | 'performance' | 'recruitment';
  type: 'summary' | 'detailed' | 'analytical';
  lastGenerated: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on-demand';
}

const mockReports: HRReport[] = [
  { id: 1, name: 'Monthly Payroll Report', nameAr: 'تقرير الرواتب الشهري', description: 'Complete payroll breakdown by department', descriptionAr: 'تفصيل الرواتب الكامل حسب القسم', category: 'payroll', type: 'detailed', lastGenerated: '2024-01-28', frequency: 'monthly' },
  { id: 2, name: 'Attendance Summary', nameAr: 'ملخص الحضور', description: 'Daily attendance and punctuality report', descriptionAr: 'تقرير الحضور والالتزام اليومي', category: 'attendance', type: 'summary', lastGenerated: '2024-01-28', frequency: 'daily' },
  { id: 3, name: 'Leave Balance Report', nameAr: 'تقرير رصيد الإجازات', description: 'Employee leave balances and usage', descriptionAr: 'أرصدة إجازات الموظفين واستخدامها', category: 'leave', type: 'detailed', lastGenerated: '2024-01-27', frequency: 'weekly' },
  { id: 4, name: 'Performance Review Summary', nameAr: 'ملخص تقييم الأداء', description: 'Quarterly performance evaluations', descriptionAr: 'تقييمات الأداء الفصلية', category: 'performance', type: 'analytical', lastGenerated: '2024-01-15', frequency: 'monthly' },
  { id: 5, name: 'Overtime Analysis', nameAr: 'تحليل العمل الإضافي', description: 'Overtime hours and costs by department', descriptionAr: 'ساعات وتكاليف العمل الإضافي حسب القسم', category: 'payroll', type: 'analytical', lastGenerated: '2024-01-26', frequency: 'weekly' },
  { id: 6, name: 'Recruitment Pipeline', nameAr: 'خط التوظيف', description: 'Active job openings and candidates', descriptionAr: 'الوظائف المفتوحة والمرشحين النشطين', category: 'recruitment', type: 'summary', lastGenerated: null, frequency: 'on-demand' },
  { id: 7, name: 'Employee Turnover Report', nameAr: 'تقرير دوران الموظفين', description: 'Hiring and separation statistics', descriptionAr: 'إحصائيات التوظيف والفصل', category: 'recruitment', type: 'analytical', lastGenerated: '2024-01-20', frequency: 'monthly' },
  { id: 8, name: 'Training Hours Report', nameAr: 'تقرير ساعات التدريب', description: 'Training completion and hours', descriptionAr: 'إتمام التدريب والساعات', category: 'performance', type: 'detailed', lastGenerated: '2024-01-25', frequency: 'monthly' },
];

const stats = {
  totalEmployees: 156,
  activeToday: 142,
  onLeave: 8,
  newHires: 5,
};

export default function HRReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [reports] = useState<HRReport[]>(mockReports);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<HRReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const categories = [
    { value: 'all', label: 'All', labelAr: 'الكل' },
    { value: 'payroll', label: 'Payroll', labelAr: 'الرواتب' },
    { value: 'attendance', label: 'Attendance', labelAr: 'الحضور' },
    { value: 'leave', label: 'Leave', labelAr: 'الإجازات' },
    { value: 'performance', label: 'Performance', labelAr: 'الأداء' },
    { value: 'recruitment', label: 'Recruitment', labelAr: 'التوظيف' },
  ];

  const filteredReports = reports.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) || report.nameAr.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleGenerate = async (report: HRReport) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    showToast(locale === 'ar' ? 'تم إنشاء التقرير بنجاح' : 'Report generated successfully', 'success');
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    showToast(locale === 'ar' ? `جاري التصدير كـ ${format.toUpperCase()}...` : `Exporting as ${format.toUpperCase()}...`, 'info');
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      payroll: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      attendance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      leave: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      performance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      recruitment: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      payroll: { en: 'Payroll', ar: 'الرواتب' },
      attendance: { en: 'Attendance', ar: 'الحضور' },
      leave: { en: 'Leave', ar: 'الإجازات' },
      performance: { en: 'Performance', ar: 'الأداء' },
      recruitment: { en: 'Recruitment', ar: 'التوظيف' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[category])}>
        {locale === 'ar' ? labels[category]?.ar : labels[category]?.en}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      summary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      detailed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      analytical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      summary: { en: 'Summary', ar: 'ملخص' },
      detailed: { en: 'Detailed', ar: 'مفصل' },
      analytical: { en: 'Analytical', ar: 'تحليلي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type]?.ar : labels[type]?.en}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير الموارد البشرية - SLMS' : 'HR Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <UsersIcon className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تقارير الموارد البشرية' : 'HR Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تقارير الموظفين والرواتب والحضور' : 'Employee, payroll, and attendance reports'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
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
                <UserGroupIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الحاضرون اليوم' : 'Active Today'}</p>
                <p className="text-xl font-semibold text-green-600">{stats.activeToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'في إجازة' : 'On Leave'}</p>
                <p className="text-xl font-semibold text-purple-600">{stats.onLeave}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600">
                <BriefcaseIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'موظفون جدد' : 'New Hires'}</p>
                <p className="text-xl font-semibold text-pink-600">{stats.newHires}</p>
              </div>
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    selectedCategory === cat.value
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {locale === 'ar' ? cat.labelAr : cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? report.nameAr : report.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{locale === 'ar' ? report.descriptionAr : report.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {getCategoryBadge(report.category)}
                {getTypeBadge(report.type)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {report.lastGenerated || (locale === 'ar' ? 'لم يتم الإنشاء' : 'Never generated')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleGenerate(report)} loading={loading}>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  {locale === 'ar' ? 'إنشاء' : 'Generate'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSelectedReport(report)}>
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {locale === 'ar' ? 'عرض' : 'View'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد تقارير مطابقة' : 'No matching reports found'}</p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={locale === 'ar' ? 'تفاصيل التقرير' : 'Report Details'} size="lg">
        {selectedReport && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{locale === 'ar' ? selectedReport.nameAr : selectedReport.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{locale === 'ar' ? selectedReport.descriptionAr : selectedReport.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium mt-1">{getCategoryBadge(selectedReport.category)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="font-medium mt-1">{getTypeBadge(selectedReport.type)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نطاق التاريخ' : 'Date Range'}</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => handleGenerate(selectedReport)} loading={loading}>{locale === 'ar' ? 'إنشاء الآن' : 'Generate Now'}</Button>
              <Button variant="secondary" onClick={() => handleExport('pdf')}>
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
