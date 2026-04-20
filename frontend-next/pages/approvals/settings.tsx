import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../lib/apiClient';

interface ApprovalRoute {
  id: number;
  name: string;
  document_type: string;
  min_amount: number;
  max_amount: number;
  branch_id?: number;
  branch_name?: string;
  is_active: boolean;
  auto_approve_below: number;
  sla_hours: number;
  created_at: string;
  steps?: RouteStep[];
}

interface RouteStep {
  id: number;
  step_number: number;
  label_en: string;
  label_ar: string;
  step_type: string;
  approval_type: string;
  role_id: number;
  role_name: string;
  can_delegate: boolean;
  sla_hours: number;
}

const docTypes = [
  'journal_entry', 'payment_voucher', 'receipt_voucher',
  'purchase_order', 'expense_request', 'bank_transfer',
];

export default function ApprovalSettings() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();

  const [routes, setRoutes] = useState<ApprovalRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<ApprovalRoute | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/approval-documents/routes/list');
      setRoutes(res.data || []);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const openDetail = async (routeId: number) => {
    try {
      const res = await apiClient.get(`/api/approval-documents/routes/${routeId}`);
      setSelectedRoute(res.data);
      setDetailOpen(true);
    } catch (err) {
      showToast({ message: 'Failed to load route detail', type: 'error' });
    }
  };

  if (!hasPermission('approval_routes:view')) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('common.noPermission') || 'No permission'}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              ⚙️ {t('approvals.routeSettings') || 'Approval Route Settings'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('approvals.routeSettingsDesc') || 'Configure approval routes, steps, and thresholds'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.push('/approvals/inbox')}>
            ← {t('approvals.backToInbox') || 'Back to Inbox'}
          </Button>
        </div>

        {/* Routes Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : routes.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-400 text-lg">
              {t('approvals.noRoutes') || 'No approval routes configured'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((route) => (
              <Card
                key={route.id}
                hoverable
                onClick={() => openDetail(route.id)}
                className="p-5 cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{route.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="info" size="sm">
                        {t(`approvals.docTypes.${route.document_type}`) || route.document_type.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant={route.is_active ? 'success' : 'secondary'} size="sm">
                        {route.is_active ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-2xl opacity-30">🔀</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="block font-medium text-gray-700 dark:text-gray-300">
                      {Number(route.min_amount).toLocaleString()} - {Number(route.max_amount).toLocaleString()}
                    </span>
                    {t('approvals.amountRange') || 'Amount Range'}
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700 dark:text-gray-300">
                      {route.auto_approve_below > 0 ? `< ${Number(route.auto_approve_below).toLocaleString()}` : '-'}
                    </span>
                    {t('approvals.autoApprove') || 'Auto Approve'}
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700 dark:text-gray-300">
                      {route.sla_hours}h
                    </span>
                    SLA
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Route Detail Modal */}
        <Modal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          title={selectedRoute?.name || 'Route Detail'}
          size="lg"
        >
          {selectedRoute && (
            <div className="space-y-6">
              {/* Route Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('approvals.type') || 'Document Type'}:</span>
                  <span className="ml-2 font-medium">
                    {t(`approvals.docTypes.${selectedRoute.document_type}`) || selectedRoute.document_type}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">SLA:</span>
                  <span className="ml-2 font-medium">{selectedRoute.sla_hours}h</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('approvals.amountRange') || 'Amount Range'}:</span>
                  <span className="ml-2 font-medium">
                    {Number(selectedRoute.min_amount).toLocaleString()} - {Number(selectedRoute.max_amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">{t('approvals.autoApprove') || 'Auto Approve Below'}:</span>
                  <span className="ml-2 font-medium">
                    {selectedRoute.auto_approve_below > 0 ? Number(selectedRoute.auto_approve_below).toLocaleString() : '-'}
                  </span>
                </div>
              </div>

              {/* Steps */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('approvals.steps') || 'Approval Steps'}
                </h4>
                <div className="space-y-3">
                  {selectedRoute.steps?.map((step, idx) => (
                    <div key={step.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{step.label_en}</div>
                        <div className="text-xs text-gray-400">{step.label_ar}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" size="sm">{step.step_type}</Badge>
                          <Badge variant="info" size="sm">{step.role_name}</Badge>
                          {step.can_delegate && <Badge variant="warning" size="sm">Can Delegate</Badge>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{step.sla_hours}h SLA</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
