import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useLocale } from '../../contexts/LocaleContext';

export interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';
  field?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  loading?: boolean;
}

const actionColors = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const actionLabels = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  entries,
  loading = false,
}) => {
  const { dir } = useLocale();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No audit history available
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <div className="relative pb-8">
              {index !== entries.length - 1 && (
                <span
                  className={`absolute top-4 ${
                    dir === 'rtl' ? 'right-4' : 'left-4'
                  } -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700`}
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3 rtl:space-x-reverse">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-900 ${
                      actionColors[entry.action]
                    }`}
                  >
                    <ClockIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 rtl:space-x-reverse pt-1.5">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{entry.user}</span>
                      {' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        {actionLabels[entry.action]}
                      </span>
                      {entry.field && (
                        <span className="text-gray-600 dark:text-gray-400">
                          {' '}the field{' '}
                          <span className="font-medium">{entry.field}</span>
                        </span>
                      )}
                    </p>
                    {(entry.oldValue || entry.newValue) && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {entry.oldValue && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-600 dark:text-red-400">From:</span>
                            <span className="line-through">{entry.oldValue}</span>
                          </div>
                        )}
                        {entry.newValue && (
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 dark:text-green-400">To:</span>
                            <span>{entry.newValue}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {entry.comment && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                        "{entry.comment}"
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    <time dateTime={entry.timestamp}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
