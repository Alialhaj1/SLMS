/**
 * 🆘 Help Requests Management Page
 * =====================================================
 * 
 * صفحة إدارة طلبات المساعدة
 * للمديرين والسوبر أدمن فقط
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';

interface HelpRequest {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  company_id: number;
  company_name: string;
  type: 'access_request' | 'permission_request' | 'general_support';
  subject: string;
  message: string;
  requested_permission: string | null;
  requested_page: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  admin_response: string | null;
  resolved_by: number | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function HelpRequestsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  // Check permissions - Allow super_admin or users with help_requests:view permission
  useEffect(() => {
    // Skip permission check if loading
    if (!user) return;
    
    // Super admins always have access
    const isSuperAdmin = user?.roles?.includes('super_admin') || user?.roles?.includes('Admin');
    
    console.log('🔐 Permission Check:', {
      user: user?.email,
      roles: user?.roles,
      isSuperAdmin,
      hasHelpRequestsView: hasPermission('help_requests:view'),
      hasWildcard: hasPermission('*:*')
    });
    
    // Allow access if super admin OR has specific permission OR has wildcard
    const hasAccess = isSuperAdmin || hasPermission('help_requests:view') || hasPermission('*:*');
    
    if (!hasAccess) {
      console.warn('⛔ Access denied to help requests page');
      router.push('/403');
    }
  }, [hasPermission, router, user]);

  // Fetch help requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);

      const url = `http://localhost:4000/api/help-requests?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch help requests');
      }

      const data = await res.json();
      console.log('🔍 API Response:', data); // Debug log
      setRequests(data.data || data.requests || []);
    } catch (error) {
      console.error('Error fetching help requests:', error);
      showToast('Failed to load help requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterType]);

  // Update request status
  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected' | 'resolved') => {
    if (!selectedRequest) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/help-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          admin_response: adminResponse,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update request');
      }

      showToast(`Request ${newStatus} successfully`, 'success');
      setIsModalOpen(false);
      setAdminResponse('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      showToast('Failed to update request', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const openModal = (request: HelpRequest) => {
    setSelectedRequest(request);
    setAdminResponse(request.admin_response || '');
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Rejected' },
      resolved: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'Resolved' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const types = {
      access_request: 'Access Request',
      permission_request: 'Permission Request',
      general_support: 'General Support',
    };
    return types[type as keyof typeof types] || type;
  };

  if (loading) {
    return (
      <MainLayout>
        <Head><title>Help Requests | SLMS</title></Head>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Help Requests | SLMS</title>
      </Head>

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <QuestionMarkCircleIcon className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Help Requests
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage user help requests and access permission requests
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Types</option>
                <option value="access_request">Access Request</option>
                <option value="permission_request">Permission Request</option>
                <option value="general_support">General Support</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Requests Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {requests.length} request{requests.length !== 1 ? 's' : ''} found
          </p>
          <Button
            onClick={fetchRequests}
            variant="secondary"
            size="sm"
          >
            Refresh
          </Button>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <Card className="p-8 text-center">
            <QuestionMarkCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No help requests found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filterStatus !== 'all' || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'No users have submitted help requests yet'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.subject}
                      </h3>
                      {getStatusBadge(request.status)}
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {getTypeLabel(request.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-4 h-4" />
                        <span>{request.user_email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => openModal(request)}
                    variant="primary"
                    size="sm"
                  >
                    Review
                  </Button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-3">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {request.message}
                  </p>
                </div>

                {(request.requested_permission || request.requested_page) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {request.requested_permission && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Requested Permission: </span>
                        <code className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded">
                          {request.requested_permission}
                        </code>
                      </div>
                    )}
                    {request.requested_page && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Requested Page: </span>
                        <code className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded">
                          {request.requested_page}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {request.admin_response && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Admin Response:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {request.admin_response}
                    </p>
                    {request.resolved_by_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Resolved by {request.resolved_by_name} on {new Date(request.resolved_at!).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !updating && setIsModalOpen(false)}
        title="Review Help Request"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Subject</h4>
              <p className="text-gray-700 dark:text-gray-300">{selectedRequest.subject}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Message</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedRequest.message}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">User Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Email: </span>
                  <span className="text-gray-900 dark:text-white">{selectedRequest.user_email}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Company: </span>
                  <span className="text-gray-900 dark:text-white">{selectedRequest.company_name}</span>
                </div>
              </div>
            </div>

            {(selectedRequest.requested_permission || selectedRequest.requested_page) && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Request Details</h4>
                {selectedRequest.requested_permission && (
                  <div className="mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Permission: </span>
                    <code className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-sm">
                      {selectedRequest.requested_permission}
                    </code>
                  </div>
                )}
                {selectedRequest.requested_page && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Page: </span>
                    <code className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-sm">
                      {selectedRequest.requested_page}
                    </code>
                  </div>
                )}
              </div>
            )}

            <div>
              <Input
                label="Admin Response"
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Enter your response or reason..."
                multiline
                rows={4}
              />
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleUpdateStatus('approved')}
                  variant="primary"
                  loading={updating}
                  className="flex-1"
                >
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('rejected')}
                  variant="danger"
                  loading={updating}
                  className="flex-1"
                >
                  <XCircleIcon className="w-5 h-5 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('resolved')}
                  variant="secondary"
                  loading={updating}
                  className="flex-1"
                >
                  <ClockIcon className="w-5 h-5 mr-2" />
                  Resolve
                </Button>
              </div>
            )}

            {selectedRequest.status !== 'pending' && (
              <div className="pt-4">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="secondary"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
