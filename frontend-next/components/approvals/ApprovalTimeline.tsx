import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocale } from '../../contexts/LocaleContext';

interface TimelineEntry {
  id: number;
  action_type?: string;
  action?: string;
  actor_name: string;
  comment?: string;
  created_at: string;
  acted_at?: string;
  ip_address?: string;
  step_label?: string;
  step_number?: number;
  // Digital signature fields
  signature_id?: number | null;
  signature_name_en?: string;
  signature_name_ar?: string;
  signature_title_en?: string;
  signature_title_ar?: string;
  signature_image_url?: string;
  signature_authority?: string;
  sig_type?: string;
}

interface Props {
  entries: TimelineEntry[];
}

const actionColors: Record<string, string> = {
  submitted:  'bg-blue-500',
  approved:   'bg-green-500',
  rejected:   'bg-red-500',
  posted:     'bg-emerald-600',
  voided:     'bg-red-700',
  recalled:   'bg-yellow-500',
  resubmitted:'bg-blue-400',
  cancelled:  'bg-gray-500',
  viewed:     'bg-indigo-400',
  delegated:  'bg-purple-500',
  reminded:   'bg-orange-400',
  commented:  'bg-gray-400',
  submit:     'bg-blue-500',
  approve:    'bg-green-500',
  reject:     'bg-red-500',
  post:       'bg-emerald-600',
  void:       'bg-red-700',
  recall:     'bg-yellow-500',
  resubmit:   'bg-blue-400',
  cancel:     'bg-gray-500',
  view:       'bg-indigo-400',
  delegate:   'bg-purple-500',
  remind:     'bg-orange-400',
  comment:    'bg-gray-400',
};

const actionIcons: Record<string, string> = {
  submitted:  '📤',
  approved:   '✅',
  rejected:   '❌',
  posted:     '✨',
  voided:     '🚫',
  recalled:   '↩️',
  resubmitted:'🔄',
  cancelled:  '⊘',
  viewed:     '👁️',
  delegated:  '🔀',
  reminded:   '🔔',
  commented:  '💬',
  submit:     '📤',
  approve:    '✅',
  reject:     '❌',
  post:       '✨',
  void:       '🚫',
  recall:     '↩️',
  resubmit:   '🔄',
  cancel:     '⊘',
  view:       '👁️',
  delegate:   '🔀',
  remind:     '🔔',
  comment:    '💬',
};

export default function ApprovalTimeline({ entries }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isRtl = locale === 'ar';

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        {t('approvals.noTimeline') || 'No activity yet'}
      </div>
    );
  }

  return (
    <div className={`relative ${isRtl ? 'pr-8' : 'pl-8'}`}>
      {/* Vertical line */}
      <div className={`absolute top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 ${isRtl ? 'right-3' : 'left-3'}`} />

      {entries.map((entry, idx) => {
        const actionKey = entry.action || entry.action_type || 'unknown';
        const color = actionColors[actionKey] || 'bg-gray-400';
        const icon = actionIcons[actionKey] || '•';
        const label = t(`approvals.actions.${actionKey}`) || actionKey;
        const time = new Date(entry.acted_at || entry.created_at);
        const timeStr = time.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });

        return (
          <div key={entry.id || idx} className="relative mb-6 last:mb-0 group">
            {/* Dot */}
            <div
              className={`absolute w-6 h-6 rounded-full ${color} 
                          flex items-center justify-center text-white text-xs
                          shadow-lg transition-transform group-hover:scale-125
                          ${isRtl ? '-right-5' : '-left-5'}`}
            >
              <span>{icon}</span>
            </div>

            {/* Content card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700
                            transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {label}
                </span>
                <span className="text-xs text-gray-400">{timeStr}</span>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                {entry.actor_name}
                {entry.step_label && (
                  <span className="ml-2 text-gray-400">• {entry.step_label}</span>
                )}
              </div>

              {entry.comment && (
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 
                                rounded p-2 border-l-2 border-blue-400">
                  {entry.comment}
                </div>
              )}

              {/* Digital signature display */}
              {entry.signature_id && (
                <div className="mt-2 flex items-center gap-3 bg-indigo-50/60 dark:bg-indigo-900/20 rounded-lg p-2 border border-indigo-200 dark:border-indigo-800">
                  {entry.signature_image_url ? (
                    <div className="flex-shrink-0 w-20 h-12 bg-white dark:bg-gray-800 rounded border border-indigo-200 dark:border-indigo-700 flex items-center justify-center overflow-hidden">
                      <img src={entry.signature_image_url} alt="signature" className="max-w-full max-h-full object-contain p-0.5" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-20 h-12 bg-white dark:bg-gray-800 rounded border border-dashed border-indigo-300 dark:border-indigo-700 flex items-center justify-center">
                      <span className="text-xs text-indigo-400">✍️</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 truncate">
                      {isRtl ? entry.signature_name_ar : entry.signature_name_en}
                    </p>
                    {(entry.signature_title_en || entry.signature_title_ar) && (
                      <p className="text-[11px] text-indigo-500 dark:text-indigo-500 truncate">
                        {isRtl ? entry.signature_title_ar : entry.signature_title_en}
                      </p>
                    )}
                    {entry.signature_authority && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{entry.signature_authority}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
