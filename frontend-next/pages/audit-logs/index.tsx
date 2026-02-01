import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  ClipboardDocumentListIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: number;
  details?: any;
  ip_address?: string;
  created_at: string;
}

type FilterType = 'all' | 'user' | 'shipment' | 'expense' | 'warehouse' | 'supplier';

function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!hasPermission('audit_logs:view' as any)) {
      router.push('/dashboard');
      return;
    }

    fetchLogs();
  }, [currentPage, filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (filter !== 'all') {
        params.append('resource_type', filter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const res = await fetch(`http://localhost:4000/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
      } else if (res.status === 403) {
        showToast('Access denied', 'error');
        router.push('/dashboard');
      }
    } catch (error) {
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      login: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      logout: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[action.toLowerCase()] || colors.update;
  };

  if (!hasPermission('audit_logs:view' as any)) {
    return null;
  }

  return (
    <MainLayout>
      <Head>
        <title>Audit Logs - SLMS</title>
      </Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track all system activities and changes
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">Filter by:</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {(['all', 'user', 'shipment', 'expense', 'warehouse', 'supplier'] as FilterType[]).map(
                  (filterType) => (
                    <button
                      key={filterType}
                      onClick={() => {
                        setFilter(filterType);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === filterType
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by user email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input flex-1"
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {log.user_email}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {log.resource_type}
                        {log.resource_id && ` #${log.resource_id}`}
                      </span>
                    </div>

                    {log.details && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {typeof log.details === 'string'
                          ? log.details
                          : JSON.stringify(log.details, null, 2)}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                      {log.ip_address && (
                        <div className="flex items-center gap-1">
                          <span>IP: {log.ip_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {!loading && logs.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
                <ChevronRightIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.System.AuditLogs.View, AuditLogsPage);
