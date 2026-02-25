import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface InventoryTransfer {
  id: number;
  transfer_number: string;
  from_warehouse_name: string;
  to_warehouse_name: string;
  transfer_date: string;
  expected_arrival: string | null;
  status: string;
  total_items: number;
  shipped_items: number;
  received_items: number;
  notes: string | null;
  created_by_name: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  in_transit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  received: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  partial: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  in_transit: { en: 'In Transit', ar: 'في الطريق' },
  received: { en: 'Received', ar: 'مستلم' },
  partial: { en: 'Partially Received', ar: 'مستلم جزئياً' },
  cancelled: { en: 'Cancelled', ar: 'ملغى' },
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <ClockIcon className="w-4 h-4" />,
  approved: <CheckCircleIcon className="w-4 h-4" />,
  in_transit: <TruckIcon className="w-4 h-4" />,
  received: <CheckCircleIcon className="w-4 h-4" />,
  cancelled: <XCircleIcon className="w-4 h-4" />,
};

export default function InventoryTransfersPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/inventory-transfers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setTransfers(result.data || []);
      } else {
        showToast('error', locale === 'ar' ? 'فشل تحميل التحويلات' : 'Failed to load transfers');
      }
    } catch (error) {
      showToast('error', locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.transfer_number?.toLowerCase().includes(term) ||
      t.from_warehouse_name?.toLowerCase().includes(term) ||
      t.to_warehouse_name?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB');
  };

  const handleApprove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/inventory-transfers/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم اعتماد التحويل' : 'Transfer approved');
        fetchTransfers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  const handleShip = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/inventory-transfers/${id}/ship`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم الشحن' : 'Shipped');
        fetchTransfers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  const handleReceive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/inventory-transfers/${id}/receive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', locale === 'ar' ? 'تم الاستلام' : 'Received');
        fetchTransfers();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed');
      }
    } catch { showToast('error', 'Error'); }
  };

  const stats = {
    total: transfers.length,
    inTransit: transfers.filter((t) => t.status === 'in_transit').length,
    received: transfers.filter((t) => t.status === 'received').length,
    draft: transfers.filter((t) => t.status === 'draft').length,
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تحويلات المخزون — SLMS' : 'Inventory Transfers — SLMS'}</title>
      </Head>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ArrowsRightLeftIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'تحويلات المخزون' : 'Inventory Transfers'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'نقل البضائع بين المستودعات ومتابعة الشحنات' : 'Transfer goods between warehouses & track shipments'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchTransfers}>
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            {hasPermission('inventory_transfers:create') && (
              <Button onClick={() => router.push('/inventory/transfers/new')}>
                <PlusIcon className="w-5 h-5 mr-1" />
                {locale === 'ar' ? 'تحويل جديد' : 'New Transfer'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مسودات' : 'Drafts'}</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.draft}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'في الطريق' : 'In Transit'}</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inTransit}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مستلمة' : 'Received'}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.received}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث برقم التحويل أو المستودع...' : 'Search by transfer number, warehouse...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full">
                <option value="all">{locale === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{locale === 'ar' ? label.ar : label.en}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12">
              <ArrowsRightLeftIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {locale === 'ar' ? 'لا توجد تحويلات' : 'No transfers found'}
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'رقم التحويل' : 'Transfer #'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'التاريخ' : 'Date'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'من المستودع' : 'From Warehouse'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'إلى المستودع' : 'To Warehouse'}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الأصناف' : 'Items'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الوصول المتوقع' : 'Expected Arrival'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {locale === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTransfers.map((tr) => (
                    <tr
                      key={tr.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/inventory/transfers/${tr.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{tr.transfer_number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(tr.transfer_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{tr.from_warehouse_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{tr.to_warehouse_name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tr.total_items || 0}</span>
                        {tr.status === 'in_transit' && tr.shipped_items > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {locale === 'ar' ? 'شُحن:' : 'Shipped:'} {tr.shipped_items}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(tr.expected_arrival || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[tr.status] || statusColors.draft}`}>
                          {statusIcons[tr.status]}
                          {locale === 'ar' ? statusLabels[tr.status]?.ar : statusLabels[tr.status]?.en || tr.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {tr.status === 'draft' && hasPermission('inventory_transfers:approve') && (
                            <Button size="sm" variant="secondary" onClick={(e) => handleApprove(tr.id, e)}>
                              {locale === 'ar' ? 'اعتماد' : 'Approve'}
                            </Button>
                          )}
                          {tr.status === 'approved' && hasPermission('inventory_transfers:ship') && (
                            <Button size="sm" onClick={(e) => handleShip(tr.id, e)}>
                              <TruckIcon className="w-3 h-3 mr-1" />
                              {locale === 'ar' ? 'شحن' : 'Ship'}
                            </Button>
                          )}
                          {tr.status === 'in_transit' && hasPermission('inventory_transfers:receive') && (
                            <Button size="sm" onClick={(e) => handleReceive(tr.id, e)}>
                              {locale === 'ar' ? 'استلام' : 'Receive'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); router.push(`/inventory/transfers/${tr.id}`); }}
                          >
                            {locale === 'ar' ? 'عرض' : 'View'}
                          </Button>
                        </div>
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
