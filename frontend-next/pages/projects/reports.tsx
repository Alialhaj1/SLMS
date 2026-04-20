/**
 * Project Reports — Financial Analytics
 * =======================================
 * 6 tabs: Summary · Cost Analysis · Profitability · Cashflow · Vendor Analysis · Budget vs Actual
 * Connected to /api/reports/projects/* endpoints.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import {
  PresentationChartBarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingStorefrontIcon,
  ScaleIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Recharts — use regular import (rendered only after client mount via useEffect guard)
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// =============================================
// TYPES
// =============================================

interface ProjectSummary {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  status: string;
  financial_status: string;
  budget_allocated: number;
  budget_consumed: number;
  revenue_target: number;
  revenue_actual: number;
  completion_pct: number;
  risk_level: string;
  links_count: number;
}

interface CostDetail {
  categories: { category: string; amount: number }[];
  by_type: { link_type: string; amount: number; count: number }[];
  transactions: { id: number; reference: string; type: string; category: string; amount: number; date: string }[];
  monthly_trend: { month: string; amount: number }[];
}

interface Profitability {
  revenue: number;
  costs: number;
  gross_profit: number;
  gross_margin: number;
  net_margin: number;
  roi: number;
}

interface BudgetVsActual {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  budget_allocated: number;
  budget_consumed: number;
  variance: number;
  variance_pct: number;
  budget_status: string;
}

interface VendorAnalysis {
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  total_amount: number;
  projects_count: number;
  transactions_count: number;
}

interface CashflowEntry {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
}

// =============================================
// CONFIG
// =============================================

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

const CHART_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316', '#6366F1', '#78716C'];

// =============================================
// API
// =============================================

async function fetchReport(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// =============================================
// HELPERS
// =============================================

const fmt = (n: number, locale: string, currency?: string) =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    style: 'currency', currency: currency || 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n || 0);

const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

const fmtNum = (n: number, locale: string) =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA').format(n || 0);

// =============================================
// SUB-COMPONENTS
// =============================================

function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <nav className="flex space-x-1 overflow-x-auto px-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)} className={clsx(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
            active === t.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
          )}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function KPI({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1">
        {value}
        {trend === 'up' && <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />}
        {trend === 'down' && <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="animate-pulse space-y-4 py-8">
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function ProjectReportsPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission(['projects:reports:view', 'projects:view']);
  const projectId = router.query.project as string | undefined;

  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Data states
  const [summary, setSummary] = useState<ProjectSummary[]>([]);
  const [costDetail, setCostDetail] = useState<CostDetail | null>(null);
  const [profitability, setProfitability] = useState<Profitability | null>(null);
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual[]>([]);
  const [vendors, setVendors] = useState<VendorAnalysis[]>([]);
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = useCallback(async (endpoint: string) => {
    setLoading(true);
    try {
      return await fetchReport(`${API_BASE}${endpoint}`);
    } catch (err: any) {
      showToast({ message: err.message || 'Failed to load report', type: 'error' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load tab data
  useEffect(() => {
    const load = async () => {
      switch (tab) {
        case 'summary':
          if (summary.length === 0) {
            const d = await loadData(`/reports/projects/summary${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
            if (d) setSummary(d.data || []);
          }
          break;
        case 'cost':
          if (!costDetail && projectId) {
            const d = await loadData(`/reports/projects/${projectId}/cost`);
            if (d) setCostDetail(d.data);
          }
          break;
        case 'profitability':
          if (!profitability && projectId) {
            const d = await loadData(`/reports/projects/${projectId}/profitability`);
            if (d) setProfitability(d.data);
          }
          break;
        case 'budget':
          if (budgetVsActual.length === 0) {
            const d = await loadData('/reports/projects/budget-vs-actual');
            if (d) setBudgetVsActual(d.data || []);
          }
          break;
        case 'vendor':
          if (vendors.length === 0) {
            const d = await loadData('/reports/projects/vendor-analysis');
            if (d) setVendors(d.data || []);
          }
          break;
        case 'cashflow':
          if (cashflow.length === 0 && projectId) {
            const d = await loadData(`/reports/projects/${projectId}/cashflow`);
            if (d) setCashflow(d.data || []);
          }
          break;
      }
    };
    load();
  }, [tab, projectId, statusFilter]);

  // Computed KPIs from summary
  const summaryKPIs = useMemo(() => {
    if (summary.length === 0) return null;
    const totalBudget = summary.reduce((s, p) => s + Number(p.budget_allocated || 0), 0);
    const totalConsumed = summary.reduce((s, p) => s + Number(p.budget_consumed || 0), 0);
    const totalRevenue = summary.reduce((s, p) => s + Number(p.revenue_actual || 0), 0);
    const atRisk = summary.filter(p => p.risk_level === 'high' || p.risk_level === 'critical').length;
    return { totalBudget, totalConsumed, totalRevenue, atRisk, count: summary.length };
  }, [summary]);

  const tabs = [
    { id: 'summary', label: locale === 'ar' ? 'ملخص' : 'Summary', icon: ChartBarIcon },
    { id: 'cost', label: locale === 'ar' ? 'تحليل التكاليف' : 'Cost Analysis', icon: CurrencyDollarIcon },
    { id: 'profitability', label: locale === 'ar' ? 'الربحية' : 'Profitability', icon: ArrowTrendingUpIcon },
    { id: 'cashflow', label: locale === 'ar' ? 'التدفق النقدي' : 'Cashflow', icon: ScaleIcon },
    { id: 'vendor', label: locale === 'ar' ? 'تحليل الموردين' : 'Vendor Analysis', icon: BuildingStorefrontIcon },
    { id: 'budget', label: locale === 'ar' ? 'الميزانية مقابل الفعلي' : 'Budget vs Actual', icon: PresentationChartBarIcon },
  ];

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'تقارير المشاريع - SLMS' : 'Project Reports - SLMS'}</title></Head>
        <div className="text-center py-12">
          <PresentationChartBarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير المشاريع - SLMS' : 'Project Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <PresentationChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'تقارير المشاريع' : 'Project Reports'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تحليلات مالية شاملة للمشاريع' : 'Comprehensive financial analytics'}</p>
            </div>
          </div>
          <Link href="/projects" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← {locale === 'ar' ? 'العودة للمشاريع' : 'Back to Projects'}
          </Link>
        </div>

        {/* Tabs Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <TabBar tabs={tabs} active={tab} onChange={setTab} />

          <div className="p-6">
            {/* ===== SUMMARY TAB ===== */}
            {tab === 'summary' && (
              <div className="space-y-6">
                {loading ? <LoadingBlock /> : (
                  <>
                    {/* KPIs */}
                    {summaryKPIs && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <KPI label={locale === 'ar' ? 'عدد المشاريع' : 'Projects'} value={fmtNum(summaryKPIs.count, locale)} />
                        <KPI label={locale === 'ar' ? 'إجمالي الميزانيات' : 'Total Budget'} value={fmt(summaryKPIs.totalBudget, locale)} />
                        <KPI label={locale === 'ar' ? 'إجمالي المصروف' : 'Total Consumed'} value={fmt(summaryKPIs.totalConsumed, locale)} trend={summaryKPIs.totalConsumed > summaryKPIs.totalBudget ? 'down' : undefined} />
                        <KPI label={locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'} value={fmt(summaryKPIs.totalRevenue, locale)} trend="up" />
                        <KPI label={locale === 'ar' ? 'مشاريع عالية المخاطر' : 'At Risk'} value={String(summaryKPIs.atRisk)} trend={summaryKPIs.atRisk > 0 ? 'down' : undefined} />
                      </div>
                    )}

                    {/* Summary Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">{locale === 'ar' ? 'المشروع' : 'Project'}</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">{locale === 'ar' ? 'الميزانية' : 'Budget'}</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">{locale === 'ar' ? 'المصروف' : 'Consumed'}</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">{locale === 'ar' ? 'الإيراد' : 'Revenue'}</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">{locale === 'ar' ? 'الإنجاز' : 'Completion'}</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">{locale === 'ar' ? 'المخاطر' : 'Risk'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</td></tr>
                          ) : summary.map((p) => (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3">
                                <Link href={`/projects/${p.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{p.code}</Link>
                                <p className="text-xs text-slate-500">{locale === 'ar' ? p.name_ar || p.name : p.name}</p>
                              </td>
                              <td className="px-4 py-3 capitalize text-xs">{p.status?.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3 text-right">{fmt(p.budget_allocated, locale)}</td>
                              <td className="px-4 py-3 text-right">{fmt(p.budget_consumed, locale)}</td>
                              <td className="px-4 py-3 text-right text-green-600">{fmt(p.revenue_actual, locale)}</td>
                              <td className="px-4 py-3 text-right">{p.completion_pct || 0}%</td>
                              <td className="px-4 py-3">
                                <span className={clsx('text-xs px-2 py-0.5 rounded-full capitalize',
                                  p.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                                  p.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                                  p.risk_level === 'medium' ? 'bg-amber-100 text-amber-800' :
                                  'bg-green-100 text-green-800'
                                )}>{p.risk_level}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ===== COST ANALYSIS TAB ===== */}
            {tab === 'cost' && (
              <div className="space-y-6">
                {!projectId ? (
                  <div className="text-center py-12 text-slate-500">
                    <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>{locale === 'ar' ? 'يرجى اختيار مشروع من صفحة التفاصيل' : 'Please select a project from the detail page'}</p>
                    <Link href="/projects" className="text-indigo-600 hover:text-indigo-800 text-sm mt-2 inline-block">
                      {locale === 'ar' ? 'اذهب للمشاريع' : 'Go to Projects'}
                    </Link>
                  </div>
                ) : loading ? <LoadingBlock /> : costDetail ? (
                  <>
                    {/* By category */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{locale === 'ar' ? 'التكاليف حسب الفئة' : 'Costs by Category'}</h4>
                        {costDetail.categories && costDetail.categories.length > 0 ? (
                          <div style={{ width: '100%', height: 280, minWidth: 0 }}>
                            {mounted && <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={costDetail.categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                                  {costDetail.categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => fmt(v, locale)} />
                              </PieChart>
                            </ResponsiveContainer>}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                        )}
                      </div>

                      {/* By type */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{locale === 'ar' ? 'حسب نوع المعاملة' : 'By Transaction Type'}</h4>
                        <div className="space-y-3">
                          {(costDetail.by_type || []).map((t, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm capitalize">{t.link_type?.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-slate-500">{t.count} {locale === 'ar' ? 'معاملة' : 'transactions'}</p>
                              </div>
                              <p className="font-semibold">{fmt(t.amount, locale)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Monthly trend */}
                    {costDetail.monthly_trend && costDetail.monthly_trend.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{locale === 'ar' ? 'الاتجاه الشهري' : 'Monthly Trend'}</h4>
                        <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                          {mounted && <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costDetail.monthly_trend}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip formatter={(v: number) => fmt(v, locale)} />
                              <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>}
                        </div>
                      </div>
                    )}

                    {/* Transactions table */}
                    {costDetail.transactions && costDetail.transactions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{locale === 'ar' ? 'المعاملات' : 'Transactions'}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="px-4 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                                <th className="px-4 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                                <th className="px-4 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                                <th className="px-4 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                                <th className="px-4 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {costDetail.transactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700">
                                  <td className="px-4 py-2 font-medium text-indigo-600">{tx.reference}</td>
                                  <td className="px-4 py-2 capitalize">{tx.type?.replace(/_/g, ' ')}</td>
                                  <td className="px-4 py-2 capitalize">{tx.category?.replace(/_/g, ' ')}</td>
                                  <td className="px-4 py-2 text-right font-medium">{fmt(tx.amount, locale)}</td>
                                  <td className="px-4 py-2 text-slate-500">{tx.date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-center py-12 text-slate-500">{locale === 'ar' ? 'لا توجد بيانات تكاليف' : 'No cost data'}</p>
                )}
              </div>
            )}

            {/* ===== PROFITABILITY TAB ===== */}
            {tab === 'profitability' && (
              <div className="space-y-6">
                {!projectId ? (
                  <div className="text-center py-12 text-slate-500">
                    <ArrowTrendingUpIcon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>{locale === 'ar' ? 'يرجى اختيار مشروع' : 'Please select a project'}</p>
                  </div>
                ) : loading ? <LoadingBlock /> : profitability ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <KPI label={locale === 'ar' ? 'الإيرادات' : 'Revenue'} value={fmt(profitability.revenue, locale)} trend="up" />
                    <KPI label={locale === 'ar' ? 'التكاليف' : 'Costs'} value={fmt(profitability.costs, locale)} />
                    <KPI label={locale === 'ar' ? 'إجمالي الربح' : 'Gross Profit'} value={fmt(profitability.gross_profit, locale)} trend={profitability.gross_profit >= 0 ? 'up' : 'down'} />
                    <KPI label={locale === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin'} value={fmtPct(profitability.gross_margin)} />
                    <KPI label={locale === 'ar' ? 'صافي الهامش' : 'Net Margin'} value={fmtPct(profitability.net_margin)} />
                    <KPI label={locale === 'ar' ? 'العائد على الاستثمار' : 'ROI'} value={fmtPct(profitability.roi)} trend={profitability.roi > 0 ? 'up' : 'down'} />
                  </div>
                ) : (
                  <p className="text-center py-12 text-slate-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                )}
              </div>
            )}

            {/* ===== CASHFLOW TAB ===== */}
            {tab === 'cashflow' && (
              <div className="space-y-6">
                {!projectId ? (
                  <div className="text-center py-12 text-slate-500">
                    <ScaleIcon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>{locale === 'ar' ? 'يرجى اختيار مشروع' : 'Please select a project'}</p>
                  </div>
                ) : loading ? <LoadingBlock /> : cashflow.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: 350, minWidth: 0 }}>
                      {mounted && <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cashflow}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(v: number) => fmt(v, locale)} />
                          <Legend />
                          <Line type="monotone" dataKey="inflow" stroke="#10B981" name={locale === 'ar' ? 'التدفق الداخل' : 'Inflow'} strokeWidth={2} />
                          <Line type="monotone" dataKey="outflow" stroke="#EF4444" name={locale === 'ar' ? 'التدفق الخارج' : 'Outflow'} strokeWidth={2} />
                          <Line type="monotone" dataKey="cumulative" stroke="#6366F1" name={locale === 'ar' ? 'التراكمي' : 'Cumulative'} strokeWidth={2} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'الشهر' : 'Month'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-green-600">{locale === 'ar' ? 'داخل' : 'Inflow'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-red-600">{locale === 'ar' ? 'خارج' : 'Outflow'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'صافي' : 'Net'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-indigo-600">{locale === 'ar' ? 'تراكمي' : 'Cumulative'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashflow.map((c, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="px-4 py-2 font-medium">{c.month}</td>
                              <td className="px-4 py-2 text-right text-green-600">{fmt(c.inflow, locale)}</td>
                              <td className="px-4 py-2 text-right text-red-600">{fmt(c.outflow, locale)}</td>
                              <td className={clsx('px-4 py-2 text-right font-medium', c.net >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt(c.net, locale)}</td>
                              <td className="px-4 py-2 text-right text-indigo-600">{fmt(c.cumulative, locale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-center py-12 text-slate-500">{locale === 'ar' ? 'لا توجد بيانات تدفق نقدي' : 'No cashflow data'}</p>
                )}
              </div>
            )}

            {/* ===== VENDOR ANALYSIS TAB ===== */}
            {tab === 'vendor' && (
              <div className="space-y-6">
                {loading ? <LoadingBlock /> : vendors.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart */}
                      <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                        {mounted && <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={vendors.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="vendor_name" width={120} />
                            <Tooltip formatter={(v: number) => fmt(v, locale)} />
                            <Bar dataKey="total_amount" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>}
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'المورد' : 'Vendor'}</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'المشاريع' : 'Projects'}</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'المعاملات' : 'Txns'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendors.map((v) => (
                              <tr key={v.vendor_id} className="border-b border-slate-100 dark:border-slate-700">
                                <td className="px-3 py-2">
                                  <p className="font-medium">{v.vendor_name}</p>
                                  <p className="text-xs text-slate-500">{v.vendor_code}</p>
                                </td>
                                <td className="px-3 py-2 text-right font-medium">{fmt(v.total_amount, locale)}</td>
                                <td className="px-3 py-2 text-right">{v.projects_count}</td>
                                <td className="px-3 py-2 text-right">{v.transactions_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center py-12 text-slate-500">{locale === 'ar' ? 'لا توجد بيانات موردين' : 'No vendor data'}</p>
                )}
              </div>
            )}

            {/* ===== BUDGET VS ACTUAL TAB ===== */}
            {tab === 'budget' && (
              <div className="space-y-6">
                {loading ? <LoadingBlock /> : budgetVsActual.length > 0 ? (
                  <>
                    {/* Chart */}
                    <div style={{ width: '100%', height: 350, minWidth: 0 }}>
                      {mounted && <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={budgetVsActual.slice(0, 15)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="code" />
                          <YAxis />
                          <Tooltip formatter={(v: number) => fmt(v, locale)} />
                          <Legend />
                          <Bar dataKey="budget_allocated" fill="#3B82F6" name={locale === 'ar' ? 'الميزانية' : 'Budget'} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="budget_consumed" fill="#EF4444" name={locale === 'ar' ? 'المصروف' : 'Consumed'} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'المشروع' : 'Project'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'الميزانية' : 'Budget'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'المصروف' : 'Consumed'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-600">{locale === 'ar' ? 'الفرق' : 'Variance'}</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-600">%</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetVsActual.map((b) => (
                            <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="px-4 py-2">
                                <Link href={`/projects/${b.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{b.code}</Link>
                                <p className="text-xs text-slate-500">{locale === 'ar' ? b.name_ar || b.name : b.name}</p>
                              </td>
                              <td className="px-4 py-2 text-right">{fmt(b.budget_allocated, locale)}</td>
                              <td className="px-4 py-2 text-right">{fmt(b.budget_consumed, locale)}</td>
                              <td className={clsx('px-4 py-2 text-right font-medium', b.variance >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt(b.variance, locale)}</td>
                              <td className={clsx('px-4 py-2 text-right', b.variance_pct >= 0 ? 'text-green-600' : 'text-red-600')}>{fmtPct(b.variance_pct)}</td>
                              <td className="px-4 py-2">
                                <span className={clsx('text-xs px-2 py-0.5 rounded-full',
                                  b.budget_status === 'under_budget' ? 'bg-green-100 text-green-800' :
                                  b.budget_status === 'on_budget' ? 'bg-blue-100 text-blue-800' :
                                  b.budget_status === 'over_budget' ? 'bg-red-100 text-red-800' :
                                  'bg-amber-100 text-amber-800'
                                )}>
                                  {b.budget_status === 'under_budget' ? (locale === 'ar' ? 'أقل من الميزانية' : 'Under Budget') :
                                   b.budget_status === 'on_budget' ? (locale === 'ar' ? 'ضمن الميزانية' : 'On Budget') :
                                   b.budget_status === 'over_budget' ? (locale === 'ar' ? 'تجاوز الميزانية' : 'Over Budget') :
                                   (locale === 'ar' ? 'تحذير' : 'Warning')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-center py-12 text-slate-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
