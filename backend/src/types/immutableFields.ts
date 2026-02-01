/**
 * Immutable Fields Declaration
 * Centralized registry of fields that CANNOT change after creation
 * 
 * CTO Requirement: "Immutable Fields Declaration - ملف يعرّف أي fields لا تتغير بعد creation"
 * 
 * Why this is critical:
 * 1. Single source of truth - All validation logic references this file
 * 2. Testability - Tests can verify immutability rules are enforced
 * 3. Documentation - Developers know which fields are frozen
 * 4. Consistency - Frontend/backend use same rules
 * 5. Audit - Git history shows when immutability rules changed
 * 
 * Usage:
 * - Validation layer
 * - Tests (immutability tests)
 * - UI (disable fields visually)
 * - API documentation
 */

/**
 * Immutability rule types
 */
export enum ImmutabilityRule {
  ALWAYS = 'always', // Never changes after creation
  AFTER_MOVEMENT = 'after_movement', // Changes until first inventory movement
  AFTER_APPROVAL = 'after_approval', // Changes until approved
  AFTER_POSTING = 'after_posting', // Changes until posted to accounting
}

/**
 * Field immutability configuration
 */
export interface FieldImmutability {
  field: string;
  rule: ImmutabilityRule;
  reason: string; // Why this field is immutable
  allowedRoles?: string[]; // Roles that can override (e.g., ['super_admin'])
}

/**
 * Immutable Fields Registry
 */
export const ImmutableFields = {
  /**
   * Items (master/items)
   */
  items: [
    {
      field: 'code',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Item code is the unique identifier used in reports, integrations, and accounting',
    },
    {
      field: 'base_uom_id',
      rule: ImmutabilityRule.AFTER_MOVEMENT,
      reason: 'Base UOM affects inventory calculations and cannot change after movement',
    },
    {
      field: 'tracking_policy',
      rule: ImmutabilityRule.AFTER_MOVEMENT,
      reason: 'Tracking policy determines serial/batch/lot tracking and cannot change after movement',
    },
    {
      field: 'valuation_method',
      rule: ImmutabilityRule.AFTER_MOVEMENT,
      reason: 'Valuation method (FIFO/LIFO/Avg Cost) affects accounting and cannot change after movement',
    },
    {
      field: 'is_composite',
      rule: ImmutabilityRule.AFTER_MOVEMENT,
      reason: 'Composite flag affects BOM structure and cannot change after movement',
    },
  ] as FieldImmutability[],

  /**
   * Item Groups (master/item_groups)
   */
  itemGroups: [
    {
      field: 'code',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Group code is used in accounting chart and cannot change',
    },
    {
      field: 'parent_id',
      rule: ImmutabilityRule.AFTER_MOVEMENT,
      reason: 'Parent group affects accounting hierarchy and cannot change after items have movement',
    },
  ] as FieldImmutability[],

  /**
   * Shipments (operations/shipments)
   */
  shipments: [
    {
      field: 'shipment_number',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Shipment number is the unique reference for customs, invoices, and tracking',
    },
    {
      field: 'company_id',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Company ownership cannot change (multi-tenant isolation)',
    },
  ] as FieldImmutability[],

  /**
   * Expenses (operations/expenses)
   */
  expenses: [
    {
      field: 'expense_number',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Expense number is the unique reference for accounting and audit',
    },
    {
      field: 'expense_date',
      rule: ImmutabilityRule.AFTER_POSTING,
      reason: 'Expense date cannot change after posted to accounting (fiscal period lock)',
    },
    {
      field: 'company_id',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Company ownership cannot change (multi-tenant isolation)',
    },
  ] as FieldImmutability[],

  /**
   * Warehouses (master/warehouses)
   */
  warehouses: [
    {
      field: 'code',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Warehouse code is used in inventory reports and accounting',
    },
    {
      field: 'company_id',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Company ownership cannot change (multi-tenant isolation)',
    },
  ] as FieldImmutability[],

  /**
   * Suppliers (partners/suppliers)
   */
  suppliers: [
    {
      field: 'code',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Supplier code is used in accounting and purchase orders',
    },
    {
      field: 'company_id',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Company ownership cannot change (multi-tenant isolation)',
    },
  ] as FieldImmutability[],

  /**
   * Customers (partners/customers)
   */
  customers: [
    {
      field: 'code',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Customer code is used in accounting and sales orders',
    },
    {
      field: 'company_id',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Company ownership cannot change (multi-tenant isolation)',
    },
  ] as FieldImmutability[],

  /**
   * Users (system/users)
   */
  users: [
    {
      field: 'email',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Email is the unique login identifier and cannot change',
      allowedRoles: ['super_admin'], // Only super_admin can change user email
    },
    {
      field: 'company_id',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'User cannot switch companies (security isolation)',
      allowedRoles: ['super_admin'],
    },
  ] as FieldImmutability[],

  /**
   * Companies (system/companies)
   */
  companies: [
    {
      field: 'code',
      rule: ImmutabilityRule.ALWAYS,
      reason: 'Company code is used in multi-tenant routing and accounting',
    },
  ] as FieldImmutability[],
};

/**
 * Helper Functions
 */
export class ImmutabilityHelper {
  /**
   * Get immutable fields for entity
   */
  static getImmutableFields(entityType: string): FieldImmutability[] {
    return ImmutableFields[entityType as keyof typeof ImmutableFields] || [];
  }

  /**
   * Check if field is immutable
   */
  static isFieldImmutable(entityType: string, fieldName: string, rule: ImmutabilityRule): boolean {
    const fields = this.getImmutableFields(entityType);
    const field = fields.find((f) => f.field === fieldName);
    return field ? field.rule === rule || field.rule === ImmutabilityRule.ALWAYS : false;
  }

  /**
   * Get immutability reason
   */
  static getReason(entityType: string, fieldName: string): string | null {
    const fields = this.getImmutableFields(entityType);
    const field = fields.find((f) => f.field === fieldName);
    return field?.reason || null;
  }

  /**
   * Check if user can override immutability
   */
  static canOverride(entityType: string, fieldName: string, userRole: string): boolean {
    const fields = this.getImmutableFields(entityType);
    const field = fields.find((f) => f.field === fieldName);

    if (!field) return false;

    // Always immutable fields cannot be overridden (except by allowed roles)
    if (field.rule === ImmutabilityRule.ALWAYS) {
      return field.allowedRoles?.includes(userRole) || false;
    }

    // Other rules can be overridden with proper permissions
    return true;
  }

  /**
   * Get all immutable field names for entity
   */
  static getImmutableFieldNames(entityType: string, rule?: ImmutabilityRule): string[] {
    const fields = this.getImmutableFields(entityType);
    if (rule) {
      return fields.filter((f) => f.rule === rule).map((f) => f.field);
    }
    return fields.map((f) => f.field);
  }

  /**
   * Validate update payload against immutability rules
   */
  static validateUpdate(
    entityType: string,
    updatePayload: Record<string, any>,
    currentState: Record<string, any>,
    rule: ImmutabilityRule
  ): { valid: boolean; violations: Array<{ field: string; reason: string }> } {
    const violations: Array<{ field: string; reason: string }> = [];
    const immutableFields = this.getImmutableFields(entityType).filter(
      (f) => f.rule === rule || f.rule === ImmutabilityRule.ALWAYS
    );

    for (const field of immutableFields) {
      if (
        updatePayload[field.field] !== undefined &&
        updatePayload[field.field] !== currentState[field.field]
      ) {
        violations.push({
          field: field.field,
          reason: field.reason,
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

/**
 * Usage Examples:
 * 
 * // In validation layer
 * import { ImmutableFields, ImmutabilityHelper, ImmutabilityRule } from '../types/immutableFields';
 * 
 * // Check if field is immutable after movement
 * if (hasMovement) {
 *   const validation = ImmutabilityHelper.validateUpdate(
 *     'items',
 *     updatePayload,
 *     currentItem,
 *     ImmutabilityRule.AFTER_MOVEMENT
 *   );
 * 
 *   if (!validation.valid) {
 *     return ErrorResponseBuilder.conflict(res, {
 *       code: ErrorCode.ITEM_POLICY_LOCKED,
 *       message: 'Cannot modify locked fields',
 *       fields: validation.violations.map(v => v.field),
 *       hint: validation.violations[0].reason,
 *     });
 *   }
 * }
 * 
 * // In tests
 * const immutableFields = ImmutabilityHelper.getImmutableFieldNames('items', ImmutabilityRule.AFTER_MOVEMENT);
 * expect(immutableFields).toContain('base_uom_id');
 * 
 * // In UI
 * const isImmutable = ImmutabilityHelper.isFieldImmutable('items', 'base_uom_id', ImmutabilityRule.AFTER_MOVEMENT);
 * <Input disabled={hasMovement && isImmutable} />
 */
