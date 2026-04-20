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
  PaperAirplaneIcon,
  CheckCircleIcon,
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
  status_code: string;
  allows_submit: boolean;
  notes: string;
  bank_name: string;
  bank_account_number: string;
  iban: string;
  swift_code: string;
  beneficiary_name: string;
  transaction_reference: string;
  requested_by: number;
  requested_by_name: string;
  requested_by_email: string;
  approved_by_name: string;
  approved_at: string;
  approved_by: number;
  reviewed_by: number;
  reviewed_by_name: string;
  reviewed_at: string;
  rejection_reason?: string;
  rejected_by_name?: string;
  transfer_type?: string;
  created_at: string;
  updated_at: string;
  // Signature fields
  requester_signature_url: string;
  requester_title_en: string;
  requester_title_ar: string;
  reviewer_signature_url: string;
  reviewer_title_en: string;
  reviewer_title_ar: string;
  approver_signature_url: string;
  approver_title_en: string;
  approver_title_ar: string;
  // History
  approval_history: ApprovalHistoryEntry[];
  history: ApprovalHistoryEntry[];
}

interface ApprovalHistoryEntry {
  id: number;
  action: string;
  performed_by_name: string;
  previous_status_name: string;
  previous_status_name_ar: string;
  new_status_name: string;
  new_status_name_ar: string;
  comments: string;
  rejection_reason: string;
  performer_signature_url: string;
  performer_title_en: string;
  performer_title_ar: string;
  performed_at: string;
}

export default function TransferRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  const [request, setRequest] = useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = locale === 'ar';
  const isOwner = request ? (user as any)?.id === request.requested_by : false;

  // Permission-based checks
  const canSubmit = hasAnyPermission(['transfer_requests:submit', 'transfer_requests:manage']);
  const canApprove = hasAnyPermission(['transfer_requests:approve', 'transfer_requests:manage']);
  const canReview = hasAnyPermission(['transfer_requests:review', 'transfer_requests:approve', 'transfer_requests:manage']);
  const canExecute = hasAnyPermission(['transfer_requests:execute', 'transfer_requests:manage']);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/transfer-requests/${id}`, {
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
        showToast({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const handlePrint = () => {
    router.push(`/requests/transfer/${id}/print`);
  };

  const callAction = async (action: 'submit' | 'review' | 'approve' | 'reject' | 'execute', body?: object) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/transfer-requests/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
      showToast({ type: 'success', message: isArabic
        ? action === 'submit' ? 'تم إرسال الطلب للاعتماد' : action === 'review' ? 'تمت مراجعة الطلب' : action === 'approve' ? 'تمت الموافقة على الطلب' : action === 'reject' ? 'تم رفض الطلب' : 'تم تنفيذ التحويل'
        : action === 'submit' ? 'Submitted for approval' : action === 'review' ? 'Request reviewed' : action === 'approve' ? 'Transfer approved' : action === 'reject' ? 'Transfer rejected' : 'Transfer executed'
      });
      // Reload
      const newRes = await fetch(`/api/transfer-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (newRes.ok) setRequest(await newRes.json());
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = () => callAction('submit');
  const handleReview = () => callAction('review');
  const handleApprove = () => callAction('approve');
  const handleReject = async () => {
    await callAction('reject', { rejection_reason: rejectReason });
    setShowRejectModal(false);
    setRejectReason('');
  };
  const handleExecute = () => callAction('execute');

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
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={handlePrint}>
              <PrinterIcon className="w-5 h-5" />
              {isArabic ? 'طباعة' : 'Print'}
            </Button>
            {/* Submit – available in DRAFT */}
            {request && request.status_code === 'DRAFT' && (isOwner || canSubmit) && (
              <Button variant="primary" onClick={handleSubmit} disabled={actionLoading}>
                <PaperAirplaneIcon className="w-5 h-5" />
                {isArabic ? 'إرسال للاعتماد' : 'Submit for Approval'}
              </Button>
            )}
            {/* Review – available when SUBMITTED */}
            {request && request.status_code === 'SUBMITTED' && canReview && (
              <Button
                variant="primary"
                onClick={handleReview}
                disabled={actionLoading}
                className="!bg-blue-600 hover:!bg-blue-700"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {isArabic ? 'مراجعة' : 'Review'}
              </Button>
            )}
            {/* Approve – available when SUBMITTED or REVIEWED */}
            {request && (request.status_code === 'SUBMITTED' || request.status_code === 'REVIEWED') && canApprove && (
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={actionLoading}
                className="!bg-green-600 hover:!bg-green-700"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {isArabic ? 'اعتماد' : 'Approve'}
              </Button>
            )}
            {/* Reject – available when SUBMITTED or REVIEWED */}
            {request && (request.status_code === 'SUBMITTED' || request.status_code === 'REVIEWED') && canApprove && (
              <Button
                variant="secondary"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="!border-red-300 !text-red-600 hover:!bg-red-50"
              >
                <XCircleIcon className="w-5 h-5" />
                {isArabic ? 'رفض' : 'Reject'}
              </Button>
            )}
            {/* Execute – available when APPROVED */}
            {request && request.status_code === 'APPROVED' && canExecute && (
              <Button
                variant="primary"
                onClick={handleExecute}
                disabled={actionLoading}
                className="!bg-emerald-600 hover:!bg-emerald-700"
              >
                <BanknotesIcon className="w-5 h-5" />
                {isArabic ? 'تنفيذ التحويل' : 'Execute Transfer'}
              </Button>
            )}
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
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  {isArabic ? 'تمت الموافقة بواسطة' : 'Approved By'}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400">{request.approved_by_name}</p>
                {request.approved_at && (
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">{formatDate(request.approved_at)}</p>
                )}
              </div>
            )}

            {/* Rejection Info */}
            {request.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                  {isArabic ? 'سبب الرفض' : 'Rejection Reason'}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400">{request.rejection_reason}</p>
                {request.rejected_by_name && (
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    {isArabic ? 'بواسطة: ' : 'By: '}{request.rejected_by_name}
                  </p>
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

      {/* Approval Signatures */}
      {(request.requester_signature_url || request.reviewer_signature_url || request.approver_signature_url || request.reviewed_by_name || request.approved_by_name) && (
        <div className="mx-6 mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {isArabic ? 'التوقيعات' : 'Signatures'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                {isArabic ? 'مقدم الطلب' : 'Requested By'}
              </p>
              <div className="w-32 h-20 border border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center mb-3 bg-gray-50 dark:bg-gray-700">
                {request.requester_signature_url ? (
                  <img src={request.requester_signature_url} alt="signature" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">{isArabic ? 'لا يوجد توقيع' : 'No signature'}</span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white text-center">{request.requested_by_name || '-'}</p>
              {(request.requester_title_en || request.requester_title_ar) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{isArabic ? request.requester_title_ar : request.requester_title_en}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(request.created_at)}</p>
            </div>
            <div className="flex flex-col items-center border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                {isArabic ? 'المراجع' : 'Reviewed By'}
              </p>
              <div className="w-32 h-20 border border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center mb-3 bg-gray-50 dark:bg-gray-700">
                {request.reviewer_signature_url ? (
                  <img src={request.reviewer_signature_url} alt="signature" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">{isArabic ? 'لا يوجد توقيع' : 'No signature'}</span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white text-center">{request.reviewed_by_name || '-'}</p>
              {(request.reviewer_title_en || request.reviewer_title_ar) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{isArabic ? request.reviewer_title_ar : request.reviewer_title_en}</p>
              )}
              {request.reviewed_at && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(request.reviewed_at)}</p>}
            </div>
            <div className="flex flex-col items-center border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                {isArabic ? 'المعتمد' : 'Approved By'}
              </p>
              <div className="w-32 h-20 border border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center mb-3 bg-gray-50 dark:bg-gray-700">
                {request.approver_signature_url ? (
                  <img src={request.approver_signature_url} alt="signature" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">{isArabic ? 'لا يوجد توقيع' : 'No signature'}</span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white text-center">{request.approved_by_name || '-'}</p>
              {(request.approver_title_en || request.approver_title_ar) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{isArabic ? request.approver_title_ar : request.approver_title_en}</p>
              )}
              {request.approved_at && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(request.approved_at)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Approval History Timeline */}
      {((request.approval_history?.length > 0) || (request.history?.length > 0)) && (
        <div className="mx-6 mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {isArabic ? 'سجل الموافقات' : 'Approval History'}
          </h2>
          <ol className="relative border-s border-gray-200 dark:border-gray-700 ms-3">
            {(request.approval_history || request.history || []).map((entry) => {
              const actionColors: Record<string, string> = {
                submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                reviewed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
              };
              const actionLabels: Record<string, { en: string; ar: string }> = {
                submitted: { en: 'Submitted', ar: 'تم التقديم' },
                reviewed: { en: 'Reviewed', ar: 'تمت المراجعة' },
                approved: { en: 'Approved', ar: 'تمت الموافقة' },
                rejected: { en: 'Rejected', ar: 'تم الرفض' },
              };
              const colorClass = actionColors[entry.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
              const label = actionLabels[entry.action];
              return (
                <li key={entry.id} className="mb-6 ms-6">
                  <span className="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-8 ring-white dark:ring-gray-800 bg-gray-100 dark:bg-gray-700">
                    <svg className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                    </svg>
                  </span>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                          {label ? (isArabic ? label.ar : label.en) : entry.action}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.performed_by_name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(entry.performed_at)}</span>
                      </div>
                      {entry.comments && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{entry.comments}</p>}
                      {entry.rejection_reason && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {isArabic ? 'سبب الرفض: ' : 'Reason: '}{entry.rejection_reason}
                        </p>
                      )}
                      {(entry.previous_status_name || entry.new_status_name) && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {isArabic ? entry.previous_status_name_ar : entry.previous_status_name}{' → '}{isArabic ? entry.new_status_name_ar : entry.new_status_name}
                        </p>
                      )}
                    </div>
                    {entry.performer_signature_url && (
                      <div className="w-20 h-12 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <img src={entry.performer_signature_url} alt="sig" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isArabic ? 'رفض طلب التحويل' : 'Reject Transfer Request'}
            </h3>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isArabic ? 'سبب الرفض' : 'Reason for rejection'}
            </label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={isArabic ? 'اكتب سبب الرفض...' : 'Enter rejection reason...'}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
              >
                {actionLoading ? (isArabic ? 'جار الرفض...' : 'Rejecting...') : (isArabic ? 'تأكيد الرفض' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
