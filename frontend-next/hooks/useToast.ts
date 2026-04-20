import { useContext, useCallback } from 'react';
import { ToastContext } from '../contexts/ToastContext';

export interface ToastMessage {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  persistent?: boolean;
  icon?: React.ReactNode;
  progress?: number;
}

export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    // Return no-op functions for SSR compatibility
    return {
      showToast: (_type: any, _message?: any, _title?: any) => '',
      showAdvancedToast: (_options: any) => '',
      showPromiseToast: (_promise: any, _messages: any) => Promise.resolve(),
      showProgressToast: (_options: any) => '',
      hideToast: (_id: string) => {},
      clearAll: () => {},
    };
  }
  
  const { showToast: contextShowToast, hideToast, clearAll } = context;
  
  // Simple string-based toast (backward compatibility)
  const showToast = useCallback((type: ToastMessage['type'], message: string, title?: string) => {
    return contextShowToast({
      type,
      message,
      title,
    });
  }, [contextShowToast]);
  
  // Advanced toast with full options
  const showAdvancedToast = useCallback((options: Omit<ToastMessage, 'id'>) => {
    return contextShowToast(options);
  }, [contextShowToast]);
  
  // Promise-based toast for async operations
  const showPromiseToast = useCallback(<T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    const toastId = contextShowToast({
      type: 'info',
      message: messages.loading,
      persistent: true,
    });
    
    return promise
      .then((result) => {
        hideToast(toastId);
        contextShowToast({
          type: 'success',
          message: messages.success,
        });
        return result;
      })
      .catch((error) => {
        hideToast(toastId);
        contextShowToast({
          type: 'error',
          message: messages.error,
        });
        throw error;
      });
  }, [contextShowToast, hideToast]);
  
  // Progress toast for file uploads, etc.
  const showProgressToast = useCallback((options: {
    id?: string;
    title?: string;
    message: string;
    progress: number;
    type?: ToastMessage['type'];
  }) => {
    return contextShowToast({
      id: options.id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      progress: options.progress,
      persistent: options.progress < 100,
    });
  }, [contextShowToast]);
  
  return {
    showToast,
    showAdvancedToast,
    showPromiseToast,
    showProgressToast,
    hideToast,
    clearAll,
  };
}