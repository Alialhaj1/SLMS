import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ClipboardDocumentCheckIcon,
  GlobeAltIcon,
  ScaleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ComplianceItem {
  id: number;
  name: string;
  category: string;
  status: 'compliant' | 'non_compliant' | 'in_progress';
  lastChecked: string | null;
}

interface GovernanceData {
  complianceItems: ComplianceItem[];
  dataResidency: string;
  regulatoryFrameworks: string[];
  overallProgress: number;
}

export default function EnterpriseGovernance() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [data, setData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/governance/enterprise', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data);
    } catch {
      showToast('error', 'Failed to load governance data');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: ComplianceItem['status']) => {
    const map: Record<string, string> = {
      compliant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      non_compliant: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    const label: Record<string, string> = { compliant: 'Compliant', non_compliant: 'Non-Compliant', in_progress: 'In Progress' };
    return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${map[status]}`}>{label[status]}</span>;
  };

  const summaryCards = [
    { label: 'Overall Progress', value: data ? `${data.overallProgress}%` : '—', icon: CheckCircleIcon, cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
    { label: 'Data Residency', value: data?.dataResidency ?? '—', icon: GlobeAltIcon, cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
    { label: 'Frameworks', value: data?.regulatoryFrameworks?.length ?? '—', icon: ScaleIcon, cls: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
    { label: 'Checks', value: data?.complianceItems?.length ?? '—', icon: ClipboardDocumentCheckIcon, cls: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>Enterprise Governance - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Governance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Compliance checklist, data residency, and regulatory tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <div key={c.label} className={`rounded-lg border border-gray-200 dark:border-gray-700 p-5 ${c.cls}`}>
              <div className="flex items-center gap-3">
                <c.icon className="h-6 w-6" />
                <div>
                  <p className="text-xs font-medium opacity-75">{c.label}</p>
                  {loading ? (
                    <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{c.value}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Checklist</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Requirement', 'Category', 'Status', 'Last Checked'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : !data?.complianceItems?.length ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <ClipboardDocumentCheckIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No compliance items configured.</p>
                  </td>
                </tr>
              ) : (
                data.complianceItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{item.category}</td>
                    <td className="px-6 py-4">{statusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{item.lastChecked ? new Date(item.lastChecked).toLocaleDateString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
