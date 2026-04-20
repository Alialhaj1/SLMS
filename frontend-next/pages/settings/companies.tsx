import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';
import { BuildingOffice2Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

interface Company {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  status?: string;
  is_active?: boolean;
  branches_count?: number;
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

function CompaniesSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/companies?limit=500&page=1`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch companies');
      const data = await res.json();
      setCompanies(data.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      showToast('error', t('common.loadFailed') || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast, t]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) ||
           (c.code || '').toLowerCase().includes(q) ||
           (c.email || '').toLowerCase().includes(q);
  });

  const statusBadge = (company: Company) => {
    const isActive = company.is_active !== false && company.status !== 'inactive' && company.status !== 'suspended';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      }`}>
        {isActive ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.companies') || 'My Companies'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BuildingOffice2Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.companies') || 'My Companies'}</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t('settings.companiesDesc') || 'Companies registered under your account.'}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search') || 'Search companies...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
            <BuildingOffice2Icon className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">{t('common.noResults') || 'No companies found.'}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('common.name') || 'Company'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.code') || 'Code'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('common.status') || 'Status'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">{t('settings.country') || 'Country'}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">{t('settings.branches') || 'Branches'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 hidden lg:table-cell">{t('common.contact') || 'Contact'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(company => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{company.name}</p>
                        {company.name_ar && <p className="text-xs text-gray-400 mt-0.5">{company.name_ar}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{company.code}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(company)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">{company.country || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 hidden md:table-cell">{company.branches_count ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {company.email && <p className="text-xs text-gray-500 dark:text-gray-400">{company.email}</p>}
                      {company.phone && <p className="text-xs text-gray-400">{company.phone}</p>}
                      {!company.email && !company.phone && <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary stats */}
        {!loading && companies.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{companies.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.totalCompanies') || 'Total Companies'}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{companies.filter(c => c.is_active !== false).length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.activeCompanies') || 'Active'}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{companies.reduce((s, c) => s + (c.branches_count || 0), 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.totalBranches') || 'Total Branches'}</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('companies:view', CompaniesSettingsPage);
