/**
 * Entity Access Control API Routes
 * =================================
 * Manages granular user access to branches, warehouses, and cost centers.
 * 
 * Endpoints:
 *   GET    /api/entity-access/user/:userId              — Full access summary for a user
 *   GET    /api/entity-access/user/:userId/:entityType   — Access records by entity type
 *   GET    /api/entity-access/:entityType/:entityId/users — Users with access to an entity
 *   POST   /api/entity-access/assign                     — Assign/update user-entity access
 *   POST   /api/entity-access/bulk-assign                — Bulk assign user to multiple entities
 *   DELETE /api/entity-access/:entityType/:entityId/user/:userId — Remove access
 *   GET    /api/entity-access/check                      — Check specific permission
 *   GET    /api/entity-access/my-access                  — Current user's own access summary
 *   GET    /api/entity-access/available-entities          — Lookup for branch/warehouse/cost_center lists
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../middleware/auditLog';
import pool from '../db';
import EntityAccessService, { EntityType, EntityPermissions } from '../services/entityAccessService';
import { clearBranchAccessCache } from '../middleware/branchAccess';

const router = Router();

router.use(authenticate);

// Helper: get tenant_id from JWT
function getTenantId(req: Request): number | null {
  return (req as any).user?.tenant_id ?? null;
}

function getUserId(req: Request): number {
  return (req as any).user?.id || (req as any).user?.sub;
}

const VALID_ENTITY_TYPES: EntityType[] = ['branch', 'warehouse', 'cost_center'];

function isValidEntityType(t: string): t is EntityType {
  return VALID_ENTITY_TYPES.includes(t as EntityType);
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /my-access — Current user's own entity access
// ═══════════════════════════════════════════════════════════════════════════
router.get('/my-access', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.json({ success: true, data: { branches: [], warehouses: [], cost_centers: [] } });
    }

    const access = await EntityAccessService.getUserAccess(userId, tenantId);
    res.json({ success: true, data: access });
  } catch (error: any) {
    console.error('Error fetching my access:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /available-entities — Lookup: branches/warehouses/cost_centers for selectors
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/available-entities',
  requirePermission('entity_access:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.json({ success: true, data: { branches: [], warehouses: [], cost_centers: [] } });
      }

      const [branches, warehouses, costCenters] = await Promise.all([
        pool.query(
          `SELECT b.id, b.code, b.name, b.name_ar, b.type, b.is_active
           FROM branches b INNER JOIN companies c ON b.company_id = c.id
           WHERE c.tenant_id = $1 AND b.deleted_at IS NULL ORDER BY b.name`,
          [tenantId]
        ),
        pool.query(
          `SELECT w.id, w.code, w.name, w.name_ar, w.warehouse_type, w.is_active, b.name AS branch_name
           FROM warehouses w
           INNER JOIN companies c ON w.company_id = c.id
           LEFT JOIN branches b ON w.branch_id = b.id
           WHERE c.tenant_id = $1 AND w.deleted_at IS NULL ORDER BY w.name`,
          [tenantId]
        ),
        pool.query(
          `SELECT cc.id, cc.code, cc.name, cc.name_ar, cc.level, cc.is_group, cc.is_active
           FROM cost_centers cc INNER JOIN companies c ON cc.company_id = c.id
           WHERE c.tenant_id = $1 ORDER BY cc.code`,
          [tenantId]
        ),
      ]);

      res.json({
        success: true,
        data: {
          branches: branches.rows,
          warehouses: warehouses.rows,
          cost_centers: costCenters.rows,
        },
      });
    } catch (error: any) {
      console.error('Error fetching available entities:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /users — List all tenant users (for the assignment dropdown)
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/users',
  requirePermission('entity_access:view'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.json({ success: true, data: [] });
      }

      const result = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.status, u.is_tenant_admin,
                r.name AS role_name
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
         ORDER BY u.full_name ASC`,
        [tenantId]
      );

      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /user/:userId — Full access summary for a specific user
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/user/:userId',
  requirePermission('entity_access:view'),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant context required' });

      const access = await EntityAccessService.getUserAccess(userId, tenantId);
      res.json({ success: true, data: access });
    } catch (error: any) {
      console.error('Error fetching user access:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /user/:userId/:entityType — Access records for a specific entity type
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/user/:userId/:entityType',
  requirePermission('entity_access:view'),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const entityType = req.params.entityType;
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant context required' });
      if (!isValidEntityType(entityType)) {
        return res.status(400).json({ success: false, error: 'Invalid entity type. Use: branch, warehouse, cost_center' });
      }

      const records = await EntityAccessService.getAccessByType(userId, tenantId, entityType);
      res.json({ success: true, data: records });
    } catch (error: any) {
      console.error('Error fetching user entity access:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /:entityType/:entityId/users — List users with access to an entity
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/:entityType/:entityId/users',
  requirePermission('entity_access:view'),
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant context required' });
      if (!isValidEntityType(entityType)) {
        return res.status(400).json({ success: false, error: 'Invalid entity type' });
      }

      const users = await EntityAccessService.getEntityUsers(entityType, parseInt(entityId, 10), tenantId);
      res.json({ success: true, data: users, total: users.length });
    } catch (error: any) {
      console.error('Error fetching entity users:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// POST /assign — Assign or update user-entity access
// Body: { user_id, entity_type, entity_id, permissions: {...}, is_home_branch? }
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  '/assign',
  requirePermission('entity_access:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { user_id, entity_type, entity_id, permissions, is_home_branch } = req.body;

      if (!user_id || !entity_type || !entity_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id, entity_type, and entity_id are required',
          error_ar: 'معرف المستخدم ونوع الكيان ومعرف الكيان مطلوبة',
        });
      }

      if (!isValidEntityType(entity_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity_type. Use: branch, warehouse, cost_center',
        });
      }

      const assignedBy = getUserId(req);
      const record = await EntityAccessService.assignAccess(
        user_id, entity_type, entity_id,
        permissions || {}, assignedBy, is_home_branch
      );

      res.status(201).json({
        success: true,
        message: 'Access assigned successfully',
        message_ar: 'تم تعيين الصلاحية بنجاح',
        data: record,
      });
    } catch (error: any) {
      console.error('Error assigning access:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// POST /bulk-assign — Bulk assign user to multiple entities
// Body: { user_id, entity_type, assignments: [{ entity_id, permissions, is_home_branch? }] }
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  '/bulk-assign',
  requirePermission('entity_access:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { user_id, entity_type, assignments } = req.body;

      if (!user_id || !entity_type || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'user_id, entity_type, and assignments array are required',
        });
      }

      if (!isValidEntityType(entity_type)) {
        return res.status(400).json({ success: false, error: 'Invalid entity_type' });
      }

      const assignedBy = getUserId(req);
      const result = await EntityAccessService.bulkAssign(user_id, entity_type, assignments, assignedBy);

      res.status(201).json({
        success: true,
        message: `Assigned ${result.assigned.length} entities, ${result.failed.length} failed`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error bulk assigning access:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PUT /update — Update existing access permissions
// Body: { user_id, entity_type, entity_id, permissions: {...} }
// ═══════════════════════════════════════════════════════════════════════════
router.put(
  '/update',
  requirePermission('entity_access:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { user_id, entity_type, entity_id, permissions, is_home_branch } = req.body;

      if (!user_id || !entity_type || !entity_id) {
        return res.status(400).json({ success: false, error: 'user_id, entity_type, and entity_id are required' });
      }

      if (!isValidEntityType(entity_type)) {
        return res.status(400).json({ success: false, error: 'Invalid entity_type' });
      }

      const assignedBy = getUserId(req);
      const record = await EntityAccessService.assignAccess(
        user_id, entity_type, entity_id,
        permissions || {}, assignedBy, is_home_branch
      );

      res.json({
        success: true,
        message: 'Access updated successfully',
        message_ar: 'تم تحديث الصلاحية بنجاح',
        data: record,
      });
    } catch (error: any) {
      console.error('Error updating access:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /:entityType/:entityId/user/:userId — Remove entity access
// ═══════════════════════════════════════════════════════════════════════════
router.delete(
  '/:entityType/:entityId/user/:userId',
  requirePermission('entity_access:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const { entityType, entityId, userId } = req.params;

      if (!isValidEntityType(entityType)) {
        return res.status(400).json({ success: false, error: 'Invalid entity type' });
      }

      const removed = await EntityAccessService.removeAccess(
        parseInt(userId, 10), entityType, parseInt(entityId, 10)
      );

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: 'Access record not found',
          error_ar: 'لم يتم العثور على سجل الصلاحية',
        });
      }

      res.json({
        success: true,
        message: 'Access removed successfully',
        message_ar: 'تم إزالة الصلاحية بنجاح',
      });
    } catch (error: any) {
      console.error('Error removing access:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /check — Check if current user has a specific permission on an entity
// Query: ?entity_type=branch&entity_id=1&permission=can_create
// ═══════════════════════════════════════════════════════════════════════════
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id, permission } = req.query;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!entity_type || !entity_id || !permission || !tenantId) {
      return res.status(400).json({ success: false, error: 'entity_type, entity_id, and permission are required' });
    }

    if (!isValidEntityType(entity_type as string)) {
      return res.status(400).json({ success: false, error: 'Invalid entity_type' });
    }

    const validPerms = ['can_read', 'can_create', 'can_update', 'can_delete', 'can_approve', 'can_reject', 'can_endorse'];
    if (!validPerms.includes(permission as string)) {
      return res.status(400).json({ success: false, error: `Invalid permission. Use: ${validPerms.join(', ')}` });
    }

    const hasAccess = await EntityAccessService.checkPermission(
      userId, entity_type as EntityType, parseInt(entity_id as string, 10),
      permission as keyof EntityPermissions, tenantId
    );

    res.json({ success: true, data: { allowed: hasAccess } });
  } catch (error: any) {
    console.error('Error checking permission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
