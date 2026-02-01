/**
 * Standardized Error Contracts
 * Frontend copy of error types from backend
 * Keep in sync with backend/src/types/errors.ts
 */

export interface ApiError {
  error: {
    code: string;
    message: string;
    entity?: string;
    entity_id?: number;
    field?: string;
    fields?: string[];
    hint?: string;
    details?: Record<string, any>;
  };
}

/**
 * Error Codes Registry
 * Centralized error code definitions
 */
export enum ErrorCode {
  // Policy Violations
  ITEM_POLICY_LOCKED = 'ITEM_POLICY_LOCKED',
  ITEM_HAS_MOVEMENT = 'ITEM_HAS_MOVEMENT',
  GROUP_HAS_CHILDREN = 'GROUP_HAS_CHILDREN',
  GROUP_HAS_ITEMS = 'GROUP_HAS_ITEMS',

  // Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_CODE = 'DUPLICATE_CODE',
  INVALID_REFERENCE = 'INVALID_REFERENCE',

  // Not Found
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',

  // Business Logic
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
}
