import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { SparklesIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Feature {
  name: string;
  description: string;
  module: string;
  status: 'active' | 'beta' | 'coming';
  href: string;
  icon: string;
}

const allFeatures: Feature[] = [
  { name: 'Dashboard & KPIs', description: 'Real-time business metrics, charts, and stat cards', module: 'Core', status: 'active', href: '/dashboard', icon: '📊' },
  { name: 'Shipment Management', description: 'Track shipments, containers, and delivery statuses', module: 'Logistics', status: 'active', href: '/shipments', icon: '🚢' },
  { name: 'Expense Tracking', description: 'Record, categorize, and analyze operational expenses', module: 'Finance', status: 'active', href: '/expenses', icon: '💰' },
  { name: 'Warehouse Management', description: 'Inventory levels, warehouse locations, and stock movements', module: 'Logistics', status: 'active', href: '/warehouses', icon: '🏭' },
  { name: 'Supplier Portal', description: 'Manage suppliers, contacts, and purchase history', module: 'Procurement', status: 'active', href: '/suppliers', icon: '🤝' },
  { name: 'Accounting Module', description: 'Chart of accounts, journal entries, ledgers, and financial reports', module: 'Finance', status: 'active', href: '/accounting/accounts', icon: '📒' },
  { name: 'Approval Workflows', description: 'Multi-step approval logic for documents and transactions', module: 'Core', status: 'active', href: '/approvals/pending', icon: '✅' },
  { name: 'User & Role Management', description: 'RBAC, user roles, permissions, and access control', module: 'Admin', status: 'active', href: '/users', icon: '👥' },
  { name: 'Audit Logging', description: 'Full mutation history with before/after snapshots', module: 'Admin', status: 'active', href: '/admin/audit-logs', icon: '🔍' },
  { name: 'Customs Clearance', description: 'Customs declarations, HS codes, and duty calculations', module: 'Logistics', status: 'beta', href: '/customs', icon: '🛃' },
  { name: 'Document Management', description: 'Upload, organize, and share business documents', module: 'Core', status: 'beta', href: '/documents', icon: '📄' },
  { name: 'Multi-language Support', description: 'Arabic and English translations across the platform', module: 'Core', status: 'active', href: '#', icon: '🌐' },
  { name: 'Master Data Management', description: 'Countries, currencies, units, and reference data', module: 'Admin', status: 'active', href: '/master', icon: '🗄️' },
  { name: 'Report Builder', description: 'Custom report generation with export to PDF/Excel', module: 'Analytics', status: 'coming', href: '#', icon: '📈' },
  { name: 'Notification Center', description: 'In-app and email notifications for approvals and alerts', module: 'Core', status: 'coming', href: '#', icon: '🔔' },
  { name: 'API Integrations', description: 'REST API for third-party system integration', module: 'Platform', status: 'beta', href: '#', icon: '🔌' },
];

export default function FeatureDiscoveryPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const filtered = allFeatures.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.module.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
      beta: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
      coming: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[s]}`}>{s === 'coming' ? 'Coming Soon' : s.charAt(0).toUpperCase() + s.slice(1)}</span>;
  };

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{t('featureDiscovery.title') || 'Feature Discovery'} - SLMS</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-7 h-7 text-blue-500" />
              {t('featureDiscovery.title') || 'Feature Discovery'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('featureDiscovery.subtitle') || 'Explore all system modules and capabilities'}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {allFeatures.filter((f) => f.status === 'active').length} active</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> {allFeatures.filter((f) => f.status === 'beta').length} beta</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> {allFeatures.filter((f) => f.status === 'coming').length} coming</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search features..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="beta">Beta</option>
            <option value="coming">Coming Soon</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
              <p className="font-medium text-gray-500 dark:text-gray-400">No features match your filter</p>
            </div>
          ) : filtered.map((f) => (
            <Link key={f.name} href={f.href} className={`block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 ${f.status === 'coming' ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{f.name}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{f.module}</p>
                  </div>
                </div>
                {statusBadge(f.status)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{f.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
