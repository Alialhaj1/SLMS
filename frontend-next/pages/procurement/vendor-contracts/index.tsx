import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface VendorContract {
  id: number;
  contract_number: string;
  contract_name: string;
  vendor_id: number;
  vendor_code: string;
  vendor_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_value?: number;
  currency_code: string;
  is_active: boolean;
  days_until_expiry?: number;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function VendorContractsPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();

  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchContracts();
  }, [statusFilter]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`http://localhost:4000/api/procurement/vendor-contracts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        // Calculate days until expiry
        const today = new Date();
        const contractsWithExpiry = (result.data || []).map((contract: any) => {
          const endDate = new Date(contract.end_date);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { ...contract, days_until_expiry: daysUntilExpiry };
        });
        setContracts(contractsWithExpiry);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load contracts', 'error');
      }
    } catch (error) {
      showToast('Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.vendor_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currency;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getExpiryBadge = (daysUntilExpiry?: number) => {
    if (!daysUntilExpiry) return null;
    
    if (daysUntilExpiry < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <ExclamationTriangleIcon className="w-3 h-3" />
          Expired
        </span>
      );
    }
    
    if (daysUntilExpiry <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          <ClockIcon className="w-3 h-3" />
          Expires in {daysUntilExpiry} days
        </span>
      );
    }

    return null;
  };

  if (!hasPermission('vendor_contracts:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view vendor contracts.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Vendor Contracts - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Vendor Contracts</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage vendor contracts and pricing agreements
            </p>
          </div>
          {hasPermission('vendor_contracts:create') && (
            <Button onClick={() => router.push('/procurement/vendor-contracts/new')}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New Contract
            </Button>
          )}
        </div>

        {/* Expiry Warnings Summary */}
        {contracts.filter(c => c.is_active && c.days_until_expiry && c.days_until_expiry <= 30 && c.days_until_expiry > 0).length > 0 && (
          <div className="card border-2 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">Expiring Contracts</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  {contracts.filter(c => c.is_active && c.days_until_expiry && c.days_until_expiry <= 30 && c.days_until_expiry > 0).length} contract(s) expiring within 30 days. Review and renew to avoid service interruption.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by contract number, name, vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading contracts...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No contracts found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new vendor contract'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contract
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredContracts.map((contract) => (
                    <tr 
                      key={contract.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/procurement/vendor-contracts/${contract.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {contract.contract_number}
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">{contract.contract_name}</div>
                          {getExpiryBadge(contract.days_until_expiry)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {contract.vendor_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{contract.vendor_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(contract.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(contract.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {contract.total_value ? formatCurrency(contract.total_value, contract.currency_code) : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[contract.status] || statusColors.draft
                          }`}
                        >
                          {contract.status === 'active' && <CheckCircleIcon className="w-3 h-3" />}
                          {contract.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/procurement/vendor-contracts/${contract.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.VendorContracts.View, VendorContractsPage);
