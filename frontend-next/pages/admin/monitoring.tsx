import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

interface HealthData {
  cpu_usage: number;
  memory_usage: number;
  memory_total: string;
  db_connections: { active: number; idle: number; max: number };
  api_response_time_ms: number;
  active_sessions: number;
  queue_depth: number;
  uptime_seconds: number;
  disk_usage: number;
  last_updated: string;
}

export default function MonitoringPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/health/detailed', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch health data');
      const data = await res.json();
      setHealth(data.data || data);
      setLastRefresh(new Date());
    } catch {
      if (loading) showToast('error', 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, [loading, showToast]);

  useEffect(() => {
    fetchHealth();
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const getGaugeColor = (value: number) => {
    if (value < 60) return 'text-green-500';
    if (value < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBgGaugeColor = (value: number) => {
    if (value < 60) return 'bg-green-500';
    if (value < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-full" />
    </div>
  );

  const MetricCard = ({ title, value, subtitle, percentage }: { title: string; value: string; subtitle?: string; percentage?: number }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {percentage !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-700 ${getBgGaugeColor(percentage)}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
          </div>
          <p className={`text-xs mt-1 font-medium ${getGaugeColor(percentage)}`}>{percentage.toFixed(1)}%</p>
        </div>
      )}
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <MainLayout>
      <Head>
        <title>System Monitoring - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Monitoring</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time system health overview
              {lastRefresh && <span className="ml-2">· Last updated {lastRefresh.toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
                className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              Auto-refresh (30s)
            </label>
            <button onClick={fetchHealth} className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm transition-colors">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>
        </div>

        {health && !loading && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">System Online</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">Uptime: {formatUptime(health.uptime_seconds)}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : health ? (
            <>
              <MetricCard title="CPU Usage" value={`${health.cpu_usage.toFixed(1)}%`} percentage={health.cpu_usage} />
              <MetricCard title="Memory Usage" value={health.memory_total} percentage={health.memory_usage} />
              <MetricCard title="Disk Usage" value={`${health.disk_usage.toFixed(1)}%`} percentage={health.disk_usage} />
              <MetricCard
                title="Database Connections"
                value={`${health.db_connections.active} active`}
                subtitle={`${health.db_connections.idle} idle · ${health.db_connections.max} max`}
                percentage={(health.db_connections.active / health.db_connections.max) * 100}
              />
              <MetricCard
                title="API Response Time"
                value={`${health.api_response_time_ms}ms`}
                subtitle={health.api_response_time_ms < 200 ? 'Healthy' : health.api_response_time_ms < 500 ? 'Moderate' : 'Slow'}
              />
              <MetricCard title="Active Sessions" value={String(health.active_sessions)} subtitle="Current active user sessions" />
              <MetricCard
                title="Queue Depth"
                value={String(health.queue_depth)}
                subtitle={health.queue_depth > 100 ? 'Queue building up' : 'Normal'}
              />
            </>
          ) : (
            <div className="col-span-full text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <p className="font-medium text-gray-500 dark:text-gray-400">Unable to retrieve monitoring data</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Check backend connectivity and try again</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
