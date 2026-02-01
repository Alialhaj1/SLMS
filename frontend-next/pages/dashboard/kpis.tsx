import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ChartBarIcon,
  TruckIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

interface KPI {
  label: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  unit?: string;
  trend?: 'up' | 'down';
}

function KPIsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');

      // Fetch stats from multiple endpoints
      const [shipmentsRes, inventoryRes, itemsRes] = await Promise.all([
        fetch('http://localhost:4000/api/shipments', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/warehouses', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/items', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const shipments = await shipmentsRes.json();
      const warehouses = await inventoryRes.json();
      const items = await itemsRes.json();

      // Calculate KPIs
      const shipmentsData = Array.isArray(shipments) ? shipments : shipments.data || [];
      const itemsData = Array.isArray(items) ? items : items.data || [];
      const warehousesData = Array.isArray(warehouses) ? warehouses : warehouses.data || [];

      const kpisData: KPI[] = [
        {
          label: 'Total Shipments',
          value: shipmentsData.length,
          icon: <TruckIcon className="w-8 h-8" />,
          color: 'blue',
          change: 12,
          trend: 'up',
        },
        {
          label: 'Active Items',
          value: itemsData.filter((i: any) => i.is_active).length,
          icon: <CubeIcon className="w-8 h-8" />,
          color: 'green',
          change: 5,
          trend: 'up',
        },
        {
          label: 'Total Warehouses',
          value: warehousesData.length,
          icon: <ArchiveBoxIcon className="w-8 h-8" />,
          color: 'purple',
          change: 0,
        },
        {
          label: 'Inventory Items',
          value: itemsData.filter((i: any) => i.track_inventory).length,
          icon: <CubeIcon className="w-8 h-8" />,
          color: 'amber',
          change: 8,
          trend: 'up',
        },
      ];

      setKpis(kpisData);
    } catch (err: any) {
      console.error('Failed to fetch KPIs:', err);
      setError(err.message || 'Failed to load KPIs');
      showToast('Failed to load KPIs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      purple:
        'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    };
    return colors[color] || colors.blue;
  };

  return (
    <MainLayout>
      <Head>
        <title>KPIs - Dashboard - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Key Performance Indicators
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              مؤشرات الأداء الرئيسية - Real-time business metrics
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading KPIs...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {kpis.map((kpi, index) => (
              <div
                key={index}
                className={`border rounded-lg p-6 ${getColorClasses(kpi.color)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="opacity-70">{kpi.icon}</div>
                  {kpi.change !== undefined && (
                    <div
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        kpi.trend === 'up'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {kpi.trend === 'up' ? (
                        <ArrowUpIcon className="w-4 h-4" />
                      ) : (
                        <ArrowDownIcon className="w-4 h-4" />
                      )}
                      {kpi.change}%
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {kpi.label}
                </h3>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {kpi.value.toLocaleString()}
                  </span>
                  {kpi.unit && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {kpi.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipments Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TruckIcon className="w-6 h-6 text-blue-600" />
                Shipments Overview
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">Total Shipments</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {kpis.find((k) => k.label === 'Total Shipments')?.value || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click on the Shipments menu to view detailed tracking information and manage
                  shipments.
                </p>
              </div>
            </div>

            {/* Inventory Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ArchiveBoxIcon className="w-6 h-6 text-purple-600" />
                Inventory Summary
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">Total Items</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {kpis.find((k) => k.label === 'Active Items')?.value || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300">Tracked Items</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {kpis.find((k) => k.label === 'Inventory Items')?.value || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your inventory items and track stock levels.
                </p>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-400 text-sm">
              📊 <strong>Tip:</strong> KPIs are updated in real-time. Navigate to individual
              sections (Shipments, Inventory, Items) for more detailed analytics and reports.
            </p>
          </div>
        </>
      )}
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Dashboard.Statistics.View, KPIsPage);
