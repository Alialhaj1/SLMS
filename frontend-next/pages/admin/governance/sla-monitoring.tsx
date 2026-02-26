import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ServerIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline';

interface SlaMetrics {
  apiUptime: number;
  responseTimeP95: number;
  errorRate: number;
  apdexScore: number;
}

export default function SlaMonitoring() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<SlaMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/governance/sla', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMetrics(data.data);
    } catch {
      showToast('error', 'Failed to load SLA metrics');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      label: 'API Uptime',
      value: metrics ? `${metrics.apiUptime}%` : '—',
      target: '99.9%',
      icon: ServerIcon,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    },
    {
      label: 'Response Time (p95)',
      value: metrics ? `${metrics.responseTimeP95}ms` : '—',
      target: '< 500ms',
      icon: ClockIcon,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    },
    {
      label: 'Error Rate',
      value: metrics ? `${metrics.errorRate}%` : '—',
      target: '< 1%',
      icon: ExclamationTriangleIcon,
      color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    },
    {
      label: 'Apdex Score',
      value: metrics ? `${metrics.apdexScore}` : '—',
      target: '> 0.9',
      icon: ChartBarSquareIcon,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    },
  ];

  return (
    <MainLayout>
      <Head>
        <title>SLA Monitoring - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Service Level Agreement metrics and performance indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className={`rounded-lg border border-gray-200 dark:border-gray-700 p-5 ${card.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <card.icon className="h-6 w-6" />
                <p className="text-sm font-medium">{card.label}</p>
              </div>
              {loading ? (
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold">{card.value}</p>
              )}
              <p className="mt-1 text-xs opacity-75">Target: {card.target}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Uptime History (30 Days)
            </h2>
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded">
              Chart placeholder — integrate Recharts / Chart.js
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Response Time Distribution
            </h2>
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded">
              Chart placeholder — integrate Recharts / Chart.js
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SLA Breach Log</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              No SLA breaches detected in the current period.
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
