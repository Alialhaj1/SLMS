import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  DocumentTextIcon,
  FunnelIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CostReport {
  id: number;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  currentPeriod: number;
  previousPeriod: number;
  variance: number;
  variancePercent: number;
  trend: 'up' | 'down' | 'stable';
}

const mockReports: CostReport[] = [
  { id: 1, name: 'Transportation Costs', nameAr: 'تكاليف النقل', category: 'Direct', categoryAr: 'مباشرة', currentPeriod: 125000, previousPeriod: 118000, variance: 7000, variancePercent: 5.9, trend: 'up' },
  { id: 2, name: 'Customs Duties', nameAr: 'الرسوم الجمركية', category: 'Direct', categoryAr: 'مباشرة', currentPeriod: 85000, previousPeriod: 92000, variance: -7000, variancePercent: -7.6, trend: 'down' },
  { id: 3, name: 'Warehouse Rent', nameAr: 'إيجار المستودعات', category: 'Overhead', categoryAr: 'عامة', currentPeriod: 45000, previousPeriod: 45000, variance: 0, variancePercent: 0, trend: 'stable' },
  { id: 4, name: 'Insurance Premiums', nameAr: 'أقساط التأمين', category: 'Overhead', categoryAr: 'عامة', currentPeriod: 32000, previousPeriod: 28000, variance: 4000, variancePercent: 14.3, trend: 'up' },
  { id: 5, name: 'Fuel & Energy', nameAr: 'الوقود والطاقة', category: 'Variable', categoryAr: 'متغيرة', currentPeriod: 28500, previousPeriod: 31200, variance: -2700, variancePercent: -8.7, trend: 'down' },
  { id: 6, name: 'Labor Costs', nameAr: 'تكاليف العمالة', category: 'Direct', categoryAr: 'مباشرة', currentPeriod: 156000, previousPeriod: 148000, variance: 8000, variancePercent: 5.4, trend: 'up' },
  { id: 7, name: 'Packaging Materials', nameAr: 'مواد التغليف', category: 'Variable', categoryAr: 'متغيرة', currentPeriod: 18500, previousPeriod: 19200, variance: -700, variancePercent: -3.6, trend: 'down' },
  { id: 8, name: 'Technology & Software', nameAr: 'التقنية والبرمجيات', category: 'Overhead', categoryAr: 'عامة', currentPeriod: 22000, previousPeriod: 20000, variance: 2000, variancePercent: 10, trend: 'up' },
];

const pricingData = [
  { route: 'Jeddah → Riyadh', routeAr: 'جدة ← الرياض', baseCost: 850, markup: 25, sellingPrice: 1062.5, margin: 212.5, marginPercent: 20 },
  { route: 'Dammam → Jeddah', routeAr: 'الدمام ← جدة', baseCost: 1200, markup: 22, sellingPrice: 1464, margin: 264, marginPercent: 18 },
  { route: 'Riyadh → Dammam', routeAr: 'الرياض ← الدمام', baseCost: 650, markup: 28, sellingPrice: 832, margin: 182, marginPercent: 21.9 },
  { route: 'International Import', routeAr: 'استيراد دولي', baseCost: 3500, markup: 18, sellingPrice: 4130, margin: 630, marginPercent: 15.3 },
];

export default function CostsPricingReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [reports] = useState<CostReport[]>(mockReports);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState<'costs' | 'pricing'>('costs');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CostReport | null>(null);

  const categories = ['all', 'Direct', 'Overhead', 'Variable'];

  const filteredReports = reports.filter(report =>
    selectedCategory === 'all' || report.category === selectedCategory
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    showToast(locale === 'ar' ? `جاري التصدير كـ ${format.toUpperCase()}...` : `Exporting as ${format.toUpperCase()}...`, 'info');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
      case 'down': return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      default: return <span className="h-4 w-4 text-gray-400">—</span>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      Direct: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      Overhead: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      Variable: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    const labels: Record<string, { ar: string }> = {
      Direct: { ar: 'مباشرة' },
      Overhead: { ar: 'عامة' },
      Variable: { ar: 'متغيرة' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[category])}>
        {locale === 'ar' ? labels[category]?.ar : category}
      </span>
    );
  };

  const totalCurrent = filteredReports.reduce((sum, r) => sum + r.currentPeriod, 0);
  const totalPrevious = filteredReports.reduce((sum, r) => sum + r.previousPeriod, 0);
  const totalVariance = totalCurrent - totalPrevious;
  const avgMargin = pricingData.reduce((sum, p) => sum + p.marginPercent, 0) / pricingData.length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير التكاليف والتسعير - SLMS' : 'Costs & Pricing Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تقارير التكاليف والتسعير' : 'Costs & Pricing Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تحليل التكاليف وهوامش الربح' : 'Cost analysis and profit margins'}
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
                <CurrencyDollarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي التكاليف' : 'Total Costs'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalCurrent)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفترة السابقة' : 'Previous Period'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalPrevious)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className={clsx('p-2 rounded-lg', totalVariance > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-green-100 dark:bg-green-900/30 text-green-600')}>
                {totalVariance > 0 ? <ArrowTrendingUpIcon className="h-5 w-5" /> : <ArrowTrendingDownIcon className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرق' : 'Variance'}</p>
                <p className={clsx('text-xl font-semibold', totalVariance > 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(totalVariance)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <CalculatorIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوسط الهامش' : 'Avg Margin'}</p>
                <p className="text-xl font-semibold text-green-600">{avgMargin.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('costs')}
                className={clsx(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'costs'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                )}
              >
                {locale === 'ar' ? 'تحليل التكاليف' : 'Cost Analysis'}
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={clsx(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'pricing'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                )}
              >
                {locale === 'ar' ? 'جدول التسعير' : 'Pricing Table'}
              </button>
            </nav>
          </div>

          {activeTab === 'costs' && (
            <div className="p-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={clsx(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      selectedCategory === cat
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    {cat === 'all' ? (locale === 'ar' ? 'الكل' : 'All') : (locale === 'ar' && cat === 'Direct' ? 'مباشرة' : locale === 'ar' && cat === 'Overhead' ? 'عامة' : locale === 'ar' && cat === 'Variable' ? 'متغيرة' : cat)}
                  </button>
                ))}
              </div>

              {/* Cost Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البند' : 'Item'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة الحالية' : 'Current'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة السابقة' : 'Previous'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفرق' : 'Variance'}</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاتجاه' : 'Trend'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setSelectedReport(report)}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? report.nameAr : report.name}</td>
                        <td className="px-4 py-3">{getCategoryBadge(report.category)}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(report.currentPeriod)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(report.previousPeriod)}</td>
                        <td className={clsx('px-4 py-3 text-right', report.variance > 0 ? 'text-red-600' : report.variance < 0 ? 'text-green-600' : 'text-gray-500')}>
                          {report.variance > 0 ? '+' : ''}{formatCurrency(report.variance)} ({report.variancePercent > 0 ? '+' : ''}{report.variancePercent}%)
                        </td>
                        <td className="px-4 py-3 text-center">{getTrendIcon(report.trend)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? 'الإجمالي' : 'Total'}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(totalCurrent)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(totalPrevious)}</td>
                      <td className={clsx('px-4 py-3 text-right', totalVariance > 0 ? 'text-red-600' : 'text-green-600')}>
                        {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المسار' : 'Route'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التكلفة الأساسية' : 'Base Cost'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'هامش الربح %' : 'Markup %'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'سعر البيع' : 'Selling Price'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الهامش' : 'Margin'}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'نسبة الهامش' : 'Margin %'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {pricingData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? item.routeAr : item.route}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(item.baseCost)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.markup}%</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(item.sellingPrice)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(item.margin)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">{item.marginPercent}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost Detail Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={locale === 'ar' ? 'تفاصيل التكلفة' : 'Cost Details'} size="lg">
        {selectedReport && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{locale === 'ar' ? selectedReport.nameAr : selectedReport.name}</h3>
              <p className="mt-1">{getCategoryBadge(selectedReport.category)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفترة الحالية' : 'Current Period'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedReport.currentPeriod)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفترة السابقة' : 'Previous Period'}</p>
                <p className="text-xl font-semibold text-gray-500">{formatCurrency(selectedReport.previousPeriod)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفرق' : 'Variance'}</p>
                <p className={clsx('text-xl font-semibold', selectedReport.variance > 0 ? 'text-red-600' : selectedReport.variance < 0 ? 'text-green-600' : 'text-gray-500')}>
                  {selectedReport.variance > 0 ? '+' : ''}{formatCurrency(selectedReport.variance)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'نسبة التغير' : 'Change %'}</p>
                <p className={clsx('text-xl font-semibold', selectedReport.variancePercent > 0 ? 'text-red-600' : selectedReport.variancePercent < 0 ? 'text-green-600' : 'text-gray-500')}>
                  {selectedReport.variancePercent > 0 ? '+' : ''}{selectedReport.variancePercent}%
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => handleExport('pdf')}>
                <DocumentTextIcon className="h-4 w-4 mr-1" />
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
