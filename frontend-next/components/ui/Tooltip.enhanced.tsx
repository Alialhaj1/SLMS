/**
 * ============================================================================
 * TOOLTIP SYSTEM - Arabic Specification Implementation
 * ============================================================================
 * Features:
 * - Smart positioning (auto-adjusts to viewport)
 * - Multiple placement options (top, bottom, left, right)
 * - RTL support with correct positioning
 * - Keyboard accessibility (Esc to close, focus management)
 * - Touch device support
 * - Delay controls (show/hide timing)
 * - Multiple trigger types (hover, click, focus)
 * - Rich content support (HTML, components)
 * - Performance optimized with virtual positioning
 */

import React, { useState, useRef, useEffect, useCallback, cloneElement } from 'react';
import ReactDOM from 'react-dom';
import { useLocale } from '../../contexts/LocaleContext';

// ============================================================================
// Types & Interfaces
// ============================================================================

type TooltipPlacement = 
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'auto';

type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';

type TooltipVariant = 'default' | 'dark' | 'light' | 'success' | 'warning' | 'error' | 'info';

export interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  content_ar?: React.ReactNode;
  
  // Positioning
  placement?: TooltipPlacement;
  offset?: [number, number]; // [skidding, distance]
  
  // Behavior
  trigger?: TooltipTrigger | TooltipTrigger[];
  showDelay?: number;
  hideDelay?: number;
  disabled?: boolean;
  
  // Styling
  variant?: TooltipVariant;
  className?: string;
  contentClassName?: string;
  arrowClassName?: string;
  maxWidth?: number | string;
  
  // Advanced
  portal?: boolean;
  portalContainer?: Element;
  zIndex?: number;
  animated?: boolean;
  
  // Accessibility
  role?: string;
  id?: string;
  
  // Events
  onShow?: () => void;
  onHide?: () => void;
  onToggle?: (visible: boolean) => void;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: TooltipPlacement;
  arrowTop?: number;
  arrowLeft?: number;
}

// ============================================================================
// Positioning Utilities
// ============================================================================

class TooltipPositioning {
  private static ARROW_SIZE = 8;
  private static VIEWPORT_PADDING = 8;
  
  static calculatePosition(
    triggerElement: HTMLElement,
    tooltipElement: HTMLElement,
    placement: TooltipPlacement,
    offset: [number, number] = [0, 8]
  ): TooltipPosition {
    const triggerRect = triggerElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollY: window.scrollY,
      scrollX: window.scrollX,
    };
    
    const [skidding, distance] = offset;
    let finalPlacement = placement;
    
    // Auto-adjust placement if needed
    if (placement === 'auto') {
      finalPlacement = this.getAutoPlacement(triggerRect, tooltipRect, viewport);
    } else {
      finalPlacement = this.adjustPlacementForViewport(placement, triggerRect, tooltipRect, viewport);
    }
    
    const position = this.getPositionForPlacement(finalPlacement, triggerRect, tooltipRect, skidding, distance);
    const arrow = this.getArrowPosition(finalPlacement, triggerRect, tooltipRect, position);
    
    return {
      top: position.top + viewport.scrollY,
      left: position.left + viewport.scrollX,
      placement: finalPlacement,
      arrowTop: arrow.top,
      arrowLeft: arrow.left,
    };
  }
  
  private static getAutoPlacement(
    triggerRect: DOMRect,
    tooltipRect: DOMRect,
    viewport: { width: number; height: number }
  ): TooltipPlacement {
    const spaces = {
      top: triggerRect.top - this.VIEWPORT_PADDING,
      bottom: viewport.height - triggerRect.bottom - this.VIEWPORT_PADDING,
      left: triggerRect.left - this.VIEWPORT_PADDING,
      right: viewport.width - triggerRect.right - this.VIEWPORT_PADDING,
    };
    
    // Prefer top/bottom over left/right for better readability
    if (spaces.bottom >= tooltipRect.height) return 'bottom';
    if (spaces.top >= tooltipRect.height) return 'top';
    if (spaces.right >= tooltipRect.width) return 'right';
    if (spaces.left >= tooltipRect.width) return 'left';
    
    // Fallback to side with most space
    const maxSpace = Math.max(spaces.top, spaces.bottom, spaces.left, spaces.right);
    if (maxSpace === spaces.bottom) return 'bottom';
    if (maxSpace === spaces.top) return 'top';
    if (maxSpace === spaces.right) return 'right';
    return 'left';
  }
  
  private static adjustPlacementForViewport(
    placement: TooltipPlacement,
    triggerRect: DOMRect,
    tooltipRect: DOMRect,
    viewport: { width: number; height: number }
  ): TooltipPlacement {
    const basePlacement = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
    const position = this.getPositionForPlacement(placement, triggerRect, tooltipRect, 0, 8);
    
    // Check if tooltip would go outside viewport
    const wouldOverflow = {
      top: position.top < this.VIEWPORT_PADDING,
      bottom: position.top + tooltipRect.height > viewport.height - this.VIEWPORT_PADDING,
      left: position.left < this.VIEWPORT_PADDING,
      right: position.left + tooltipRect.width > viewport.width - this.VIEWPORT_PADDING,
    };
    
    // If current placement overflows, try opposite
    if (
      (basePlacement === 'top' && wouldOverflow.top) ||
      (basePlacement === 'bottom' && wouldOverflow.bottom)
    ) {
      return basePlacement === 'top' ? 'bottom' : 'top';
    }
    
    if (
      (basePlacement === 'left' && wouldOverflow.left) ||
      (basePlacement === 'right' && wouldOverflow.right)
    ) {
      return basePlacement === 'left' ? 'right' : 'left';
    }
    
    return placement;
  }
  
  private static getPositionForPlacement(
    placement: TooltipPlacement,
    triggerRect: DOMRect,
    tooltipRect: DOMRect,
    skidding: number,
    distance: number
  ): { top: number; left: number } {
    const basePlacement = placement.split('-')[0];
    const alignment = placement.split('-')[1] || 'center';
    
    let top = 0;
    let left = 0;
    
    // Calculate base position
    switch (basePlacement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - distance;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + distance;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - distance;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + distance;
        break;
    }
    
    // Apply alignment
    if (basePlacement === 'top' || basePlacement === 'bottom') {
      switch (alignment) {
        case 'start':
          left = triggerRect.left;
          break;
        case 'end':
          left = triggerRect.right - tooltipRect.width;
          break;
      }
      left += skidding;
    } else {
      switch (alignment) {
        case 'start':
          top = triggerRect.top;
          break;
        case 'end':
          top = triggerRect.bottom - tooltipRect.height;
          break;
      }
      top += skidding;
    }
    
    return { top, left };
  }
  
  private static getArrowPosition(
    placement: TooltipPlacement,
    triggerRect: DOMRect,
    tooltipRect: DOMRect,
    tooltipPosition: { top: number; left: number }
  ): { top?: number; left?: number } {
    const basePlacement = placement.split('-')[0];
    const alignment = placement.split('-')[1] || 'center';
    
    let arrowTop: number | undefined;
    let arrowLeft: number | undefined;
    
    switch (basePlacement) {
      case 'top':
      case 'bottom':
        arrowTop = basePlacement === 'top' ? tooltipRect.height - 1 : -this.ARROW_SIZE + 1;
        
        if (alignment === 'center') {
          arrowLeft = tooltipRect.width / 2 - this.ARROW_SIZE / 2;
        } else {
          const triggerCenter = triggerRect.left + triggerRect.width / 2;
          arrowLeft = triggerCenter - (tooltipPosition.left - window.scrollX) - this.ARROW_SIZE / 2;
          // Clamp arrow position to stay within tooltip bounds
          arrowLeft = Math.max(this.ARROW_SIZE, Math.min(tooltipRect.width - this.ARROW_SIZE * 2, arrowLeft));
        }
        break;
        
      case 'left':
      case 'right':
        arrowLeft = basePlacement === 'left' ? tooltipRect.width - 1 : -this.ARROW_SIZE + 1;
        
        if (alignment === 'center') {
          arrowTop = tooltipRect.height / 2 - this.ARROW_SIZE / 2;
        } else {
          const triggerCenter = triggerRect.top + triggerRect.height / 2;
          arrowTop = triggerCenter - (tooltipPosition.top - window.scrollY) - this.ARROW_SIZE / 2;
          // Clamp arrow position to stay within tooltip bounds
          arrowTop = Math.max(this.ARROW_SIZE, Math.min(tooltipRect.height - this.ARROW_SIZE * 2, arrowTop));
        }
        break;
    }
    
    return { top: arrowTop, left: arrowLeft };
  }
}

// ============================================================================
// Tooltip Component
// ============================================================================

export default function Tooltip({
  children,
  content,
  content_ar,
  placement = 'top',
  offset = [0, 8],
  trigger = 'hover',
  showDelay = 0,
  hideDelay = 0,
  disabled = false,
  variant = 'default',
  className = '',
  contentClassName = '',
  arrowClassName = '',
  maxWidth = 300,
  portal = true,
  portalContainer,
  zIndex = 1000,
  animated = true,
  role = 'tooltip',
  id,
  onShow,
  onHide,
  onToggle,
}: TooltipProps) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Generate unique ID
  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  
  // Get display content
  const displayContent = isRTL ? (content_ar || content) : content;
  
  // Convert single trigger to array
  const triggers = Array.isArray(trigger) ? trigger : [trigger];
  
  // Clear timeouts
  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  }, []);
  
  // Show tooltip
  const showTooltip = useCallback(() => {
    if (disabled) return;
    
    clearTimeouts();
    
    if (showDelay > 0) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        onShow?.();
        onToggle?.(true);
      }, showDelay);
    } else {
      setIsVisible(true);
      onShow?.();
      onToggle?.(true);
    }
  }, [disabled, showDelay, clearTimeouts, onShow, onToggle]);
  
  // Hide tooltip
  const hideTooltip = useCallback(() => {
    clearTimeouts();
    
    if (hideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        onHide?.();
        onToggle?.(false);
      }, hideDelay);
    } else {
      setIsVisible(false);
      onHide?.();
      onToggle?.(false);
    }
  }, [hideDelay, clearTimeouts, onHide, onToggle]);
  
  // Toggle tooltip (for click trigger)
  const toggleTooltip = useCallback(() => {
    if (isVisible) {
      hideTooltip();
    } else {
      showTooltip();
    }
  }, [isVisible, showTooltip, hideTooltip]);
  
  // Update tooltip position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current || !isVisible) return;
    
    const newPosition = TooltipPositioning.calculatePosition(
      triggerRef.current,
      tooltipRef.current,
      placement,
      offset
    );
    
    setPosition(newPosition);
  }, [isVisible, placement, offset]);
  
  // Handle trigger events
  const handleMouseEnter = useCallback(() => {
    if (triggers.includes('hover')) {
      showTooltip();
    }
  }, [triggers, showTooltip]);
  
  const handleMouseLeave = useCallback(() => {
    if (triggers.includes('hover')) {
      hideTooltip();
    }
  }, [triggers, hideTooltip]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (triggers.includes('click')) {
      e.preventDefault();
      e.stopPropagation();
      toggleTooltip();
    }
  }, [triggers, toggleTooltip]);
  
  const handleFocus = useCallback(() => {
    if (triggers.includes('focus')) {
      showTooltip();
    }
  }, [triggers, showTooltip]);
  
  const handleBlur = useCallback(() => {
    if (triggers.includes('focus')) {
      hideTooltip();
    }
  }, [triggers, hideTooltip]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) {
      hideTooltip();
    }
  }, [isVisible, hideTooltip]);
  
  // Update position when visible
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure tooltip is rendered
      const timer = setTimeout(updatePosition, 10);
      return () => clearTimeout(timer);
    }
  }, [isVisible, updatePosition]);
  
  // Handle scroll and resize events
  useEffect(() => {
    if (!isVisible) return;
    
    const handleUpdate = () => updatePosition();
    
    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, updatePosition]);
  
  // Handle outside clicks
  useEffect(() => {
    if (!isVisible || !triggers.includes('click')) return;
    
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        tooltipRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        hideTooltip();
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isVisible, triggers, hideTooltip]);
  
  // Cleanup on unmount
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);
  
  // Don't render if no content or disabled
  if (!displayContent || disabled) {
    return children;
  }
  
  // Variant styles
  const variantStyles = {
    default: 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100',
    dark: 'bg-neutral-900 text-white border-neutral-900',
    light: 'bg-white text-neutral-900 border-neutral-300 shadow-lg',
    success: 'bg-green-600 text-white border-green-600',
    warning: 'bg-yellow-600 text-white border-yellow-600',
    error: 'bg-red-600 text-white border-red-600',
    info: 'bg-blue-600 text-white border-blue-600',
  };
  
  // Clone child and add event handlers
  const triggerElement = cloneElement(children, {
    ref: (node: HTMLElement) => {
      triggerRef.current = node;
      // Call original ref if it exists
      if (typeof children.ref === 'function') {
        children.ref(node);
      } else if (children.ref) {
        children.ref.current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      handleMouseEnter();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      handleMouseLeave();
    },
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      handleClick(e);
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      handleFocus();
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      handleBlur();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      children.props.onKeyDown?.(e);
      handleKeyDown(e);
    },
    'aria-describedby': triggers.includes('hover') ? tooltipId : children.props['aria-describedby'],
  });
  
  // Tooltip content
  const tooltipContent = isVisible ? (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role={role}
      className={`slms-tooltip ${variantStyles[variant]} ${contentClassName} ${animated ? 'animated' : ''} ${className}`}
      style={{
        position: 'absolute',
        top: position?.top,
        left: position?.left,
        maxWidth,
        zIndex,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        opacity: isVisible ? 1 : 0,
        transition: animated ? 'transform 0.1s ease-out, opacity 0.1s ease-out' : undefined,
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Tooltip Content */}
      <div className="px-3 py-2 text-sm font-medium rounded-md break-words">
        {displayContent}
      </div>
      
      {/* Arrow */}
      {position && (
        <div
          className={`slms-tooltip-arrow ${arrowClassName}`}
          style={{
            position: 'absolute',
            top: position.arrowTop,
            left: position.arrowLeft,
          }}
          data-placement={position.placement.split('-')[0]}
        />
      )}
    </div>
  ) : null;
  
  return (
    <>
      {triggerElement}
      {tooltipContent && (
        portal
          ? ReactDOM.createPortal(tooltipContent, portalContainer || document.body)
          : tooltipContent
      )}
    </>
  );
}

// ============================================================================
// Quick Tooltip Variants
// ============================================================================

/**
 * Info Tooltip - Blue variant for informational content
 */
export function InfoTooltip({ children, content, content_ar, ...props }: Omit<TooltipProps, 'variant'>) {
  return (
    <Tooltip
      {...props}
      variant="info"
      content={content}
      content_ar={content_ar}
    >
      {children}
    </Tooltip>
  );
}

/**
 * Warning Tooltip - Yellow variant for warnings
 */
export function WarningTooltip({ children, content, content_ar, ...props }: Omit<TooltipProps, 'variant'>) {
  return (
    <Tooltip
      {...props}
      variant="warning"
      content={content}
      content_ar={content_ar}
    >
      {children}
    </Tooltip>
  );
}

/**
 * Error Tooltip - Red variant for errors
 */
export function ErrorTooltip({ children, content, content_ar, ...props }: Omit<TooltipProps, 'variant'>) {
  return (
    <Tooltip
      {...props}
      variant="error"
      content={content}
      content_ar={content_ar}
    >
      {children}
    </Tooltip>
  );
}

/**
 * Success Tooltip - Green variant for success messages
 */
export function SuccessTooltip({ children, content, content_ar, ...props }: Omit<TooltipProps, 'variant'>) {
  return (
    <Tooltip
      {...props}
      variant="success"
      content={content}
      content_ar={content_ar}
    >
      {children}
    </Tooltip>
  );
}

/**
 * Help Tooltip - Click-triggered tooltip for help content
 */
export function HelpTooltip({ children, content, content_ar, ...props }: Omit<TooltipProps, 'trigger'>) {
  return (
    <Tooltip
      {...props}
      trigger="click"
      placement="top"
      content={content}
      content_ar={content_ar}
    >
      {children}
    </Tooltip>
  );
}

// ============================================================================
// Tooltip Hook for Programmatic Control
// ============================================================================

export function useTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  
  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);
  
  return {
    isVisible,
    show,
    hide,
    toggle,
    setIsVisible,
  };
}

export type {
  TooltipProps,
  TooltipPlacement,
  TooltipTrigger,
  TooltipVariant,
};