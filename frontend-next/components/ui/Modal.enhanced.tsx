/**
 * ============================================================================
 * ENHANCED MODAL SYSTEM - Arabic Specification Implementation
 * ============================================================================
 * Features:
 * - Multiple sizes (sm, md, lg, xl, full)
 * - Smooth animations with proper transitions
 * - Full keyboard accessibility (Esc, Tab trapping, focus management)
 * - Click-outside to close with proper event handling
 * - RTL support with correct positioning
 * - Loading states and async action handling
 * - Confirmation dialogs with customizable variants
 * - Nested modal support
 * - Backdrop blur effects
 * - Mobile-responsive behavior
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocale } from '../../contexts/LocaleContext';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from './Button';

// ============================================================================
// Types & Interfaces
// ============================================================================

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

// Base Modal Props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  title_ar?: string;
  children: React.ReactNode;
  
  // Layout & Styling
  size?: ModalSize;
  variant?: ModalVariant;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  
  // Behavior
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventClose?: boolean;
  
  // Header & Footer
  icon?: React.ComponentType<{ className?: string }>;
  showHeader?: boolean;
  showFooter?: boolean;
  footer?: React.ReactNode;
  
  // Animation
  animationDuration?: number;
  
  // Advanced
  portal?: boolean;
  portalContainer?: Element;
  zIndex?: number;
  
  // Accessibility
  ariaLabel?: string;
  ariaLabel_ar?: string;
  ariaDescribedBy?: string;
  role?: string;
  
  // Events
  onOpen?: () => void;
  onClosed?: () => void;
  onEscapeKey?: () => void;
  onClickOutside?: () => void;
}

// Confirmation Dialog Props
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  
  // Styling
  variant?: 'danger' | 'warning' | 'success' | 'info';
  size?: ModalSize;
  
  // Button Labels
  confirmText?: string;
  confirmText_ar?: string;
  cancelText?: string;
  cancelText_ar?: string;
  
  // Behavior
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  
  // Advanced
  icon?: React.ComponentType<{ className?: string }>;
  showIcon?: boolean;
  requireConfirmation?: boolean; // Requires typing "CONFIRM" or equivalent
  confirmationText?: string;
  confirmationText_ar?: string;
}

// ============================================================================
// Size Configurations
// ============================================================================

const MODAL_SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full m-4',
};

const MODAL_HEIGHTS: Record<ModalSize, string> = {
  sm: 'max-h-[80vh]',
  md: 'max-h-[85vh]',
  lg: 'max-h-[90vh]',
  xl: 'max-h-[95vh]',
  full: 'h-[calc(100vh-2rem)]',
};

// ============================================================================
// Variant Icons
// ============================================================================

const VARIANT_ICONS = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: ExclamationCircleIcon,
  info: InformationCircleIcon,
  default: undefined,
};

const VARIANT_COLORS = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  default: 'text-neutral-600 dark:text-neutral-400',
};

// ============================================================================
// Focus Trap Hook
// ============================================================================

function useFocusTrap(isOpen: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Focus first element when modal opens
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // Handle tab trapping
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isOpen, containerRef]);
}

// ============================================================================
// Main Modal Component
// ============================================================================

export default function Modal({
  isOpen,
  onClose,
  title,
  title_ar,
  children,
  size = 'md',
  variant = 'default',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  closeOnClickOutside = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventClose = false,
  icon,
  showHeader = true,
  showFooter = false,
  footer,
  animationDuration = 200,
  portal = true,
  portalContainer,
  zIndex = 9999,
  ariaLabel,
  ariaLabel_ar,
  ariaDescribedBy,
  role = 'dialog',
  onOpen,
  onClosed,
  onEscapeKey,
  onClickOutside,
}: ModalProps) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // Use focus trap
  useFocusTrap(isOpen && isVisible, modalRef);
  
  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      // Store current focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      setIsVisible(true);
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onOpen?.();
      }, animationDuration);
      
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
        
        // Restore focus to previously focused element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
        
        onClosed?.();
      }, animationDuration);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationDuration, onOpen, onClosed]);
  
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscapeKey?.();
        if (!preventClose) {
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, preventClose, onClose, onEscapeKey]);
  
  // Handle click outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnClickOutside) {
      onClickOutside?.();
      if (!preventClose) {
        onClose();
      }
    }
  }, [closeOnClickOutside, preventClose, onClose, onClickOutside]);
  
  // Close handler that respects preventClose
  const handleClose = useCallback(() => {
    if (!preventClose) {
      onClose();
    }
  }, [preventClose, onClose]);
  
  if (!isVisible) return null;
  
  // Get display text
  const displayTitle = isRTL ? (title_ar || title) : title;
  const displayAriaLabel = isRTL ? (ariaLabel_ar || ariaLabel) : ariaLabel;
  
  // Get variant icon
  const VariantIcon = icon || VARIANT_ICONS[variant];
  const variantColor = VARIANT_COLORS[variant];
  
  // Build modal content
  const modalContent = (
    <div
      className={`slms-modal-overlay ${isAnimating ? 'animating' : ''}`}
      style={{ zIndex }}
      onClick={handleBackdropClick}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        ref={modalRef}
        className={`slms-modal-container ${MODAL_SIZES[size]} ${MODAL_HEIGHTS[size]} ${className}`}
        role={role}
        aria-modal="true"
        aria-label={displayAriaLabel || displayTitle}
        aria-describedby={ariaDescribedBy}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {showHeader && (displayTitle || showCloseButton) && (
          <div className={`slms-modal-header ${headerClassName}`}>
            <div className="flex items-center gap-3 flex-1">
              {VariantIcon && (
                <div className="flex-shrink-0">
                  <VariantIcon className={`w-6 h-6 ${variantColor}`} />
                </div>
              )}
              
              {displayTitle && (
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex-1">
                  {displayTitle}
                </h2>
              )}
            </div>
            
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="slms-modal-close-button"
                aria-label={isRTL ? 'إغلاق' : 'Close'}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className={`slms-modal-body ${bodyClassName}`}>
          {children}
        </div>
        
        {/* Footer */}
        {showFooter && footer && (
          <div className={`slms-modal-footer ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  
  // Render with or without portal
  if (portal) {
    return ReactDOM.createPortal(
      modalContent,
      portalContainer || document.body
    );
  }
  
  return modalContent;
}

// ============================================================================
// Confirmation Dialog Component
// ============================================================================

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  title_ar,
  message,
  message_ar,
  variant = 'danger',
  size = 'sm',
  confirmText = 'Confirm',
  confirmText_ar = 'تأكيد',
  cancelText = 'Cancel',
  cancelText_ar = 'إلغاء',
  loading = false,
  disabled = false,
  destructive = false,
  icon,
  showIcon = true,
  requireConfirmation = false,
  confirmationText = 'CONFIRM',
  confirmationText_ar = 'تأكيد',
}: ConfirmDialogProps) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Get display text
  const displayTitle = isRTL ? (title_ar || title) : title;
  const displayMessage = isRTL ? (message_ar || message) : message;
  const displayConfirmText = isRTL ? (confirmText_ar || confirmText) : confirmText;
  const displayCancelText = isRTL ? (cancelText_ar || cancelText) : cancelText;
  const displayConfirmationText = isRTL ? (confirmationText_ar || confirmationText) : confirmationText;
  
  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setIsConfirming(false);
    }
  }, [isOpen]);
  
  // Handle confirmation
  const handleConfirm = async () => {
    if (requireConfirmation && confirmationInput !== displayConfirmationText) {
      return;
    }
    
    setIsConfirming(true);
    
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };
  
  // Check if confirmation is valid
  const isConfirmationValid = !requireConfirmation || confirmationInput === displayConfirmationText;
  const canConfirm = !disabled && !loading && !isConfirming && isConfirmationValid;
  
  // Get variant styles
  const variantStyles = {
    danger: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-red-600 dark:text-red-400',
      confirmVariant: 'danger' as const,
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      confirmVariant: 'primary' as const,
    },
    success: {
      icon: CheckCircleIcon,
      iconColor: 'text-green-600 dark:text-green-400',
      confirmVariant: 'success' as const,
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: 'text-blue-600 dark:text-blue-400',
      confirmVariant: 'primary' as const,
    },
  };
  
  const styles = variantStyles[variant];
  const IconComponent = icon || styles.icon;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayTitle}
      size={size}
      showHeader={false}
      preventClose={loading || isConfirming}
      className="slms-confirm-dialog"
    >
      <div className="p-6">
        {/* Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          {showIcon && IconComponent && (
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <IconComponent className={`w-6 h-6 ${styles.iconColor}`} />
              </div>
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {displayTitle}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {displayMessage}
            </p>
          </div>
        </div>
        
        {/* Confirmation Input */}
        {requireConfirmation && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {isRTL 
                ? `اكتب "${displayConfirmationText}" للتأكيد:`
                : `Type "${displayConfirmationText}" to confirm:`
              }
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="slms-input"
              placeholder={displayConfirmationText}
              autoComplete="off"
            />
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={loading || isConfirming}
          >
            {displayCancelText}
          </Button>
          
          <Button
            onClick={handleConfirm}
            variant={styles.confirmVariant}
            loading={loading || isConfirming}
            disabled={!canConfirm}
          >
            {displayConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Quick Action Dialogs
// ============================================================================

/**
 * Delete Confirmation Dialog
 */
export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemName_ar,
  ...props
}: Omit<ConfirmDialogProps, 'title' | 'message' | 'variant'> & {
  itemName?: string;
  itemName_ar?: string;
}) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const displayItemName = isRTL ? (itemName_ar || itemName) : itemName;
  
  const title = isRTL ? 'تأكيد الحذف' : 'Confirm Delete';
  const message = displayItemName
    ? (isRTL 
        ? `هل أنت متأكد من حذف "${displayItemName}"؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to delete "${displayItemName}"? This action cannot be undone.`)
    : (isRTL
        ? 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.'
        : 'Are you sure you want to delete this item? This action cannot be undone.');
  
  return (
    <ConfirmDialog
      {...props}
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      variant="danger"
      destructive
      confirmText={isRTL ? 'حذف' : 'Delete'}
      icon={ExclamationTriangleIcon}
    />
  );
}

/**
 * Save Changes Confirmation Dialog
 */
export function SaveChangesDialog({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  ...props
}: Omit<ConfirmDialogProps, 'title' | 'message' | 'onConfirm'> & {
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
}) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const title = isRTL ? 'حفظ التغييرات؟' : 'Save Changes?';
  const message = isRTL
    ? 'لديك تغييرات غير محفوظة. هل تريد حفظها أم تجاهلها؟'
    : 'You have unsaved changes. Do you want to save them or discard them?';
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showHeader={false}
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3">
          <Button onClick={onDiscard} variant="secondary">
            {isRTL ? 'تجاهل' : 'Discard'}
          </Button>
          <Button onClick={onClose} variant="secondary">
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={onSave} variant="primary">
            {isRTL ? 'حفظ' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Modal Utilities
// ============================================================================

/**
 * Modal Hook for easier state management
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  
  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);
  
  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    setIsOpen,
  };
}

/**
 * Confirmation Hook with Promise support
 */
export function useConfirmation() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  
  const confirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        },
      });
    });
  }, []);
  
  const ConfirmationDialog = dialog ? (
    <ConfirmDialog
      isOpen={dialog.isOpen}
      onClose={dialog.onCancel}
      onConfirm={dialog.onConfirm}
      title={dialog.title}
      message={dialog.message}
    />
  ) : null;
  
  return { confirm, ConfirmationDialog };
}

export type {
  ModalProps,
  ConfirmDialogProps,
  ModalSize,
  ModalVariant,
};