/**
 * 🔔 LC ALERTS PAGE - صفحة تنبيهات الاعتمادات المستندية
 * ======================================================
 * Shows alerts for LCs expiring soon or with upcoming deadlines
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  BellAlertIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LcAlert {
  id: number;
  letter_of_credit_id: number;
  lc_number: string;
  vendor_name?: string;
  alert_type: string;
  alert_date: string;
  message: string;
  message_ar?: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  // LC Info
  expiry_date?: string;
  latest_shipment_date?: string;
  amount?: number;
  currency?: string;
}

interface ExpiringLC {
  id: number;
  lc_number: string;
  vendor_name: string;
  expiry_date: string;
  latest_shipment_date: string;
  days_to_expiry: number;
  days_to_latest_shipment: number;
  amount: number;
  currency: string;
  status_name: string;
  status_color: string;
}

const API_BASE = 'http://localhost:4000/api';

export default function LcAlertsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  const [alerts, setAlerts] = useState<LcAlert[]>([]);
  const [expiringLCs, setExpiringLCs] = useState<ExpiringLC[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning'>('all');

  const getToken = () => localStorage.getItem('accessToken');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExpiringLCs = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit?expiring_within_days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Calculate days to expiry for each LC
        const lcs = (data.data || []).map((lc: any) => {
          const now = new Date();
          const expiryDate = lc.expiry_date ? new Date(lc.expiry_date) : null;
          const latestShipmentDate = lc.latest_shipment_date ? new Date(lc.latest_shipment_date) : null;
          
          return {
            ...lc,
            days_to_expiry: expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
            days_to_latest_shipment: latestShipmentDate ? Math.ceil((latestShipmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
          };
        });
        setExpiringLCs(lcs);
      }
    } catch (error) {
      console.error('Error fetching expiring LCs:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchExpiringLCs();
  }, [fetchAlerts, fetchExpiringLCs]);

  const markAsRead = async (alertId: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/alerts/${alertId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
        showToast(isRTL ? 'تم التحديد كمقروء' : 'Marked as read', 'success');
      }
    } catch (error) {
      showToast(isRTL ? 'فشل في التحديث' : 'Failed to update', 'error');
    }
  };

  const markAsResolved = async (alertId: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/letters-of-credit/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
        showToast(isRTL ? 'تم الحل' : 'Resolved', 'success');
      }
    } catch (error) {
      showToast(isRTL ? 'فشل في التحديث' : 'Failed to update', 'error');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.is_read;
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'warning') return alert.severity === 'warning';
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default: return <ClockIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getDaysColor = (days: number | null) => {
    if (days === null) return 'text-gray-500';
    if (days <= 0) return 'text-red-600 font-bold';
    if (days <= 7) return 'text-red-500';
    if (days <= 14) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'تنبيهات الاعتمادات - SLMS' : 'LC Alerts - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <BellAlertIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'تنبيهات الاعتمادات' : 'LC Alerts'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? 'مراقبة تواريخ الانتهاء والتنبيهات الهامة' : 'Monitor expiry dates and important alerts'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {expiringLCs.filter(lc => lc.days_to_expiry !== null && lc.days_to_expiry <= 7).length}
                </p>
                <p className="text-sm text-red-600">{isRTL ? 'تنتهي خلال 7 أيام' : 'Expiring in 7 days'}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {expiringLCs.filter(lc => lc.days_to_latest_shipment !== null && lc.days_to_latest_shipment <= 7).length}
                </p>
                <p className="text-sm text-yellow-600">{isRTL ? 'آخر شحن خلال 7 أيام' : 'Last shipment in 7 days'}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{alerts.filter(a => !a.is_read).length}</p>
                <p className="text-sm text-blue-600">{isRTL ? 'تنبيهات غير مقروءة' : 'Unread alerts'}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{alerts.filter(a => a.is_resolved).length}</p>
                <p className="text-sm text-green-600">{isRTL ? 'تنبيهات محلولة' : 'Resolved alerts'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expiring LCs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-orange-500" />
              {isRTL ? 'الاعتمادات المنتهية قريباً (30 يوم)' : 'Expiring LCs (30 days)'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'رقم الاعتماد' : 'LC Number'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'المورد' : 'Vendor'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'أيام للانتهاء' : 'Days to Expiry'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'آخر شحن' : 'Latest Shipment'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'أيام لآخر شحن' : 'Days to Ship'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {isRTL ? 'المبلغ' : 'Amount'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : expiringLCs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {isRTL ? 'لا توجد اعتمادات منتهية قريباً' : 'No LCs expiring soon'}
                    </td>
                  </tr>
                ) : (
                  expiringLCs.map((lc) => (
                    <tr key={lc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {lc.lc_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {lc.vendor_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {lc.expiry_date ? formatDate(lc.expiry_date) : '-'}
                      </td>
                      <td className={clsx('px-4 py-3 whitespace-nowrap text-sm font-bold', getDaysColor(lc.days_to_expiry))}>
                        {lc.days_to_expiry !== null ? (
                          lc.days_to_expiry <= 0 
                            ? (isRTL ? 'منتهي!' : 'EXPIRED!') 
                            : `${lc.days_to_expiry} ${isRTL ? 'يوم' : 'days'}`
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {lc.latest_shipment_date ? formatDate(lc.latest_shipment_date) : '-'}
                      </td>
                      <td className={clsx('px-4 py-3 whitespace-nowrap text-sm font-bold', getDaysColor(lc.days_to_latest_shipment))}>
                        {lc.days_to_latest_shipment !== null ? (
                          lc.days_to_latest_shipment <= 0 
                            ? (isRTL ? 'فات الموعد!' : 'PAST DUE!') 
                            : `${lc.days_to_latest_shipment} ${isRTL ? 'يوم' : 'days'}`
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {Number(lc.amount).toLocaleString()} {lc.currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BellAlertIcon className="h-5 w-5 text-orange-500" />
              {isRTL ? 'التنبيهات' : 'Alerts'}
            </h2>
            <div className="flex gap-2">
              {(['all', 'unread', 'critical', 'warning'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'px-3 py-1 text-sm rounded-lg transition-colors',
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {f === 'all' && (isRTL ? 'الكل' : 'All')}
                  {f === 'unread' && (isRTL ? 'غير مقروء' : 'Unread')}
                  {f === 'critical' && (isRTL ? 'حرج' : 'Critical')}
                  {f === 'warning' && (isRTL ? 'تحذير' : 'Warning')}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlerts.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                {isRTL ? 'لا توجد تنبيهات' : 'No alerts'}
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={clsx(
                    'px-6 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    !alert.is_read && 'bg-blue-50/50 dark:bg-blue-900/10'
                  )}
                >
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {alert.lc_number}
                      </span>
                      <span className={clsx('px-2 py-0.5 text-xs rounded-full', getSeverityColor(alert.severity))}>
                        {alert.severity === 'critical' && (isRTL ? 'حرج' : 'Critical')}
                        {alert.severity === 'warning' && (isRTL ? 'تحذير' : 'Warning')}
                        {alert.severity === 'info' && (isRTL ? 'معلومات' : 'Info')}
                      </span>
                      {!alert.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {isRTL && alert.message_ar ? alert.message_ar : alert.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(alert.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!alert.is_read && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title={isRTL ? 'تحديد كمقروء' : 'Mark as read'}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    )}
                    {!alert.is_resolved && (
                      <button
                        onClick={() => markAsResolved(alert.id)}
                        className="text-green-600 hover:text-green-800 text-sm"
                        title={isRTL ? 'تحديد كمحلول' : 'Mark as resolved'}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
