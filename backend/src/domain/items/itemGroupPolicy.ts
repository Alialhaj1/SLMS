/**
 * Item Group Policy Domain Layer
 * Hierarchical group protection business logic
 */

import { Pool } from 'pg';
import { ErrorFactory, ApiError } from '../../types/errors';

export interface GroupPolicyValidationResult {
  valid: boolean;
  error?: ApiError;
  childCount?: number;
  itemCount?: number;
}

export interface ItemGroupEntity {
  id: number;
  parent_group_id: number | null;
  [key: string]: any;
}

/**
 * Item Group Policy Guard
 * Enforces hierarchical protection rules
 */
export class ItemGroupPolicyGuard {
  constructor(private pool: Pool) {}

  /**
   * Count child groups
   */
  async countChildren(groupId: number, companyId: number): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS cnt FROM item_groups WHERE parent_group_id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [groupId, companyId]
    );
    return result.rows[0]?.cnt || 0;
  }

  /**
   * Count items in group
   * Checks both legacy group_id and new multi-group assignments
   */
  async countItems(groupId: number): Promise<number> {
    // Legacy items
    const legacyResult = await this.pool.query(
      'SELECT COUNT(*)::int AS cnt FROM items WHERE item_group_id = $1 AND deleted_at IS NULL',
      [groupId]
    );

    // Multi-group assignments
    const assignedResult = await this.pool.query(
      'SELECT COUNT(*)::int AS cnt FROM item_group_assignments WHERE group_id = $1 AND deleted_at IS NULL',
      [groupId]
    );

    const legacyCount = legacyResult.rows[0]?.cnt || 0;
    const assignedCount = assignedResult.rows[0]?.cnt || 0;

    return legacyCount + assignedCount;
  }

  /**
   * Validate group reparenting (changing parent_id)
   */
  async validateReparenting(
    groupId: number,
    companyId: number,
    currentParentId: number | null,
    newParentId: number | null
  ): Promise<GroupPolicyValidationResult> {
    // No change in parent_id → allowed
    if (currentParentId === newParentId) {
      return { valid: true };
    }

    // Check if group has children
    const childCount = await this.countChildren(groupId, companyId);
    if (childCount > 0) {
      return {
        valid: false,
        error: ErrorFactory.groupHasChildren(groupId, childCount),
        childCount,
      };
    }

    // Check if group has items
    const itemCount = await this.countItems(groupId);
    if (itemCount > 0) {
      return {
        valid: false,
        error: ErrorFactory.groupHasItems(groupId, itemCount),
        itemCount,
      };
    }

    return { valid: true };
  }

  /**
   * Validate group deletion
   */
  async validateDeletion(
    groupId: number,
    companyId: number
  ): Promise<GroupPolicyValidationResult> {
    // Check if group has children
    const childCount = await this.countChildren(groupId, companyId);
    if (childCount > 0) {
      return {
        valid: false,
        error: ErrorFactory.groupHasChildren(groupId, childCount),
        childCount,
      };
    }

    // Check if group has items
    const itemCount = await this.countItems(groupId);
    if (itemCount > 0) {
      return {
        valid: false,
        error: ErrorFactory.groupHasItems(groupId, itemCount),
        itemCount,
      };
    }

    return { valid: true };
  }

  /**
   * Get group by ID (helper method)
   */
  async getGroupById(groupId: number, companyId: number): Promise<ItemGroupEntity | null> {
    const result = await this.pool.query(
      'SELECT * FROM item_groups WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [groupId, companyId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

/**
 * Item Group Policy Service
 * High-level orchestration for group policy operations
 */
export class ItemGroupPolicyService {
  private guard: ItemGroupPolicyGuard;

  constructor(pool: Pool) {
    this.guard = new ItemGroupPolicyGuard(pool);
  }

  /**
   * Validate group update (especially reparenting)
   * Throws ApiError if validation fails
   */
  async validateUpdate(
    groupId: number,
    companyId: number,
    updatedFields: Partial<ItemGroupEntity>
  ): Promise<void> {
    // Fetch current group state
    const currentGroup = await this.guard.getGroupById(groupId, companyId);

    if (!currentGroup) {
      throw ErrorFactory.entityNotFound('item_group', groupId);
    }

    // Check if parent_id is being changed
    if (updatedFields.parent_group_id !== undefined) {
      const validation = await this.guard.validateReparenting(
        groupId,
        companyId,
        currentGroup.parent_group_id,
        updatedFields.parent_group_id
      );

      if (!validation.valid) {
        throw validation.error!;
      }
    }
  }

  /**
   * Validate group deletion
   * Throws ApiError if validation fails
   */
  async validateDeletion(groupId: number, companyId: number): Promise<void> {
    const validation = await this.guard.validateDeletion(groupId, companyId);

    if (!validation.valid) {
      throw validation.error!;
    }
  }

  /**
   * Check if group can be safely reparented
   * Returns boolean without throwing
   */
  async canReparent(groupId: number, companyId: number): Promise<boolean> {
    const childCount = await this.guard.countChildren(groupId, companyId);
    const itemCount = await this.guard.countItems(groupId);
    return childCount === 0 && itemCount === 0;
  }

  /**
   * Check if group can be safely deleted
   * Returns boolean without throwing
   */
  async canDelete(groupId: number, companyId: number): Promise<boolean> {
    const childCount = await this.guard.countChildren(groupId, companyId);
    const itemCount = await this.guard.countItems(groupId);
    return childCount === 0 && itemCount === 0;
  }
}

/**
 * Usage Example (in routes):
 * 
 * const policyService = new ItemGroupPolicyService(pool);
 * 
 * try {
 *   await policyService.validateUpdate(groupId, companyId, req.body);
 *   // Proceed with update
 * } catch (error: any) {
 *   return res.status(409).json(error);
 * }
 */
