/**
 * My Requests - طلباتي
 * ======================================================
 * Central hub for all user requests:
 * - Expense Requests (طلبات المصاريف) - unprinted
 * - Transfer Requests (طلبات التحويل) - unprinted
 * - Payment Requests (طلبات السداد) - unprinted
 * - Previous Expense Requests (طلبات المصاريف السابقة) - printed
 * - Previous Transfer Requests (طلبات التحويل السابقة) - printed
 * - Previous Payment Requests (طلبات السداد السابقة) - printed
 * - Deleted Requests (المحذوفة) - soft deleted
 * 
 * Features:
 * - Tabbed interface with filters
 * - RBAC-aware (user sees only own requests unless manager)
 * - Status badges, print tracking
 * - Approval workflows
 * - Delete/Restore functionality
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { DataTablePro } from '../../components/ui/DataTablePro';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CreditCardIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  ArchiveBoxIcon,
  Squares2X2Icon,
  BellIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

type RequestTab = 
  | 'all'
  | 'expense' 
  | 'transfer' 
  | 'payment' 
  | 'expense_printed' 
  | 'transfer_printed' 
  | 'payment_printed' 
  | 'deleted';

interface ExpenseRequest {
  id: number;
  request_number: string;
  request_date: string;
  project_name: string;
  shipment_number: string;
  expense_type_name: string;
  expense_type_name_ar: string;
  vendor_name: string;
  total_amount: number;
  currency_code: string;
  status_name: string;
  status_name_ar: string;
  status_color: string;
  requested_by_name: string;
  is_printed: boolean;
  print_count: number;
  created_at: string;
  deleted_at?: string;
}

interface TransferRequest {
  id: number;
  request_number: string;
  request_date: string;
  expense_request_number: string;
  vendor_payment_number?: string;
  vendor_payment_amount?: number;
  transfer_type?: string;
  project_name: string;
  shipment_number: string;
  expense_type_name: string;
  expense_type_name_ar: string;
  vendor_name: string;
  transfer_amount: number;
  currency_code: string;
  status_name: string;
  status_name_ar: string;
  status_color: string;
  is_printed: boolean;
  print_count: number;
  created_at: string;
  deleted_at?: string;
}

interface PaymentRequest {
  id: number;
  request_number: string;
  request_date: string;
  transfer_request_number: string;
  expense_request_number: string;
  project_name: string;
  shipment_number: string;
  expense_type_name: string;
  vendor_name: string;
  payment_amount: number;
  currency_code: string;
  payment_method: string;
  status_name: string;
  status_name_ar: string;
  status_color: string;
  is_printed: boolean;
  is_posted: boolean;
  print_count: number;
  created_at: string;
  deleted_at?: string;
}

export default function RequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  const [activeTab, setActiveTab] = useState<RequestTab>('expense');

  // Sync tab with URL query parameter
  useEffect(() => {
    const { tab } = router.query;
    if (tab && typeof tab === 'string') {
      const validTabs: RequestTab[] = ['all', 'expense', 'transfer', 'payment', 'expense_printed', 'transfer_printed', 'payment_printed', 'deleted'];
      // Map URL-friendly names: 'printed' → 'expense_printed', 'unprinted' → 'expense'
      let resolvedTab: RequestTab | undefined;
      if (tab === 'printed') resolvedTab = 'expense_printed';
      else if (tab === 'unprinted') resolvedTab = 'expense';
      else resolvedTab = validTabs.find(t => t === tab);
      if (resolvedTab) setActiveTab(resolvedTab);
    }
  }, [router.query]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/users/notifications/approval?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) { /* silent */ }
  };

  const markNotificationsRead = async (ids?: number[]) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/users/notifications/mark-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(ids ? { notification_ids: ids } : { mark_all: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) { /* silent */ }
  };

  // Fetch notifications on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // All Requests State (unprinted from all types)
  const [allRequests, setAllRequests] = useState<(ExpenseRequest & { _type?: string })[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allPage, setAllPage] = useState(1);
  const [allLimit] = useState(50);

  // Expense Requests State
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseLimit] = useState(50);

  // Transfer Requests State
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [transferTotal, setTransferTotal] = useState(0);
  const [transferPage, setTransferPage] = useState(1);
  const [transferLimit] = useState(50);

  // Payment Requests State
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentLimit] = useState(50);

  // Deleted Requests State
  const [deletedRequests, setDeletedRequests] = useState<ExpenseRequest[]>([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [deletedPage, setDeletedPage] = useState(1);
  const [deletedLimit] = useState(50);

  // Printed Expense Requests State (separate from unprinted)
  const [expensePrintedRequests, setExpensePrintedRequests] = useState<ExpenseRequest[]>([]);
  const [expensePrintedTotal, setExpensePrintedTotal] = useState(0);
  const [expensePrintedPage, setExpensePrintedPage] = useState(1);
  const [expensePrintedLimit] = useState(50);

  // Printed Transfer Requests State
  const [transferPrintedRequests, setTransferPrintedRequests] = useState<TransferRequest[]>([]);
  const [transferPrintedTotal, setTransferPrintedTotal] = useState(0);
  const [transferPrintedPage, setTransferPrintedPage] = useState(1);
  const [transferPrintedLimit] = useState(50);

  // Printed Payment Requests State
  const [paymentPrintedRequests, setPaymentPrintedRequests] = useState<PaymentRequest[]>([]);
  const [paymentPrintedTotal, setPaymentPrintedTotal] = useState(0);
  const [paymentPrintedPage, setPaymentPrintedPage] = useState(1);
  const [paymentPrintedLimit] = useState(50);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<{id: number; type: 'expense' | 'transfer' | 'payment'} | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Restore confirmation  
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [requestToRestore, setRequestToRestore] = useState<{id: number; type: 'expense' | 'transfer' | 'payment'} | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Permission checks
  const canViewExpenseRequests = hasAnyPermission(['expense_requests:view', 'expense_requests:manage']);
  const canDeleteExpenseRequest = hasAnyPermission(['expense_requests:delete', 'expense_requests:manage']);
  const canViewTransferRequests = hasAnyPermission(['transfer_requests:view', 'transfer_requests:manage']);
  const canDeleteTransferRequest = hasAnyPermission(['transfer_requests:delete', 'transfer_requests:manage']);
  const canViewPaymentRequests = hasAnyPermission(['payment_requests:view', 'payment_requests:manage']);
  const canDeletePaymentRequest = hasAnyPermission(['payment_requests:delete', 'payment_requests:manage']);

  // Fetch All Requests (unprinted from all types, combined)
  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const buildParams = () => {
        const params = new URLSearchParams({ limit: '50' });
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter) params.append('status_id', statusFilter);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        return params;
      };

      const fetches = [];
      if (canViewExpenseRequests) fetches.push(fetch(`/api/expense-requests?${buildParams()}`, { headers }).then(async r => ({ type: 'expense', data: r.ok ? await r.json() : null })));
      if (canViewTransferRequests) fetches.push(fetch(`/api/transfer-requests?${buildParams()}`, { headers }).then(async r => ({ type: 'transfer', data: r.ok ? await r.json() : null })));
      if (canViewPaymentRequests) fetches.push(fetch(`/api/payment-requests?${buildParams()}`, { headers }).then(async r => ({ type: 'payment', data: r.ok ? await r.json() : null })));

      const results = await Promise.allSettled(fetches);
      const combined: (ExpenseRequest & { _type?: string })[] = [];

      results.forEach(result => {
        if (result.status !== 'fulfilled' || !result.value.data) return;
        const { type, data } = result.value;
        (data.data || []).forEach((r: any) => {
          combined.push({
            id: r.id,
            request_number: r.request_number,
            request_date: r.request_date || r.created_at,
            project_name: r.project_name || '',
            shipment_number: r.shipment_number || '',
            expense_type_name: r.expense_type_name || '',
            expense_type_name_ar: r.expense_type_name_ar || '',
            vendor_name: r.vendor_name || '',
            total_amount: parseFloat(r.total_amount || r.transfer_amount || r.payment_amount || 0),
            currency_code: r.currency_code || '',
            status_name: r.status_name || '',
            status_name_ar: r.status_name_ar || '',
            status_color: r.status_color || 'gray',
            requested_by_name: r.requested_by_name || '',
            is_printed: r.is_printed || false,
            print_count: r.print_count || 0,
            created_at: r.created_at,
            _type: type,
          });
        });
      });

      // Sort by date descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllRequests(combined);
      setAllTotal(combined.length);
    } catch (error: any) {
      console.error('Error fetching all requests:', error);
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في جلب الطلبات' : 'Failed to fetch requests' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Expense Requests
  const fetchExpenseRequests = async (isPrinted: boolean = false) => {
    if (!canViewExpenseRequests) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const params = new URLSearchParams({
        page: expensePage.toString(),
        limit: expenseLimit.toString(),
        is_printed: isPrinted.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await fetch(`/api/expense-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch expense requests');

      const data = await response.json();
      setExpenseRequests(data.data || []);
      setExpenseTotal(data.pagination?.total || 0);
    } catch (error: any) {
      console.error('Error fetching expense requests:', error);
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في جلب طلبات المصاريف' : 'Failed to fetch expense requests' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transfer Requests
  const fetchTransferRequests = async (isPrinted: boolean = false) => {
    if (!canViewTransferRequests) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const params = new URLSearchParams({
        page: transferPage.toString(),
        limit: transferLimit.toString(),
        is_printed: isPrinted.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await fetch(`/api/transfer-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch transfer requests');

      const data = await response.json();
      setTransferRequests(data.data || []);
      setTransferTotal(data.pagination?.total || 0);
    } catch (error: any) {
      console.error('Error fetching transfer requests:', error);
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في جلب طلبات التحويل' : 'Failed to fetch transfer requests' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Payment Requests
  const fetchPaymentRequests = async (isPrinted: boolean = false) => {
    if (!canViewPaymentRequests) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const params = new URLSearchParams({
        page: paymentPage.toString(),
        limit: paymentLimit.toString(),
        is_printed: isPrinted.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await fetch(`/api/payment-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch payment requests');

      const data = await response.json();
      setPaymentRequests(data.data || []);
      setPaymentTotal(data.pagination?.total || 0);
    } catch (error: any) {
      console.error('Error fetching payment requests:', error);
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في جلب طلبات السداد' : 'Failed to fetch payment requests' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Printed Expense Requests (dedicated — avoids state conflict with unprinted tab)
  const fetchExpensePrintedRequests = async () => {
    if (!canViewExpenseRequests) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: expensePrintedPage.toString(),
        limit: expensePrintedLimit.toString(),
        is_printed: 'true',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const response = await fetch(`/api/expense-requests?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setExpensePrintedRequests(data.data || []);
      setExpensePrintedTotal(data.pagination?.total || 0);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في جلب طلبات المصاريف السابقة' : 'Failed to fetch previous expense requests' });
    } finally { setLoading(false); }
  };

  // Fetch Printed Transfer Requests
  const fetchTransferPrintedRequests = async () => {
    if (!canViewTransferRequests) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: transferPrintedPage.toString(),
        limit: transferPrintedLimit.toString(),
        is_printed: 'true',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const response = await fetch(`/api/transfer-requests?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTransferPrintedRequests(data.data || []);
      setTransferPrintedTotal(data.pagination?.total || 0);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في جلب طلبات التحويل السابقة' : 'Failed to fetch previous transfer requests' });
    } finally { setLoading(false); }
  };

  // Fetch Printed Payment Requests
  const fetchPaymentPrintedRequests = async () => {
    if (!canViewPaymentRequests) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: paymentPrintedPage.toString(),
        limit: paymentPrintedLimit.toString(),
        is_printed: 'true',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const response = await fetch(`/api/payment-requests?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPaymentPrintedRequests(data.data || []);
      setPaymentPrintedTotal(data.pagination?.total || 0);
    } catch {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في جلب طلبات السداد السابقة' : 'Failed to fetch previous payment requests' });
    } finally { setLoading(false); }
  };

  // Fetch Deleted Requests (all types)
  const fetchDeletedRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const buildParams = () => {
        const params = new URLSearchParams({ limit: '50', deleted_only: 'true' });
        if (searchTerm) params.append('search', searchTerm);
        return params;
      };

      const fetches = [];
      if (canViewExpenseRequests) fetches.push(fetch(`/api/expense-requests?${buildParams()}`, { headers }).then(async r => ({ type: 'expense', data: r.ok ? await r.json() : null })));
      if (canViewTransferRequests) fetches.push(fetch(`/api/transfer-requests?${buildParams()}`, { headers }).then(async r => ({ type: 'transfer', data: r.ok ? await r.json() : null })));
      if (canViewPaymentRequests) fetches.push(fetch(`/api/payment-requests?${buildParams()}`, { headers }).then(async r => ({ type: 'payment', data: r.ok ? await r.json() : null })));

      const results = await Promise.allSettled(fetches);
      const combined: (ExpenseRequest & { _type?: string })[] = [];

      results.forEach(result => {
        if (result.status !== 'fulfilled' || !result.value.data) return;
        const { type, data } = result.value;
        (data.data || []).forEach((r: any) => {
          combined.push({
            id: r.id,
            request_number: r.request_number,
            request_date: r.request_date || r.created_at,
            project_name: r.project_name || '',
            shipment_number: r.shipment_number || '',
            expense_type_name: r.expense_type_name || '',
            expense_type_name_ar: r.expense_type_name_ar || '',
            vendor_name: r.vendor_name || '',
            total_amount: parseFloat(r.total_amount || r.transfer_amount || r.payment_amount || 0),
            currency_code: r.currency_code || '',
            status_name: r.status_name || '',
            status_name_ar: r.status_name_ar || '',
            status_color: r.status_color || 'gray',
            requested_by_name: r.requested_by_name || '',
            is_printed: r.is_printed || false,
            print_count: r.print_count || 0,
            created_at: r.created_at,
            _type: type,
          });
        });
      });

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDeletedRequests(combined);
      setDeletedTotal(combined.length);
    } catch (error: any) {
      console.error('Error fetching deleted requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  const loadTabData = (tab: RequestTab) => {
    switch (tab) {
      case 'all':
        fetchAllRequests();
        break;
      case 'expense':
        fetchExpenseRequests(false);
        break;
      case 'transfer':
        fetchTransferRequests(false);
        break;
      case 'payment':
        fetchPaymentRequests(false);
        break;
      case 'expense_printed':
        fetchExpensePrintedRequests();
        break;
      case 'transfer_printed':
        fetchTransferPrintedRequests();
        break;
      case 'payment_printed':
        fetchPaymentPrintedRequests();
        break;
      case 'deleted':
        fetchDeletedRequests();
        break;
    }
  };

  // Refresh current tab
  const handleRefresh = () => {
    setRefreshing(true);
    loadTabData(activeTab);
    setTimeout(() => setRefreshing(false), 500);
  };

  // Load data when tab changes
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, allPage, expensePage, transferPage, paymentPage, deletedPage, expensePrintedPage, transferPrintedPage, paymentPrintedPage]);

  // Print and mark as printed
  const handlePrint = async (id: number, type: 'expense' | 'transfer' | 'payment') => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Call API to mark as printed
      const endpoint = type === 'expense' 
        ? `/api/expense-requests/${id}/print`
        : type === 'transfer'
        ? `/api/transfer-requests/${id}/print`
        : `/api/payment-requests/${id}/print`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to mark as printed');

      // Open print window
      const printUrl = `/requests/${type}/${id}/print`;
      const printWindow = window.open(printUrl, '_blank');
      if (!printWindow) {
        showToast({ type: 'warning', message: locale === 'ar' ? 'الرجاء السماح بالنوافذ المنبثقة' : 'Please allow popups for printing' });
      }

      // Refresh current tab data
      handleRefresh();
      showToast({ type: 'success', message: locale === 'ar' ? 'تم إرسال الطلب للطباعة' : 'Request sent to print' });
    } catch (error) {
      // Still open print window even if marking fails
      const printUrl = `/requests/${type}/${id}/print`;
      window.open(printUrl, '_blank');
      showToast({ type: 'info', message: locale === 'ar' ? 'تم فتح نافذة الطباعة' : 'Print window opened' });
    }
  };

  // Delete request (soft delete)
  const handleDelete = async () => {
    if (!requestToDelete) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('accessToken');
      
      const endpoint = requestToDelete.type === 'expense' 
        ? `/api/expense-requests/${requestToDelete.id}`
        : requestToDelete.type === 'transfer'
        ? `/api/transfer-requests/${requestToDelete.id}`
        : `/api/payment-requests/${requestToDelete.id}`;
        
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete request');

      showToast({ type: 'success', message: locale === 'ar' ? 'تم حذف الطلب' : 'Request deleted' });
      handleRefresh();
    } catch (error) {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في حذف الطلب' : 'Failed to delete request' });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setRequestToDelete(null);
    }
  };

  // Restore request
  const handleRestore = async () => {
    if (!requestToRestore) return;

    try {
      setRestoring(true);
      const token = localStorage.getItem('accessToken');
      
      const endpoint = requestToRestore.type === 'expense' 
        ? `/api/expense-requests/${requestToRestore.id}/restore`
        : requestToRestore.type === 'transfer'
        ? `/api/transfer-requests/${requestToRestore.id}/restore`
        : `/api/payment-requests/${requestToRestore.id}/restore`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to restore request');

      showToast({ type: 'success', message: locale === 'ar' ? 'تم استعادة الطلب' : 'Request restored' });
      handleRefresh();
    } catch (error) {
      showToast({ type: 'error', message: locale === 'ar' ? 'فشل في استعادة الطلب' : 'Failed to restore request' });
    } finally {
      setRestoring(false);
      setRestoreConfirmOpen(false);
      setRequestToRestore(null);
    }
  };

  // Status badge
  const StatusBadge = ({ status_color, status_name, status_name_ar }: { status_color?: string; status_name?: string; status_name_ar?: string }) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      slate: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status_color || 'gray'] || colorMap.gray}`}>
        {locale === 'ar' ? status_name_ar : status_name}
      </span>
    );
  };

  // Tab definitions
  const tabs = [
    { key: 'all' as RequestTab, label: locale === 'ar' ? 'جميع الطلبات' : 'All Requests', icon: Squares2X2Icon, count: allTotal, show: canViewExpenseRequests || canViewTransferRequests || canViewPaymentRequests },
    { key: 'expense' as RequestTab, label: locale === 'ar' ? 'طلبات المصاريف' : 'Expense Requests', icon: DocumentTextIcon, count: expenseTotal, show: canViewExpenseRequests },
    { key: 'transfer' as RequestTab, label: locale === 'ar' ? 'طلبات التحويل' : 'Transfer Requests', icon: BanknotesIcon, count: transferTotal, show: canViewTransferRequests },
    { key: 'payment' as RequestTab, label: locale === 'ar' ? 'طلبات السداد' : 'Payment Requests', icon: CreditCardIcon, count: paymentTotal, show: canViewPaymentRequests },
    { key: 'expense_printed' as RequestTab, label: locale === 'ar' ? 'طلبات المصاريف السابقة' : 'Previous Expense Requests', icon: ClockIcon, count: expensePrintedTotal, show: canViewExpenseRequests },
    { key: 'transfer_printed' as RequestTab, label: locale === 'ar' ? 'طلبات التحويل السابقة' : 'Previous Transfer Requests', icon: ClockIcon, count: transferPrintedTotal, show: canViewTransferRequests },
    { key: 'payment_printed' as RequestTab, label: locale === 'ar' ? 'طلبات السداد السابقة' : 'Previous Payment Requests', icon: ClockIcon, count: paymentPrintedTotal, show: canViewPaymentRequests },
    { key: 'deleted' as RequestTab, label: locale === 'ar' ? 'المحذوفة' : 'Deleted', icon: ArchiveBoxIcon, count: deletedTotal, show: canViewExpenseRequests || canViewTransferRequests || canViewPaymentRequests },
  ];

  // Common columns for expense requests
  const getExpenseColumns = (showDelete: boolean = true, showRestore: boolean = false) => [
    {
      label: locale === 'ar' ? 'رقم الطلب' : 'Request Number',
      key: 'request_number',
      render: (row: ExpenseRequest) => (
        <Link 
          href={`/requests/expense/${row.id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {row.request_number}
        </Link>
      ),
    },
    {
      label: locale === 'ar' ? 'التاريخ' : 'Date',
      key: 'request_date',
      render: (row: ExpenseRequest) => new Date(row.request_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
    },
    {
      label: locale === 'ar' ? 'المشروع' : 'Project',
      key: 'project_name',
    },
    {
      label: locale === 'ar' ? 'الشحنة' : 'Shipment',
      key: 'shipment_number',
    },
    {
      label: locale === 'ar' ? 'نوع المصروف' : 'Expense Type',
      key: 'expense_type_name',
      render: (row: ExpenseRequest) => (
        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
          {locale === 'ar' ? row.expense_type_name_ar : row.expense_type_name}
        </span>
      ),
    },
    {
      label: locale === 'ar' ? 'المورد' : 'Vendor',
      key: 'vendor_name',
    },
    {
      label: locale === 'ar' ? 'المبلغ' : 'Amount',
      key: 'total_amount',
      render: (row: ExpenseRequest) => `${parseFloat(String(row.total_amount || 0)).toFixed(2)} ${row.currency_code || ''}`,
    },
    {
      label: locale === 'ar' ? 'الحالة' : 'Status',
      key: 'status_name',
      render: (row: ExpenseRequest) => <StatusBadge status_color={row.status_color} status_name={row.status_name} status_name_ar={row.status_name_ar} />,
    },
    {
      label: locale === 'ar' ? 'مطبوع' : 'Printed',
      key: 'is_printed',
      render: (row: ExpenseRequest) => (
        row.is_printed ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-5 h-5" />
            {row.print_count || 1}x
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      label: locale === 'ar' ? 'الإجراءات' : 'Actions',
      key: 'actions',
      render: (row: ExpenseRequest) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrint(row.id, 'expense')}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title={locale === 'ar' ? 'طباعة' : 'Print'}
          >
            <PrinterIcon className="w-5 h-5" />
          </button>
          {showDelete && canDeleteExpenseRequest && (
            <button
              onClick={() => {
                setRequestToDelete({ id: row.id, type: 'expense' });
                setDeleteConfirmOpen(true);
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title={locale === 'ar' ? 'حذف' : 'Delete'}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
          {showRestore && (
            <button
              onClick={() => {
                setRequestToRestore({ id: row.id, type: 'expense' });
                setRestoreConfirmOpen(true);
              }}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              title={locale === 'ar' ? 'استعادة' : 'Restore'}
            >
              <ArrowUturnLeftIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Common columns for transfer requests
  const getTransferColumns = (showDelete: boolean = true, showRestore: boolean = false) => [
    {
      label: locale === 'ar' ? 'رقم الطلب' : 'Request Number',
      key: 'request_number',
      render: (row: TransferRequest) => (
        <Link 
          href={`/requests/transfer/${row.id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {row.request_number}
        </Link>
      ),
    },
    {
      label: locale === 'ar' ? 'المصدر' : 'Source',
      key: 'source',
      render: (row: TransferRequest) => {
        if (row.vendor_payment_number) {
          return (
            <div className="flex flex-col">
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                {locale === 'ar' ? 'دفعة مورد' : 'Vendor Payment'}
              </span>
              <span className="text-sm">{row.vendor_payment_number}</span>
            </div>
          );
        }
        if (row.expense_request_number) {
          return (
            <div className="flex flex-col">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {locale === 'ar' ? 'طلب مصروف' : 'Expense Request'}
              </span>
              <span className="text-sm">{row.expense_request_number}</span>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      label: locale === 'ar' ? 'التاريخ' : 'Date',
      key: 'request_date',
      render: (row: TransferRequest) => new Date(row.request_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
    },
    {
      label: locale === 'ar' ? 'المشروع' : 'Project',
      key: 'project_name',
    },
    {
      label: locale === 'ar' ? 'نوع المصروف' : 'Expense Type',
      key: 'expense_type_name',
      render: (row: TransferRequest) => (
        <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm">
          {locale === 'ar' ? row.expense_type_name_ar : row.expense_type_name}
        </span>
      ),
    },
    {
      label: locale === 'ar' ? 'المورد' : 'Vendor',
      key: 'vendor_name',
    },
    {
      label: locale === 'ar' ? 'المبلغ' : 'Amount',
      key: 'transfer_amount',
      render: (row: TransferRequest) => `${parseFloat(String(row.transfer_amount || 0)).toFixed(2)} ${row.currency_code || ''}`,
    },
    {
      label: locale === 'ar' ? 'الحالة' : 'Status',
      key: 'status_name',
      render: (row: TransferRequest) => <StatusBadge status_color={row.status_color} status_name={row.status_name} status_name_ar={row.status_name_ar} />,
    },
    {
      label: locale === 'ar' ? 'مطبوع' : 'Printed',
      key: 'is_printed',
      render: (row: TransferRequest) => (
        row.is_printed ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-5 h-5" />
            {row.print_count}x
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      label: locale === 'ar' ? 'الإجراءات' : 'Actions',
      key: 'actions',
      render: (row: TransferRequest) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrint(row.id, 'transfer')}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title={locale === 'ar' ? 'طباعة' : 'Print'}
          >
            <PrinterIcon className="w-5 h-5" />
          </button>
          {showDelete && canDeleteTransferRequest && (
            <button
              onClick={() => {
                setRequestToDelete({ id: row.id, type: 'transfer' });
                setDeleteConfirmOpen(true);
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title={locale === 'ar' ? 'حذف' : 'Delete'}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
          {showRestore && (
            <button
              onClick={() => {
                setRequestToRestore({ id: row.id, type: 'transfer' });
                setRestoreConfirmOpen(true);
              }}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              title={locale === 'ar' ? 'استعادة' : 'Restore'}
            >
              <ArrowUturnLeftIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Common columns for payment requests
  const getPaymentColumns = (showDelete: boolean = true, showRestore: boolean = false) => [
    {
      label: locale === 'ar' ? 'رقم الطلب' : 'Request Number',
      key: 'request_number',
      render: (row: PaymentRequest) => (
        <Link 
          href={`/requests/payment/${row.id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {row.request_number}
        </Link>
      ),
    },
    {
      label: locale === 'ar' ? 'طلب التحويل' : 'Transfer Request',
      key: 'transfer_request_number',
    },
    {
      label: locale === 'ar' ? 'التاريخ' : 'Date',
      key: 'request_date',
      render: (row: PaymentRequest) => new Date(row.request_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
    },
    {
      label: locale === 'ar' ? 'المشروع' : 'Project',
      key: 'project_name',
    },
    {
      label: locale === 'ar' ? 'المورد' : 'Vendor',
      key: 'vendor_name',
    },
    {
      label: locale === 'ar' ? 'المبلغ' : 'Amount',
      key: 'payment_amount',
      render: (row: PaymentRequest) => `${parseFloat(String(row.payment_amount || 0)).toFixed(2)} ${row.currency_code || ''}`,
    },
    {
      label: locale === 'ar' ? 'طريقة الدفع' : 'Payment Method',
      key: 'payment_method',
    },
    {
      label: locale === 'ar' ? 'الحالة' : 'Status',
      key: 'status_name',
      render: (row: PaymentRequest) => <StatusBadge status_color={row.status_color} status_name={row.status_name} status_name_ar={row.status_name_ar} />,
    },
    {
      label: locale === 'ar' ? 'مطبوع' : 'Printed',
      key: 'is_printed',
      render: (row: PaymentRequest) => (
        row.is_printed ? (
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <XCircleIcon className="w-5 h-5 text-gray-400" />
        )
      ),
    },
    {
      label: locale === 'ar' ? 'الإجراءات' : 'Actions',
      key: 'actions',
      render: (row: PaymentRequest) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrint(row.id, 'payment')}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title={locale === 'ar' ? 'طباعة' : 'Print'}
          >
            <PrinterIcon className="w-5 h-5" />
          </button>
          {showDelete && canDeletePaymentRequest && (
            <button
              onClick={() => {
                setRequestToDelete({ id: row.id, type: 'payment' });
                setDeleteConfirmOpen(true);
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title={locale === 'ar' ? 'حذف' : 'Delete'}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
          {showRestore && (
            <button
              onClick={() => {
                setRequestToRestore({ id: row.id, type: 'payment' });
                setRestoreConfirmOpen(true);
              }}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              title={locale === 'ar' ? 'استعادة' : 'Restore'}
            >
              <ArrowUturnLeftIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Access check
  if (!canViewExpenseRequests && !canViewTransferRequests && !canViewPaymentRequests) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'طلباتي' : 'My Requests'} - SLMS</title></Head>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {locale === 'ar' ? 'ليس لديك صلاحيات لعرض الطلبات' : 'You do not have permission to view requests'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'طلباتي' : 'My Requests'} - SLMS</title></Head>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'طلباتي' : 'My Requests'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'إدارة ومتابعة جميع الطلبات والموافقات' : 'Manage and track all requests & approvals'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications && unreadCount > 0) markNotificationsRead(); }}
                className="relative p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                title={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
              >
                {unreadCount > 0 ? <BellAlertIcon className="w-6 h-6 text-blue-600" /> : <BellIcon className="w-6 h-6" />}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                    </h3>
                    {notifications.length > 0 && (
                      <button onClick={() => markNotificationsRead()} className="text-xs text-blue-600 hover:underline">
                        {locale === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      {locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                    </div>
                  ) : notifications.map((n: any) => (
                    <button key={n.id}
                      onClick={() => {
                        setShowNotifications(false);
                        if (n.request_type && n.request_id) router.push(`/requests/${n.request_type}/${n.request_id}`);
                      }}
                      className={`w-full text-start p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {locale === 'ar' ? n.title_ar : n.title}
                      </p>
                      {(n.message || n.message_ar) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {locale === 'ar' ? n.message_ar : n.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="w-5 h-5" />
              {locale === 'ar' ? 'تصفية' : 'Filter'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              loading={refreshing}
            >
              <ArrowPathIcon className="w-5 h-5" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                type="date"
                label={locale === 'ar' ? 'من تاريخ' : 'From Date'}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                label={locale === 'ar' ? 'إلى تاريخ' : 'To Date'}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <Button variant="primary" onClick={handleRefresh}>
                {locale === 'ar' ? 'بحث' : 'Search'}
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-4 rtl:space-x-reverse overflow-x-auto">
            {tabs.filter(tab => tab.show).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap
                  ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                    activeTab === tab.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* All Requests Tab (Unprinted from all types) */}
          {activeTab === 'all' && (
            <DataTablePro
              keyExtractor={(row) => `${row._type}-${row.id}`}
              columns={[
                {
                  label: locale === 'ar' ? 'النوع' : 'Type',
                  key: '_type',
                  render: (row: any) => {
                    const typeMap: Record<string, { label: string; labelAr: string; color: string }> = {
                      expense: { label: 'Expense', labelAr: 'مصروف', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                      transfer: { label: 'Transfer', labelAr: 'تحويل', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                      payment: { label: 'Payment', labelAr: 'سداد', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                    };
                    const t = typeMap[row._type] || typeMap.expense;
                    return <span className={`px-2 py-1 rounded text-xs font-medium ${t.color}`}>{locale === 'ar' ? t.labelAr : t.label}</span>;
                  },
                },
                ...getExpenseColumns(true, false).map(col => {
                  if (col.key === 'request_number') {
                    return {
                      ...col,
                      render: (row: any) => (
                        <Link href={`/requests/${row._type || 'expense'}/${row.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{row.request_number}</Link>
                      ),
                    };
                  }
                  return col;
                }),
              ]}
              data={allRequests}
              loading={loading}
              pagination={{
                page: allPage,
                pageSize: allLimit,
                total: allTotal,
                onPageChange: setAllPage,
              }}
            />
          )}

          {/* Expense Requests Tab (Unprinted) */}
          {activeTab === 'expense' && (
            <DataTablePro
              keyExtractor={(row) => row.id}
              columns={getExpenseColumns(true, false)}
              data={expenseRequests}
              loading={loading}
              pagination={{
                page: expensePage,
                pageSize: expenseLimit,
                total: expenseTotal,
                onPageChange: setExpensePage,
              }}
            />
          )}

          {/* Expense Requests Tab (Printed / Previous) */}
          {activeTab === 'expense_printed' && (
            <DataTablePro
              keyExtractor={(row) => row.id}
              columns={getExpenseColumns(true, false)}
              data={expensePrintedRequests}
              loading={loading}
              pagination={{
                page: expensePrintedPage,
                pageSize: expensePrintedLimit,
                total: expensePrintedTotal,
                onPageChange: setExpensePrintedPage,
              }}
            />
          )}

          {/* Transfer Requests Tab (Unprinted) */}
          {activeTab === 'transfer' && (
            <DataTablePro
              keyExtractor={(row) => row.id}
              columns={getTransferColumns(true, false)}
              data={transferRequests}
              loading={loading}
              pagination={{
                page: transferPage,
                pageSize: transferLimit,
                total: transferTotal,
                onPageChange: setTransferPage,
              }}
            />
          )}

          {/* Transfer Requests Tab (Printed / Previous) */}
          {activeTab === 'transfer_printed' && (
            <DataTablePro
              keyExtractor={(row) => row.id}
              columns={getTransferColumns(true, false)}
              data={transferPrintedRequests}
              loading={loading}
              pagination={{
                page: transferPrintedPage,
                pageSize: transferPrintedLimit,
                total: transferPrintedTotal,
                onPageChange: setTransferPrintedPage,
              }}
            />
          )}

          {/* Payment Requests Tab (Unprinted) */}
          {activeTab === 'payment' && (
            <DataTablePro
              keyExtractor={(row) => row.id}
              columns={getPaymentColumns(true, false)}
              data={paymentRequests}
              loading={loading}
              pagination={{
                page: paymentPage,
                pageSize: paymentLimit,
                total: paymentTotal,
                onPageChange: setPaymentPage,
              }}
            />
          )}

          {/* Payment Requests Tab (Printed / Previous) */}
          {activeTab === 'payment_printed' && (
            <DataTablePro
              keyExtractor={(row) => row.id}
              columns={getPaymentColumns(true, false)}
              data={paymentPrintedRequests}
              loading={loading}
              pagination={{
                page: paymentPrintedPage,
                pageSize: paymentPrintedLimit,
                total: paymentPrintedTotal,
                onPageChange: setPaymentPrintedPage,
              }}
            />
          )}

          {/* Deleted Requests Tab */}
          {activeTab === 'deleted' && (
            <DataTablePro
              keyExtractor={(row) => `deleted-${row._type}-${row.id}`}
              columns={[
                {
                  label: locale === 'ar' ? 'النوع' : 'Type',
                  key: '_type',
                  render: (row: any) => {
                    const typeMap: Record<string, { label: string; labelAr: string; color: string }> = {
                      expense: { label: 'Expense', labelAr: 'مصروف', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                      transfer: { label: 'Transfer', labelAr: 'تحويل', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                      payment: { label: 'Payment', labelAr: 'سداد', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                    };
                    const t = typeMap[row._type] || typeMap.expense;
                    return <span className={`px-2 py-1 rounded text-xs font-medium ${t.color}`}>{locale === 'ar' ? t.labelAr : t.label}</span>;
                  },
                },
                ...getExpenseColumns(false, true),
              ]}
              data={deletedRequests}
              loading={loading}
              pagination={{
                page: deletedPage,
                pageSize: deletedLimit,
                total: deletedTotal,
                onPageChange: setDeletedPage,
              }}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRequestToDelete(null);
        }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب؟ يمكنك استعادته لاحقاً من قائمة المحذوفات.' : 'Are you sure you want to delete this request? You can restore it later from the deleted list.'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        cancelText={locale === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        loading={deleting}
      />

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={restoreConfirmOpen}
        onClose={() => {
          setRestoreConfirmOpen(false);
          setRequestToRestore(null);
        }}
        onConfirm={handleRestore}
        title={locale === 'ar' ? 'تأكيد الاستعادة' : 'Confirm Restore'}
        message={locale === 'ar' ? 'هل أنت متأكد من استعادة هذا الطلب؟' : 'Are you sure you want to restore this request?'}
        confirmText={locale === 'ar' ? 'استعادة' : 'Restore'}
        cancelText={locale === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="primary"
        loading={restoring}
      />
    </MainLayout>
  );
}
