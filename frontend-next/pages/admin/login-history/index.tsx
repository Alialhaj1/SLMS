/**
 * Login History Page (Admin)
 * Phase 4B Feature 4: Complete authentication audit trail
 * Route: /admin/login-history
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import LoginHistoryTable from '../../../components/admin/LoginHistoryTable';
import LoginStatsCards from '../../../components/admin/LoginStatsCards';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { hasPermission } from '../../../utils/permissionHelpers';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../contexts/ToastContext';

interface LoginHistoryEntry {
  id: number;
  user_id: number;
  username?: string;
  email?: string;
  activity_type: 'login_success' | 'login_failed' | 'logout' | 'token_refresh';
  ip_address: string | null;
  user_agent: string | null;
  failed_reason: string | null;
  security_flags: any;
  created_at: string;
}

function LoginHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const rawUserId = router.query.user_id;
  const selectedUserId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : undefined;
  const hasSelectedUser = Number.isFinite(selectedUserId);

  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalToday: 0,
    failedToday: 0,
    lockedToday: 0,
    uniqueIPs: 0,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 50;

  // Permission check (direct)
  const canView = hasPermission('users:view', user?.roles, user?.permissions);

  useEffect(() => {
    if (!router.isReady) return;
    if (authLoading) return;
    
    if (!canView) {
      showToast('You do not have permission to view login history', 'error');
      router.push('/dashboard');
      return;
    }

    fetchHistory();
    fetchStats();
  }, [router.isReady, authLoading, canView, activityFilter, page, rawUserId]);

  useEffect(() => {
    if (!router.isReady) return;
    // When switching between global vs per-user view, reset pagination.
    setPage(1);
  }, [router.isReady, rawUserId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });

      if (activityFilter !== 'all') {
        params.append('activity_type', activityFilter);
      }

      const endpoint = hasSelectedUser
        ? `/api/users/${selectedUserId}/login-history?${params.toString()}`
        : `/api/users/all/login-history?${params.toString()}`;

      const response = await apiClient.get<any>(endpoint);

      if (response?.success) {
        const rows: LoginHistoryEntry[] = response.data || response.history || [];
        setHistory(rows);
        setTotalRecords(response.pagination?.total || 0);
      } else {
        setHistory([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      console.error('Error fetching login history:', error);
      showToast('Failed to load login history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);

      // Calculate today's stats from history
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endpoint = hasSelectedUser
        ? `/api/users/${selectedUserId}/login-history?limit=1000`
        : '/api/users/all/login-history?limit=1000';

      const response = await apiClient.get<any>(endpoint);

      if (response?.success) {
        const allHistory: LoginHistoryEntry[] = response.data || response.history || [];
        const todayHistory = allHistory.filter((entry: LoginHistoryEntry) => {
          const entryDate = new Date(entry.created_at);
          return entryDate >= today;
        });

        const uniqueIPs = new Set(
          todayHistory
            .filter((entry: LoginHistoryEntry) => entry.ip_address)
            .map((entry: LoginHistoryEntry) => entry.ip_address)
        );

        setStats({
          totalToday: todayHistory.length,
          failedToday: todayHistory.filter((e: LoginHistoryEntry) => e.activity_type === 'login_failed').length,
          lockedToday: todayHistory.filter((e: LoginHistoryEntry) => 
            e.failed_reason === 'account_locked'
          ).length,
          uniqueIPs: uniqueIPs.size,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const filteredHistory = searchTerm
    ? history.filter(
        (entry) =>
          entry.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.ip_address?.includes(searchTerm)
      )
    : history;

  const totalPages = Math.ceil(totalRecords / limit);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Complete authentication audit trail for security compliance
            </p>
          </div>
          <Button
            onClick={fetchHistory}
            variant="secondary"
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <LoginStatsCards stats={stats} loading={statsLoading} />

        {/* Filters */}
        <Card>
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by username, email, or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Activity Type Filter */}
              <select
                value={activityFilter}
                onChange={(e) => {
                  setActivityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Activities</option>
                <option value="login_success">Login Success</option>
                <option value="login_failed">Login Failed</option>
                <option value="logout">Logout</option>
                <option value="token_refresh">Token Refresh</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, totalRecords)} of {totalRecords} records
              </span>
              {activityFilter !== 'all' && (
                <button
                  onClick={() => {
                    setActivityFilter('all');
                    setSearchTerm('');
                    setPage(1);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* History Table */}
        <LoginHistoryTable history={filteredHistory} loading={loading} showUser={true} />

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <div className="p-4 flex items-center justify-between">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                variant="secondary"
              >
                Previous
              </Button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>

              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Users.View, LoginHistoryPage);
