/**
 * 📜 DOCUMENT HISTORY VIEWER
 * ===========================
 * Inline timeline showing document lifecycle
 * 
 * Features:
 * ✅ Timeline with Created → Approved → Posted → Reversed
 * ✅ Who did what and when
 * ✅ Bilingual (EN/AR)
 * ✅ Collapsible panel
 * ✅ Change summaries
 */

import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  UserIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  DocumentPlusIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentCheckIcon,
  ArrowUturnLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useLocale } from '../../contexts/LocaleContext';

export interface HistoryEvent {
  id: number;
  action: string;
  action_label: string;
  action_label_ar: string;
  previous_status?: string;
  new_status?: string;
  reason?: string;
  reason_ar?: string;
  performed_by: number;
  performer_name: string;
  performer_email: string;
  performed_at: string;
  changes_summary?: string;
  changes_summary_ar?: string;
}

export interface DocumentHistoryProps {
  documentType: string;
  documentId: number;
  onClose?: () => void;
  isPanel?: boolean;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  created: DocumentPlusIcon,
  updated: PencilIcon,
  approved: CheckCircleIcon,
  rejected: XCircleIcon,
  posted: DocumentCheckIcon,
  reversed: ArrowUturnLeftIcon,
  cancelled: XMarkIcon,
  deleted: XMarkIcon,
  status_changed: PencilIcon,
  lines_updated: PencilIcon,
  attachment_added: DocumentPlusIcon,
  note_added: PencilIcon
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  updated: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  approved: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  posted: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  reversed: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  deleted: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
};

export const DocumentHistory: React.FC<DocumentHistoryProps> = ({
  documentType,
  documentId,
  onClose,
  isPanel = false
}) => {
  const { locale } = useLocale();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!isPanel);
  const [error, setError] = useState<string | null>(null);

  const isArabic = locale === 'ar';

  useEffect(() => {
    fetchHistory();
  }, [documentType, documentId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const docTypePath = documentType.replace(/_/g, '-') + 's';
      
      const response = await fetch(
        `http://localhost:4000/api/procurement/${docTypePath}/${documentId}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const result = await response.json();
      setHistory(result.data || []);
    } catch (err) {
      console.error('Error fetching document history:', err);
      setError(isArabic ? 'فشل في تحميل السجل' : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return isArabic ? 'الآن' : 'Just now';
    if (diffMins < 60) return isArabic ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return isArabic ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return isArabic ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    return formatDate(dateString);
  };

  // Panel view (collapsible)
  if (isPanel) {
    return (
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-900 dark:text-white">
              {isArabic ? 'سجل المستند' : 'Document History'}
            </span>
            <span className="text-sm text-gray-500">
              ({history.length} {isArabic ? 'حدث' : 'events'})
            </span>
          </div>
          {expanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expanded && (
          <div className="p-4">
            <HistoryTimeline 
              history={history} 
              loading={loading} 
              error={error} 
              isArabic={isArabic}
              formatDate={formatDate}
              formatRelativeTime={formatRelativeTime}
            />
          </div>
        )}
      </div>
    );
  }

  // Full view (modal-like)
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArabic ? 'سجل المستند' : 'Document History'}
            </h3>
            <p className="text-sm text-gray-500">
              {history.length} {isArabic ? 'حدث مسجل' : 'recorded events'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="p-6 max-h-96 overflow-y-auto">
        <HistoryTimeline 
          history={history} 
          loading={loading} 
          error={error} 
          isArabic={isArabic}
          formatDate={formatDate}
          formatRelativeTime={formatRelativeTime}
        />
      </div>
    </div>
  );
};

// Timeline component
interface HistoryTimelineProps {
  history: HistoryEvent[];
  loading: boolean;
  error: string | null;
  isArabic: boolean;
  formatDate: (date: string) => string;
  formatRelativeTime: (date: string) => string;
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({
  history,
  loading,
  error,
  isArabic,
  formatDate,
  formatRelativeTime
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
              <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <ClockIcon className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">
          {isArabic ? 'لا يوجد سجل متاح' : 'No history available'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className={`absolute ${isArabic ? 'right-5' : 'left-5'} top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700`}></div>

      {/* Events */}
      <div className="space-y-6">
        {history.map((event, index) => {
          const Icon = ACTION_ICONS[event.action] || PencilIcon;
          const colorClass = ACTION_COLORS[event.action] || ACTION_COLORS.updated;
          const isLast = index === history.length - 1;

          return (
            <div key={event.id} className={`relative flex gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
              {/* Icon */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className={`flex-1 ${isArabic ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {isArabic ? event.action_label_ar : event.action_label}
                  </span>
                  {event.previous_status && event.new_status && (
                    <span className="text-sm text-gray-500">
                      {event.previous_status} → {event.new_status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <UserIcon className="h-4 w-4" />
                  <span>{event.performer_name}</span>
                  <span className="text-gray-300 dark:text-slate-600">•</span>
                  <span title={formatDate(event.performed_at)}>
                    {formatRelativeTime(event.performed_at)}
                  </span>
                </div>

                {/* Reason (for rejections/reversals) */}
                {(event.reason || event.reason_ar) && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                    <span className="font-medium">{isArabic ? 'السبب:' : 'Reason:'}</span>{' '}
                    {isArabic ? event.reason_ar || event.reason : event.reason}
                  </div>
                )}

                {/* Changes summary */}
                {(event.changes_summary || event.changes_summary_ar) && (
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {isArabic ? event.changes_summary_ar || event.changes_summary : event.changes_summary}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentHistory;
