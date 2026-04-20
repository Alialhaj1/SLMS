/**
 * ============================================================================
 * STANDARD PAGE HEADER - Arabic Specification Implementation
 * ============================================================================
 * Component 1 of 6 in standard page structure:
 * 1. Page Header ← THIS COMPONENT
 * 2. Filter Bar
 * 3. Stat Cards
 * 4. Main Content/Table
 * 5. Pagination
 * 6. Modals
 */

import React from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { usePermissions } from '../../hooks/usePermissions.enhanced';
import { Permission } from '../../lib/rbac';
import Button from '../ui/Button';
import { 
  PlusIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// Page Header Component
// ============================================================================

interface PageHeaderAction {
  id: string;
  label: string;
  label_ar?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  permission?: string;
  loading?: boolean;
  disabled?: boolean;
  tooltip?: string;
  tooltip_ar?: string;
}

interface PageHeaderProps {
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: PageHeaderAction[];
  breadcrumbs?: {
    label: string;
    label_ar?: string;
    href?: string;
  }[];
  className?: string;
}

export default function PageHeader({
  title,
  title_ar,
  description,
  description_ar,
  icon: Icon,
  actions = [],
  breadcrumbs = [],
  className = '',
}: PageHeaderProps) {
  const { locale, t } = useLocale();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  // Filter actions based on permissions
  const visibleActions = actions.filter(action => 
    !action.permission || hasPermission(action.permission)
  );

  const displayTitle = isRTL ? (title_ar || title) : title;
  const displayDescription = isRTL ? (description_ar || description) : description;

  return (
    <div className={`slms-page-header ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-neutral-500 dark:text-neutral-400 mb-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="mx-2 text-neutral-300 dark:text-neutral-600">/</span>
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {isRTL ? (crumb.label_ar || crumb.label) : crumb.label}
                </a>
              ) : (
                <span className="text-neutral-700 dark:text-neutral-300">
                  {isRTL ? (crumb.label_ar || crumb.label) : crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between">
        {/* Title & Description */}
        <div className="flex items-start gap-4 flex-1">
          {Icon && (
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          )}
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {displayTitle}
            </h1>
            {displayDescription && (
              <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl">
                {displayDescription}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {visibleActions.length > 0 && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {visibleActions.map((action) => {
              const ActionIcon = action.icon;
              const displayLabel = isRTL ? (action.label_ar || action.label) : action.label;
              const displayTooltip = isRTL ? (action.tooltip_ar || action.tooltip) : action.tooltip;
              
              return (
                <div key={action.id} className="relative group">
                  <Button
                    onClick={action.onClick}
                    variant={action.variant || 'primary'}
                    size="md"
                    loading={action.loading}
                    disabled={action.disabled}
                    className="flex items-center gap-2"
                  >
                    {ActionIcon && <ActionIcon className="w-5 h-5" />}
                    {displayLabel}
                  </Button>
                  
                  {/* Tooltip */}
                  {displayTooltip && (
                    <div className="slms-tooltip">
                      {displayTooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Pre-configured Page Header Variants
// ============================================================================

/**
 * Standard CRUD Page Header
 * Includes Create, Export, Settings actions
 */
interface CrudPageHeaderProps extends Omit<PageHeaderProps, 'actions'> {
  onAdd?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  addPermission?: string;
  exportPermission?: string;
  settingsPermission?: string;
  addLabel?: string;
  addLabel_ar?: string;
  exportLabel?: string;
  exportLabel_ar?: string;
  settingsLabel?: string;
  settingsLabel_ar?: string;
}

export function CrudPageHeader({
  onAdd,
  onExport,
  onSettings,
  addPermission,
  exportPermission,
  settingsPermission,
  addLabel = 'Add New',
  addLabel_ar = 'إضافة جديد',
  exportLabel = 'Export',
  exportLabel_ar = 'تصدير',
  settingsLabel = 'Settings',
  settingsLabel_ar = 'الإعدادات',
  ...headerProps
}: CrudPageHeaderProps) {
  const actions: PageHeaderAction[] = [];

  if (onAdd) {
    actions.push({
      id: 'add',
      label: addLabel,
      label_ar: addLabel_ar,
      icon: PlusIcon,
      onClick: onAdd,
      variant: 'primary',
      permission: addPermission,
    });
  }

  if (onExport) {
    actions.push({
      id: 'export',
      label: exportLabel,
      label_ar: exportLabel_ar,
      icon: DocumentArrowDownIcon,
      onClick: onExport,
      variant: 'secondary',
      permission: exportPermission,
    });
  }

  if (onSettings) {
    actions.push({
      id: 'settings',
      label: settingsLabel,
      label_ar: settingsLabel_ar,
      icon: Cog6ToothIcon,
      onClick: onSettings,
      variant: 'secondary',
      permission: settingsPermission,
    });
  }

  return <PageHeader {...headerProps} actions={actions} />;
}

// ============================================================================
// Quick Action Buttons (Common Patterns)
// ============================================================================

export const QuickActions = {
  Add: (props: { onClick: () => void; permission?: string; loading?: boolean }) => ({
    id: 'add',
    label: 'Add New',
    label_ar: 'إضافة جديد',
    icon: PlusIcon,
    variant: 'primary' as const,
    ...props,
  }),
  
  Export: (props: { onClick: () => void; permission?: string; loading?: boolean }) => ({
    id: 'export',
    label: 'Export',
    label_ar: 'تصدير',
    icon: ArrowDownTrayIcon,
    variant: 'secondary' as const,
    ...props,
  }),
  
  Filter: (props: { onClick: () => void; permission?: string; active?: boolean }) => ({
    id: 'filter',
    label: props.active ? 'Hide Filters' : 'Show Filters',
    label_ar: props.active ? 'إخفاء المرشحات' : 'إظهار المرشحات',
    icon: FunnelIcon,
    variant: 'secondary' as const,
    ...props,
  }),
};

export type { PageHeaderProps, PageHeaderAction };