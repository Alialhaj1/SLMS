/**
 * 📊 KPIGrid Component - Enterprise Dashboard KPI Cards
 * =====================================================
 * 
 * Displays 8 key performance indicator cards:
 * 1. Active Shipments
 * 2. Delayed Shipments
 * 3. Total Shipment Cost
 * 4. Pending Approvals
 * 5. Active Projects
 * 6. Active Letters of Credit
 * 7. Supplier Orders
 * 8. Pending Payments
 * 
 * Features:
 * - Animated counter values
 * - Trend indicators (up/down arrows)
 * - Click-through navigation
 * - Permission-based visibility
 * - RTL/LTR support
 * - Dark mode support
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  TruckIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { usePermissions } from '../../hooks/usePermissions';
import StatCard from './StatCard';
import type { OverviewData } from '../../lib/dashboardService';

interface KPIGridProps {
  data: OverviewData | null;
  loading?: boolean;
}

interface KPIConfig {
  key: keyof OverviewData['kpis'];
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  href: string;
  permission?: string;
  formatValue?: (value: number, currency?: string) => string;
  showTrend?: boolean;
}

const KPI_CONFIGS: KPIConfig[] = [
  {
    key: 'activeShipments',
    titleKey: 'dashboard.kpi.activeShipments',
    icon: TruckIcon,
    iconBgColor: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
    href: '/shipments',
    permission: 'shipments:view',
    showTrend: true,
  },
  {
    key: 'delayedShipments',
    titleKey: 'dashboard.kpi.delayedShipments',
    icon: ExclamationTriangleIcon,
    iconBgColor: 'bg-red-100 dark:bg-red-900',
    iconColor: 'text-red-600 dark:text-red-400',
    href: '/shipments?status=delayed',
    permission: 'shipments:view',
    showTrend: true,
  },
  {
    key: 'totalShipmentCost',
    titleKey: 'dashboard.kpi.totalShipmentCost',
    icon: CurrencyDollarIcon,
    iconBgColor: 'bg-yellow-100 dark:bg-yellow-900',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    href: '/expenses',
    permission: 'shipment_expenses:view',
    formatValue: (value, currency) => `${currency || 'SAR'} ${value.toLocaleString()}`,
    showTrend: true,
  },
  {
    key: 'pendingApprovals',
    titleKey: 'dashboard.kpi.pendingApprovals',
    icon: ClipboardDocumentCheckIcon,
    iconBgColor: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
    href: '/approvals',
    permission: 'approvals:view',
  },
  {
    key: 'activeProjects',
    titleKey: 'dashboard.kpi.activeProjects',
    icon: FolderIcon,
    iconBgColor: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
    href: '/projects',
    permission: 'projects:view',
  },
  {
    key: 'activeLettersOfCredit',
    titleKey: 'dashboard.kpi.activeLettersOfCredit',
    icon: DocumentTextIcon,
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    href: '/finance/letters-of-credit',
    permission: 'letters_of_credit:view',
  },
  {
    key: 'supplierOrders',
    titleKey: 'dashboard.kpi.supplierOrders',
    icon: ShoppingCartIcon,
    iconBgColor: 'bg-orange-100 dark:bg-orange-900',
    iconColor: 'text-orange-600 dark:text-orange-400',
    href: '/purchasing/orders',
    permission: 'purchase_orders:view',
  },
  {
    key: 'pendingPayments',
    titleKey: 'dashboard.kpi.pendingPayments',
    icon: CreditCardIcon,
    iconBgColor: 'bg-pink-100 dark:bg-pink-900',
    iconColor: 'text-pink-600 dark:text-pink-400',
    href: '/finance/vendor-payments',
    permission: 'vendor_payments:view',
    formatValue: (value, currency) => `${value} (${currency || 'SAR'})`,
  },
];

// Skeleton loader for KPI card
const KPICardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
    </div>
  </div>
);

const KPIGrid: React.FC<KPIGridProps> = ({ data, loading = false }) => {
  const router = useRouter();
  const { t, formatNumber, formatCurrency } = useTranslation();
  const { hasPermission } = usePermissions();

  // Filter KPIs based on permissions
  const visibleKPIs = KPI_CONFIGS.filter(
    kpi => !kpi.permission || hasPermission(kpi.permission)
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {visibleKPIs.map((config) => {
        const kpiData = data.kpis[config.key] as any;
        if (!kpiData) return null;

        const value = kpiData.value ?? 0;
        const change = kpiData.change ?? 0;
        const trend = kpiData.trend;
        const currency = kpiData.currency;

        // Format value
        let displayValue: string | number = value;
        if (config.formatValue && currency) {
          displayValue = formatCurrency(value, currency);
        } else if (typeof value === 'number') {
          displayValue = formatNumber(value);
        }

        // Subtitle for cards with additional info
        let subtitle: string | undefined;
        if (config.key === 'pendingPayments' && kpiData.totalAmount) {
          subtitle = `${formatCurrency(kpiData.totalAmount, currency)} ${t('dashboard.kpi.total')}`;
        } else if (config.key === 'activeLettersOfCredit' && kpiData.totalValue) {
          subtitle = `${formatCurrency(kpiData.totalValue, currency)} ${t('dashboard.kpi.totalValue')}`;
        }

        const Icon = config.icon;

        return (
          <StatCard
            key={config.key}
            title={t(config.titleKey)}
            value={displayValue}
            subtitle={subtitle}
            icon={<Icon className="w-6 h-6" />}
            iconBgColor={config.iconBgColor}
            iconColor={config.iconColor}
            change={config.showTrend ? change : undefined}
            onClick={() => router.push(config.href)}
          />
        );
      })}
    </div>
  );
};

export default KPIGrid;
