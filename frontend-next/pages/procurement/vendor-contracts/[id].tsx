import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Button from '../../../components/ui/Button';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface ContractItem {
  id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  unit_price: number;
  min_quantity?: number;
  max_quantity?: number;
  uom_code: string;
  discount_percent?: number;
  notes?: string;
}

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
  payment_terms?: string;
  delivery_terms?: string;
  is_active: boolean;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  created_by_user_name?: string;
  items: ContractItem[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function VendorContractDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();

  const [contract, setContract] = useState<VendorContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);

  useEffect(() => {
    if (id) fetchContract();
  }, [id]);

  const fetchContract = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendor-contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setContract(result.data);
        
        // Calculate days until expiry
        const today = new Date();
        const endDate = new Date(result.data.end_date);
        const days = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        setDaysUntilExpiry(days);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
        router.push('/procurement/vendor-contracts');
      } else {
        showToast('Failed to load contract', 'error');
      }
    } catch (error) {
      showToast('Failed to load contract', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const canEdit = hasPermission('vendor_contracts:edit') && contract?.status === 'draft';

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">Loading contract...</p>
        </div>
      </MainLayout>
    );
  }

  if (!contract) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Contract Not Found</h2>
          <Button onClick={() => router.push('/procurement/vendor-contracts')} className="mt-4">
            Back to Contracts
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{contract.contract_number} - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => router.push('/procurement/vendor-contracts')}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{contract.contract_number}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{contract.contract_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button variant="secondary" onClick={() => router.push(`/procurement/vendor-contracts/${contract.id}/edit`)}>
                <PencilIcon className="w-5 h-5 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="secondary">
              <PrinterIcon className="w-5 h-5 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Status & Expiry Warning */}
        <div className="space-y-3">
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              statusColors[contract.status] || statusColors.draft
            }`}
          >
            {contract.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>

          {contract.is_active && daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
            <div className="card border-2 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">Contract Expiring Soon</h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    This contract will expire in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Contact vendor to renew or extend.
                  </p>
                </div>
              </div>
            </div>
          )}

          {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
            <div className="card border-2 border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">Contract Expired</h3>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    This contract expired {Math.abs(daysUntilExpiry)} day{Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago. Prices may no longer be valid.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contract Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contract Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contract Number</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{contract.contract_number}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contract Name</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{contract.contract_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDate(contract.start_date)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDate(contract.end_date)}</dd>
              </div>
              {contract.total_value && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Value</dt>
                  <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {formatCurrency(contract.total_value, contract.currency_code)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {contract.created_by_user_name || '—'}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">on {formatDate(contract.created_at)}</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Vendor Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Code</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{contract.vendor_code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Name</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{contract.vendor_name}</dd>
              </div>
              {contract.payment_terms && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Terms</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{contract.payment_terms}</dd>
                </div>
              )}
              {contract.delivery_terms && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Terms</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">{contract.delivery_terms}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Contract Items (Price List) */}
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 px-6 pt-6">Contract Items & Pricing</h3>
          {contract.items.length === 0 ? (
            <div className="text-center py-8 px-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">No items defined in this contract.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Min Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Max Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Discount %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {contract.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.item_name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.item_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.unit_price, contract.currency_code)} / {item.uom_code}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                        {item.min_quantity || '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                        {item.max_quantity || '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                        {item.discount_percent ? `${item.discount_percent}%` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Terms & Conditions */}
        {contract.terms_and_conditions && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Terms & Conditions</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{contract.terms_and_conditions}</p>
          </div>
        )}

        {/* Notes */}
        {contract.notes && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{contract.notes}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.VendorContracts.View, VendorContractDetailPage);
