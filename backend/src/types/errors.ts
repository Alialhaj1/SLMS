/**
 * Standardized Error Contracts
 * Enterprise-grade error responses with hints and context
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

/**
 * Error Factory Functions
 */
export class ErrorFactory {
  /**
   * Item policy locked error (409)
   */
  static itemPolicyLocked(
    entityId: number,
    lockedFields: string[],
    hint?: string
  ): ApiError {
    const fieldList = lockedFields.join(', ');
    return {
      error: {
        code: ErrorCode.ITEM_POLICY_LOCKED,
        message: `Cannot modify locked fields: ${fieldList}. Item has inventory movements.`,
        entity: 'item',
        entity_id: entityId,
        fields: lockedFields,
        hint: hint || 'Policy fields are locked after first inventory movement. Create a new item instead.',
      },
    };
  }

  /**
   * Item has movement error (409)
   */
  static itemHasMovement(entityId: number): ApiError {
    return {
      error: {
        code: ErrorCode.ITEM_HAS_MOVEMENT,
        message: 'Cannot delete item. Item has inventory movements.',
        entity: 'item',
        entity_id: entityId,
        hint: 'To remove this item from active use, set is_active=false instead of deleting.',
      },
    };
  }

  /**
   * Group has children error (409)
   */
  static groupHasChildren(entityId: number, childCount?: number): ApiError {
    return {
      error: {
        code: ErrorCode.GROUP_HAS_CHILDREN,
        message: 'Cannot modify/delete group. Group has child groups.',
        entity: 'item_group',
        entity_id: entityId,
        hint: childCount
          ? `This group has ${childCount} child group(s). Move or delete them first.`
          : 'Move or delete child groups before performing this operation.',
      },
    };
  }

  /**
   * Group has items error (409)
   */
  static groupHasItems(entityId: number, itemCount?: number): ApiError {
    return {
      error: {
        code: ErrorCode.GROUP_HAS_ITEMS,
        message: 'Cannot modify/delete group. Group has items.',
        entity: 'item_group',
        entity_id: entityId,
        hint: itemCount
          ? `This group has ${itemCount} item(s). Move them to another group first.`
          : 'Move items to another group before performing this operation.',
      },
    };
  }

  /**
   * Entity not found error (404)
   */
  static entityNotFound(entity: string, id: number | string): ApiError {
    return {
      error: {
        code: ErrorCode.ENTITY_NOT_FOUND,
        message: `${entity} with id ${id} not found.`,
        entity,
        entity_id: typeof id === 'number' ? id : undefined,
      },
    };
  }

  /**
   * Validation error (400)
   */
  static validationError(field: string, message: string): ApiError {
    return {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message,
        field,
      },
    };
  }

  /**
   * Duplicate code error (409)
   */
  static duplicateCode(entity: string, code: string): ApiError {
    return {
      error: {
        code: ErrorCode.DUPLICATE_CODE,
        message: `${entity} with code '${code}' already exists.`,
        entity,
        field: 'code',
        hint: 'Choose a unique code for this entity.',
      },
    };
  }

  /**
   * Unauthorized error (401)
   */
  static unauthorized(message?: string): ApiError {
    return {
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: message || 'Authentication required.',
        hint: 'Provide a valid access token in Authorization header.',
      },
    };
  }

  /**
   * Forbidden error (403)
   */
  static forbidden(requiredPermission?: string): ApiError {
    return {
      error: {
        code: ErrorCode.FORBIDDEN,
        message: 'You do not have permission to perform this action.',
        hint: requiredPermission
          ? `Required permission: ${requiredPermission}`
          : 'Contact your administrator to request access.',
      },
    };
  }
}

/**
 * Error Response Helper
 * Type-safe error response with HTTP status
 */
export interface ErrorResponse {
  status: number;
  body: ApiError;
}

export class ErrorResponseBuilder {
  static conflict(error: ApiError): ErrorResponse {
    return { status: 409, body: error };
  }

  static notFound(error: ApiError): ErrorResponse {
    return { status: 404, body: error };
  }

  static badRequest(error: ApiError): ErrorResponse {
    return { status: 400, body: error };
  }

  static unauthorized(error: ApiError): ErrorResponse {
    return { status: 401, body: error };
  }

  static forbidden(error: ApiError): ErrorResponse {
    return { status: 403, body: error };
  }

  static internalError(message?: string): ErrorResponse {
    return {
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: message || 'An unexpected error occurred.',
          hint: 'Please try again later or contact support.',
        },
      },
    };
  }
}
