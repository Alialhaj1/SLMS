/**
 * Transfer Request Detail Page - تفاصيل طلب التحويل
 * ======================================================
 * View and manage transfer request details
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { useAuth } from '../../../../hooks/useAuth';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useToast } from '../../../../contexts/ToastContext';
import { useTranslation } from '../../../../hooks/useTranslation';
import Button from '../../../../components/ui/Button';
import {
  ArrowLeftIcon,
  PrinterIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface TransferRequest {
  id: number;
  request_number: string;
  request_date: string;
  project_name: string;
  project_code: string;
  shipment_number: string;
  expense_request_number: string;
  vendor_payment_number?: string;
  vendor_payment_amount?: number;
  expense_type_name: string;
  expense_type_name_ar: string;
  vendor_name: string;
  vendor_name_ar: string;
  transfer_amount: number;
  currency_code: string;
  currency_symbol: string;
  status_name: string;
  status_name_ar: string;
  status_color: string;
  notes: string;
  bank_name: string;
  bank_account_number: string;
  iban: string;
  swift_code: string;
  beneficiary_name: string;
  transaction_reference: string;
  requested_by_name: string;
  requested_by_email: string;
  approved_by_name: string;
  approved_at: string;
  transfer_type?: string;
  created_at: string;
  updated_at: string;
}

export default function TransferRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  const [request, setRequest] = useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isArabic = locale === 'ar';

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`http://localhost:4000/api/transfer-requests/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch transfer request');
        }

        const data = await response.json();
        setRequest(data);
      } catch (err: any) {
        setError(err.message);
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const handlePrint = () => {
    router.push(`/requests/transfer/${id}/print`);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num?.toLocaleString(isArabic ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) || '0.00';
  };

  const getStatusColor = (color: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colorMap[color] || colorMap.gray;
  };

  if (loading) {
    return (
      <MainLayout>
        <Head>
          <title>{isArabic ? 'تحميل...' : 'Loading...'} - SLMS</title>
        </Head>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !request) {
    return (
      <MainLayout>
        <Head>
          <title>{isArabic ? 'خطأ' : 'Error'} - SLMS</title>
        </Head>
        <div className="p-6">
          <div className="text-center py-12">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isArabic ? 'لم يتم العثور على الطلب' : 'Request Not Found'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => router.push('/requests')}>
              <ArrowLeftIcon className="w-5 h-5" />
              {isArabic ? 'العودة للطلبات' : 'Back to Requests'}
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{request.request_number} - {isArabic ? 'طلب تحويل' : 'Transfer Request'} - SLMS</title>
      </Head>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => router.push('/requests')}>
              <ArrowLeftIcon className="w-5 h-5" />
              {isArabic ? 'رجوع' : 'Back'}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {request.request_number}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isArabic ? 'طلب تحويل بنكي' : 'Bank Transfer Request'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handlePrint}>
              <PrinterIcon className="w-5 h-5" />
              {isArabic ? 'طباعة' : 'Print'}
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isArabic ? 'تفاصيل الطلب' : 'Request Details'}
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'رقم الطلب' : 'Request Number'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                    {request.request_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'التاريخ' : 'Date'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDate(request.request_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'المشروع' : 'Project'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {request.project_name || '-'}
                    {request.project_code && (
                      <span className="text-gray-500 text-xs mx-1">({request.project_code})</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'الشحنة' : 'Shipment'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {request.shipment_number || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'نوع المصروف' : 'Expense Type'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {isArabic ? request.expense_type_name_ar : request.expense_type_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'المورد / المستفيد' : 'Vendor / Beneficiary'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {request.vendor_name ? (isArabic ? request.vendor_name_ar || request.vendor_name : request.vendor_name) : '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Amount Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
              <div className="flex items-center gap-3 mb-2">
                <BanknotesIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isArabic ? 'مبلغ التحويل' : 'Transfer Amount'}
                </h2>
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatAmount(request.transfer_amount)} {request.currency_code}
              </div>
            </div>

            {/* Bank Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <BuildingLibraryIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isArabic ? 'معلومات البنك' : 'Bank Information'}
                </h2>
              </div>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'اسم البنك' : 'Bank Name'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                    {request.bank_name || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'اسم المستفيد' : 'Beneficiary Name'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {request.beneficiary_name || request.vendor_name || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'رقم الحساب' : 'Account Number'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {request.bank_account_number || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'رقم الآيبان' : 'IBAN'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono tracking-wider">
                    {request.iban || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'رمز السويفت' : 'SWIFT Code'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {request.swift_code || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isArabic ? 'مرجع العملية' : 'Transaction Reference'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {request.transaction_reference || '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Notes Card */}
            {request.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {isArabic ? 'ملاحظات' : 'Notes'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {request.notes}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isArabic ? 'الحالة' : 'Status'}
              </h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status_color)}`}>
                {isArabic ? request.status_name_ar : request.status_name}
              </span>
            </div>

            {/* Source Info - Vendor Payment */}
            {request.vendor_payment_number && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">
                  {isArabic ? 'مرتبط بدفعة مورد' : 'Linked to Vendor Payment'}
                </h3>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
                  {request.vendor_payment_number}
                </p>
                {request.vendor_payment_amount && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {isArabic ? 'مبلغ الدفعة:' : 'Payment Amount:'} {formatAmount(request.vendor_payment_amount)} {request.currency_code}
                  </p>
                )}
              </div>
            )}

            {/* Source Info - Expense Request */}
            {request.expense_request_number && !request.vendor_payment_number && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  {isArabic ? 'مرتبط بطلب مصروف' : 'Linked to Expense Request'}
                </h3>
                <Link 
                  href={`/requests/expense/${request.expense_request_number}`}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {request.expense_request_number}
                </Link>
              </div>
            )}

            {/* Requested By */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isArabic ? 'مقدم الطلب' : 'Requested By'}
              </h2>
              <p className="text-sm text-gray-900 dark:text-white">{request.requested_by_name || '-'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{request.requested_by_email}</p>
            </div>

            {/* Approval Info */}
            {request.approved_by_name && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {isArabic ? 'تمت الموافقة بواسطة' : 'Approved By'}
                </h2>
                <p className="text-sm text-gray-900 dark:text-white">{request.approved_by_name}</p>
                {request.approved_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(request.approved_at)}</p>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isArabic ? 'التواريخ' : 'Timestamps'}
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'تاريخ الإنشاء' : 'Created'}</dt>
                  <dd className="text-gray-900 dark:text-white">{formatDate(request.created_at)}</dd>
                </div>
                {request.updated_at && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">{isArabic ? 'آخر تحديث' : 'Updated'}</dt>
                    <dd className="text-gray-900 dark:text-white">{formatDate(request.updated_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
