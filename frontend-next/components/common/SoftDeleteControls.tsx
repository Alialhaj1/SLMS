/**
 * Soft Delete Recovery Component
 * مكون قابل لإعادة الاستخدام لإدارة البيانات المحذوفة
 * يوفر: View Deleted, Restore, Permanent Delete
 */

import { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { TrashIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SoftDeleteControlsProps {
  /**
   * Base permission name (e.g., 'users', 'companies', 'shipments')
   */
  resource: string;
  
  /**
   * Whether to show deleted items
   */
  showDeleted: boolean;
  
  /**
   * Callback when show deleted toggle changes
   */
  onToggleShowDeleted: (show: boolean) => void;
  
  /**
   * Custom styling for the toggle button
   */
  className?: string;
}

interface SoftDeleteActionsProps {
  /**
   * Base permission name (e.g., 'users', 'companies', 'shipments')
   */
  resource: string;
  
  /**
   * ID of the item to restore/delete permanently
   */
  itemId: number | string;
  
  /**
   * Display name of the item (for confirmation messages)
   */
  itemName: string;
  
  /**
   * Callback after successful restore
   */
  onRestoreSuccess?: () => void;
  
  /**
   * Callback after successful permanent delete
   */
  onPermanentDeleteSuccess?: () => void;
  
  /**
   * Custom API endpoint (if different from default pattern)
   */
  apiEndpoint?: string;
}

/**
 * Toggle button for showing/hiding deleted items
 */
export function SoftDeleteToggle({ 
  resource, 
  showDeleted, 
  onToggleShowDeleted,
  className = ''
}: SoftDeleteControlsProps) {
  const { can } = usePermissions();
  const viewDeletedPermission = `${resource}:view_deleted`;
  
  if (!can(viewDeletedPermission)) {
    return null;
  }
  
  return (
    <Button
      variant={showDeleted ? 'primary' : 'secondary'}
      onClick={() => onToggleShowDeleted(!showDeleted)}
      className={className}
    >
      <TrashIcon className="w-5 h-5" />
      {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
    </Button>
  );
}

/**
 * Action buttons for restoring or permanently deleting an item
 */
export function SoftDeleteActions({
  resource,
  itemId,
  itemName,
  onRestoreSuccess,
  onPermanentDeleteSuccess,
  apiEndpoint
}: SoftDeleteActionsProps) {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const [restoring, setRestoring] = useState(false);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  
  const restorePermission = `${resource}:restore`;
  const permanentDeletePermission = `${resource}:permanent_delete`;
  
  const baseUrl = apiEndpoint || `http://localhost:4000/api/${resource}`;
  
  const handleRestore = async () => {
    if (!can(restorePermission)) {
      showToast('You do not have permission to restore items', 'error');
      return;
    }
    
    setRestoring(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${baseUrl}/${itemId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        showToast(`${itemName} restored successfully`, 'success');
        onRestoreSuccess?.();
      } else {
        const error = await res.json();
        showToast(error.message || 'Failed to restore item', 'error');
      }
    } catch (error) {
      showToast('An error occurred while restoring', 'error');
    } finally {
      setRestoring(false);
    }
  };
  
  const handlePermanentDelete = async () => {
    if (!can(permanentDeletePermission)) {
      showToast('You do not have permission to permanently delete items', 'error');
      return;
    }
    
    setPermanentDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${baseUrl}/${itemId}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        showToast(`${itemName} permanently deleted`, 'success');
        setShowPermanentDeleteConfirm(false);
        onPermanentDeleteSuccess?.();
      } else {
        const error = await res.json();
        showToast(error.message || 'Failed to permanently delete item', 'error');
      }
    } catch (error) {
      showToast('An error occurred while deleting', 'error');
    } finally {
      setPermanentDeleting(false);
    }
  };
  
  return (
    <div className="flex gap-2">
      {can(restorePermission) && (
        <Button
          size="sm"
          variant="primary"
          onClick={handleRestore}
          loading={restoring}
          title="Restore this item"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Restore
        </Button>
      )}
      
      {can(permanentDeletePermission) && (
        <>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowPermanentDeleteConfirm(true)}
            title="Permanently delete this item (cannot be undone)"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            Delete Forever
          </Button>
          
          <ConfirmDialog
            isOpen={showPermanentDeleteConfirm}
            onClose={() => setShowPermanentDeleteConfirm(false)}
            onConfirm={handlePermanentDelete}
            title="Permanent Delete"
            message={`Are you sure you want to permanently delete "${itemName}"? \n\n⚠️ WARNING: This action cannot be undone! The item will be removed from the database permanently and cannot be recovered.`}
            confirmText="Yes, Delete Permanently"
            variant="danger"
            loading={permanentDeleting}
          />
        </>
      )}
    </div>
  );
}

/**
 * Badge to indicate an item is deleted (soft deleted)
 */
export function DeletedBadge({ deletedAt }: { deletedAt?: string | null }) {
  if (!deletedAt) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded">
      <TrashIcon className="w-3 h-3" />
      Deleted
    </span>
  );
}

/**
 * Complete Soft Delete Controls Panel
 * Includes toggle button and info about deleted items
 */
export function SoftDeletePanel({ 
  resource, 
  showDeleted, 
  onToggleShowDeleted,
  deletedCount = 0
}: SoftDeleteControlsProps & { deletedCount?: number }) {
  const { can } = usePermissions();
  const viewDeletedPermission = `${resource}:view_deleted`;
  
  if (!can(viewDeletedPermission)) {
    return null;
  }
  
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrashIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
              Deleted Items
            </h3>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {showDeleted 
                ? `Showing ${deletedCount} deleted item${deletedCount !== 1 ? 's' : ''}`
                : 'Click to view deleted items'}
            </p>
          </div>
        </div>
        <Button
          variant={showDeleted ? 'primary' : 'secondary'}
          onClick={() => onToggleShowDeleted(!showDeleted)}
        >
          {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
        </Button>
      </div>
    </div>
  );
}

export default {
  SoftDeleteToggle,
  SoftDeleteActions,
  DeletedBadge,
  SoftDeletePanel
};
