/**
 * 🎛️ TABS COMPONENT
 * =================
 * Reusable tab navigation component
 * 
 * Features:
 * ✅ Horizontal tabs with icons
 * ✅ RTL support
 * ✅ Keyboard navigation
 * ✅ Responsive
 * ✅ Dark mode
 */

import { useState, useRef, useEffect, KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';

export interface Tab {
  id: string;
  label: string;
  label_ar?: string;
  icon?: ReactNode;
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  locale?: 'en' | 'ar';
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const badgeColors = {
  primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function Tabs({
  tabs,
  activeTab,
  onTabChange,
  locale = 'en',
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className,
}: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    if (activeIndex >= 0) setFocusedIndex(activeIndex);
  }, [activeTab, tabs]);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    const isRtl = locale === 'ar';
    let newIndex = index;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = isRtl ? index - 1 : index + 1;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = isRtl ? index + 1 : index - 1;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!tabs[index].disabled) {
          onTabChange(tabs[index].id);
        }
        return;
      default:
        return;
    }

    // Wrap around
    if (newIndex < 0) newIndex = tabs.length - 1;
    if (newIndex >= tabs.length) newIndex = 0;

    // Skip disabled tabs
    while (tabs[newIndex]?.disabled && newIndex !== index) {
      newIndex = e.key === 'ArrowRight' || e.key === 'End' 
        ? (newIndex + 1) % tabs.length 
        : (newIndex - 1 + tabs.length) % tabs.length;
    }

    setFocusedIndex(newIndex);
    tabRefs.current[newIndex]?.focus();
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantClasses = {
    default: {
      container: 'border-b border-gray-200 dark:border-gray-700',
      tab: 'border-b-2 -mb-px',
      active: 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200',
    },
    pills: {
      container: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
      tab: 'rounded-md',
      active: 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm',
      inactive: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
    },
    underline: {
      container: '',
      tab: 'border-b-2 -mb-px',
      active: 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-medium',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400',
    },
  };

  const styles = variantClasses[variant];

  return (
    <div
      className={clsx(
        'flex',
        fullWidth ? 'w-full' : '',
        styles.container,
        className
      )}
      role="tablist"
      aria-orientation="horizontal"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className={clsx('flex', fullWidth ? 'w-full' : 'gap-1')}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const label = locale === 'ar' && tab.label_ar ? tab.label_ar : tab.label;

          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={focusedIndex === index ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={clsx(
                'flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                sizeClasses[size],
                styles.tab,
                isActive ? styles.active : styles.inactive,
                fullWidth ? 'flex-1' : '',
                tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              {tab.icon}
              <span>{label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium',
                    badgeColors[tab.badgeColor || 'gray']
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Tab Panel Component
 */
interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  if (id !== activeTab) return null;

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={id}
      tabIndex={0}
      className={clsx('focus:outline-none', className)}
    >
      {children}
    </div>
  );
}
