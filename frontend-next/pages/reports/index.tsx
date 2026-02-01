import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import {
  ChartBarIcon,
  DocumentTextIcon,
  TruckIcon,
  CurrencyDollarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ChartPieIcon,
  TableCellsIcon,
  DocumentChartBarIcon,
  StarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ReportCategory {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: any;
  color: string;
  href: string;
  reportCount: number;
  recentReports: { name: string; nameAr: string }[];
}

const reportCategories: ReportCategory[] = [
  {
    id: 'general',
    name: 'General Reports',
    nameAr: 'التقارير العامة',
    description: 'Overview reports and summaries',
    descriptionAr: 'تقارير نظرة عامة وملخصات',
    icon: DocumentTextIcon,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    href: '/reports/general',
    reportCount: 12,
    recentReports: [
      { name: 'Daily Summary', nameAr: 'ملخص يومي' },
      { name: 'Monthly Overview', nameAr: 'نظرة شهرية' },
    ],
  },
  {
    id: 'customs',
    name: 'Customs Reports',
    nameAr: 'تقارير الجمارك',
    description: 'Customs declarations and clearance',
    descriptionAr: 'البيانات الجمركية والتخليص',
    icon: ShieldCheckIcon,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    href: '/reports/customs',
    reportCount: 8,
    recentReports: [
      { name: 'Declarations Report', nameAr: 'تقرير البيانات' },
      { name: 'Clearance Status', nameAr: 'حالة التخليص' },
    ],
  },
  {
    id: 'costs-pricing',
    name: 'Costs & Pricing',
    nameAr: 'التكاليف والتسعير',
    description: 'Cost analysis and pricing reports',
    descriptionAr: 'تحليل التكاليف وتقارير التسعير',
    icon: CurrencyDollarIcon,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    href: '/reports/costs-pricing',
    reportCount: 10,
    recentReports: [
      { name: 'Cost Analysis', nameAr: 'تحليل التكاليف' },
      { name: 'Profit Margins', nameAr: 'هوامش الربح' },
    ],
  },
  {
    id: 'kpis',
    name: 'KPIs & Dashboards',
    nameAr: 'مؤشرات الأداء',
    description: 'Key performance indicators',
    descriptionAr: 'مؤشرات الأداء الرئيسية',
    icon: ChartBarIcon,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    href: '/reports/kpis',
    reportCount: 6,
    recentReports: [
      { name: 'Performance Dashboard', nameAr: 'لوحة الأداء' },
      { name: 'KPI Summary', nameAr: 'ملخص المؤشرات' },
    ],
  },
  {
    id: 'hr',
    name: 'HR Reports',
    nameAr: 'تقارير الموارد البشرية',
    description: 'Employee and payroll reports',
    descriptionAr: 'تقارير الموظفين والرواتب',
    icon: UsersIcon,
    color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
    href: '/reports/hr',
    reportCount: 9,
    recentReports: [
      { name: 'Attendance Report', nameAr: 'تقرير الحضور' },
      { name: 'Payroll Summary', nameAr: 'ملخص الرواتب' },
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance Reports',
    nameAr: 'تقارير الامتثال',
    description: 'Regulatory and compliance status',
    descriptionAr: 'الحالة التنظيمية والامتثال',
    icon: ClipboardDocumentCheckIcon,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    href: '/reports/compliance',
    reportCount: 7,
    recentReports: [
      { name: 'License Status', nameAr: 'حالة التراخيص' },
      { name: 'Audit Trail', nameAr: 'سجل التدقيق' },
    ],
  },
  {
    id: 'integrations',
    name: 'Integration Reports',
    nameAr: 'تقارير التكامل',
    description: 'API and system integration logs',
    descriptionAr: 'سجلات API وتكامل الأنظمة',
    icon: BuildingOfficeIcon,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
    href: '/reports/integrations',
    reportCount: 5,
    recentReports: [
      { name: 'API Logs', nameAr: 'سجلات API' },
      { name: 'Sync Status', nameAr: 'حالة المزامنة' },
    ],
  },
  {
    id: 'analytical-templates',
    name: 'Analytical Templates',
    nameAr: 'القوالب التحليلية',
    description: 'Custom report templates',
    descriptionAr: 'قوالب تقارير مخصصة',
    icon: TableCellsIcon,
    color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
    href: '/reports/analytical-templates',
    reportCount: 15,
    recentReports: [
      { name: 'Shipment Analysis', nameAr: 'تحليل الشحنات' },
      { name: 'Revenue Breakdown', nameAr: 'تفصيل الإيرادات' },
    ],
  },
];

const recentReports = [
  { id: 1, name: 'Daily Operations Summary', nameAr: 'ملخص العمليات اليومية', category: 'General', categoryAr: 'عام', date: '2024-01-28', views: 45 },
  { id: 2, name: 'Customs Declarations Q1', nameAr: 'بيانات الجمارك ق1', category: 'Customs', categoryAr: 'الجمارك', date: '2024-01-27', views: 32 },
  { id: 3, name: 'Employee Attendance Report', nameAr: 'تقرير حضور الموظفين', category: 'HR', categoryAr: 'موارد بشرية', date: '2024-01-27', views: 28 },
  { id: 4, name: 'Monthly Cost Analysis', nameAr: 'تحليل التكاليف الشهرية', category: 'Costs', categoryAr: 'التكاليف', date: '2024-01-26', views: 56 },
];

const favoriteReports = [
  { id: 1, name: 'Shipment Tracking', nameAr: 'تتبع الشحنات', href: '/reports/general' },
  { id: 2, name: 'Revenue Summary', nameAr: 'ملخص الإيرادات', href: '/reports/costs-pricing' },
  { id: 3, name: 'KPI Dashboard', nameAr: 'لوحة المؤشرات', href: '/reports/kpis' },
];

export default function ReportsIndexPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = reportCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.nameAr.includes(searchQuery)
  );

  const totalReports = reportCategories.reduce((sum, cat) => sum + cat.reportCount, 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مركز التقارير - SLMS' : 'Reports Center - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'مركز التقارير' : 'Reports Center'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? `${totalReports} تقرير متاح` : `${totalReports} reports available`}
              </p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder={locale === 'ar' ? 'بحث في التقارير...' : 'Search reports...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي التقارير' : 'Total Reports'}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalReports}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-green-600 bg-green-100 dark:bg-green-900/30">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفئات' : 'Categories'}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{reportCategories.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30">
                <StarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المفضلة' : 'Favorites'}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{favoriteReports.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Favorites */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <StarIcon className="h-5 w-5 text-yellow-500" />
            {locale === 'ar' ? 'التقارير المفضلة' : 'Favorite Reports'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {favoriteReports.map((report) => (
              <Link key={report.id} href={report.href}>
                <span className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors cursor-pointer">
                  <StarIcon className="h-4 w-4" />
                  {locale === 'ar' ? report.nameAr : report.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Report Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <Link key={category.id} href={category.href}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className={clsx('p-2 rounded-lg', category.color)}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? category.nameAr : category.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{category.reportCount} {locale === 'ar' ? 'تقرير' : 'reports'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{locale === 'ar' ? category.descriptionAr : category.description}</p>
                <div className="space-y-1">
                  {category.recentReports.map((report, idx) => (
                    <p key={idx} className="text-xs text-gray-400 dark:text-gray-500 truncate">• {locale === 'ar' ? report.nameAr : report.name}</p>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Reports */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              {locale === 'ar' ? 'التقارير الأخيرة' : 'Recent Reports'}
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentReports.map((report) => (
              <div key={report.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? report.nameAr : report.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? report.categoryAr : report.category} • {report.date}</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    {report.views} {locale === 'ar' ? 'مشاهدة' : 'views'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
