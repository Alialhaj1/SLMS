import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CircleStackIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface BackupStats {
  backups_last_24h: number;
  failed_last_7d: number;
  last_full_backup: string | null;
  last_master_backup: string | null;
  total_backup_size: number;
  critical_tables_count: number;
  active_schedules: number;
}

interface BackupHistory {
  id: number;
  backup_type: string;
  file_name: string;
  file_size: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  trigger_type: string;
  triggered_by_email?: string;
  error_message?: string;
}

interface BackupSchedule {
  id: number;
  name: string;
  name_ar: string;
  backup_type: string;
  cron_expression: string;
  retention_days: number;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface TableInfo {
  table_name: string;
  protection_level: string;
  description_ar: string;
  row_count: number;
  count?: number;
}

export default function BackupCenterPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [recentBackups, setRecentBackups] = useState<BackupHistory[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, TableInfo>>({});
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [backupType, setBackupType] = useState<'full' | 'master_data' | 'custom'>('full');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/admin/backup/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch backup dashboard');
      }

      const data = await res.json();
      setStats(data.stats);
      setRecentBackups(data.recentBackups || []);
      setSchedules(data.schedules || []);
      setTableCounts(data.tableCounts || {});
    } catch (error) {
      console.error('Error fetching backup dashboard:', error);
      showToast(locale === 'ar' ? 'فشل في تحميل البيانات' : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [locale, showToast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  // Fetch dashboard data when authenticated
  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user, fetchDashboard]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const token = localStorage.getItem('accessToken');
      
      const body: any = { type: backupType };
      if (backupType === 'custom' && selectedTables.length > 0) {
        body.tables = selectedTables;
      }

      const res = await fetch('http://localhost:4000/api/admin/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error('Failed to create backup');
      }

      showToast(locale === 'ar' ? 'تم بدء النسخ الاحتياطي' : 'Backup started', 'success');
      setCreateModalOpen(false);
      fetchDashboard();
    } catch (error) {
      console.error('Error creating backup:', error);
      showToast(locale === 'ar' ? 'فشل في إنشاء النسخة الاحتياطية' : 'Failed to create backup', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/admin/backup/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading backup:', error);
      showToast(locale === 'ar' ? 'فشل في تنزيل النسخة' : 'Failed to download backup', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      setDeleting(true);
      const token = localStorage.getItem('accessToken');
      
      const res = await fetch(`http://localhost:4000/api/admin/backup/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to delete backup');
      }

      showToast(locale === 'ar' ? 'تم حذف النسخة الاحتياطية' : 'Backup deleted', 'success');
      fetchDashboard();
    } catch (error) {
      console.error('Error deleting backup:', error);
      showToast(locale === 'ar' ? 'فشل في حذف النسخة' : 'Failed to delete backup', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    
    try {
      setRestoring(true);
      const token = localStorage.getItem('accessToken');
      
      const res = await fetch(`http://localhost:4000/api/admin/backup/restore/${restoreId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ confirm: 'RESTORE_CONFIRMED' })
      });

      if (!res.ok) {
        throw new Error('Failed to restore backup');
      }

      showToast(locale === 'ar' ? 'تم بدء الاسترجاع' : 'Restore started', 'success');
      fetchDashboard();
    } catch (error) {
      console.error('Error restoring backup:', error);
      showToast(locale === 'ar' ? 'فشل في الاسترجاع' : 'Failed to restore', 'error');
    } finally {
      setRestoring(false);
      setRestoreConfirmOpen(false);
      setRestoreId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    const labels: Record<string, { ar: string; en: string }> = {
      completed: { ar: 'مكتمل', en: 'Completed' },
      running: { ar: 'جاري', en: 'Running' },
      pending: { ar: 'معلق', en: 'Pending' },
      failed: { ar: 'فشل', en: 'Failed' }
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      full: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      master_data: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      custom: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    const labels: Record<string, { ar: string; en: string }> = {
      full: { ar: 'كامل', en: 'Full' },
      master_data: { ar: 'بيانات رئيسية', en: 'Master Data' },
      custom: { ar: 'مخصص', en: 'Custom' }
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || styles.custom}`}>
        {labels[type]?.[locale === 'ar' ? 'ar' : 'en'] || type}
      </span>
    );
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'مركز النسخ الاحتياطي' : 'Backup Center'} - SLMS</title>
        </Head>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  // If not authenticated, don't render (redirect will happen)
  if (!user) {
    return null;
  }

  if (!hasPermission('backup:view')) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'مركز النسخ الاحتياطي' : 'Backup Center'} - SLMS</title>
        </Head>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <ShieldCheckIcon className="h-16 w-16 mx-auto text-gray-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'ليس لديك صلاحية للوصول لهذه الصفحة' : 'You do not have permission to access this page'}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مركز النسخ الاحتياطي' : 'Backup Center'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'مركز النسخ الاحتياطي' : 'Backup Center'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'إدارة النسخ الاحتياطي والاسترجاع' : 'Manage backups and restore operations'}
            </p>
          </div>
          
          {hasPermission('backup:create') && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <CircleStackIcon className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
              {locale === 'ar' ? 'نسخ احتياطي جديد' : 'New Backup'}
            </Button>
          )}
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="ltr:ml-3 rtl:mr-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {locale === 'ar' ? 'تحذير مهم' : 'Important Warning'}
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                {locale === 'ar' 
                  ? 'هذه العمليات تؤثر على النظام بالكامل. تأكد من فهمك للعواقب قبل المتابعة.'
                  : 'These operations affect the entire system. Make sure you understand the consequences before proceeding.'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ltr:ml-4 rtl:mr-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'نسخ آخر 24 ساعة' : 'Backups (24h)'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.backups_last_24h}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ltr:ml-4 rtl:mr-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'فشل آخر 7 أيام' : 'Failed (7d)'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.failed_last_7d}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <ServerStackIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ltr:ml-4 rtl:mr-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'الحجم الكلي' : 'Total Size'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatBytes(stats.total_backup_size)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ltr:ml-4 rtl:mr-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'آخر نسخ كامل' : 'Last Full Backup'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.last_full_backup 
                      ? new Date(stats.last_full_backup).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')
                      : (locale === 'ar' ? 'لا يوجد' : 'None')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Recent Backups */}
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'النسخ الاحتياطية الأخيرة' : 'Recent Backups'}
              </h2>
              <Button variant="secondary" size="sm" onClick={fetchDashboard}>
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الملف' : 'File'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'النوع' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الحجم' : 'Size'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentBackups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'لا توجد نسخ احتياطية' : 'No backups found'}
                    </td>
                  </tr>
                ) : (
                  recentBackups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        {backup.file_name}
                      </td>
                      <td className="px-4 py-3">
                        {getTypeBadge(backup.backup_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {backup.file_size ? formatBytes(backup.file_size) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(backup.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(backup.started_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {backup.status === 'completed' && (
                            <>
                              <button
                                onClick={() => handleDownload(backup.id, backup.file_name)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                title={locale === 'ar' ? 'تنزيل' : 'Download'}
                              >
                                <ArrowDownTrayIcon className="h-5 w-5" />
                              </button>
                              {hasPermission('backup:restore') && (
                                <button
                                  onClick={() => {
                                    setRestoreId(backup.id);
                                    setRestoreConfirmOpen(true);
                                  }}
                                  className="text-green-600 hover:text-green-800 dark:text-green-400"
                                  title={locale === 'ar' ? 'استرجاع' : 'Restore'}
                                >
                                  <PlayIcon className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          )}
                          {hasPermission('backup:delete') && (
                            <button
                              onClick={() => {
                                setDeleteId(backup.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Protected Tables */}
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'الجداول المحمية' : 'Protected Tables'}
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(tableCounts).map(([name, info]) => (
                <div 
                  key={name}
                  className={`p-3 rounded-lg border ${
                    info.protection_level === 'critical'
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {info.description_ar || name}
                    </span>
                    {info.protection_level === 'critical' && (
                      <ShieldCheckIcon className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                    {name}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {info.count?.toLocaleString() || 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Schedules */}
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'جدول النسخ الاحتياطي التلقائي' : 'Automated Backup Schedules'}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'النوع' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الجدولة' : 'Schedule'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الاحتفاظ' : 'Retention'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {locale === 'ar' ? schedule.name_ar : schedule.name}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(schedule.backup_type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {schedule.cron_expression}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {schedule.retention_days} {locale === 'ar' ? 'يوم' : 'days'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        schedule.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {schedule.is_active 
                          ? (locale === 'ar' ? 'نشط' : 'Active')
                          : (locale === 'ar' ? 'متوقف' : 'Inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create Backup Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={locale === 'ar' ? 'إنشاء نسخة احتياطية جديدة' : 'Create New Backup'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {locale === 'ar' ? 'نوع النسخ الاحتياطي' : 'Backup Type'}
            </label>
            <div className="space-y-2">
              {[
                { value: 'full', label: locale === 'ar' ? 'كامل (جميع البيانات)' : 'Full (All Data)', icon: ServerStackIcon },
                { value: 'master_data', label: locale === 'ar' ? 'البيانات الرئيسية فقط' : 'Master Data Only', icon: CircleStackIcon },
                { value: 'custom', label: locale === 'ar' ? 'مخصص (اختر الجداول)' : 'Custom (Select Tables)', icon: DocumentArrowDownIcon }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    backupType === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="backupType"
                    value={option.value}
                    checked={backupType === option.value}
                    onChange={(e) => setBackupType(e.target.value as any)}
                    className="sr-only"
                  />
                  <option.icon className="h-5 w-5 text-gray-500 dark:text-gray-400 ltr:mr-3 rtl:ml-3" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateBackup} loading={creating}>
              {locale === 'ar' ? 'بدء النسخ الاحتياطي' : 'Start Backup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteId(null);
        }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف النسخة الاحتياطية' : 'Delete Backup'}
        message={locale === 'ar' 
          ? 'هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لا يمكن التراجع عن هذا الإجراء.'
          : 'Are you sure you want to delete this backup? This action cannot be undone.'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />

      {/* Restore Confirmation */}
      <ConfirmDialog
        isOpen={restoreConfirmOpen}
        onClose={() => {
          setRestoreConfirmOpen(false);
          setRestoreId(null);
        }}
        onConfirm={handleRestore}
        title={locale === 'ar' ? 'استرجاع النسخة الاحتياطية' : 'Restore Backup'}
        message={locale === 'ar' 
          ? '⚠️ تحذير: سيؤدي هذا إلى استبدال البيانات الحالية. هل أنت متأكد؟'
          : '⚠️ Warning: This will replace current data. Are you sure?'}
        confirmText={locale === 'ar' ? 'استرجاع' : 'Restore'}
        variant="danger"
        loading={restoring}
      />
    </MainLayout>
  );
}
