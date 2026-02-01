/**
 * 🚚 LogisticsSnapshot Component - Shipment Status Overview
 * =========================================================
 * 
 * Displays:
 * - Shipment status distribution (pie/donut chart)
 * - Upcoming arrivals timeline
 * - Top ports
 * - Delayed containers count
 * 
 * Features:
 * - Interactive donut chart
 * - Click-through to shipment details
 * - RTL/LTR support
 * - Dark mode colors
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useLocale } from '../../contexts/LocaleContext';
import type { LogisticsData } from '../../lib/dashboardService';

interface LogisticsSnapshotProps {
  data: LogisticsData | null;
  loading?: boolean;
}

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; text: string; fill: string }> = {
  delivered: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-600 dark:text-green-400',
    fill: '#10b981',
  },
  inTransit: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-600 dark:text-yellow-400',
    fill: '#f59e0b',
  },
  pending: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-600 dark:text-blue-400',
    fill: '#3b82f6',
  },
  delayed: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-600 dark:text-red-400',
    fill: '#ef4444',
  },
  customs: {
    bg: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-600 dark:text-purple-400',
    fill: '#8b5cf6',
  },
};

// Simple Donut Chart Component (no external library)
const DonutChart: React.FC<{
  data: { key: string; value: number; color: string }[];
  size?: number;
}> = ({ data, size = 160 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = size / 2;
  const strokeWidth = 24;
  const innerRadius = radius - strokeWidth;
  const circumference = 2 * Math.PI * innerRadius;

  let accumulatedPercent = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {data.map((segment, index) => {
        const percent = segment.value / total;
        const strokeDasharray = `${percent * circumference} ${circumference}`;
        const strokeDashoffset = -accumulatedPercent * circumference;
        accumulatedPercent += percent;

        return (
          <circle
            key={segment.key}
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="transparent"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        );
      })}
      {/* Center circle for donut effect */}
      <circle
        cx={radius}
        cy={radius}
        r={innerRadius - strokeWidth / 2}
        fill="transparent"
      />
    </svg>
  );
};

// Skeleton loader
const LogisticsSnapshotSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
    <div className="flex items-center justify-center mb-4">
      <div className="w-40 h-40 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
    <div className="space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      ))}
    </div>
  </div>
);

const LogisticsSnapshot: React.FC<LogisticsSnapshotProps> = ({ data, loading = false }) => {
  const router = useRouter();
  const { t, formatNumber } = useTranslation();
  const { isRTL } = useLocale();

  if (loading) {
    return <LogisticsSnapshotSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { statusDistribution, upcomingArrivals, topPorts, delayedContainers } = data;

  // Prepare chart data
  const chartData = Object.entries(statusDistribution).map(([key, value]) => ({
    key,
    value,
    color: STATUS_COLORS[key]?.fill || '#9ca3af',
  })).filter(d => d.value > 0);

  const totalShipments = Object.values(statusDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TruckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {t('dashboard.logistics.title')}
        </h2>
        <button
          onClick={() => router.push('/shipments')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('common.viewAll')}
        </button>
      </div>

      {/* Status Chart & Legend */}
      <div className="flex flex-col lg:flex-row items-center gap-6 mb-6">
        {/* Donut Chart */}
        <div className="relative">
          <DonutChart data={chartData} size={160} />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(totalShipments)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.logistics.total')}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {Object.entries(statusDistribution).map(([key, value]) => {
            const colors = STATUS_COLORS[key];
            if (!colors) return null;

            return (
              <button
                key={key}
                onClick={() => router.push(`/shipments?status=${key}`)}
                className={`flex items-center gap-2 p-2 rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.fill }}
                />
                <span className="text-sm font-medium">
                  {t(`dashboard.logistics.${key}`)}
                </span>
                <span className="text-sm font-bold ms-auto">
                  {formatNumber(value)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming Arrivals */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <ClockIcon className="w-4 h-4" />
          {t('dashboard.logistics.upcomingArrivals')}
        </h3>

        {upcomingArrivals.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            {t('dashboard.logistics.noUpcoming')}
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {upcomingArrivals.slice(0, 5).map((arrival) => (
              <button
                key={arrival.id}
                onClick={() => router.push(`/shipments/${arrival.id}`)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {arrival.shipmentNumber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3" />
                    {arrival.port}
                  </span>
                  <span className={`text-xs font-medium ${
                    arrival.daysRemaining <= 2
                      ? 'text-red-600 dark:text-red-400'
                      : arrival.daysRemaining <= 5
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {t('dashboard.logistics.daysRemaining', { days: arrival.daysRemaining })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delayed Containers Alert */}
      {delayedContainers > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ExclamationCircleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">
              {t('dashboard.logistics.delayedContainers', { count: delayedContainers })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsSnapshot;
