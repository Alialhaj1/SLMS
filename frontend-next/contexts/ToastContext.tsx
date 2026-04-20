import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  progress?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  icon?: React.ReactNode;
}

interface ToastContextType {
  showToast: (options: Partial<Toast> & { type: ToastType; message: string }) => string;
  hideToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: Partial<Toast> & { type: ToastType; message: string }): string => {
    const id = options.id || generateId();
    const duration = options.persistent ? 0 : (options.duration ?? (
      options.type === 'success' ? 3500 :
      options.type === 'warning' ? 5000 :
      options.type === 'error' ? 6000 : 5000
    ));
    
    const toast: Toast = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      duration,
      persistent: options.persistent,
      progress: options.progress,
      actions: options.actions,
      icon: options.icon,
    };

    // Update existing toast if ID matches
    setToasts((prev) => {
      const existingIndex = prev.findIndex(t => t.id === id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = toast;
        return updated;
      }
      return [...prev, toast];
    });

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

  const hideToast = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, clearAll }}>
      {children}
      <div className="fixed bottom-4 left-4 z-50 space-y-2 w-96 max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: '✓',
    error: '✕',  
    warning: '⚠',
    info: 'ℹ',
  };

  const colors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-200',
  };

  const icon = toast.icon || icons[toast.type];

  return (
    <div
      className={`p-4 rounded-lg border-l-4 shadow-lg ${colors[toast.type]} animate-slide-in-left`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-sm mb-1">{toast.title}</div>
          )}
          <p className="text-sm">{toast.message}</p>
          
          {/* Progress bar */}
          {typeof toast.progress === 'number' && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-current h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, toast.progress))}%` }}
              />
            </div>
          )}
          
          {/* Action buttons */}
          {toast.actions && toast.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-current text-white opacity-90 hover:opacity-100'
                      : 'text-current hover:bg-current hover:bg-opacity-10'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Always show close button (QA 14.1.04) */}
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity text-xl ml-2"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return default no-op functions for SSR compatibility
    return {
      showToast: (_options: any) => '',
      hideToast: (_id: string) => {},
      clearAll: () => {},
    } as ToastContextType;
  }
  return context;
}

export { ToastContext };
