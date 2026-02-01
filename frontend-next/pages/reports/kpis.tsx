import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UsersIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface KPI {
  id: number;
  name: string;
  nameAr: string;
  value: number;
  unit: string;
  unitAr: string;
  target: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  status: 'on-track' | 'at-risk' | 'off-track';
  category: string;
  categoryAr: string;
  icon: any;
}

const mockKPIs: KPI[] = [
  { id: 1, name: 'On-Time Delivery Rate', nameAr: 'معدل التسليم في الوقت المحدد', value: 94.5, unit: '%', unitAr: '%', target: 95, previousValue: 92.3, trend: 'up', status: 'on-track', category: 'Operations', categoryAr: 'العمليات', icon: TruckIcon },
  { id: 2, name: 'Customer Satisfaction', nameAr: 'رضا العملاء', value: 4.2, unit: '/5', unitAr: '/5', target: 4.5, previousValue: 4.1, trend: 'up', status: 'at-risk', category: 'Customer', categoryAr: 'العملاء', icon: UsersIcon },
  { id: 3, name: 'Revenue Growth', nameAr: 'نمو الإيرادات', value: 12.8, unit: '%', unitAr: '%', target: 15, previousValue: 14.2, trend: 'down', status: 'at-risk', category: 'Financial', categoryAr: 'مالي', icon: CurrencyDollarIcon },
  { id: 4, name: 'Shipments per Day', nameAr: 'الشحنات في اليوم', value: 156, unit: '', unitAr: '', target: 150, previousValue: 142, trend: 'up', status: 'on-track', category: 'Operations', categoryAr: 'العمليات', icon: TruckIcon },
  { id: 5, name: 'Average Clearance Time', nameAr: 'متوسط وقت التخليص', value: 2.3, unit: 'days', unitAr: 'يوم', target: 2, previousValue: 2.5, trend: 'up', status: 'at-risk', category: 'Customs', categoryAr: 'الجمارك', icon: ClockIcon },
  { id: 6, name: 'Cost per Shipment', nameAr: 'التكلفة لكل شحنة', value: 245, unit: 'SAR', unitAr: 'ر.س', target: 250, previousValue: 260, trend: 'up', status: 'on-track', category: 'Financial', categoryAr: 'مالي', icon: CurrencyDollarIcon },
  { id: 7, name: 'Warehouse Utilization', nameAr: 'استخدام المستودع', value: 78, unit: '%', unitAr: '%', target: 85, previousValue: 75, trend: 'up', status: 'at-risk', category: 'Warehouse', categoryAr: 'المستودع', icon: BuildingOfficeIcon },
  { id: 8, name: 'Employee Productivity', nameAr: 'إنتاجية الموظفين', value: 23, unit: 'shipments/employee', unitAr: 'شحنة/موظف', target: 25, previousValue: 21, trend: 'up', status: 'on-track', category: 'HR', categoryAr: 'موارد بشرية', icon: UsersIcon },
];

const periods = [
  { value: 'today', label: 'Today', labelAr: 'اليوم' },
  { value: 'week', label: 'This Week', labelAr: 'هذا الأسبوع' },
  { value: 'month', label: 'This Month', labelAr: 'هذا الشهر' },
  { value: 'quarter', label: 'This Quarter', labelAr: 'هذا الربع' },
  { value: 'year', label: 'This Year', labelAr: 'هذا العام' },
];

export default function KPIsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [kpis] = useState<KPI[]>(mockKPIs);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  const categories = ['All', ...new Set(kpis.map(k => k.category))];

  const filteredKPIs = kpis.filter(kpi =>
    selectedCategory === 'All' || kpi.category === selectedCategory
  );

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    showToast(locale === 'ar' ? 'تم تحديث المؤشرات' : 'KPIs refreshed', 'success');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default: return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'on-track': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'at-risk': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'off-track': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      'on-track': { en: 'On Track', ar: 'على المسار' },
      'at-risk': { en: 'At Risk', ar: 'معرض للخطر' },
      'off-track': { en: 'Off Track', ar: 'خارج المسار' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const getProgressColor = (value: number, target: number, higherIsBetter: boolean = true) => {
    const percentage = higherIsBetter ? (value / target) * 100 : (target / value) * 100;
    if (percentage >= 95) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const onTrack = kpis.filter(k => k.status === 'on-track').length;
  const atRisk = kpis.filter(k => k.status === 'at-risk').length;
  const offTrack = kpis.filter(k => k.status === 'off-track').length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مؤشرات الأداء - SLMS' : 'KPIs & Dashboards - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'مؤشرات الأداء ولوحات المعلومات' : 'KPIs & Dashboards'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'مراقبة مؤشرات الأداء الرئيسية' : 'Monitor key performance indicators'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRefresh} loading={loading}>
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            <Button variant="secondary">
              <Cog6ToothIcon className="h-4 w-4 mr-1" />
              {locale === 'ar' ? 'إعدادات' : 'Settings'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المؤشرات' : 'Total KPIs'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{kpis.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'على المسار' : 'On Track'}</p>
                <p className="text-xl font-semibold text-green-600">{onTrack}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'معرض للخطر' : 'At Risk'}</p>
                <p className="text-xl font-semibold text-yellow-600">{atRisk}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'خارج المسار' : 'Off Track'}</p>
                <p className="text-xl font-semibold text-red-600">{offTrack}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {periods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {locale === 'ar' ? period.labelAr : period.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    selectedCategory === cat
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {cat === 'All' ? (locale === 'ar' ? 'الكل' : 'All') : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredKPIs.map((kpi) => (
            <div
              key={kpi.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <kpi.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                {getStatusBadge(kpi.status)}
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{locale === 'ar' ? kpi.nameAr : kpi.name}</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? kpi.unitAr : kpi.unit}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getTrendIcon(kpi.trend)}
                <span className={clsx(
                  kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                )}>
                  {Math.abs(((kpi.value - kpi.previousValue) / kpi.previousValue) * 100).toFixed(1)}%
                </span>
                <span className="text-gray-400">{locale === 'ar' ? 'من الفترة السابقة' : 'vs previous'}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{locale === 'ar' ? 'الهدف' : 'Target'}: {kpi.target}{locale === 'ar' ? kpi.unitAr : kpi.unit}</span>
                  <span>{Math.round((kpi.value / kpi.target) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full', getProgressColor(kpi.value, kpi.target))}
                    style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">{locale === 'ar' ? 'اتجاه المؤشرات' : 'KPI Trends'}</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رسم بياني للاتجاهات' : 'Trend Chart Visualization'}</p>
              <p className="text-sm text-gray-400">{locale === 'ar' ? 'سيتم عرض الرسوم البيانية هنا' : 'Charts will be displayed here'}</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
