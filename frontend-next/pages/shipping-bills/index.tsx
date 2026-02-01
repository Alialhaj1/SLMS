/**
 * ===============================================
 * Shipping Bills List Page (قائمة بوليصات الشحن)
 * ===============================================
 * Enterprise-grade list view for managing shipping documents
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  TruckIcon,
  PencilIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface ShippingBill {
  id: number;
  bill_number: string;
  booking_number?: string;
  bill_date?: string;
  bill_type_code: string;
  bill_type_name: string;
  bill_type_name_ar?: string;
  shipment_id?: number;
  shipment_number?: string;
  project_id?: number;
  project_name?: string;
  carrier_name?: string;
  vessel_name?: string;
  voyage_number?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  containers_count: number;
  container_type?: string;
  eta_date?: string;
  ata_date?: string;
  status: string;
  is_original: boolean;
  tracking_url?: string;
  created_at: string;
}

interface BillType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  in_transit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  arrived: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  delivered: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <DocumentTextIcon className="w-4 h-4" />,
  issued: <CheckCircleIcon className="w-4 h-4" />,
  shipped: <TruckIcon className="w-4 h-4" />,
  in_transit: <TruckIcon className="w-4 h-4" />,
  arrived: <CheckCircleIcon className="w-4 h-4" />,
  delivered: <CheckCircleIcon className="w-4 h-4" />,
  completed: <CheckCircleIcon className="w-4 h-4" />,
  cancelled: <XCircleIcon className="w-4 h-4" />,
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  issued: { en: 'Issued', ar: 'صادرة' },
  shipped: { en: 'Shipped', ar: 'تم الشحن' },
  in_transit: { en: 'In Transit', ar: 'قيد النقل' },
  arrived: { en: 'Arrived', ar: 'وصلت' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  completed: { en: 'Completed', ar: 'مكتملة' },
  cancelled: { en: 'Cancelled', ar: 'ملغاة' },
};

function ShippingBillsPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const isArabic = locale === 'ar';

  const [bills, setBills] = useState<ShippingBill[]>([]);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billTypeFilter, setBillTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingBill, setDeletingBill] = useState<ShippingBill | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchBillTypes();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [statusFilter, billTypeFilter, page]);

  const fetchBillTypes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/bill-types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setBillTypes(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load bill types:', error);
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (billTypeFilter !== 'all') params.append('bill_type_id', billTypeFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`http://localhost:4000/api/shipping-bills?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setBills(result.data || []);
        setTotalPages(result.totalPages || 1);
        setTotal(result.total || 0);
      } else if (res.status === 401 || res.status === 403) {
        showToast(t('common.accessDenied') || 'Access denied', 'error');
      } else {
        showToast(t('shippingBills.loadError') || 'Failed to load shipping bills', 'error');
      }
    } catch (error) {
      showToast(t('shippingBills.loadError') || 'Failed to load shipping bills', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchBills();
  };

  const handleDelete = async () => {
    if (!deletingBill) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipping-bills/${deletingBill.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast(t('shippingBills.deleteSuccess') || 'Shipping bill deleted successfully', 'success');
        setDeletingBill(null);
        fetchBills();
      } else {
        showToast(t('shippingBills.deleteError') || 'Failed to delete shipping bill', 'error');
      }
    } catch (error) {
      showToast(t('shippingBills.deleteError') || 'Failed to delete shipping bill', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-GB');
  };

  const getStatusLabel = (status: string) => {
    const label = statusLabels[status];
    return label ? (isArabic ? label.ar : label.en) : status;
  };

  const filteredBills = bills.filter((bill) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      bill.bill_number.toLowerCase().includes(term) ||
      bill.booking_number?.toLowerCase().includes(term) ||
      bill.vessel_name?.toLowerCase().includes(term) ||
      bill.carrier_name?.toLowerCase().includes(term) ||
      bill.shipment_number?.toLowerCase().includes(term) ||
      bill.project_name?.toLowerCase().includes(term)
    );
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('shippingBills.title') || 'Shipping Bills'} - SLMS</title>
      </Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isArabic ? 'بوليصات الشحن' : 'Shipping Bills'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isArabic ? 'إدارة بوليصات الشحن البحري والجوي' : 'Manage B/L, AWB, and shipping documents'}
            </p>
          </div>
          {hasPermission('shipping_bills:create') && (
            <Button onClick={() => router.push('/shipping-bills/new')}>
              <PlusIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
              {isArabic ? 'إضافة بوليصة' : 'New Shipping Bill'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={isArabic ? 'البحث برقم البوليصة، السفينة، المشروع...' : 'Search by bill number, vessel, project...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input ltr:pl-10 rtl:pr-10 w-full"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={billTypeFilter}
                onChange={(e) => {
                  setBillTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="input w-full"
              >
                <option value="all">{isArabic ? 'جميع الأنواع' : 'All Types'}</option>
                {billTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {isArabic && type.name_ar ? type.name_ar : type.name} ({type.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="input w-full"
              >
                <option value="all">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {isArabic ? label.ar : label.en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {isArabic 
              ? `عرض ${filteredBills.length} من ${total} بوليصة`
              : `Showing ${filteredBills.length} of ${total} bills`}
          </span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">
                {isArabic ? 'جاري التحميل...' : 'Loading shipping bills...'}
              </p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'لا توجد بوليصات' : 'No shipping bills found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm 
                  ? (isArabic ? 'جرب تعديل معايير البحث' : 'Try adjusting your search criteria')
                  : (isArabic ? 'ابدأ بإضافة بوليصة شحن جديدة' : 'Get started by creating a new shipping bill')
                }
              </p>
              {hasPermission('shipping_bills:create') && !searchTerm && (
                <Button className="mt-4" onClick={() => router.push('/shipping-bills/new')}>
                  <PlusIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                  {isArabic ? 'إضافة بوليصة' : 'New Shipping Bill'}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'رقم البوليصة' : 'Bill Number'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'النوع' : 'Type'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الناقل / السفينة' : 'Carrier / Vessel'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الموانئ' : 'Ports'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الحاويات' : 'Containers'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'ETA' : 'ETA'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isArabic ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBills.map((bill) => (
                    <tr 
                      key={bill.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/shipping-bills/${bill.id}`)}
                    >
                      <td className="px-4 py-4">
                        <div>
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {bill.bill_number}
                          </span>
                          {bill.booking_number && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {isArabic ? 'الحجز:' : 'Booking:'} {bill.booking_number}
                            </div>
                          )}
                          {bill.shipment_number && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {isArabic ? 'الشحنة:' : 'Shipment:'} {bill.shipment_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {bill.bill_type_code}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {isArabic && bill.bill_type_name_ar ? bill.bill_type_name_ar : bill.bill_type_name}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {bill.carrier_name || '—'}
                        </div>
                        {bill.vessel_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {bill.vessel_name}
                            {bill.voyage_number && ` (${bill.voyage_number})`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {bill.port_of_loading || '—'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          → {bill.port_of_discharge || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {bill.containers_count > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {bill.containers_count} × {bill.container_type || '?'}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(bill.eta_date)}
                        {bill.ata_date && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            {isArabic ? 'وصلت:' : 'ATA:'} {formatDate(bill.ata_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[bill.status] || statusColors.draft
                          }`}
                        >
                          {statusIcons[bill.status]}
                          {getStatusLabel(bill.status)}
                        </span>
                        {bill.is_original && (
                          <span className="block text-xs text-green-600 dark:text-green-400 mt-1">
                            {isArabic ? 'أصلية' : 'Original'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/shipping-bills/${bill.id}`);
                            }}
                            title={isArabic ? 'عرض' : 'View'}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          {bill.tracking_url && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(bill.tracking_url, '_blank');
                              }}
                              title={isArabic ? 'تتبع' : 'Track'}
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {hasPermission('shipping_bills:update') && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/shipping-bills/${bill.id}/edit`);
                              }}
                              title={isArabic ? 'تعديل' : 'Edit'}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {hasPermission('shipping_bills:delete') && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingBill(bill);
                              }}
                              title={isArabic ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {isArabic ? 'السابق' : 'Previous'}
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isArabic 
                ? `صفحة ${page} من ${totalPages}`
                : `Page ${page} of ${totalPages}`}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {isArabic ? 'التالي' : 'Next'}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingBill}
        onClose={() => setDeletingBill(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title={isArabic ? 'حذف البوليصة' : 'Delete Shipping Bill'}
        message={
          isArabic 
            ? `هل أنت متأكد من حذف البوليصة "${deletingBill?.bill_number}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to delete "${deletingBill?.bill_number}"? This action cannot be undone.`
        }
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
      />
    </MainLayout>
  );
}

export default withPermission('shipping_bills:view', ShippingBillsPage);
