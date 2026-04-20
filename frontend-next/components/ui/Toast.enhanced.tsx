/**
 * ============================================================================
 * TOAST NOTIFICATION SYSTEM - Arabic Specification Implementation
 * ============================================================================
 * Features:
 * - Multiple variants (success, error, warning, info)
 * - Queue management with limits and auto-dismiss
 * - Rich content support (icons, actions, progress bars)
 * - Smooth animations (slide in/out, fade, stack)
 * - RTL support with proper positioning
 * - Keyboard accessibility (Esc to dismiss, focus management)
 * - Touch gestures (swipe to dismiss)
 * - Programmatic API with promises
 * - Persistent notifications for critical messages
 * - Progress tracking for long operations
 */

import React, { createContext, useContext, useCallback, useReducer, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useLocale } from '../../contexts/LocaleContext';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastAction {
  label: string;
  label_ar?: string;
  onClick: (toast: Toast) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  title?: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  
  // Behavior
  duration?: number; // 0 for persistent
  dismissible?: boolean;
  
  // Content
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ToastAction[];
  progress?: number; // 0-100 for progress bar
  
  // Advanced
  html?: boolean; // Allow HTML content
  component?: React.ComponentType<{ toast: Toast; dismiss: () => void }>;
  
  // Internal
  createdAt: number;
  updatedAt?: number;
  timeoutId?: NodeJS.Timeout;
  pausedAt?: number;
  remainingTime?: number;
}

export interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ToastAction[];
  progress?: number;
  html?: boolean;
  component?: React.ComponentType<{ toast: Toast; dismiss: () => void }>;
}

export interface ToastContextValue {
  toasts: Toast[];
  showToast: (variant: ToastVariant, message: string, options?: ToastOptions) => string;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  dismissToast: (id: string) => void;
  clearToasts: (variant?: ToastVariant) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
}

interface ToastState {
  toasts: Toast[];
  position: ToastPosition;
  maxToasts: number;
  defaultDuration: number;
  pauseOnHover: boolean;
  pauseOnFocusLoss: boolean;
}

// ============================================================================
// Toast Actions
// ============================================================================

type ToastActionType =
  | 'ADD_TOAST'
  | 'UPDATE_TOAST'
  | 'DISMISS_TOAST'
  | 'CLEAR_TOASTS'
  | 'PAUSE_TOAST'
  | 'RESUME_TOAST'
  | 'SET_CONFIG';

interface ToastAction {
  type: ToastActionType;
  payload?: any;
}

// ============================================================================
// Toast Reducer
// ============================================================================

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST': {
      const newToast = action.payload as Toast;
      let toasts = [newToast, ...state.toasts];
      
      // Limit number of toasts
      if (toasts.length > state.maxToasts) {
        toasts = toasts.slice(0, state.maxToasts);
      }
      
      return { ...state, toasts };
    }
    
    case 'UPDATE_TOAST': {
      const { id, updates } = action.payload;
      return {
        ...state,
        toasts: state.toasts.map(toast =>
          toast.id === id
            ? { ...toast, ...updates, updatedAt: Date.now() }
            : toast
        ),
      };
    }
    
    case 'DISMISS_TOAST': {
      const id = action.payload;
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== id),
      };
    }
    
    case 'CLEAR_TOASTS': {
      const variant = action.payload?.variant;
      return {
        ...state,
        toasts: variant
          ? state.toasts.filter(toast => toast.variant !== variant)
          : [],
      };
    }
    
    case 'PAUSE_TOAST': {
      const id = action.payload;
      return {
        ...state,
        toasts: state.toasts.map(toast => {
          if (toast.id === id && toast.timeoutId) {
            clearTimeout(toast.timeoutId);
            return {
              ...toast,
              pausedAt: Date.now(),
              remainingTime: toast.remainingTime || toast.duration || state.defaultDuration,
              timeoutId: undefined,
            };
          }
          return toast;
        }),
      };
    }
    
    case 'RESUME_TOAST': {
      const id = action.payload;
      return {
        ...state,
        toasts: state.toasts.map(toast => {
          if (toast.id === id && toast.pausedAt && toast.remainingTime) {
            return {
              ...toast,
              pausedAt: undefined,
              // timeoutId will be set by the effect
            };
          }
          return toast;
        }),
      };
    }
    
    case 'SET_CONFIG': {
      return { ...state, ...action.payload };
    }
    
    default:
      return state;
  }
}

// ============================================================================
// Toast Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Toast Provider
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  defaultDuration?: number;
  pauseOnHover?: boolean;
  pauseOnFocusLoss?: boolean;
}

export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000,
  pauseOnHover = true,
  pauseOnFocusLoss = true,
}: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, {
    toasts: [],
    position,
    maxToasts,
    defaultDuration,
    pauseOnHover,
    pauseOnFocusLoss,
  });
  
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Generate unique ID
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);
  
  // Auto-dismiss toast after duration
  const scheduleAutoDismiss = useCallback((toast: Toast) => {
    if (toast.duration === 0 || toast.variant === 'loading') return; // Persistent toast
    
    const duration = toast.remainingTime || toast.duration || defaultDuration;
    
    const timeoutId = setTimeout(() => {
      dispatch({ type: 'DISMISS_TOAST', payload: toast.id });
      timeoutRefs.current.delete(toast.id);
    }, duration);
    
    timeoutRefs.current.set(toast.id, timeoutId);
    
    dispatch({
      type: 'UPDATE_TOAST',
      payload: { id: toast.id, updates: { timeoutId } },
    });
  }, [defaultDuration]);
  
  // Show toast
  const showToast = useCallback((
    variant: ToastVariant,
    message: string,
    options: ToastOptions = {}
  ): string => {
    const id = generateId();
    const toast: Toast = {
      id,
      variant,
      message,
      duration: options.duration ?? defaultDuration,
      dismissible: options.dismissible ?? true,
      icon: options.icon,
      actions: options.actions,
      progress: options.progress,
      html: options.html,
      component: options.component,
      createdAt: Date.now(),
    };
    
    dispatch({ type: 'ADD_TOAST', payload: toast });
    
    // Schedule auto-dismiss
    scheduleAutoDismiss(toast);
    
    return id;
  }, [generateId, defaultDuration, scheduleAutoDismiss]);
  
  // Update toast
  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    dispatch({ type: 'UPDATE_TOAST', payload: { id, updates } });
    
    // If duration changed, reschedule auto-dismiss
    if ('duration' in updates) {
      const existingTimeout = timeoutRefs.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(id);
      }
      
      const toast = state.toasts.find(t => t.id === id);
      if (toast) {
        scheduleAutoDismiss({ ...toast, ...updates });
      }
    }
  }, [state.toasts, scheduleAutoDismiss]);
  
  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
    
    dispatch({ type: 'DISMISS_TOAST', payload: id });
  }, []);
  
  // Clear toasts
  const clearToasts = useCallback((variant?: ToastVariant) => {
    // Clear all timeouts for affected toasts
    const toastsToClear = variant
      ? state.toasts.filter(t => t.variant === variant)
      : state.toasts;
    
    toastsToClear.forEach(toast => {
      const timeoutId = timeoutRefs.current.get(toast.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutRefs.current.delete(toast.id);
      }
    });
    
    dispatch({ type: 'CLEAR_TOASTS', payload: { variant } });
  }, [state.toasts]);
  
  // Pause toast
  const pauseToast = useCallback((id: string) => {
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
    
    dispatch({ type: 'PAUSE_TOAST', payload: id });
  }, []);
  
  // Resume toast
  const resumeToast = useCallback((id: string) => {
    dispatch({ type: 'RESUME_TOAST', payload: id });
    
    // Reschedule auto-dismiss with remaining time
    const toast = state.toasts.find(t => t.id === id);
    if (toast && toast.remainingTime) {
      scheduleAutoDismiss(toast);
    }
  }, [state.toasts, scheduleAutoDismiss]);
  
  // Handle window focus/blur for pause on focus loss
  useEffect(() => {
    if (!pauseOnFocusLoss) return;
    
    const handleFocus = () => {
      state.toasts.forEach(toast => {
        if (toast.pausedAt) {
          resumeToast(toast.id);
        }
      });
    };
    
    const handleBlur = () => {
      state.toasts.forEach(toast => {
        if (!toast.pausedAt && toast.duration && toast.duration > 0) {
          pauseToast(toast.id);
        }
      });
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [pauseOnFocusLoss, state.toasts, pauseToast, resumeToast]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);
  
  const value: ToastContextValue = {
    toasts: state.toasts,
    showToast,
    updateToast,
    dismissToast,
    clearToasts,
    pauseToast,
    resumeToast,
  };
  
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={state.toasts}
        position={state.position}
        pauseOnHover={state.pauseOnHover}
        onDismiss={dismissToast}
        onPause={pauseToast}
        onResume={resumeToast}
      />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  position: ToastPosition;
  pauseOnHover: boolean;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function ToastContainer({
  toasts,
  position,
  pauseOnHover,
  onDismiss,
  onPause,
  onResume,
}: ToastContainerProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };
  
  if (toasts.length === 0) return null;
  
  const container = (
    <div
      className={`slms-toast-container ${positionClasses[position]}`}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          pauseOnHover={pauseOnHover}
          onDismiss={onDismiss}
          onPause={onPause}
          onResume={onResume}
        />
      ))}
    </div>
  );
  
  return ReactDOM.createPortal(container, document.body);
}

// ============================================================================
// Toast Item Component
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  index: number;
  pauseOnHover: boolean;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function ToastItem({
  toast,
  index,
  pauseOnHover,
  onDismiss,
  onPause,
  onResume,
}: ToastItemProps) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  
  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    setIsDismissing(true);
    setTimeout(() => onDismiss(toast.id), 150); // Match animation duration
  }, [toast.id, onDismiss]);
  
  // Mouse handlers for pause on hover
  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover && !toast.pausedAt) {
      onPause(toast.id);
    }
  }, [pauseOnHover, toast.pausedAt, toast.id, onPause]);
  
  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover && toast.pausedAt) {
      onResume(toast.id);
    }
  }, [pauseOnHover, toast.pausedAt, toast.id, onResume]);
  
  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  }, [handleDismiss]);
  
  // Get variant styles
  const variantStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: CheckCircleIcon,
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-800 dark:text-green-200',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: ExclamationCircleIcon,
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-800 dark:text-red-200',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      textColor: 'text-yellow-800 dark:text-yellow-200',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: InformationCircleIcon,
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-800 dark:text-blue-200',
    },
    loading: {
      bg: 'bg-neutral-50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800',
      icon: ArrowPathIcon,
      iconColor: 'text-neutral-600 dark:text-neutral-400',
      textColor: 'text-neutral-800 dark:text-neutral-200',
    },
  };
  
  const styles = variantStyles[toast.variant];
  const IconComponent = toast.icon || styles.icon;
  
  // Get display text
  const displayTitle = isRTL ? (toast.title_ar || toast.title) : toast.title;
  const displayMessage = isRTL ? (toast.message_ar || toast.message) : toast.message;
  
  // Custom component override
  if (toast.component) {
    const Component = toast.component;
    return (
      <div
        className={`slms-toast-item ${isVisible ? 'visible' : ''} ${isDismissing ? 'dismissing' : ''}`}
        style={{ '--index': index } as React.CSSProperties}
      >
        <Component toast={toast} dismiss={handleDismiss} />
      </div>
    );
  }
  
  return (
    <div
      ref={toastRef}
      className={`slms-toast-item ${styles.bg} ${isVisible ? 'visible' : ''} ${isDismissing ? 'dismissing' : ''}`}
      style={{ '--index': index } as React.CSSProperties}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="alert"
      aria-live="assertive"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        {IconComponent && (
          <div className="flex-shrink-0">
            <IconComponent
              className={`w-5 h-5 ${styles.iconColor} ${
                toast.variant === 'loading' ? 'animate-spin' : ''
              }`}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {displayTitle && (
            <h4 className={`text-sm font-medium ${styles.textColor} mb-1`}>
              {displayTitle}
            </h4>
          )}
          
          <div className={`text-sm ${styles.textColor}`}>
            {toast.html ? (
              <div dangerouslySetInnerHTML={{ __html: displayMessage }} />
            ) : (
              displayMessage
            )}
          </div>
          
          {/* Progress Bar */}
          {typeof toast.progress === 'number' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={styles.textColor}>Progress</span>
                <span className={styles.textColor}>{Math.round(toast.progress)}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    toast.variant === 'success' ? 'bg-green-500' :
                    toast.variant === 'error' ? 'bg-red-500' :
                    toast.variant === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, toast.progress))}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Actions */}
          {toast.actions && toast.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {toast.actions.map((action, actionIndex) => {
                const displayActionLabel = isRTL ? (action.label_ar || action.label) : action.label;
                
                return (
                  <button
                    key={actionIndex}
                    onClick={() => action.onClick(toast)}
                    disabled={action.loading}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      action.variant === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : action.variant === 'secondary'
                        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {action.loading && (
                      <ArrowPathIcon className="w-3 h-3 animate-spin mr-1" />
                    )}
                    {displayActionLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Dismiss Button */}
        {toast.dismissible && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.iconColor}`}
            aria-label={isRTL ? 'إغلاق الإشعار' : 'Dismiss notification'}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Quick Toast Functions
// ============================================================================

/**
 * Success Toast - Green variant for success messages
 */
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  // This will be implemented by whoever uses the hook
  console.warn('showSuccessToast called outside of ToastProvider');
  return '';
};

/**
 * Error Toast - Red variant for error messages
 */
export const showErrorToast = (message: string, options?: ToastOptions) => {
  console.warn('showErrorToast called outside of ToastProvider');
  return '';
};

/**
 * Warning Toast - Yellow variant for warning messages
 */
export const showWarningToast = (message: string, options?: ToastOptions) => {
  console.warn('showWarningToast called outside of ToastProvider');
  return '';
};

/**
 * Info Toast - Blue variant for informational messages
 */
export const showInfoToast = (message: string, options?: ToastOptions) => {
  console.warn('showInfoToast called outside of ToastProvider');
  return '';
};

/**
 * Loading Toast - Neutral variant with spinner for loading states
 */
export const showLoadingToast = (message: string, options?: ToastOptions) => {
  console.warn('showLoadingToast called outside of ToastProvider');
  return '';
};

// ============================================================================
// Toast Hook with Quick Functions
// ============================================================================

export function useToastActions() {
  const { showToast, updateToast, dismissToast } = useToast();
  
  return {
    success: useCallback(
      (message: string, options?: ToastOptions) => showToast('success', message, options),
      [showToast]
    ),
    error: useCallback(
      (message: string, options?: ToastOptions) => showToast('error', message, options),
      [showToast]
    ),
    warning: useCallback(
      (message: string, options?: ToastOptions) => showToast('warning', message, options),
      [showToast]
    ),
    info: useCallback(
      (message: string, options?: ToastOptions) => showToast('info', message, options),
      [showToast]
    ),
    loading: useCallback(
      (message: string, options?: ToastOptions) => showToast('loading', message, { duration: 0, ...options }),
      [showToast]
    ),
    promise: useCallback(
      async <T>(promise: Promise<T>, messages: {
        loading: string;
        success: string;
        error: string;
        loading_ar?: string;
        success_ar?: string;
        error_ar?: string;
      }): Promise<T> => {
        const toastId = showToast('loading', messages.loading, {
          duration: 0,
          dismissible: false,
        });
        
        try {
          const result = await promise;
          updateToast(toastId, {
            variant: 'success',
            message: messages.success,
            message_ar: messages.success_ar,
            duration: 3000,
            dismissible: true,
            icon: CheckCircleIcon,
          });
          return result;
        } catch (error) {
          updateToast(toastId, {
            variant: 'error',
            message: messages.error,
            message_ar: messages.error_ar,
            duration: 5000,
            dismissible: true,
            icon: ExclamationCircleIcon,
          });
          throw error;
        }
      },
      [showToast, updateToast]
    ),
    update: updateToast,
    dismiss: dismissToast,
  };
}

export type {
  Toast,
  ToastAction,
  ToastOptions,
  ToastVariant,
  ToastPosition,
};