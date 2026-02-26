import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ShieldExclamationIcon,
  UserGroupIcon,
  DevicePhoneMobileIcon,
  NoSymbolIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface SecurityMetrics {
  failedLogins24h: number;
  activeSessions: number;
  mfaAdoptionPercent: number;
  blockedIPs: number;
  securityScore: number;
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/security/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch security metrics');
      const data = await res.json();
      setMetrics(data.data);
    } catch {
      showToast('error', 'Failed to load security dashboard');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Failed Logins (24h)', value: metrics?.failedLogins24h, icon: ShieldExclamationIcon, color: 'red' },
    { label: 'Active Sessions', value: metrics?.activeSessions, icon: UserGroupIcon, color: 'blue' },
    { label: 'MFA Adoption', value: metrics ? `${metrics.mfaAdoptionPercent}%` : undefined, icon: DevicePhoneMobileIcon, color: 'green' },
    { label: 'Blocked IPs', value: metrics?.blockedIPs, icon: NoSymbolIcon, color: 'yellow' },
    { label: 'Security Score', value: metrics ? `${metrics.securityScore}/100` : undefined, icon: ChartBarIcon, color: 'purple' },
  ];

  const colorMap: Record<string, string> = {
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  };

  const iconBgMap: Record<string, string> = {
    red: 'bg-red-100 dark:bg-red-900/40',
    blue: 'bg-blue-100 dark:bg-blue-900/40',
    green: 'bg-green-100 dark:bg-green-900/40',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/40',
    purple: 'bg-purple-100 dark:bg-purple-900/40',
  };

  return (
    <MainLayout>
      <Head>
        <title>Security Dashboard - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of system security metrics and threat indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border border-gray-200 dark:border-gray-700 p-5 ${colorMap[card.color]}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${iconBgMap[card.color]}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium opacity-75">{card.label}</p>
                  {loading ? (
                    <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{card.value ?? '—'}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Login Attempts (7 Days)
            </h2>
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded">
              Chart placeholder — integrate Recharts / Chart.js
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Threat Map
            </h2>
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded">
              Chart placeholder — integrate Recharts / Chart.js
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Security Events
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              No recent security events to display.
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
