import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ChartBarIcon,
  CalendarIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface NotificationLog {
  id: number;
  type: 'email' | 'sms' | 'push' | 'system';
  subject: string;
  subjectAr: string;
  recipient: string;
  status: 'delivered' | 'failed' | 'pending' | 'opened';
  sentAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
  category: string;
  categoryAr: string;
}

const mockLogs: NotificationLog[] = [
  { id: 1, type: 'email', subject: 'Shipment Arrival Notice', subjectAr: 'إشعار وصول الشحنة', recipient: 'customer@example.com', status: 'opened', sentAt: '2024-01-28 10:00:00', deliveredAt: '2024-01-28 10:00:05', openedAt: '2024-01-28 10:15:00', category: 'Shipment', categoryAr: 'الشحنات' },
  { id: 2, type: 'sms', subject: 'Payment Reminder', subjectAr: 'تذكير بالدفع', recipient: '+966501234567', status: 'delivered', sentAt: '2024-01-28 09:30:00', deliveredAt: '2024-01-28 09:30:02', openedAt: null, category: 'Payment', categoryAr: 'الدفع' },
  { id: 3, type: 'email', subject: 'License Expiry Warning', subjectAr: 'تحذير انتهاء الرخصة', recipient: 'admin@company.com', status: 'delivered', sentAt: '2024-01-28 08:00:00', deliveredAt: '2024-01-28 08:00:03', openedAt: null, category: 'Compliance', categoryAr: 'الامتثال' },
  { id: 4, type: 'push', subject: 'New Order Received', subjectAr: 'تم استلام طلب جديد', recipient: 'Mobile App', status: 'delivered', sentAt: '2024-01-28 11:00:00', deliveredAt: '2024-01-28 11:00:01', openedAt: null, category: 'Order', categoryAr: 'الطلبات' },
  { id: 5, type: 'email', subject: 'Invoice Generated', subjectAr: 'تم إنشاء الفاتورة', recipient: 'finance@client.com', status: 'failed', sentAt: '2024-01-28 07:30:00', deliveredAt: null, openedAt: null, category: 'Invoice', categoryAr: 'الفواتير' },
  { id: 6, type: 'system', subject: 'System Maintenance', subjectAr: 'صيانة النظام', recipient: 'All Users', status: 'delivered', sentAt: '2024-01-27 22:00:00', deliveredAt: '2024-01-27 22:00:00', openedAt: null, category: 'System', categoryAr: 'النظام' },
  { id: 7, type: 'sms', subject: 'OTP Verification', subjectAr: 'رمز التحقق', recipient: '+966509876543', status: 'delivered', sentAt: '2024-01-28 10:30:00', deliveredAt: '2024-01-28 10:30:01', openedAt: null, category: 'Security', categoryAr: 'الأمان' },
  { id: 8, type: 'email', subject: 'Weekly Report', subjectAr: 'التقرير الأسبوعي', recipient: 'manager@company.com', status: 'pending', sentAt: '2024-01-28 11:30:00', deliveredAt: null, openedAt: null, category: 'Report', categoryAr: 'التقارير' },
];

const stats = {
  totalSent: 1256,
  delivered: 1198,
  failed: 32,
  openRate: 68.5,
};

export default function NotificationsReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [logs] = useState<NotificationLog[]>(mockLogs);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const filteredLogs = logs.filter(log => {
    const matchesType = selectedType === 'all' || log.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    return matchesType && matchesStatus;
  });

  const handleExport = () => {
    showToast(locale === 'ar' ? 'جاري التصدير...' : 'Exporting...', 'info');
  };

  const handleResend = (log: NotificationLog) => {
    showToast(locale === 'ar' ? 'تم إعادة الإرسال' : 'Notification resent', 'success');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <EnvelopeIcon className="h-5 w-5 text-blue-500" />;
      case 'sms': return <DevicePhoneMobileIcon className="h-5 w-5 text-green-500" />;
      case 'push': return <BellIcon className="h-5 w-5 text-purple-500" />;
      case 'system': return <BellIcon className="h-5 w-5 text-gray-500" />;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      sms: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      push: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      system: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<string, { ar: string }> = {
      email: { ar: 'بريد' },
      sms: { ar: 'رسالة' },
      push: { ar: 'إشعار' },
      system: { ar: 'نظام' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full uppercase', styles[type])}>
        {locale === 'ar' ? labels[type]?.ar : type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      opened: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      delivered: { en: 'Delivered', ar: 'تم التسليم' },
      failed: { en: 'Failed', ar: 'فشل' },
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      opened: { en: 'Opened', ar: 'تم الفتح' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير التنبيهات - SLMS' : 'Notifications Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <BellIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تقارير التنبيهات' : 'Notifications Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'سجلات الإشعارات والرسائل المرسلة' : 'Notification and message logs'}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <BellIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المرسل' : 'Total Sent'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalSent}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</p>
                <p className="text-xl font-semibold text-green-600">{stats.delivered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600">
                <XCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'فشل' : 'Failed'}</p>
                <p className="text-xl font-semibold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <EyeIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'معدل الفتح' : 'Open Rate'}</p>
                <p className="text-xl font-semibold text-purple-600">{stats.openRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="email">{locale === 'ar' ? 'بريد إلكتروني' : 'Email'}</option>
                <option value="sms">{locale === 'ar' ? 'رسالة قصيرة' : 'SMS'}</option>
                <option value="push">{locale === 'ar' ? 'إشعار' : 'Push'}</option>
                <option value="system">{locale === 'ar' ? 'نظام' : 'System'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="delivered">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
                <option value="opened">{locale === 'ar' ? 'تم الفتح' : 'Opened'}</option>
                <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="failed">{locale === 'ar' ? 'فشل' : 'Failed'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'من تاريخ' : 'From Date'}</label>
              <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
              <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الموضوع' : 'Subject'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستلم' : 'Recipient'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'وقت الإرسال' : 'Sent At'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.type)}
                        {getTypeBadge(log.type)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? log.subjectAr : log.subject}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{log.recipient}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{locale === 'ar' ? log.categoryAr : log.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{log.sentAt}</td>
                    <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-3">
                      {log.status === 'failed' && (
                        <Button size="sm" variant="secondary" onClick={() => handleResend(log)}>
                          {locale === 'ar' ? 'إعادة إرسال' : 'Resend'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
