/**
 * ============================================================================
 * TENANT DASHBOARD - Company Control Center
 * ============================================================================
 * Main dashboard for tenant users (company managers/users).
 * Landing page after login for non-platform users.
 *
 * @module pages/tenant/dashboard
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  CubeIcon,
  TruckIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  total_shipments: number;
  active_shipments: number;
  pending_shipments: number;
  completed_shipments: number;
  total_expenses: number;
  monthly_expenses: number;
  total_customers: number;
  total_suppliers: number;
  pending_invoices: number;
  total_warehouses: number;
  recent_activities: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  href,
  loading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  href?: string;
  loading?: boolean;
}) {
  const router = useRouter();
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-24" />
          <div className="h-10 w-10 bg-gray-200 dark:bg-slate-600 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-slate-600 rounded w-16 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-20" />
      </div>
    );
  }

  return (
    <div
      onClick={href ? () => router.push(href) : undefined}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-all ${href ? 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div className={`p-2.5 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
}

export default function TenantDashboard() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total_shipments: 0,
    active_shipments: 0,
    pending_shipments: 0,
    completed_shipments: 0,
    total_expenses: 0,
    monthly_expenses: 0,
    total_customers: 0,
    total_suppliers: 0,
    pending_invoices: 0,
    total_warehouses: 0,
    recent_activities: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/dashboard', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data) setStats(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { label: t('shipments') || 'Shipments', href: '/shipments', icon: TruckIcon, color: 'text-blue-600', desc: t('manageShipments') || 'Track and manage' },
    { label: t('expenses') || 'Expenses', href: '/expenses', icon: CurrencyDollarIcon, color: 'text-green-600', desc: t('manageExpenses') || 'Track costs' },
    { label: t('invoices') || 'Invoices', href: '/sales/invoices', icon: DocumentTextIcon, color: 'text-purple-600', desc: t('viewInvoices') || 'Sales & billing' },
    { label: t('inventory') || 'Inventory', href: '/inventory', icon: ArchiveBoxIcon, color: 'text-yellow-600', desc: t('manageInventory') || 'Stock & warehouses' },
    { label: t('reports') || 'Reports', href: '/reports', icon: ChartBarIcon, color: 'text-indigo-600', desc: t('viewReports') || 'Analytics & reports' },
    { label: t('settings') || 'Settings', href: '/admin/settings', icon: ShieldCheckIcon, color: 'text-gray-600', desc: t('systemSettings') || 'System config' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{t('dashboard') || 'Dashboard'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('welcomeBack') || 'Welcome back'}, {user?.first_name || user?.email?.split('@')[0] || ''}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('dashboardOverview') || 'Here\'s an overview of your logistics operations'}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('totalShipments') || 'Total Shipments'}
            value={stats.total_shipments}
            icon={TruckIcon}
            color="blue"
            subtitle={`${stats.active_shipments} ${t('active') || 'active'}`}
            href="/shipments"
            loading={loading}
          />
          <StatCard
            title={t('activeShipments') || 'Active Shipments'}
            value={stats.active_shipments}
            icon={CubeIcon}
            color="green"
            subtitle={`${stats.pending_shipments} ${t('pending') || 'pending'}`}
            href="/shipments"
            loading={loading}
          />
          <StatCard
            title={t('monthlyExpenses') || 'Monthly Expenses'}
            value={`$${(stats.monthly_expenses || 0).toLocaleString()}`}
            icon={CurrencyDollarIcon}
            color="yellow"
            href="/expenses"
            loading={loading}
          />
          <StatCard
            title={t('pendingInvoices') || 'Pending Invoices'}
            value={stats.pending_invoices}
            icon={DocumentTextIcon}
            color={stats.pending_invoices > 0 ? 'red' : 'green'}
            href="/sales/invoices"
            loading={loading}
          />
        </div>

        {/* Second KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('customers') || 'Customers'}
            value={stats.total_customers}
            icon={UsersIcon}
            color="purple"
            href="/master/customers"
            loading={loading}
          />
          <StatCard
            title={t('suppliers') || 'Suppliers'}
            value={stats.total_suppliers}
            icon={BuildingStorefrontIcon}
            color="teal"
            href="/master/vendors"
            loading={loading}
          />
          <StatCard
            title={t('warehouses') || 'Warehouses'}
            value={stats.total_warehouses}
            icon={ArchiveBoxIcon}
            color="indigo"
            href="/inventory/warehouses"
            loading={loading}
          />
          <StatCard
            title={t('completedShipments') || 'Completed'}
            value={stats.completed_shipments}
            icon={CheckCircleIcon}
            color="green"
            loading={loading}
          />
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('quickAccess') || 'Quick Access'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-center"
              >
                <div className={`p-3 rounded-lg bg-gray-100 dark:bg-slate-700`}>
                  <link.icon className={`h-6 w-6 ${link.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{link.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{link.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
