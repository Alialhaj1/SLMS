/**
 * ============================================================================
 * PREMIUM ENTERPRISE DASHBOARD - لوحة التحكم الاحترافية
 * ============================================================================
 * A comprehensive, executive-grade dashboard integrating all system modules:
 * - KPI overview with animated counters & trends
 * - Logistics snapshot (shipment donut + upcoming arrivals)
 * - Financial pulse (cash flow chart + payment summary)
 * - Procurement & project progress widgets
 * - Smart alerts & activity timeline
 * - Quick actions panel
 * - Full RTL/LTR + dark mode + bilingual support
 *
 * API Endpoints consumed:
 *   /api/dashboard/overview    → Executive KPIs
 *   /api/dashboard/logistics   → Shipment status & arrivals
 *   /api/dashboard/financial   → Cash flow & payments
 *   /api/dashboard/procurement → PO & supplier data
 *   /api/dashboard/projects    → Active projects progress
 *   /api/dashboard/alerts      → Alerts & system health
 *   /api/dashboard/activity    → Recent activity timeline
 *   /api/dashboard/charts      → Chart data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useLocale } from '../contexts/LocaleContext';
import { usePermissions, PermissionGate } from '../hooks/usePermissions';
import dashboardService from '../lib/dashboardService';
import type {
  OverviewData,
  LogisticsData,
  FinancialData,
  ProcurementData,
  ProjectsData,
  AlertsData,
  ActivityItem,
} from '../lib/dashboardService';
import {
  TruckIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  DocumentCheckIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BellAlertIcon,
  ClockIcon,
  MapPinIcon,
  ChartBarIcon,
  PlusIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChevronRightIcon,
  SparklesIcon,
  CalendarDaysIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  LockClosedIcon,
  UserCircleIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

// ============================================================================
// TYPES
// ============================================================================

interface ChartPoint {
  month: string;
  shipments: number;
  previousYear?: number;
}

interface FinancialTrend {
  month: string;
  expenses: number;
  revenue: number;
}

interface ShipmentType {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface ChartsData {
  monthlyShipments: ChartPoint[];
  financialTrends: FinancialTrend[];
  shipmentTypes: ShipmentType[];
}

// ============================================================================
// ANIMATED NUMBER COMPONENT
// ============================================================================

function AnimatedNumber({ value, duration = 1200, format }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let current = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{format ? format(display) : display.toLocaleString()}</>;
}

// ============================================================================
// MINI SPARKLINE SVG
// ============================================================================

function Sparkline({ data, color = '#3B82F6', height = 32, width = 80 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const gradId = `sg-${color.replace('#', '')}`;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradId})`} points={`0,${height} ${points} ${width},${height}`} />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// ============================================================================
// DONUT CHART
// ============================================================================

function DonutChart({ segments, size = 160 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const r = size / 2;
  const sw = 22;
  const ir = r - sw;
  const circ = 2 * Math.PI * ir;
  let acc = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = `${pct * circ} ${circ}`;
        const offset = -acc * circ;
        acc += pct;
        return (
          <circle key={i} cx={r} cy={r} r={ir} fill="transparent" stroke={seg.color}
            strokeWidth={sw} strokeDasharray={dash} strokeDashoffset={offset}
            className="transition-all duration-700" strokeLinecap="round" />
        );
      })}
      <text x={r} y={r} textAnchor="middle" dominantBaseline="central"
        className="fill-gray-900 dark:fill-white text-xl font-bold" transform={`rotate(90 ${r} ${r})`}>
        {total}
      </text>
    </svg>
  );
}

// ============================================================================
// BAR CHART
// ============================================================================

function BarChart({ data, barColor = '#3B82F6', height = 120 }: { data: { label: string; value: number }[]; barColor?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 justify-between" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full rounded-t-md transition-all duration-500 relative group"
            style={{ height: `${(d.value / max) * 100}%`, backgroundColor: barColor, minHeight: 4 }}>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {d.value.toLocaleString()}
            </div>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// AREA CHART (Revenue vs Expenses)
// ============================================================================

function DualAreaChart({ data, isRTL, height = 140 }: { data: FinancialTrend[]; isRTL: boolean; height?: number }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expenses]), 1);
  const w = 100;
  const h = 100;
  const pad = 2;

  const getY = (v: number) => h - pad - ((v / maxVal) * (h - pad * 2));
  const getX = (i: number) => pad + (i / (data.length - 1 || 1)) * (w - pad * 2);

  const revPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.revenue)}`).join(' ');
  const expPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.expenses)}`).join(' ');

  return (
    <div style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <line key={i} x1={pad} y1={h - pad - r * (h - pad * 2)} x2={w - pad} y2={h - pad - r * (h - pad * 2)}
            stroke="currentColor" strokeOpacity={0.06} strokeDasharray="2,2" />
        ))}
        <path d={`${revPath} L ${getX(data.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#revGrad)" />
        <path d={revPath} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
        <path d={`${expPath} L ${getX(data.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#expGrad)" />
        <path d={expPath} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4,2" />
      </svg>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">{isRTL ? 'الإيرادات' : 'Revenue'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-red-500 rounded" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">{isRTL ? 'المصروفات' : 'Expenses'}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

function ProgressBar({ value, max = 100, color = 'bg-blue-500' }: { value: number; max?: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';
  const canView = hasPermission('dashboard:view');

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [procurement, setProcurement] = useState<ProcurementData | null>(null);
  const [projects, setProjects] = useState<ProjectsData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock (updates every minute)
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Fetch all dashboard data
  const fetchAll = useCallback(async (silent = false) => {
    if (!canView) { setLoading(false); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [ov, lg, fn, pr, pj, al, ac] = await Promise.allSettled([
        dashboardService.getOverview(),
        dashboardService.getLogistics(),
        dashboardService.getFinancial(),
        dashboardService.getProcurement(),
        dashboardService.getProjects(),
        dashboardService.getAlerts(),
        dashboardService.getRecentActivity(8),
      ]);

      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (lg.status === 'fulfilled') setLogistics(lg.value);
      if (fn.status === 'fulfilled') setFinancial(fn.value);
      if (pr.status === 'fulfilled') setProcurement(pr.value);
      if (pj.status === 'fulfilled') setProjects(pj.value);
      if (al.status === 'fulfilled') setAlerts(al.value);
      if (ac.status === 'fulfilled') setActivity(ac.value);

      // Fetch charts data
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const res = await fetch('/api/dashboard/charts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setCharts(await res.json());
      } catch { /* charts are optional */ }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canView]);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  // Auto-refresh on tab focus
  useEffect(() => {
    const handle = () => { if (document.visibilityState === 'visible' && user) fetchAll(true); };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [user, fetchAll]);

  // Permission warning
  useEffect(() => {
    if (user && !canView) {
      setLoading(false);
      showToast(isRTL ? 'ليس لديك صلاحية لعرض لوحة التحكم' : 'No dashboard permission', 'warning');
    }
  }, [user, canView, showToast, isRTL]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const h = currentTime.getHours();
    if (h < 12) return isRTL ? 'صباح الخير' : 'Good Morning';
    if (h < 17) return isRTL ? 'مساء الخير' : 'Good Afternoon';
    return isRTL ? 'مساء الخير' : 'Good Evening';
  }, [currentTime, isRTL]);

  const dateStr = useMemo(() => currentTime.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }), [currentTime, isRTL]);

  const kpis = overview?.kpis;
  const fmtCurrency = (v: number) => `${v.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`;
  const go = (path: string) => router.push(path);

  const formatTimeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return isRTL ? 'الآن' : 'Just now';
    if (diff < 60) return isRTL ? `منذ ${diff} د` : `${diff}m ago`;
    if (diff < 1440) return isRTL ? `منذ ${Math.floor(diff / 60)} س` : `${Math.floor(diff / 60)}h ago`;
    return isRTL ? `منذ ${Math.floor(diff / 1440)} ي` : `${Math.floor(diff / 1440)}d ago`;
  };

  // ========== KPI Card definitions ==========
  const kpiCards = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        title: isRTL ? 'الشحنات النشطة' : 'Active Shipments',
        value: kpis.activeShipments.value,
        change: kpis.activeShipments.change,
        trend: kpis.activeShipments.trend,
        icon: TruckIcon, gradient: 'from-blue-500 to-blue-600',
        href: '/shipments',
        sparkData: [12, 15, 18, 14, 22, 19, 25, kpis.activeShipments.value],
        sparkColor: '#3B82F6',
      },
      {
        title: isRTL ? 'الشحنات المتأخرة' : 'Delayed Shipments',
        value: kpis.delayedShipments.value,
        change: kpis.delayedShipments.change,
        trend: kpis.delayedShipments.trend as 'up' | 'down',
        icon: ExclamationTriangleIcon, gradient: 'from-red-500 to-rose-600',
        href: '/shipments?status=delayed',
        sparkData: [5, 8, 6, 9, 7, 4, 3, kpis.delayedShipments.value],
        sparkColor: '#EF4444',
      },
      {
        title: isRTL ? 'تكلفة الشحن الشهرية' : 'Monthly Shipment Cost',
        value: kpis.totalShipmentCost.value,
        change: kpis.totalShipmentCost.change,
        trend: kpis.totalShipmentCost.trend,
        icon: CurrencyDollarIcon, gradient: 'from-amber-500 to-yellow-600',
        href: '/expenses', isCurrency: true,
        sparkData: [45000, 52000, 48000, 61000, 55000, 58000, 67000, kpis.totalShipmentCost.value || 1],
        sparkColor: '#F59E0B',
      },
      {
        title: isRTL ? 'بانتظار الموافقة' : 'Pending Approvals',
        value: kpis.pendingApprovals.value, change: 0, trend: 'up' as const,
        icon: ClipboardDocumentCheckIcon, gradient: 'from-purple-500 to-violet-600',
        href: '/approvals',
        badge: kpis.pendingApprovals.newCount > 0 ? `${kpis.pendingApprovals.newCount} ${isRTL ? 'جديد' : 'new'}` : undefined,
        sparkData: [3, 5, 4, 7, 6, 8, 5, kpis.pendingApprovals.value],
        sparkColor: '#8B5CF6',
      },
      {
        title: isRTL ? 'المشاريع النشطة' : 'Active Projects',
        value: kpis.activeProjects.value, change: kpis.activeProjects.change, trend: 'up' as const,
        icon: FolderIcon, gradient: 'from-emerald-500 to-green-600',
        href: '/projects',
        sparkData: [2, 3, 3, 4, 5, 4, 5, kpis.activeProjects.value],
        sparkColor: '#10B981',
      },
      {
        title: isRTL ? 'اعتمادات مستندية' : 'Letters of Credit',
        value: kpis.activeLettersOfCredit.value, change: 0, trend: 'up' as const,
        icon: DocumentCheckIcon, gradient: 'from-cyan-500 to-teal-600',
        href: '/finance/letters-of-credit',
        subtitle: kpis.activeLettersOfCredit.totalValue > 0 ? fmtCurrency(kpis.activeLettersOfCredit.totalValue) : undefined,
        sparkData: [1, 2, 2, 3, 2, 3, 3, kpis.activeLettersOfCredit.value],
        sparkColor: '#06B6D4',
      },
      {
        title: isRTL ? 'أوامر الموردين' : 'Supplier Orders',
        value: kpis.supplierOrders.value, change: 0, trend: 'up' as const,
        icon: ShoppingCartIcon, gradient: 'from-indigo-500 to-blue-600',
        href: '/purchasing/orders',
        sparkData: [8, 10, 9, 12, 11, 14, 13, kpis.supplierOrders.value],
        sparkColor: '#6366F1',
      },
      {
        title: isRTL ? 'مدفوعات معلقة' : 'Pending Payments',
        value: kpis.pendingPayments.value, change: 0, trend: 'down' as const,
        icon: CreditCardIcon, gradient: 'from-rose-500 to-pink-600',
        href: '/finance/vendor-payments',
        subtitle: kpis.pendingPayments.totalAmount > 0 ? fmtCurrency(kpis.pendingPayments.totalAmount) : undefined,
        sparkData: [6, 8, 5, 9, 7, 10, 8, kpis.pendingPayments.value],
        sparkColor: '#F43F5E',
      },
    ];
  }, [kpis, isRTL]);

  // ========== Logistics segments ==========
  const logisticsSegments = useMemo(() => {
    if (!logistics) return [];
    const sd = logistics.statusDistribution;
    return [
      { label: isRTL ? 'تم التسليم' : 'Delivered', value: sd.delivered, color: '#10B981' },
      { label: isRTL ? 'في الطريق' : 'In Transit', value: sd.inTransit, color: '#F59E0B' },
      { label: isRTL ? 'قيد الانتظار' : 'Pending', value: sd.pending, color: '#3B82F6' },
      { label: isRTL ? 'متأخر' : 'Delayed', value: sd.delayed, color: '#EF4444' },
      { label: isRTL ? 'جمارك' : 'Customs', value: sd.customs, color: '#8B5CF6' },
    ].filter(s => s.value > 0);
  }, [logistics, isRTL]);

  // ========== Quick Actions ==========
  const quickActions = useMemo(() => [
    { title: isRTL ? 'شحنة جديدة' : 'New Shipment', icon: TruckIcon, href: '/shipments/create', perm: 'shipments:create', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60' },
    { title: isRTL ? 'بوليصة شحن' : 'Bill of Lading', icon: DocumentTextIcon, href: '/shipping-bills/create', perm: 'shipping_bills:create', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60' },
    { title: isRTL ? 'مصروف جديد' : 'New Expense', icon: CurrencyDollarIcon, href: '/expenses/create', perm: 'shipment_expenses:create', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/60' },
    { title: isRTL ? 'دفعة جديدة' : 'New Payment', icon: CreditCardIcon, href: '/finance/vendor-payments/create', perm: 'vendor_payments:create', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/40 hover:bg-green-100 dark:hover:bg-green-900/60' },
    { title: isRTL ? 'طلب تحويل' : 'Transfer Request', icon: ArrowsRightLeftIcon, href: '/finance/transfer-requests/create', perm: 'transfer_requests:create', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/60' },
    { title: isRTL ? 'بيان جمركي' : 'Customs Declaration', icon: ShieldCheckIcon, href: '/customs/declarations/create', perm: 'customs:create', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/60' },
    { title: isRTL ? 'مشروع جديد' : 'New Project', icon: FolderIcon, href: '/projects/create', perm: 'projects:create', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60' },
    { title: isRTL ? 'اعتماد مستندي' : 'Letter of Credit', icon: BanknotesIcon, href: '/finance/letters-of-credit/create', perm: 'letters_of_credit:create', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60' },
  ], [isRTL]);

  // ========== Activity helpers ==========
  const getActivityMeta = (type: ActivityItem['type']) => {
    const map: Record<string, { icon: typeof TruckIcon; color: string }> = {
      login: { icon: ArrowRightCircleIcon, color: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' },
      logout: { icon: ArrowLeftCircleIcon, color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
      passwordChange: { icon: LockClosedIcon, color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400' },
      profileUpdate: { icon: UserCircleIcon, color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' },
      notification: { icon: BellIcon, color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' },
    };
    return map[type] || { icon: UserCircleIcon, color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' };
  };

  // ========== Alert styles ==========
  const alertStyles: Record<string, { bg: string; border: string; icon: typeof BellIcon; iconColor: string }> = {
    critical: { bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800', icon: XCircleIcon, iconColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', icon: ExclamationTriangleIcon, iconColor: 'text-amber-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', icon: InformationCircleIcon, iconColor: 'text-blue-500' },
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'لوحة التحكم - SLMS' : 'Dashboard - SLMS'}</title>
      </Head>

      <div className="space-y-6 pb-8">

        {/* ================================================================ */}
        {/* HERO HEADER                                                      */}
        {/* ================================================================ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-6 md:p-8">
          {/* Dot pattern */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          {/* Glows */}
          <div className="absolute top-0 end-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 start-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-amber-400" />
                <span className="text-amber-300/90 text-sm font-medium">{greeting}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {user?.full_name || user?.email}
              </h1>
              <p className="text-blue-200/80 text-sm flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4" />
                {dateStr}
              </p>
              {user?.company_name && (
                <p className="text-blue-300/60 text-xs flex items-center gap-1.5">
                  <BuildingOffice2Icon className="h-3.5 w-3.5" />
                  {user.company_name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* System Health */}
              {alerts && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm border
                  ${alerts.systemHealth === 'healthy'
                    ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300'
                    : alerts.systemHealth === 'warning'
                    ? 'bg-amber-500/10 border-amber-400/20 text-amber-300'
                    : 'bg-red-500/10 border-red-400/20 text-red-300'
                  }`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    alerts.systemHealth === 'healthy' ? 'bg-emerald-400' :
                    alerts.systemHealth === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  <span className="text-xs font-medium">
                    {isRTL
                      ? (alerts.systemHealth === 'healthy' ? 'النظام يعمل بشكل طبيعي' : alerts.systemHealth === 'warning' ? 'تحذيرات نشطة' : 'حالة حرجة')
                      : (alerts.systemHealth === 'healthy' ? 'All Systems Healthy' : alerts.systemHealth === 'warning' ? 'Active Warnings' : 'Critical Issues')}
                  </span>
                </div>
              )}

              {/* Refresh */}
              <button onClick={() => fetchAll(true)} disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all disabled:opacity-50"
                title={isRTL ? 'تحديث البيانات' : 'Refresh data'}>
                <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* KPI GRID - 8 cards (4 per row on desktop)                        */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-16 mb-3" />
                <Skeleton className="h-7 w-full" />
              </div>
            ))
          ) : kpiCards.map((kpi, i) => {
            const Icon = kpi.icon;
            const isUp = kpi.trend === 'up';
            return (
              <div key={i} onClick={() => go(kpi.href)}
                className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer
                  transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50
                  hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5">
                {/* Icon + Change badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {kpi.change !== 0 && (
                    <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full
                      ${isUp ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40'
                             : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/40'}`}>
                      {isUp ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                      {Math.abs(kpi.change)}%
                    </div>
                  )}
                  {kpi.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                      {kpi.badge}
                    </span>
                  )}
                </div>

                {/* Value */}
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {kpi.isCurrency
                    ? <AnimatedNumber value={kpi.value} format={fmtCurrency} />
                    : <AnimatedNumber value={kpi.value} />}
                </div>

                {/* Title + subtitle */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">{kpi.title}</p>
                {kpi.subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500">{kpi.subtitle}</p>}

                {/* Sparkline */}
                <div className="mt-3">
                  <Sparkline data={kpi.sparkData} color={kpi.sparkColor} height={28} width={120} />
                </div>

                {/* Hover indicator */}
                <div className="absolute top-5 end-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRightIcon className={`h-4 w-4 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* ROW 2: Logistics Snapshot + Financial Pulse                      */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* --- Logistics Snapshot --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <TruckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'نظرة على الشحنات' : 'Logistics Snapshot'}
                </h2>
              </div>
              <button onClick={() => go('/shipments')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {isRTL ? 'عرض الكل' : 'View All'}
                <ChevronRightIcon className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48"><Skeleton className="w-40 h-40 rounded-full" /></div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <DonutChart segments={logisticsSegments} size={160} />
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {logisticsSegments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{seg.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{seg.value}</span>
                    </div>
                  ))}
                  {logistics && logistics.delayedContainers > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                        {logistics.delayedContainers} {isRTL ? 'حاوية متأخرة' : 'delayed containers'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Arrivals */}
            {!loading && logistics && logistics.upcomingArrivals.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  {isRTL ? 'الوصول القادم' : 'Upcoming Arrivals'}
                </h3>
                <div className="space-y-2">
                  {logistics.upcomingArrivals.slice(0, 3).map((arr, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => go(`/shipments/${arr.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <MapPinIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{arr.shipmentNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{arr.port}</p>
                        </div>
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded-full
                        ${arr.daysRemaining <= 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                          : arr.daysRemaining <= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>
                        {arr.daysRemaining} {isRTL ? 'يوم' : 'days'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* --- Financial Pulse --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <BanknotesIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'النبض المالي' : 'Financial Pulse'}
                </h2>
              </div>
              <button onClick={() => go('/accounting/reports/cash-flow')} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                {isRTL ? 'التفاصيل' : 'Details'}
                <ChevronRightIcon className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {loading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : (
              <>
                {/* Cash Flow Area Chart */}
                {financial && financial.cashFlow.length > 0 ? (
                  <DualAreaChart isRTL={isRTL} data={financial.cashFlow.map(c => ({ month: c.date, revenue: c.income, expenses: c.expenses }))} height={140} />
                ) : charts && charts.financialTrends.length > 0 ? (
                  <DualAreaChart isRTL={isRTL} data={charts.financialTrends} height={140} />
                ) : (
                  <div className="flex items-center justify-center h-36 text-gray-400"><ChartBarIcon className="h-10 w-10 opacity-30" /></div>
                )}

                {/* Payment Summary */}
                {financial && (
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-center">
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                        <AnimatedNumber value={financial.paymentSummary.dueToday} />
                      </p>
                      <p className="text-[11px] text-amber-600/80 dark:text-amber-400/60 mt-0.5">
                        {isRTL ? 'مستحقة اليوم' : 'Due Today'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-center">
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                        <AnimatedNumber value={financial.paymentSummary.dueThisWeek} />
                      </p>
                      <p className="text-[11px] text-blue-600/80 dark:text-blue-400/60 mt-0.5">
                        {isRTL ? 'هذا الأسبوع' : 'This Week'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 text-center">
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">
                        <AnimatedNumber value={financial.paymentSummary.overdue} />
                      </p>
                      <p className="text-[11px] text-red-600/80 dark:text-red-400/60 mt-0.5">
                        {isRTL ? 'متأخرة' : 'Overdue'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Expenses by Type */}
                {financial && financial.expensesByType.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {isRTL ? 'المصروفات حسب النوع' : 'Expenses by Type'}
                    </h3>
                    <div className="space-y-2.5">
                      {financial.expensesByType.slice(0, 4).map((exp, i) => {
                        const maxAmt = Math.max(...financial.expensesByType.map(e => e.amount), 1);
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">{exp.type}</span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">{exp.amount.toLocaleString()} SAR</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${colors[i % colors.length]}`}
                                style={{ width: `${(exp.amount / maxAmt) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* ROW 3: Procurement + Projects + Monthly Shipments Chart          */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* --- Procurement --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                <ShoppingCartIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isRTL ? 'المشتريات' : 'Procurement'}
              </h2>
            </div>

            {loading ? (
              <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : procurement && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
                  onClick={() => go('/purchasing/orders')}>
                  <div>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{procurement.posInProgress}</p>
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60">{isRTL ? 'أوامر شراء قيد التنفيذ' : 'POs In Progress'}</p>
                  </div>
                  <ShoppingCartIcon className="h-8 w-8 text-indigo-200 dark:text-indigo-800" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                  onClick={() => go('/purchasing/invoices')}>
                  <div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{procurement.unpaidInvoices}</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/60">{isRTL ? 'فواتير غير مدفوعة' : 'Unpaid Invoices'}</p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-red-200 dark:text-red-800" />
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'أكبر مورد' : 'Top Supplier'}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{procurement.topSupplier}</p>
                </div>
                {procurement.delayedSuppliers > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      {procurement.delayedSuppliers} {isRTL ? 'موردين متأخرين' : 'delayed suppliers'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- Projects --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <FolderIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'المشاريع' : 'Projects'}
                </h2>
              </div>
              <button onClick={() => go('/projects')} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                {isRTL ? 'الكل' : 'All'}
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : projects && projects.projects.length > 0 ? (
              <div className="space-y-4">
                {projects.projects.slice(0, 4).map((proj, i) => {
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
                  return (
                    <div key={i} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={() => go(`/projects/${proj.id}`)}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                          {isRTL ? (proj.nameAr || proj.name) : proj.name}
                        </p>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 ms-2">{proj.progress}%</span>
                      </div>
                      <ProgressBar value={proj.progress} color={colors[i % colors.length]} />
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {proj.linkedShipments} {isRTL ? 'شحنة' : 'shipments'}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {proj.totalCost.toLocaleString()} SAR
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                <FolderIcon className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">{isRTL ? 'لا توجد مشاريع نشطة' : 'No active projects'}</p>
              </div>
            )}
          </div>

          {/* --- Monthly Shipments Bar Chart --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <ChartBarIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isRTL ? 'الشحنات الشهرية' : 'Monthly Shipments'}
              </h2>
            </div>

            {loading ? (
              <Skeleton className="h-32 w-full rounded-lg" />
            ) : charts && charts.monthlyShipments.length > 0 ? (
              <BarChart data={charts.monthlyShipments.map(m => ({ label: m.month, value: m.shipments }))} barColor="#3B82F6" height={140} />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                <ChartBarIcon className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">{isRTL ? 'لا توجد بيانات' : 'No chart data'}</p>
              </div>
            )}

            {/* Shipment type breakdown */}
            {!loading && charts && charts.shipmentTypes.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2">
                {charts.shipmentTypes.map((st, i) => (
                  <div key={i} className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="text-lg font-bold" style={{ color: st.color }}>{st.count}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">{st.type}</div>
                    <div className="text-[10px] text-gray-400">{st.percentage}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* ROW 4: Alerts + Activity + Quick Actions                         */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* --- Alerts --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                  <BellAlertIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'التنبيهات' : 'Alerts'}
                </h2>
              </div>
              {alerts && alerts.alerts.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                  {alerts.alerts.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : alerts && alerts.alerts.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {alerts.alerts.map((alert, i) => {
                  const style = alertStyles[alert.severity] || alertStyles.info;
                  const AlertIcon = style.icon;
                  return (
                    <div key={i} className={`p-3 rounded-lg border ${style.bg} ${style.border} transition-all hover:shadow-sm`}>
                      <div className="flex items-start gap-2">
                        <AlertIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                            {isRTL ? alert.messageAr : alert.message}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            {formatTimeAgo(alert.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                <CheckCircleIcon className="h-10 w-10 mb-2 text-emerald-400" />
                <p className="text-sm">{isRTL ? 'لا توجد تنبيهات' : 'No active alerts'}</p>
              </div>
            )}
          </div>

          {/* --- Activity Timeline --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                  <ClockIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
                </h2>
              </div>
              <button onClick={() => go('/audit-logs')} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
                {isRTL ? 'الكل' : 'All'}
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1"><Skeleton className="h-3 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></div>
                </div>
              ))}</div>
            ) : activity.length > 0 ? (
              <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
                {activity.map((act, i) => {
                  const meta = getActivityMeta(act.type);
                  const ActIcon = meta.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                        <ActIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                          <span className="font-medium">{act.userName}</span>{' '}
                          <span className="text-gray-500 dark:text-gray-400">{act.message}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatTimeAgo(act.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                <ClockIcon className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">{isRTL ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>
              </div>
            )}
          </div>

          {/* --- Quick Actions --- */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                <PlusIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((action, i) => {
                const ActionIcon = action.icon;
                return (
                  <PermissionGate key={i} permission={action.perm}>
                    <button onClick={() => go(action.href)}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl ${action.bg} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}>
                      <ActionIcon className={`h-6 w-6 ${action.color}`} />
                      <span className={`text-xs font-medium ${action.color} text-center leading-tight`}>{action.title}</span>
                    </button>
                  </PermissionGate>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* ROW 5: Top Ports                                                 */}
        {/* ================================================================ */}
        {!loading && logistics && logistics.topPorts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                <MapPinIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isRTL ? 'أهم الموانئ' : 'Top Ports'}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {logistics.topPorts.map((port, i) => {
                const maxCount = Math.max(...logistics.topPorts.map(p => p.count), 1);
                return (
                  <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{port.count}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{port.port}</p>
                    <div className="mt-2 w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${(port.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {overview && (
          <div className="text-center pb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isRTL ? 'آخر تحديث: ' : 'Last updated: '}
              {new Date(overview.lastUpdated).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
