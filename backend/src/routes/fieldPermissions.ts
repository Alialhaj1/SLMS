/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 FIELD PERMISSIONS API
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Endpoints:
 *   GET  /api/field-permissions/:resource     → Get field permissions for current user
 *   GET  /api/field-permissions/admin/rules   → List all rules (admin)
 *   POST /api/field-permissions/admin/rules   → Create/update a rule (admin)
 *   DELETE /api/field-permissions/admin/rules/:id → Delete a rule (admin)
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  getFieldPermissionsForResource,
  listFieldPermissionRules,
  createFieldPermissionRule,
  deleteFieldPermissionRule,
} from '../services/fieldPermissionEngine';

const router = Router();

/**
 * GET /api/field-permissions/:resource
 * Returns resolved field permissions for the current user on a specific resource.
 * Frontend uses this to control form field visibility/editability.
 */
router.get('/:resource', authenticate, async (req: Request, res: Response) => {
  try {
    const { resource } = req.params;
    const user = (req as any).user;
    const companyId = (req as any).companyId || user?.company_id;

    const permissions = await getFieldPermissionsForResource(
      resource,
      user.id,
      companyId
    );

    res.json({
      success: true,
      data: permissions,
      resource,
    });
  } catch (error) {
    console.error('[FieldPermissions] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load field permissions',
    });
  }
});

/**
 * GET /api/field-permissions/admin/rules
 * Lists all field permission rules (admin view).
 * Query params: ?resource=countries&role_id=5&company_id=1
 */
router.get('/admin/rules', authenticate, requirePermission('field_permissions:view'), async (req: Request, res: Response) => {
  try {
    const { resource, role_id, company_id } = req.query;
    const rules = await listFieldPermissionRules(
      resource as string,
      role_id ? parseInt(role_id as string) : undefined,
      company_id ? parseInt(company_id as string) : undefined
    );

    res.json({
      success: true,
      data: rules,
      total: rules.length,
    });
  } catch (error) {
    console.error('[FieldPermissions] Admin list error:', error);
    res.status(500).json({ success: false, error: 'Failed to list rules' });
  }
});

/**
 * POST /api/field-permissions/admin/rules
 * Create or update a field permission rule.
 * Body: { resource, field_name, role_id, visibility, required_override?, company_id? }
 */
router.post('/admin/rules', authenticate, requirePermission('field_permissions:manage'), async (req: Request, res: Response) => {
  try {
    const { resource, field_name, role_id, visibility, required_override, company_id } = req.body;

    if (!resource || !field_name || !role_id || !visibility) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: resource, field_name, role_id, visibility',
      });
    }

    if (!['visible', 'hidden', 'readonly', 'editable'].includes(visibility)) {
      return res.status(400).json({
        success: false,
        error: 'visibility must be: visible, hidden, readonly, or editable',
      });
    }

    const rule = await createFieldPermissionRule({
      resource,
      field_name,
      role_id,
      visibility,
      required_override: required_override ?? null,
      company_id: company_id || null,
    });

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('[FieldPermissions] Create rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to create rule' });
  }
});

/**
 * DELETE /api/field-permissions/admin/rules/:id
 * Delete a field permission rule.
 */
router.delete('/admin/rules/:id', authenticate, requirePermission('field_permissions:manage'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await deleteFieldPermissionRule(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    console.error('[FieldPermissions] Delete rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete rule' });
  }
});

export default router;
