import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface PurchaseOrder {
  id: number;
  po_number: string;
  po_date: string;
  vendor_id: number;
  vendor_code: string;
  vendor_name: string;
  status: string;
  total_amount: number;
  currency_code: string;
  expected_delivery_date?: string;
  approved_at?: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  partially_received: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  fully_received: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <DocumentCheckIcon className="w-4 h-4" />,
  pending_approval: <ClockIcon className="w-4 h-4" />,
  approved: <CheckCircleIcon className="w-4 h-4" />,
  partially_received: <ClockIcon className="w-4 h-4" />,
  fully_received: <CheckCircleIcon className="w-4 h-4" />,
  closed: <CheckCircleIcon className="w-4 h-4" />,
  cancelled: <XCircleIcon className="w-4 h-4" />,
};

function PurchaseOrdersPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`http://localhost:4000/api/procurement/purchase-orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setOrders(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load purchase orders', 'error');
      }
    } catch (error) {
      showToast('Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendor_code.toLowerCase().includes(searchTerm.toLowerCase());
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

  if (!hasPermission('purchase_orders:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view purchase orders.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Purchase Orders - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Purchase Orders</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage purchase orders and track approvals
            </p>
          </div>
          {hasPermission('purchase_orders:create') && (
            <Button onClick={() => router.push('/procurement/purchase-orders/new')}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New Purchase Order
            </Button>
          )}
        </div>

        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PO number, vendor name..."
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
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="partially_received">Partially Received</option>
                <option value="fully_received">Fully Received</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading purchase orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <DocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No purchase orders found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new purchase order'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expected Delivery
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
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
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/procurement/purchase-orders/${order.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          {order.po_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(order.po_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {order.vendor_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{order.vendor_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(order.total_amount, order.currency_code)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[order.status] || statusColors.draft
                          }`}
                        >
                          {statusIcons[order.status]}
                          {order.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/procurement/purchase-orders/${order.id}`);
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

export default withPermission(MenuPermissions.Procurement.PurchaseOrders.View, PurchaseOrdersPage);
