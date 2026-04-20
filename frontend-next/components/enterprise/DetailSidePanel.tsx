/**
 * 📋 DETAIL SIDE PANEL
 * =====================
 * Slide-over panel from the right side showing record details,
 * related records, and audit trail timeline.
 */

import React, { useEffect, useRef } from 'react';
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  LinkIcon,
  ChevronRightIcon,
  UserCircleIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import type { AuditEntry, StatusType } from '../../lib/governance/types';
import { STATUS_COLORS } from '../../lib/governance/types';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface DetailSection {
  title: string;
  fields: Array<{
    label: string;
    value: any;
    type?: string; // 'text' | 'date' | 'datetime' | 'boolean' | 'status' | 'currency' | 'link'
  }>;
}

interface RelatedRecord {
  type: string;
  label: string;
  count: number;
  href?: string;
}

interface DetailSidePanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Record title (name/code) */
  title: string;
  /** Record subtitle (e.g. Arabic name or description) */
  subtitle?: string;
  /** Record status */
  status?: StatusType | string;
  /** Detail sections with field-value pairs */
  sections: DetailSection[];
  /** Related records with counts and links */
  relations?: RelatedRecord[];
  /** Audit trail entries */
  auditEntries?: AuditEntry[];
  /** Whether audit data is loading */
  loading?: boolean;
  /** Edit callback (undefined = no edit permission) */
  onEdit?: () => void;
  /** Delete callback (undefined = no delete permission) */
  onDelete?: () => void;
  /** Callback when a relation is clicked — return true to prevent default navigation */
  onRelationClick?: (rel: RelatedRecord) => boolean;
  /** Permission prefix for RBAC checks */
  permissionPrefix: string;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <PlusCircleIcon className="w-4 h-4 text-green-500" />,
  update: <ArrowPathIcon className="w-4 h-4 text-blue-500" />,
  delete: <MinusCircleIcon className="w-4 h-4 text-red-500" />,
  view: <EyeIcon className="w-4 h-4 text-gray-500" />,
  export: <ArrowDownTrayIcon className="w-4 h-4 text-purple-500" />,
  restore: <ArrowPathIcon className="w-4 h-4 text-green-500" />,
};

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

function formatFieldValue(value: any, type?: string): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 dark:text-gray-500 italic">—</span>;
  }
  switch (type) {
    case 'boolean':
      return value ? (
        <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
      ) : (
        <span className="text-gray-500 dark:text-gray-400">No</span>
      );
    case 'status': {
      const colors = STATUS_COLORS[value as StatusType] || STATUS_COLORS.active;
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
        </span>
      );
    }
    case 'date':
      try { return new Date(value).toLocaleDateString(); } catch { return String(value); }
    case 'datetime':
      return formatTimestamp(String(value));
    case 'currency':
      return typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : String(value);
    case 'link':
      return (
        <a href={String(value)} target="_blank" rel="noopener noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm break-all">
          {String(value)}
        </a>
      );
    default:
      return <span className="break-words">{String(value)}</span>;
  }
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function DetailSidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  status,
  sections,
  relations = [],
  auditEntries = [],
  loading = false,
  onEdit,
  onDelete,
  onRelationClick,
  permissionPrefix,
}: DetailSidePanelProps) {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  const canEdit = onEdit && hasPermission(`${permissionPrefix}:update`);
  const canDelete = onDelete && hasPermission(`${permissionPrefix}:delete`);

  // Trap focus and close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statusColors = STATUS_COLORS[(status as StatusType)] || STATUS_COLORS.active;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900
          shadow-2xl border-l border-gray-200 dark:border-slate-700
          transform transition-transform duration-300 ease-out
          flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
            {status && (
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                  {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200
              dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700
              transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('common.close') || 'Close'}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Action buttons */}
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                    bg-primary-600 text-white hover:bg-primary-700
                    dark:bg-primary-500 dark:hover:bg-primary-600
                    transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                    dark:focus:ring-offset-slate-900"
                >
                  <PencilIcon className="w-4 h-4" />
                  {t('common.edit') || 'Edit'}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                    text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20
                    hover:bg-red-100 dark:hover:bg-red-900/40
                    transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                    dark:focus:ring-offset-slate-900"
                >
                  <TrashIcon className="w-4 h-4" />
                  {t('common.delete') || 'Delete'}
                </button>
              )}
            </div>
          )}

          {/* Detail sections */}
          {sections.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
                {section.fields.map((field, fi) => (
                  <div key={fi} className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {field.label}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 text-right">
                      {formatFieldValue(field.value, field.type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Related records */}
          {relations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                {t('common.relatedRecords') || 'Related Records'}
              </h3>
              <div className="space-y-2">
                {relations.map((rel, ri) => (
                  <div
                    key={ri}
                    className={`flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 ${
                      (rel.href || onRelationClick) ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors' : ''
                    }`}
                    onClick={() => {
                      if (onRelationClick && onRelationClick(rel)) return;
                      if (rel.href) window.open(rel.href, '_self');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {rel.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                        {rel.count}
                      </span>
                      {rel.href && <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit trail timeline */}
          {(auditEntries.length > 0 || loading) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                {t('common.auditTrail') || 'Audit Trail'}
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-3 bottom-3 w-px bg-gray-200 dark:bg-slate-700" />

                  <div className="space-y-4">
                    {auditEntries.map((entry, ei) => (
                      <div key={entry.id || ei} className="relative flex gap-3 pl-0">
                        {/* Icon dot */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 flex items-center justify-center z-10">
                          {ACTION_ICONS[entry.action] || <ClockIcon className="w-4 h-4 text-gray-400" />}
                        </div>

                        {/* Entry content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                              {entry.action}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <UserCircleIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.userName || entry.userEmail || `User #${entry.userId}`}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {entry.description}
                            </p>
                          )}
                          {/* Field changes */}
                          {entry.changes && !Array.isArray(entry.changes) && Object.keys(entry.changes).length > 0 && (
                            <div className="mt-2 text-xs space-y-1">
                              {Object.entries(entry.changes).slice(0, 5).map(([field, change]) => {
                                const c = change as { before: any; after: any };
                                return (
                                <div key={field} className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">{field}:</span>
                                  <span className="line-through text-red-500/70">{String(c.before ?? '—')}</span>
                                  <span>→</span>
                                  <span className="text-green-600 dark:text-green-400">{String(c.after ?? '—')}</span>
                                </div>
                                );
                              })}
                              {Object.keys(entry.changes).length > 5 && (
                                <span className="text-gray-400">+{Object.keys(entry.changes).length - 5} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
