/**
 * ===============================================
 * Shipping Bill Detail Page
 * ===============================================
 * Enterprise-grade detail view with status management
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  TruckIcon,
  MapPinIcon,
  CubeIcon,
  CalendarIcon,
  LinkIcon,
  PencilIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface ShippingBill {
  id: number;
  bill_number: string;
  booking_number?: string;
  bill_date?: string;
  bill_type_id: number;
  bill_type_code: string;
  bill_type_name: string;
  bill_type_name_ar?: string;
  bill_type_category?: string;
  shipment_id?: number;
  shipment_number?: string;
  project_id?: number;
  project_name?: string;
  project_code?: string;
  carrier_id?: number;
  carrier_display_name?: string;
  carrier_code?: string;
  vessel_name?: string;
  voyage_number?: string;
  port_of_loading_id?: number;
  port_of_loading_name?: string;
  port_of_loading_code?: string;
  port_of_loading_text?: string;
  port_of_discharge_id?: number;
  port_of_discharge_name?: string;
  port_of_discharge_code?: string;
  port_of_discharge_text?: string;
  place_of_delivery?: string;
  containers_count: number;
  container_type?: string;
  container_numbers?: string[];
  cargo_description?: string;
  gross_weight?: number;
  gross_weight_unit?: string;
  net_weight?: number;
  volume?: number;
  volume_unit?: string;
  packages_count?: number;
  package_type?: string;
  shipped_on_board_date?: string;
  eta_date?: string;
  ata_date?: string;
  tracking_url?: string;
  tracking_number?: string;
  status: string;
  is_original: boolean;
  is_freight_prepaid: boolean;
  freight_terms?: string;
  notes?: string;
  internal_notes?: string;
  created_by_email?: string;
  updated_by_email?: string;
  created_at: string;
  updated_at: string;
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

const statusFlow = ['draft', 'issued', 'shipped', 'in_transit', 'arrived', 'delivered', 'completed'];

function ShippingBillDetailPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const isArabic = locale === 'ar';

  const [bill, setBill] = useState<ShippingBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBill();
    }
  }, [id]);

  const fetchBill = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipping-bills/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setBill(result.data);
      } else if (res.status === 404) {
        showToast(isArabic ? 'البوليصة غير موجودة' : 'Shipping bill not found', 'error');
        router.push('/shipping-bills');
      } else {
        showToast(isArabic ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipping-bills/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast(isArabic ? 'تم حذف البوليصة بنجاح' : 'Shipping bill deleted', 'success');
        router.push('/shipping-bills');
      } else {
        showToast(isArabic ? 'فشل الحذف' : 'Failed to delete', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    setStatusLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipping-bills/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (res.ok) {
        showToast(isArabic ? 'تم تحديث الحالة' : 'Status updated', 'success');
        setStatusModalOpen(false);
        fetchBill();
      } else {
        showToast(isArabic ? 'فشل تحديث الحالة' : 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-GB');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString(isArabic ? 'ar-SA' : 'en-GB');
  };

  const getStatusLabel = (status: string) => {
    const label = statusLabels[status];
    return label ? (isArabic ? label.ar : label.en) : status;
  };

  const getPortDisplay = (name?: string, code?: string, text?: string) => {
    if (name) return `${name} (${code})`;
    if (text) return text;
    return '—';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!bill) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isArabic ? 'البوليصة غير موجودة' : 'Shipping Bill Not Found'}
          </h2>
          <Button className="mt-4" onClick={() => router.push('/shipping-bills')}>
            {isArabic ? 'العودة للقائمة' : 'Back to List'}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{bill.bill_number} - {isArabic ? 'بوليصة شحن' : 'Shipping Bill'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => router.push('/shipping-bills')}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {bill.bill_number}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[bill.status]}`}>
                  {getStatusLabel(bill.status)}
                </span>
                {bill.is_original && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {isArabic ? 'أصلية' : 'Original'}
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isArabic && bill.bill_type_name_ar ? bill.bill_type_name_ar : bill.bill_type_name} ({bill.bill_type_code})
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {bill.tracking_url && (
              <Button
                variant="secondary"
                onClick={() => window.open(bill.tracking_url, '_blank')}
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                {isArabic ? 'تتبع' : 'Track'}
              </Button>
            )}
            {hasPermission('shipping_bills:change_status') && bill.status !== 'cancelled' && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedStatus(bill.status);
                  setStatusModalOpen(true);
                }}
              >
                <ClockIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                {isArabic ? 'تغيير الحالة' : 'Change Status'}
              </Button>
            )}
            {hasPermission('shipping_bills:update') && (
              <Button onClick={() => router.push(`/shipping-bills/${bill.id}/edit`)}>
                <PencilIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                {isArabic ? 'تعديل' : 'Edit'}
              </Button>
            )}
            {hasPermission('shipping_bills:delete') && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <TrashIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                {isArabic ? 'حذف' : 'Delete'}
              </Button>
            )}
          </div>
        </div>

        {/* Status Progress */}
        {bill.status !== 'cancelled' && (
          <Card>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {statusFlow.map((status, index) => {
                const currentIndex = statusFlow.indexOf(bill.status);
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isPending = index > currentIndex;

                return (
                  <div key={status} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                          <span className="text-xs font-medium">{index + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs mt-1 ${isCurrent ? 'font-semibold' : ''}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    {index < statusFlow.length - 1 && (
                      <div
                        className={`w-12 h-0.5 mx-1 ${
                          index < currentIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">{isArabic ? 'البيانات الأساسية' : 'Basic Information'}</h2>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'رقم البوليصة' : 'Bill Number'}</dt>
                <dd className="font-medium">{bill.bill_number}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'رقم الحجز' : 'Booking Number'}</dt>
                <dd className="font-medium">{bill.booking_number || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'تاريخ البوليصة' : 'Bill Date'}</dt>
                <dd className="font-medium">{formatDate(bill.bill_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'الشحنة' : 'Shipment'}</dt>
                <dd className="font-medium">
                  {bill.shipment_number ? (
                    <a
                      href={`/shipments/${bill.shipment_id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {bill.shipment_number}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'المشروع' : 'Project'}</dt>
                <dd className="font-medium">
                  {bill.project_name ? `${bill.project_code} - ${bill.project_name}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'شروط الشحن' : 'Freight Terms'}</dt>
                <dd className="font-medium">
                  {bill.freight_terms || '—'}
                  {bill.is_freight_prepaid && (
                    <span className="text-green-600 text-xs ml-2">
                      ({isArabic ? 'مسبق الدفع' : 'Prepaid'})
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Carrier / Vessel */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <TruckIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">{isArabic ? 'الناقل والسفينة' : 'Carrier & Vessel'}</h2>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'شركة الشحن' : 'Carrier'}</dt>
                <dd className="font-medium">{bill.carrier_display_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'رمز الناقل' : 'Carrier Code'}</dt>
                <dd className="font-medium">{bill.carrier_code || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'السفينة' : 'Vessel'}</dt>
                <dd className="font-medium">{bill.vessel_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'رقم الرحلة' : 'Voyage'}</dt>
                <dd className="font-medium">{bill.voyage_number || '—'}</dd>
              </div>
              {bill.tracking_number && (
                <div className="col-span-2">
                  <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'رقم التتبع' : 'Tracking Number'}</dt>
                  <dd className="font-medium">{bill.tracking_number}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Ports */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MapPinIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">{isArabic ? 'الموانئ' : 'Ports'}</h2>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'ميناء التحميل' : 'Port of Loading'}</dt>
                <dd className="font-medium">
                  {getPortDisplay(bill.port_of_loading_name, bill.port_of_loading_code, bill.port_of_loading_text)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'ميناء التفريغ' : 'Port of Discharge'}</dt>
                <dd className="font-medium">
                  {getPortDisplay(bill.port_of_discharge_name, bill.port_of_discharge_code, bill.port_of_discharge_text)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'مكان التسليم' : 'Place of Delivery'}</dt>
                <dd className="font-medium">{bill.place_of_delivery || '—'}</dd>
              </div>
            </dl>
          </Card>

          {/* Dates */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">{isArabic ? 'التواريخ' : 'Dates'}</h2>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'تاريخ الشحن' : 'Shipped on Board'}</dt>
                <dd className="font-medium">{formatDate(bill.shipped_on_board_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'الوصول المتوقع' : 'ETA'}</dt>
                <dd className="font-medium">{formatDate(bill.eta_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'الوصول الفعلي' : 'ATA'}</dt>
                <dd className="font-medium">{formatDate(bill.ata_date)}</dd>
              </div>
            </dl>
          </Card>

          {/* Containers & Cargo */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <CubeIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">{isArabic ? 'الحاويات والبضائع' : 'Containers & Cargo'}</h2>
            </div>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'عدد الحاويات' : 'Containers'}</dt>
                <dd className="font-medium text-lg">
                  {bill.containers_count > 0 ? `${bill.containers_count} × ${bill.container_type || '?'}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'الوزن الإجمالي' : 'Gross Weight'}</dt>
                <dd className="font-medium">
                  {bill.gross_weight ? `${bill.gross_weight.toLocaleString()} ${bill.gross_weight_unit}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'الوزن الصافي' : 'Net Weight'}</dt>
                <dd className="font-medium">
                  {bill.net_weight ? `${bill.net_weight.toLocaleString()} ${bill.gross_weight_unit}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'الحجم' : 'Volume'}</dt>
                <dd className="font-medium">
                  {bill.volume ? `${bill.volume.toLocaleString()} ${bill.volume_unit}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'عدد الطرود' : 'Packages'}</dt>
                <dd className="font-medium">
                  {bill.packages_count ? `${bill.packages_count} ${bill.package_type || ''}` : '—'}
                </dd>
              </div>
            </dl>

            {bill.container_numbers && bill.container_numbers.length > 0 && (
              <div className="mt-4">
                <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {isArabic ? 'أرقام الحاويات' : 'Container Numbers'}
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {bill.container_numbers.map((num, i) => (
                    <span
                      key={i}
                      className="inline-flex px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono"
                    >
                      {num}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {bill.cargo_description && (
              <div className="mt-4">
                <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {isArabic ? 'وصف البضاعة' : 'Cargo Description'}
                </dt>
                <dd className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  {bill.cargo_description}
                </dd>
              </div>
            )}
          </Card>

          {/* Notes */}
          {(bill.notes || bill.internal_notes) && (
            <Card className="lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">{isArabic ? 'الملاحظات' : 'Notes'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bill.notes && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {isArabic ? 'ملاحظات عامة' : 'Notes'}
                    </dt>
                    <dd className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">
                      {bill.notes}
                    </dd>
                  </div>
                )}
                {bill.internal_notes && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {isArabic ? 'ملاحظات داخلية' : 'Internal Notes'}
                    </dt>
                    <dd className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                      {bill.internal_notes}
                    </dd>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Audit Info */}
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">{isArabic ? 'معلومات النظام' : 'System Information'}</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'تاريخ الإنشاء' : 'Created At'}</dt>
                <dd className="font-medium">{formatDateTime(bill.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'أنشئ بواسطة' : 'Created By'}</dt>
                <dd className="font-medium">{bill.created_by_email || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'آخر تحديث' : 'Updated At'}</dt>
                <dd className="font-medium">{formatDateTime(bill.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'حُدث بواسطة' : 'Updated By'}</dt>
                <dd className="font-medium">{bill.updated_by_email || '—'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title={isArabic ? 'حذف البوليصة' : 'Delete Shipping Bill'}
        message={
          isArabic
            ? `هل أنت متأكد من حذف البوليصة "${bill.bill_number}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to delete "${bill.bill_number}"? This action cannot be undone.`
        }
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
      />

      {/* Status Change Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {isArabic ? 'تغيير الحالة' : 'Change Status'}
            </h3>
            <div className="space-y-3">
              {statusFlow.map((status) => (
                <label
                  key={status}
                  className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition ${
                    selectedStatus === status
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={selectedStatus === status}
                    onChange={() => setSelectedStatus(status)}
                    className="text-primary-600"
                  />
                  <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                    {getStatusLabel(status)}
                  </span>
                </label>
              ))}
              <label
                className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition ${
                  selectedStatus === 'cancelled'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="cancelled"
                  checked={selectedStatus === 'cancelled'}
                  onChange={() => setSelectedStatus('cancelled')}
                  className="text-red-600"
                />
                <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${statusColors.cancelled}`}>
                  <XCircleIcon className="w-4 h-4" />
                  {getStatusLabel('cancelled')}
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setStatusModalOpen(false)}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleStatusChange}
                loading={statusLoading}
                disabled={selectedStatus === bill.status}
              >
                {isArabic ? 'تحديث الحالة' : 'Update Status'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default withPermission('shipping_bills:view', ShippingBillDetailPage);
