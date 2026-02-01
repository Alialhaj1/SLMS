/**
 * 🔔 TOAST TYPES
 * ==============
 * Single Source of Truth for toast notifications
 * 
 * ⚠️ RULE: Always use ToastPayload to avoid parameter order confusion
 * 
 * Usage:
 * showToast({ message: 'Saved!', type: 'success' });
 */

// ═══════════════════════════════════════════════════════════════
// TOAST TYPES
// ═══════════════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastPayload {
  message: string;
  type: ToastType;
  duration?: number;  // milliseconds, optional
}

// ═══════════════════════════════════════════════════════════════
// TOAST HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a success toast payload
 */
export function successToast(message: string, duration?: number): ToastPayload {
  return { message, type: 'success', duration };
}

/**
 * Create an error toast payload
 */
export function errorToast(message: string, duration?: number): ToastPayload {
  return { message, type: 'error', duration };
}

/**
 * Create a warning toast payload
 */
export function warningToast(message: string, duration?: number): ToastPayload {
  return { message, type: 'warning', duration };
}

/**
 * Create an info toast payload
 */
export function infoToast(message: string, duration?: number): ToastPayload {
  return { message, type: 'info', duration };
}

// ═══════════════════════════════════════════════════════════════
// COMMON MESSAGES (for consistency across app)
// ═══════════════════════════════════════════════════════════════

export const ToastMessages = {
  // Success
  SAVED: 'Saved successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  
  // Errors
  SAVE_FAILED: 'Failed to save',
  CREATE_FAILED: 'Failed to create',
  UPDATE_FAILED: 'Failed to update',
  DELETE_FAILED: 'Failed to delete',
  LOAD_FAILED: 'Failed to load data',
  NETWORK_ERROR: 'Network error. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  
  // Validation
  REQUIRED_FIELDS: 'Please fill in all required fields',
  INVALID_INPUT: 'Please check your input',
} as const;
