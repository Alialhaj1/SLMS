import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  CubeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChartBarIcon,
  ServerIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface IntegrationLog {
  id: number;
  integrationName: string;
  integrationNameAr: string;
  type: 'api' | 'webhook' | 'file' | 'database';
  direction: 'inbound' | 'outbound';
  status: 'success' | 'failed' | 'pending' | 'partial';
  recordsProcessed: number;
  recordsFailed: number;
  startTime: string;
  endTime: string | null;
  duration: number;
  errorMessage: string | null;
}

const mockLogs: IntegrationLog[] = [
  { id: 1, integrationName: 'Customs API Sync', integrationNameAr: 'مزامنة API الجمارك', type: 'api', direction: 'inbound', status: 'success', recordsProcessed: 156, recordsFailed: 0, startTime: '2024-01-28 10:00:00', endTime: '2024-01-28 10:05:32', duration: 332, errorMessage: null },
  { id: 2, integrationName: 'Bank Statement Import', integrationNameAr: 'استيراد كشف البنك', type: 'file', direction: 'inbound', status: 'success', recordsProcessed: 89, recordsFailed: 2, startTime: '2024-01-28 09:30:00', endTime: '2024-01-28 09:31:45', duration: 105, errorMessage: null },
  { id: 3, integrationName: 'Shipping Carrier Webhook', integrationNameAr: 'ويب هوك شركة الشحن', type: 'webhook', direction: 'inbound', status: 'pending', recordsProcessed: 0, recordsFailed: 0, startTime: '2024-01-28 10:10:00', endTime: null, duration: 0, errorMessage: null },
  { id: 4, integrationName: 'ERP Data Export', integrationNameAr: 'تصدير بيانات ERP', type: 'database', direction: 'outbound', status: 'failed', recordsProcessed: 45, recordsFailed: 12, startTime: '2024-01-28 08:00:00', endTime: '2024-01-28 08:02:15', duration: 135, errorMessage: 'Connection timeout after 30s' },
  { id: 5, integrationName: 'Payment Gateway Sync', integrationNameAr: 'مزامنة بوابة الدفع', type: 'api', direction: 'outbound', status: 'partial', recordsProcessed: 78, recordsFailed: 5, startTime: '2024-01-28 07:30:00', endTime: '2024-01-28 07:35:00', duration: 300, errorMessage: '5 transactions pending' },
  { id: 6, integrationName: 'Inventory Sync', integrationNameAr: 'مزامنة المخزون', type: 'api', direction: 'inbound', status: 'success', recordsProcessed: 234, recordsFailed: 0, startTime: '2024-01-27 23:00:00', endTime: '2024-01-27 23:08:45', duration: 525, errorMessage: null },
];

const integrationStats = {
  totalSyncs: 1256,
  successRate: 94.5,
  failedToday: 3,
  pendingNow: 2,
};

export default function IntegrationsReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [logs] = useState<IntegrationLog[]>(mockLogs);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredLogs = logs.filter(log => {
    const matchesType = selectedType === 'all' || log.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    return matchesType && matchesStatus;
  });

  const handleRetry = async (log: IntegrationLog) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    showToast(locale === 'ar' ? 'تم إعادة التشغيل' : 'Retry initiated', 'success');
  };

  const handleExport = () => {
    showToast(locale === 'ar' ? 'جاري التصدير...' : 'Exporting...', 'info');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'partial': return <ExclamationCircleIcon className="h-5 w-5 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      success: { en: 'Success', ar: 'نجاح' },
      failed: { en: 'Failed', ar: 'فشل' },
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      partial: { en: 'Partial', ar: 'جزئي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      api: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      webhook: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      file: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      database: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full uppercase', styles[type])}>
        {type}
      </span>
    );
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير التكاملات - SLMS' : 'Integrations Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <CubeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تقارير التكاملات' : 'Integrations Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'سجلات API والمزامنة' : 'API and sync logs'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <CloudIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي المزامنات' : 'Total Syncs'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{integrationStats.totalSyncs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'معدل النجاح' : 'Success Rate'}</p>
                <p className="text-xl font-semibold text-green-600">{integrationStats.successRate}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600">
                <XCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'فشل اليوم' : 'Failed Today'}</p>
                <p className="text-xl font-semibold text-red-600">{integrationStats.failedToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد التشغيل' : 'Pending Now'}</p>
                <p className="text-xl font-semibold text-yellow-600">{integrationStats.pendingNow}</p>
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
                <option value="api">API</option>
                <option value="webhook">Webhook</option>
                <option value="file">{locale === 'ar' ? 'ملف' : 'File'}</option>
                <option value="database">{locale === 'ar' ? 'قاعدة بيانات' : 'Database'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="success">{locale === 'ar' ? 'نجاح' : 'Success'}</option>
                <option value="failed">{locale === 'ar' ? 'فشل' : 'Failed'}</option>
                <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="partial">{locale === 'ar' ? 'جزئي' : 'Partial'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التكامل' : 'Integration'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاتجاه' : 'Direction'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'السجلات' : 'Records'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المدة' : 'Duration'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? log.integrationNameAr : log.integrationName}</span>
                          <p className="text-xs text-gray-500">{log.startTime}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(log.type)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-sm', log.direction === 'inbound' ? 'text-green-600' : 'text-blue-600')}>
                        {log.direction === 'inbound' ? (locale === 'ar' ? '← وارد' : '← Inbound') : (locale === 'ar' ? '→ صادر' : '→ Outbound')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-white">{log.recordsProcessed}</span>
                      {log.recordsFailed > 0 && <span className="text-red-500 text-sm ml-1">(-{log.recordsFailed})</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.duration > 0 ? formatDuration(log.duration) : '-'}</td>
                    <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedLog(log)}><EyeIcon className="h-4 w-4" /></Button>
                        {(log.status === 'failed' || log.status === 'partial') && (
                          <Button size="sm" variant="secondary" onClick={() => handleRetry(log)} loading={loading}><ArrowPathIcon className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title={locale === 'ar' ? 'تفاصيل السجل' : 'Log Details'} size="lg">
        {selectedLog && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedLog.status)}
                <h3 className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedLog.integrationNameAr : selectedLog.integrationName}</h3>
              </div>
              {getStatusBadge(selectedLog.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="font-medium mt-1">{getTypeBadge(selectedLog.type)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الاتجاه' : 'Direction'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedLog.direction === 'inbound' ? (locale === 'ar' ? 'وارد' : 'Inbound') : (locale === 'ar' ? 'صادر' : 'Outbound')}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'السجلات المعالجة' : 'Records Processed'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedLog.recordsProcessed}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'السجلات الفاشلة' : 'Records Failed'}</p>
                <p className="font-medium text-red-600">{selectedLog.recordsFailed}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'وقت البدء' : 'Start Time'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedLog.startTime}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المدة' : 'Duration'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedLog.duration > 0 ? formatDuration(selectedLog.duration) : '-'}</p>
              </div>
            </div>
            {selectedLog.errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">{locale === 'ar' ? 'رسالة الخطأ' : 'Error Message'}</p>
                <p className="text-sm text-red-800 dark:text-red-300">{selectedLog.errorMessage}</p>
              </div>
            )}
            {(selectedLog.status === 'failed' || selectedLog.status === 'partial') && (
              <div className="pt-4 border-t dark:border-gray-700">
                <Button onClick={() => handleRetry(selectedLog)} loading={loading}>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
