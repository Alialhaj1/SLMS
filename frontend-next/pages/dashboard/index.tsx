/**
 * 🏠 Enterprise Dashboard - Premium Logistics Control Center
 * ===========================================================
 * 
 * Main dashboard page with:
 * - Executive KPIs (8 cards)
 * - Logistics Snapshot (shipment status, arrivals)
 * - Financial Pulse (cash flow, payments)
 * - Alerts & Risks
 * - Quick Actions
 * - Activity Timeline
 * 
 * Features:
 * - Real-time data refresh
 * - Permission-based widgets
 * - RTL/LTR support
 * - Dark mode
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AuthGuard from '../../components/AuthGuard';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';

// Dashboard Components
import KPIGrid from '../../components/dashboard/KPIGrid';
import LogisticsSnapshot from '../../components/dashboard/LogisticsSnapshot';
import FinancialPulse from '../../components/dashboard/FinancialPulse';
import AlertsPanel from '../../components/dashboard/AlertsPanel';
import QuickActions from '../../components/dashboard/QuickActions';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';

// Dashboard Service
import dashboardService, {
  OverviewData,
  LogisticsData,
  FinancialData,
  AlertsData,
  ActivityItem,
} from '../../lib/dashboardService';

// Dashboard state interface
interface DashboardState {
  overview: OverviewData | null;
  logistics: LogisticsData | null;
  financial: FinancialData | null;
  alerts: AlertsData | null;
  activities: ActivityItem[];
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatRelativeTime } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  // Refs to avoid stale closures
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // State
  const [data, setData] = useState<DashboardState>({
    overview: null,
    logistics: null,
    financial: null,
    alerts: null,
    activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch all dashboard data - no dependencies to avoid re-creation
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch all data in parallel
      const [overview, logistics, financial, alerts] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getLogistics(),
        dashboardService.getFinancial(),
        dashboardService.getAlerts(),
      ]);

      setData({
        overview,
        logistics,
        financial,
        alerts,
        activities: [], // Will be fetched from legacy endpoint if needed
      });
      setLastUpdated(new Date());

      if (isRefresh) {
        showToastRef.current?.('تم التحديث ✓', 'success');
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Empty dependencies - stable reference

  // Initial fetch - only once
  useEffect(() => {
    if (!hasFetched) {
      setHasFetched(true);
      fetchDashboardData();
    }
  }, [hasFetched, fetchDashboardData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Handle manual refresh
  const handleRefresh = () => {
    if (!refreshing) {
      fetchDashboardData(true);
    }
  };

  return (
    <AuthGuard>
      <Head>
        <title>{t('dashboard.title')} - SLMS</title>
      </Head>
      <MainLayout>
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.title')}
            </h1>
            {user && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('dashboard.welcome')}, {user.full_name || user.email}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Last Updated */}
            {lastUpdated && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.lastUpdated', { time: formatRelativeTime(lastUpdated) })}
              </span>
            )}
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <p className="font-medium">{error}</p>
              <button
                onClick={handleRefresh}
                className="ms-auto text-sm underline hover:no-underline"
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <KPIGrid data={data.overview} loading={loading} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Logistics Snapshot - 2 columns */}
          {hasPermission('shipments:view') && (
            <div className="lg:col-span-2">
              <LogisticsSnapshot data={data.logistics} loading={loading} />
            </div>
          )}

          {/* Financial Pulse - 1 column */}
          {hasPermission('finance:view') && (
            <div className="lg:col-span-1">
              <FinancialPulse data={data.financial} loading={loading} />
            </div>
          )}
        </div>

        {/* Secondary Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Panel - 2 columns */}
          <div className="lg:col-span-2">
            <AlertsPanel data={data.alerts} loading={loading} />
          </div>

          {/* Quick Actions - 1 column */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
};

export default withPermission(MenuPermissions.Dashboard.View, Dashboard);
