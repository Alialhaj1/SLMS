/**
 * 🔐 Permission Components Index
 * =====================================================
 * Re-export all permission-aware components
 */

export {
  PermissionButton,
  PermissionCard,
  PermissionColumn,
  PermissionField,
  PermissionSection,
  PermissionGate,
  usePermissionColumns,
} from './PermissionComponents';

export {
  PermissionDebugProvider,
  useDebugMode,
  withPermissionDebug,
} from './PermissionDebug';

// Note: CSS must be imported in _app.tsx, not here
// import '@/styles/permission-components.css';
