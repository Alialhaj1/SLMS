import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocale } from '../../contexts/LocaleContext';
import { usePermissions } from '../../hooks/usePermissions';
import apiClient from '../../lib/apiClient';
import {
  DocumentCheckIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

/**
 * Approval statuses sourced from the approval_documents workflow engine.
 * This page shows current status distribution + master status reference.
 */

interface StatusSummary {
  status: string;
  count: number;
}

const statusMeta: Record<string, {
  icon: typeof CheckCircleIcon;
  color: string;
  bgGradient: string;
  label_en: string;
  label_ar: string;
  desc_en: string;
  desc_ar: string;
}> = {
  draft:            { icon: PencilSquareIcon,       color: 'gray',   bgGradient: 'from-gray-400 to-gray-500',    label_en: 'Draft',           label_ar: 'مسودة',            desc_en: 'Document saved but not yet submitted',          desc_ar: 'المستند محفوظ ولم يُرسل بعد' },
  pending_review:   { icon: ClockIcon,              color: 'amber',  bgGradient: 'from-amber-400 to-orange-500', label_en: 'Pending Review',  label_ar: 'بانتظار المراجعة', desc_en: 'Waiting for reviewer to check',                 desc_ar: 'بانتظار مراجعة المختص' },
  under_review:     { icon: EyeIcon,                color: 'blue',   bgGradient: 'from-blue-400 to-blue-500',    label_en: 'Under Review',    label_ar: 'قيد المراجعة',     desc_en: 'Reviewer has opened and is reviewing',          desc_ar: 'المراجع يقوم بمراجعة المستند' },
  pending_approval: { icon: ExclamationTriangleIcon, color: 'orange', bgGradient: 'from-orange-400 to-red-500',  label_en: 'Pending Approval', label_ar: 'بانتظار الاعتماد', desc_en: 'Needs final approval from authorized person', desc_ar: 'يحتاج اعتماد من المخوّل' },
  approved:         { icon: CheckCircleIcon,        color: 'green',  bgGradient: 'from-emerald-400 to-green-500', label_en: 'Approved',       label_ar: 'معتمد',            desc_en: 'All approvals completed',                       desc_ar: 'اكتملت جميع الاعتمادات' },
  pending_post:     { icon: DocumentTextIcon,       color: 'indigo', bgGradient: 'from-indigo-400 to-violet-500', label_en: 'Pending Post',   label_ar: 'بانتظار الترحيل',  desc_en: 'Approved and ready to post to ledger',          desc_ar: 'معتمد وجاهز للترحيل' },
  posted:           { icon: CheckCircleIcon,        color: 'teal',   bgGradient: 'from-teal-400 to-emerald-500', label_en: 'Posted',          label_ar: 'مرحّل',            desc_en: 'Posted to general ledger with accounting effect', desc_ar: 'تم الترحيل للدفاتر بأثر محاسبي' },
  rejected:         { icon: XCircleIcon,            color: 'red',    bgGradient: 'from-red-400 to-red-600',      label_en: 'Rejected',        label_ar: 'مرفوض',            desc_en: 'Rejected by reviewer or approver',              desc_ar: 'مرفوض من المراجع أو المعتمد' },
  voided:           { icon: NoSymbolIcon,           color: 'rose',   bgGradient: 'from-rose-400 to-rose-600',    label_en: 'Voided',          label_ar: 'ملغي',             desc_en: 'Posted document reversed',                      desc_ar: 'مستند مرحّل تم إلغاؤه' },
  cancelled:        { icon: NoSymbolIcon,           color: 'slate',  bgGradient: 'from-slate-400 to-slate-500',  label_en: 'Cancelled',       label_ar: 'ملغى',             desc_en: 'Document cancelled by creator',                 desc_ar: 'ألغي بواسطة المنشئ' },
};

const allStatuses = Object.keys(statusMeta);

export default function ContractApprovalStatusPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const [summary, setSummary] = useState<StatusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/approval-documents/monitor');
      // Extract status counts from monitor data
      const data = res.data || res;
      const counts: StatusSummary[] = [];

      // If monitor returns per-status counts, use them; otherwise count from items
      if (data.statusCounts) {
        Object.entries(data.statusCounts).forEach(([status, count]) => {
          counts.push({ status, count: count as number });
        });
      } else if (data.items) {
        const countMap: Record<string, number> = {};
        (data.items as any[]).forEach(item => {
          countMap[item.status] = (countMap[item.status] || 0) + 1;
        });
        Object.entries(countMap).forEach(([status, count]) => {
          counts.push({ status, count });
        });
      }
      setSummary(counts);
    } catch (err) {
      console.error('Failed to load status summary:', err);
      // Show all statuses with 0 count as fallback
      setSummary(allStatuses.map(s => ({ status: s, count: 0 })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const totalDocuments = summary.reduce((sum, s) => sum + s.count, 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'حالات الاعتماد - SLMS' : 'Approval Statuses - SLMS'}</title>
      </Head>

      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/25">
              <DocumentCheckIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'حالات الاعتماد' : 'Approval Statuses'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'مرجع جميع حالات دورة الاعتماد مع التوزيع الحالي'
                  : 'Reference of all approval workflow statuses with current distribution'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => router.push('/settings/approval-engine')}>
              {locale === 'ar' ? '⚙️ إعدادات المحرك' : '⚙️ Engine Settings'}
            </Button>
            <Button variant="secondary" onClick={fetchSummary}>
              <ArrowPathIcon className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Summary bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {locale === 'ar' ? 'التوزيع الحالي' : 'Current Distribution'}
            </span>
            <span className="text-sm text-gray-500">
              {locale === 'ar' ? `${totalDocuments} مستند` : `${totalDocuments} documents`}
            </span>
          </div>
          {totalDocuments > 0 ? (
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
              {summary.filter(s => s.count > 0).map((s) => {
                const meta = statusMeta[s.status];
                const pct = (s.count / totalDocuments) * 100;
                return (
                  <div
                    key={s.status}
                    className={clsx('bg-gradient-to-r', meta?.bgGradient || 'from-gray-400 to-gray-500', 'transition-all duration-700')}
                    style={{ width: `${pct}%` }}
                    title={`${locale === 'ar' ? meta?.label_ar : meta?.label_en}: ${s.count}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700" />
          )}
        </div>

        {/* Status Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <ArrowPathIcon className="h-10 w-10 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allStatuses.map((status) => {
              const meta = statusMeta[status];
              const StatusIcon = meta.icon;
              const summaryItem = summary.find(s => s.status === status);
              const count = summaryItem?.count || 0;

              return (
                <div
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={clsx(
                    'relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer transition-all duration-300',
                    'hover:shadow-lg hover:scale-[1.02]',
                    selectedStatus === status && 'ring-2 ring-blue-500'
                  )}
                >
                  {/* Decorative gradient strip */}
                  <div className={clsx('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', meta.bgGradient)} />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={clsx('p-2.5 rounded-xl bg-gradient-to-br', meta.bgGradient, 'shadow-md')}>
                        <StatusIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {locale === 'ar' ? meta.label_ar : meta.label_en}
                        </h3>
                        <code className="text-xs text-gray-400 font-mono">{status}</code>
                      </div>
                    </div>
                    <span className={clsx(
                      'text-2xl font-bold',
                      count > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'
                    )}>
                      {count}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {locale === 'ar' ? meta.desc_ar : meta.desc_en}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Status Detail Modal */}
        <Modal
          isOpen={!!selectedStatus}
          onClose={() => setSelectedStatus(null)}
          title={selectedStatus ? (locale === 'ar' ? statusMeta[selectedStatus]?.label_ar : statusMeta[selectedStatus]?.label_en) : ''}
          size="md"
        >
          {selectedStatus && (() => {
            const meta = statusMeta[selectedStatus];
            const StatusIcon = meta.icon;
            const count = summary.find(s => s.status === selectedStatus)?.count || 0;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={clsx('p-4 rounded-xl bg-gradient-to-br', meta.bgGradient, 'shadow-lg')}>
                    <StatusIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {locale === 'ar' ? meta.label_ar : meta.label_en}
                    </h3>
                    <code className="text-sm text-gray-400 font-mono">{selectedStatus}</code>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300">
                  {locale === 'ar' ? meta.desc_ar : meta.desc_en}
                </p>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'المستندات الحالية' : 'Current Documents'}
                    </span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{count}</span>
                  </div>
                </div>

                {count > 0 && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedStatus(null);
                      router.push(`/approvals/monitor?status=${selectedStatus}`);
                    }}
                  >
                    {locale === 'ar' ? 'عرض المستندات' : 'View Documents'} →
                  </Button>
                )}
              </div>
            );
          })()}
        </Modal>
      </div>
    </MainLayout>
  );
}
