/**
 * Item Policy Domain Layer
 * Enterprise-grade business logic isolation
 * 
 * Separates policy validation from HTTP layer
 */

import { Pool } from 'pg';
import { ErrorFactory, ApiError } from '../../types/errors';

export interface ItemPolicyValidationResult {
  valid: boolean;
  error?: ApiError;
  lockedFields?: string[];
}

export interface ItemEntity {
  id: number;
  base_uom_id: number;
  tracking_policy: string;
  valuation_method: string;
  is_composite: boolean;
  [key: string]: any;
}

/**
 * Item Policy Guard
 * Enforces business rules for item modifications
 */
export class ItemPolicyGuard {
  constructor(private pool: Pool) {}

  /**
   * Check if item has inventory movements
   * Uses item_has_movement() database function
   */
  async hasMovement(itemId: number): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT item_has_movement($1) as has_movement',
      [itemId]
    );
    return result.rows[0]?.has_movement || false;
  }

  /**
   * Validate policy field changes
   * Returns validation result with detailed error if invalid
   */
  async validatePolicyChange(
    itemId: number,
    currentItem: ItemEntity,
    updatedFields: Partial<ItemEntity>
  ): Promise<ItemPolicyValidationResult> {
    // Check if item has movements
    const hasMovement = await this.hasMovement(itemId);

    if (!hasMovement) {
      // No movements → all changes allowed
      return { valid: true };
    }

    // Item has movements → check for locked field changes
    const lockedFields: string[] = [];

    // Define policy fields (locked after first movement)
    const policyFields = {
      base_uom_id: 'number',
      tracking_policy: 'string',
      valuation_method: 'string',
      is_composite: 'boolean',
    };

    // Check each policy field for changes
    for (const [field, type] of Object.entries(policyFields)) {
      if (updatedFields[field] === undefined) {
        continue; // Field not being updated
      }

      let isChanged = false;

      if (type === 'boolean') {
        isChanged = Boolean(updatedFields[field]) !== Boolean(currentItem[field]);
      } else if (type === 'number') {
        isChanged = Number(updatedFields[field]) !== Number(currentItem[field]);
      } else {
        isChanged = updatedFields[field] !== currentItem[field];
      }

      if (isChanged) {
        lockedFields.push(field);
      }
    }

    if (lockedFields.length > 0) {
      return {
        valid: false,
        error: ErrorFactory.itemPolicyLocked(itemId, lockedFields),
        lockedFields,
      };
    }

    return { valid: true };
  }

  /**
   * Validate item deletion
   * Returns validation result with detailed error if invalid
   */
  async validateDeletion(itemId: number): Promise<ItemPolicyValidationResult> {
    const hasMovement = await this.hasMovement(itemId);

    if (hasMovement) {
      return {
        valid: false,
        error: ErrorFactory.itemHasMovement(itemId),
      };
    }

    return { valid: true };
  }

  /**
   * Get item by ID (helper method)
   */
  async getItemById(itemId: number, companyId: number): Promise<ItemEntity | null> {
    const result = await this.pool.query(
      'SELECT * FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [itemId, companyId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

/**
 * Item Policy Service
 * High-level orchestration for item policy operations
 */
export class ItemPolicyService {
  private guard: ItemPolicyGuard;

  constructor(pool: Pool) {
    this.guard = new ItemPolicyGuard(pool);
  }

  /**
   * Validate and prepare item update
   * Throws ApiError if validation fails
   */
  async validateUpdate(
    itemId: number,
    companyId: number,
    updatedFields: Partial<ItemEntity>
  ): Promise<void> {
    // Fetch current item state
    const currentItem = await this.guard.getItemById(itemId, companyId);

    if (!currentItem) {
      throw ErrorFactory.entityNotFound('item', itemId);
    }

    // Validate policy changes
    const validation = await this.guard.validatePolicyChange(
      itemId,
      currentItem,
      updatedFields
    );

    if (!validation.valid) {
      throw validation.error!;
    }
  }

  /**
   * Validate item deletion
   * Throws ApiError if validation fails
   */
  async validateDeletion(itemId: number): Promise<void> {
    const validation = await this.guard.validateDeletion(itemId);

    if (!validation.valid) {
      throw validation.error!;
    }
  }

  /**
   * Check if item can be safely modified
   * Returns boolean without throwing
   */
  async canModifyPolicies(itemId: number): Promise<boolean> {
    return !(await this.guard.hasMovement(itemId));
  }

  /**
   * Check if item can be safely deleted
   * Returns boolean without throwing
   */
  async canDelete(itemId: number): Promise<boolean> {
    return !(await this.guard.hasMovement(itemId));
  }
}

/**
 * Usage Example (in routes):
 * 
 * const policyService = new ItemPolicyService(pool);
 * 
 * try {
 *   await policyService.validateUpdate(itemId, companyId, req.body);
 *   // Proceed with update
 * } catch (error: any) {
 *   return res.status(409).json(error);
 * }
 */
