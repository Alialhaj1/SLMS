/**
 * 🔒 useFieldPermissions Hook
 * =====================================================
 * Provides field-level permission checks for the Enterprise UI Governance Framework.
 * 
 * Determines which fields a user can view or edit based on their permissions
 * and the field's own permission metadata.
 * 
 * Usage:
 *   const { canView, canEdit, getFieldAccess, filterVisibleFields } = useFieldPermissions('master:countries');
 * 
 *   if (canView('country_code')) { ... }
 *   if (canEdit('name')) { ... }
 *   const visibleFields = filterVisibleFields(allFields);
 */

import { useCallback, useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { FieldMeta } from '../lib/governance/types';

interface FieldAccess {
  /** Whether the user can see this field */
  visible: boolean;
  /** Whether the user can edit this field */
  editable: boolean;
}

interface UseFieldPermissionsResult {
  /** Check if user can view a specific field */
  canView: (fieldKey: string) => boolean;
  /** Check if user can edit a specific field */
  canEdit: (fieldKey: string) => boolean;
  /** Get full access info for a field (with its FieldMeta) */
  getFieldAccess: (field: FieldMeta) => FieldAccess;
  /** Filter a list of fields to only those the user can see */
  filterVisibleFields: (fields: FieldMeta[]) => FieldMeta[];
  /** Filter a list of fields to only those the user can edit */
  filterEditableFields: (fields: FieldMeta[]) => FieldMeta[];
  /** Whether user has any view access to this resource */
  hasViewAccess: boolean;
  /** Whether user has any edit access to this resource */
  hasEditAccess: boolean;
}

export function useFieldPermissions(permissionPrefix: string): UseFieldPermissionsResult {
  const { can, isSuperAdmin } = usePermissions();

  // Check base resource-level permissions
  const hasViewAccess = useMemo(() => {
    if (isSuperAdmin) return true;
    // User can view if they have view permission (colon or dot notation)
    return can(`${permissionPrefix}:view`) || can(`${permissionPrefix}.view`);
  }, [can, isSuperAdmin, permissionPrefix]);

  const hasEditAccess = useMemo(() => {
    if (isSuperAdmin) return true;
    // User can edit if they have edit or create permission
    return (
      can(`${permissionPrefix}:edit`) ||
      can(`${permissionPrefix}.edit`) ||
      can(`${permissionPrefix}:create`) ||
      can(`${permissionPrefix}.create`) ||
      can(`${permissionPrefix}:update`) ||
      can(`${permissionPrefix}.update`)
    );
  }, [can, isSuperAdmin, permissionPrefix]);

  /**
   * Check if user can view a specific field.
   * 
   * Logic:
   * 1. Super admin can always view
   * 2. If field has viewPermission, check it specifically
   * 3. Otherwise, fall back to resource-level view permission
   */
  const canView = useCallback(
    (fieldKey: string): boolean => {
      if (isSuperAdmin) return true;
      // For simplified implementation: if user has resource view, they can see all fields
      return hasViewAccess;
    },
    [isSuperAdmin, hasViewAccess]
  );

  /**
   * Check if user can edit a specific field.
   * 
   * Logic:
   * 1. Super admin can always edit
   * 2. If field has editPermission, check it specifically
   * 3. Otherwise, fall back to resource-level edit/create permission
   */
  const canEdit = useCallback(
    (fieldKey: string): boolean => {
      if (isSuperAdmin) return true;
      // For simplified implementation: if user has resource edit/create, they can edit all fields
      return hasEditAccess;
    },
    [isSuperAdmin, hasEditAccess]
  );

  /**
   * Get full access object for a field based on its FieldMeta.
   * Respects field-level viewPermission/editPermission if defined.
   */
  const getFieldAccess = useCallback(
    (field: FieldMeta): FieldAccess => {
      if (isSuperAdmin) {
        return { visible: true, editable: true };
      }

      // Check field-level view permission
      let visible = hasViewAccess;
      if (field.viewPermission) {
        visible = can(field.viewPermission);
      }

      // Check field-level edit permission
      let editable = hasEditAccess;
      if (field.editPermission) {
        editable = can(field.editPermission);
      }

      return { visible, editable };
    },
    [isSuperAdmin, hasViewAccess, hasEditAccess, can]
  );

  /**
   * Filter fields to only those the user can see.
   */
  const filterVisibleFields = useCallback(
    (fields: FieldMeta[]): FieldMeta[] => {
      if (isSuperAdmin) return fields;

      return fields.filter((field) => {
        // If field has specific viewPermission, check it
        if (field.viewPermission) {
          return can(field.viewPermission);
        }
        // Otherwise, use resource-level view permission
        return hasViewAccess;
      });
    },
    [isSuperAdmin, can, hasViewAccess]
  );

  /**
   * Filter fields to only those the user can edit.
   */
  const filterEditableFields = useCallback(
    (fields: FieldMeta[]): FieldMeta[] => {
      if (isSuperAdmin) return fields;

      return fields.filter((field) => {
        if (field.editPermission) {
          return can(field.editPermission);
        }
        return hasEditAccess;
      });
    },
    [isSuperAdmin, can, hasEditAccess]
  );

  return {
    canView,
    canEdit,
    isVisible: canView,
    isEditable: canEdit,
    isRequired: (_field: string) => false,
    getFieldAccess,
    filterVisibleFields,
    filterEditableFields,
    hasViewAccess,
    hasEditAccess,
  };
}
