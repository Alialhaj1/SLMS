/**
 * 🔐 Permission-Aware Components
 * =====================================================
 * Smart components that auto-check permissions and apply translations
 * 
 * Usage:
 *   <PermissionButton permission="accounting.journal.post">
 *     Post Entry
 *   </PermissionButton>
 *   
 *   <PermissionCard permission="dashboard.cards.revenue.view">
 *     <RevenueChart />
 *   </PermissionCard>
 */

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';

// =====================================================
// 🔘 PERMISSION BUTTON
// =====================================================

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Permission code (dot notation) */
  permission: string;
  /** Fallback when no permission (default: hidden) */
  fallback?: 'hidden' | 'disabled' | React.ReactNode;
  /** Show confirmation for dangerous actions */
  confirmDangerous?: boolean;
  /** Custom confirmation message */
  confirmMessage?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  loading?: boolean;
  /** Icon to show before text */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function PermissionButton({
  permission,
  fallback = 'hidden',
  confirmDangerous = true,
  confirmMessage,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  onClick,
  children,
  className = '',
  disabled,
  ...props
}: PermissionButtonProps) {
  const { can, isDangerous, loading: permLoading } = usePermissions();
  const { t } = useTranslation();
  
  const hasPermission = can(permission);
  const dangerous = isDangerous(permission);
  
  // Handle no permission
  if (!hasPermission) {
    if (fallback === 'hidden') return null;
    if (fallback === 'disabled') {
      return (
        <button
          {...props}
          className={`permission-button ${variant} ${size} disabled ${className}`}
          disabled
          title={t('info.noPermission')}
        >
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </button>
      );
    }
    return <>{fallback}</>;
  }
  
  // Handle click with optional confirmation
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (dangerous && confirmDangerous) {
      const message = confirmMessage || t(`confirm.${permission.split('.').pop()}`);
      if (!window.confirm(message)) {
        e.preventDefault();
        return;
      }
    }
    onClick?.(e);
  };
  
  // Base classes
  const baseClasses = [
    'permission-button',
    variant,
    size,
    dangerous && 'dangerous',
    loading && 'loading',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <button
      {...props}
      className={baseClasses}
      onClick={handleClick}
      disabled={disabled || loading || permLoading}
      data-permission={permission}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true">⏳</span>
      ) : (
        icon && <span className="btn-icon">{icon}</span>
      )}
      {children}
    </button>
  );
}

// =====================================================
// 📦 PERMISSION CARD
// =====================================================

interface PermissionCardProps {
  /** Permission code for viewing this card */
  permission: string;
  /** Card title (will auto-translate if key provided) */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Fallback when no permission */
  fallback?: 'hidden' | 'placeholder' | React.ReactNode;
  /** Card variant */
  variant?: 'default' | 'bordered' | 'elevated';
  /** Additional class names */
  className?: string;
  /** Header actions (buttons) */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionCard({
  permission,
  title,
  subtitle,
  fallback = 'hidden',
  variant = 'default',
  className = '',
  headerActions,
  children,
}: PermissionCardProps) {
  const { can, loading } = usePermissions();
  const { t } = useTranslation();
  
  const hasPermission = can(permission);
  
  // Handle no permission
  if (!hasPermission && !loading) {
    if (fallback === 'hidden') return null;
    if (fallback === 'placeholder') {
      return (
        <div className={`permission-card placeholder ${variant} ${className}`}>
          <div className="card-locked">
            <span className="lock-icon">🔒</span>
            <p>{t('info.noPermission')}</p>
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }
  
  return (
    <div className={`permission-card ${variant} ${className}`} data-permission={permission}>
      {(title || headerActions) && (
        <div className="card-header">
          <div className="card-title-section">
            {title && <h3 className="card-title">{t(title) || title}</h3>}
            {subtitle && <p className="card-subtitle">{t(subtitle) || subtitle}</p>}
          </div>
          {headerActions && (
            <div className="card-actions">{headerActions}</div>
          )}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

// =====================================================
// 📊 PERMISSION COLUMN (for tables)
// =====================================================

interface PermissionColumnProps {
  /** Permission code for viewing this column */
  permission: string;
  /** Column header */
  header: string;
  /** Fallback when no permission (default: hidden) */
  fallback?: 'hidden' | 'masked';
  /** Render function for cell content */
  render: (row: any) => React.ReactNode;
  /** Additional class name */
  className?: string;
}

export function PermissionColumn({
  permission,
  header,
  fallback = 'hidden',
  render,
  className = '',
}: PermissionColumnProps) {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  const hasPermission = can(permission);
  
  // Return column config for table components
  return {
    permission,
    header: t(header) || header,
    visible: hasPermission,
    masked: !hasPermission && fallback === 'masked',
    className,
    render: hasPermission 
      ? render 
      : fallback === 'masked' 
        ? () => <span className="masked-value">***</span>
        : () => null,
  };
}

/**
 * Hook to filter table columns by permission
 */
export function usePermissionColumns<T extends { permission?: string }>(
  columns: T[]
): T[] {
  const { can } = usePermissions();
  
  return columns.filter(col => {
    if (!col.permission) return true;
    return can(col.permission);
  });
}

// =====================================================
// 📑 PERMISSION FIELD (for forms)
// =====================================================

interface PermissionFieldProps {
  /** Permission for viewing the field */
  viewPermission?: string;
  /** Permission for editing the field */
  editPermission?: string;
  /** Field label */
  label: string;
  /** Field name */
  name: string;
  /** Current value */
  value: any;
  /** Change handler */
  onChange?: (value: any) => void;
  /** Field type */
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  /** Required field */
  required?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** Options for select type */
  options?: { value: string | number; label: string }[];
  /** Additional class */
  className?: string;
  children?: React.ReactNode;
}

export function PermissionField({
  viewPermission,
  editPermission,
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  options,
  className = '',
  children,
}: PermissionFieldProps) {
  const { can } = usePermissions();
  const { t } = useTranslation();
  
  const canView = !viewPermission || can(viewPermission);
  const canEdit = !editPermission || can(editPermission);
  
  // Hide if no view permission
  if (!canView) return null;
  
  // Show read-only if no edit permission
  const readOnly = !canEdit;
  
  const baseClass = `permission-field ${className} ${readOnly ? 'readonly' : ''}`;
  
  const renderInput = () => {
    if (children) return children;
    
    switch (type) {
      case 'select':
        return (
          <select
            name={name}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            disabled={readOnly}
            required={required}
          >
            <option value="">{placeholder || t('actions.select')}</option>
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
        
      case 'textarea':
        return (
          <textarea
            name={name}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
          />
        );
        
      default:
        return (
          <input
            type={type}
            name={name}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
          />
        );
    }
  };
  
  return (
    <div className={baseClass}>
      <label htmlFor={name}>
        {t(label) || label}
        {required && <span className="required">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}

// =====================================================
// 🎭 PERMISSION SECTION (for page sections)
// =====================================================

interface PermissionSectionProps {
  /** Permission code for viewing this section */
  permission: string;
  /** Section title */
  title?: string;
  /** Collapsible section */
  collapsible?: boolean;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Fallback when no permission */
  fallback?: 'hidden' | React.ReactNode;
  /** Additional class */
  className?: string;
  children: React.ReactNode;
}

export function PermissionSection({
  permission,
  title,
  collapsible = false,
  defaultExpanded = true,
  fallback = 'hidden',
  className = '',
  children,
}: PermissionSectionProps) {
  const { can, loading } = usePermissions();
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  
  const hasPermission = can(permission);
  
  if (!hasPermission && !loading) {
    if (fallback === 'hidden') return null;
    return <>{fallback}</>;
  }
  
  return (
    <section className={`permission-section ${className}`}>
      {title && (
        <div 
          className={`section-header ${collapsible ? 'collapsible' : ''}`}
          onClick={() => collapsible && setExpanded(!expanded)}
        >
          <h4 className="section-title">{t(title) || title}</h4>
          {collapsible && (
            <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
          )}
        </div>
      )}
      {(!collapsible || expanded) && (
        <div className="section-content">{children}</div>
      )}
    </section>
  );
}

// =====================================================
// 🚪 PERMISSION GATE (general purpose wrapper)
// =====================================================

interface PermissionGateProps {
  /** Single permission or array */
  permission: string | string[];
  /** Mode for multiple permissions */
  mode?: 'any' | 'all';
  /** Fallback content */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  mode = 'any',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();
  
  const hasPermission = React.useMemo(() => {
    const perms = Array.isArray(permission) ? permission : [permission];
    return mode === 'all' ? canAll(perms) : canAny(perms);
  }, [permission, mode, canAny, canAll]);
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export default {
  PermissionButton,
  PermissionCard,
  PermissionColumn,
  PermissionField,
  PermissionSection,
  PermissionGate,
  usePermissionColumns,
};
