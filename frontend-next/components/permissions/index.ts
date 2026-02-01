/**
 * 🔐 PERMISSION COMPONENTS - مكونات الصلاحيات
 * =====================================================
 * 
 * تصدير موحد لجميع مكونات الصلاحيات
 * 
 * @example
 * import { 
 *   PermissionGate,
 *   ProtectedButton,
 *   ProtectedField,
 *   ProtectedLink,
 *   ProtectedCard,
 *   ProtectedAction,
 *   ProtectedDataTable,
 *   withPermission,
 *   MaskedValue,
 * } from '../components/permissions';
 */

export { PermissionGate, withPermission } from './PermissionGate';
export type { PermissionGateProps } from './PermissionGate';

export { ProtectedButton } from './ProtectedButton';
export type { ProtectedButtonProps } from './ProtectedButton';

export { ProtectedField, MaskedValue } from './ProtectedField';
export type { ProtectedFieldProps } from './ProtectedField';

export { ProtectedLink } from './ProtectedLink';
export type { ProtectedLinkProps } from './ProtectedLink';

export { ProtectedCard } from './ProtectedCard';
export type { ProtectedCardProps } from './ProtectedCard';

export { ProtectedAction } from './ProtectedAction';
export type { ProtectedActionProps } from './ProtectedAction';

export { ProtectedDataTable } from './ProtectedDataTable';
export type { ProtectedColumn, ProtectedRowAction } from './ProtectedDataTable';

export { PageGuard } from './PageGuard';
export type { PageGuardProps } from './PageGuard';

// Re-export permission hook and types for convenience
export { usePermissions } from '../../hooks/usePermissions';
export type { PermissionCheckResult } from '../../hooks/usePermissions';
