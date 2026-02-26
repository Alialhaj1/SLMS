import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

interface Company {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'inactive' | 'suspended';
  branches_count: number;
  users_count: number;
  created_at: string;
}

const MOCK_COMPANIES: Company[] = [
  { id: 1, name: 'Al Hajj International', code: 'AHI', status: 'active', branches_count: 3, users_count: 45, created_at: '2024-01-15' },
  { id: 2, name: 'Gulf Logistics Co.', code: 'GLC', status: 'active', branches_count: 2, users_count: 28, created_at: '2024-03-20' },
  { id: 3, name: 'Saudi Express Freight', code: 'SEF', status: 'inactive', branches_count: 1, users_count: 12, created_at: '2024-06-10' },
  { id: 4, name: 'Peninsula Shipping', code: 'PNS', status: 'active', branches_count: 5, users_count: 67, created_at: '2024-08-01' },
];

function CompaniesSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { setCompanies(MOCK_COMPANIES); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: Company['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
      suspended: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.companies') || 'Company Management'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.companies') || 'Company Management'}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.companiesDesc') || 'Manage companies registered in this tenant.'}</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            {t('common.addNew') || 'Add Company'}
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder={t('common.search') || 'Search companies...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
          />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('common.name') || 'Name'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.code') || 'Code'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('common.status') || 'Status'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.branches') || 'Branches'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.users') || 'Users'}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(company => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-slate-750">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{company.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{company.code}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(company.status)}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{company.branches_count}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{company.users_count}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mr-3">{t('common.edit') || 'Edit'}</button>
                      <button className="text-gray-400 hover:text-red-600 dark:text-gray-500 text-sm">{t('common.disable') || 'Disable'}</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('common.noResults') || 'No companies found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{companies.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.totalCompanies') || 'Total Companies'}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{companies.filter(c => c.status === 'active').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.activeCompanies') || 'Active'}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{companies.reduce((s, c) => s + c.users_count, 0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.totalUsers') || 'Total Users'}</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default withPermission('companies:view', CompaniesSettingsPage);
