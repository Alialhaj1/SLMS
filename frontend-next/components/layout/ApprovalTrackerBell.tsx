/**
 * 📋 ApprovalTrackerBell — Header icon for approval request tracking & notifications
 *
 * Features:
 * - Badge showing pending approval count
 * - Dropdown with latest approval actions (new, approved, rejected etc.)
 * - Each item shows reference number + status + time
 * - Quick-track: click any item to open its tracker page
 * - Search by reference number
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocale } from '../../contexts/LocaleContext';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import {
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline';
import { ClipboardDocumentCheckIcon as ClipboardSolidIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface TrackerItem {
  id: number;
  document_type: string;
  document_number: string;
  title: string;
  status: string;
  priority: string;
  current_step_label: string;
  created_at: string;
  updated_at: string;
  amount?: number;
  currency?: string;
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircleIcon; label_en: string; label_ar: string }> = {
  draft:            { color: 'gray',   icon: DocumentTextIcon,       label_en: 'Draft',            label_ar: 'مسودة' },
  pending_review:   { color: 'amber',  icon: ClockIcon,              label_en: 'Pending Review',   label_ar: 'بانتظار المراجعة' },
  under_review:     { color: 'blue',   icon: EyeIcon,                label_en: 'Under Review',     label_ar: 'قيد المراجعة' },
  pending_approval: { color: 'orange', icon: ExclamationTriangleIcon, label_en: 'Pending Approval', label_ar: 'بانتظار الاعتماد' },
  approved:         { color: 'green',  icon: CheckCircleIcon,        label_en: 'Approved',         label_ar: 'معتمد' },
  pending_post:     { color: 'indigo', icon: DocumentTextIcon,       label_en: 'Pending Post',     label_ar: 'بانتظار الترحيل' },
  posted:           { color: 'teal',   icon: CheckCircleIcon,        label_en: 'Posted',           label_ar: 'مرحّل' },
  rejected:         { color: 'red',    icon: XCircleIcon,            label_en: 'Rejected',         label_ar: 'مرفوض' },
  voided:           { color: 'rose',   icon: XCircleIcon,            label_en: 'Voided',           label_ar: 'ملغي' },
  cancelled:        { color: 'slate',  icon: XCircleIcon,            label_en: 'Cancelled',        label_ar: 'ملغى' },
};

const docTypeIcons: Record<string, { icon: typeof DocumentTextIcon; label_en: string; label_ar: string }> = {
  journal_entry:   { icon: DocumentTextIcon, label_en: 'Journal',  label_ar: 'قيد' },
  payment_voucher: { icon: BanknotesIcon,    label_en: 'Payment',  label_ar: 'صرف' },
  receipt_voucher: { icon: BanknotesIcon,    label_en: 'Receipt',  label_ar: 'قبض' },
};

export default function ApprovalTrackerBell() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canViewApprovals = permissions.includes('*:*') || permissions.includes('*.*') || permissions.includes('approval_documents:view');

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !canViewApprovals) return;
    try {
      setLoading(true);
      const [inboxRes, myDocsRes] = await Promise.all([
        apiClient.get('/api/approval-documents/inbox-count').catch(() => ({ count: 0 })),
        apiClient.get('/api/approval-documents/my-documents?limit=8').catch(() => ({ data: [] })),
      ]);
      setInboxCount(inboxRes.count || 0);
      setItems(myDocsRes.data || []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, canViewApprovals]);

  // Initial fetch + poll every 60s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  if (!isAuthenticated || !canViewApprovals) {
    return null;
  }

  const handleItemClick = (item: TrackerItem) => {
    setIsOpen(false);
    router.push(`/approvals/tracker/${item.id}`);
  };

  const filteredItems = search.trim()
    ? items.filter(item =>
        item.document_number?.toLowerCase().includes(search.toLowerCase()) ||
        item.title?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (mins < 60) return locale === 'ar' ? `${mins} د` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return locale === 'ar' ? `${hours} س` : `${hours}h`;
    const days = Math.floor(hours / 24);
    return locale === 'ar' ? `${days} ي` : `${days}d`;
  };

  const getStatusInfo = (status: string) => statusConfig[status] || statusConfig.draft;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Tracker Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'relative p-2 rounded-lg transition-all duration-200 active:scale-95',
          isOpen
            ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
        aria-label={locale === 'ar' ? 'تتبع الطلبات' : 'Track Requests'}
        title={locale === 'ar' ? 'تتبع الطلبات' : 'Track Requests'}
      >
        {inboxCount > 0 ? (
          <ClipboardSolidIcon className="w-6 h-6" />
        ) : (
          <ClipboardDocumentCheckIcon className="w-6 h-6" />
        )}

        {/* Badge */}
        {inboxCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-violet-600 rounded-full border-2 border-white dark:border-gray-800 animate-pulse">
            {inboxCount > 99 ? '99+' : inboxCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute end-0 mt-2 w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col animate-scale-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-violet-600" />
                {locale === 'ar' ? 'تتبع الطلبات' : 'Request Tracker'}
              </h3>
              {inboxCount > 0 && (
                <span className="px-2.5 py-1 text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                  {inboxCount} {locale === 'ar' ? 'بانتظارك' : 'pending'}
                </span>
              )}
            </div>

            {/* Search by reference */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'ar' ? 'بحث بالرقم المرجعي...' : 'Search by reference #...'}
                className="w-full ps-9 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="overflow-y-auto flex-1">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
                <p className="mt-2 text-sm text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <InboxStackIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {search
                    ? (locale === 'ar' ? 'لا توجد نتائج' : 'No results found')
                    : (locale === 'ar' ? 'لا توجد طلبات' : 'No requests yet')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const statusInfo = getStatusInfo(item.status);
                  const StatusIcon = statusInfo.icon;
                  const docInfo = docTypeIcons[item.document_type] || { icon: DocumentTextIcon, label_en: item.document_type, label_ar: item.document_type };
                  const isActive = ['pending_review', 'under_review', 'pending_approval', 'pending_post'].includes(item.status);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={clsx(
                        'px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 relative',
                        isActive && 'bg-violet-50/30 dark:bg-violet-900/10'
                      )}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute start-0 top-0 bottom-0 w-1 bg-violet-500 rounded-e" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className={clsx(
                          'p-2 rounded-lg flex-shrink-0 mt-0.5',
                          `bg-${statusInfo.color}-100 dark:bg-${statusInfo.color}-900/30`
                        )}>
                          <StatusIcon className={clsx('h-4 w-4', `text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400`)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {item.document_number ||  `#${item.id}`}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatTimeAgo(item.updated_at || item.created_at)}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                            {item.title || (locale === 'ar' ? docInfo.label_ar : docInfo.label_en)}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                              `bg-${statusInfo.color}-100 text-${statusInfo.color}-700`,
                              `dark:bg-${statusInfo.color}-900/30 dark:text-${statusInfo.color}-300`
                            )}>
                              {locale === 'ar' ? statusInfo.label_ar : statusInfo.label_en}
                            </span>
                            {item.current_step_label && (
                              <span className="text-xs text-gray-400">
                                → {item.current_step_label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Link
              href="/approvals/inbox"
              className="flex-1 text-center py-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20"
              onClick={() => setIsOpen(false)}
            >
              <InboxStackIcon className="inline-block w-4 h-4 me-1" />
              {locale === 'ar' ? 'صندوق الاعتمادات' : 'Approval Inbox'}
            </Link>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <Link
              href="/approvals/monitor"
              className="flex-1 text-center py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => setIsOpen(false)}
            >
              {locale === 'ar' ? 'مراقبة الاعتمادات' : 'Monitor'}
              <ArrowRightIcon className="inline-block w-4 h-4 ms-1" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
