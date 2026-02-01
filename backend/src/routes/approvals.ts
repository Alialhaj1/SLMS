import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { getPendingApprovalsCount } from '../utils/approvalHelpers';

const router = Router();

/**
 * GET /api/approvals/pending
 * Get all pending approval requests for current user (based on role)
 */
router.get('/pending', authenticate, requirePermission('approvals:view'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const userRoles = req.user!.roles || [];

    // Get user role names (normalize to lowercase)
    const roleNames = userRoles.map((r: any) => 
      (typeof r === 'string' ? r : (r?.name ?? r?.role_name ?? r?.role ?? '')).toLowerCase()
    );

    // Check if user is super_admin (can approve anything)
    const isSuperAdmin = roleNames.some(r => r.includes('super') && r.includes('admin'));

    // Company filter - super_admin can see all, others see only their company
    const companyFilter = isSuperAdmin ? '' : (companyId ? 'AND ar.company_id = $1' : 'AND 1=0');
    const params = isSuperAdmin ? [] : (companyId ? [companyId] : []);

    // Build dynamic WHERE clause for role filtering
    let roleFilter = '';
    if (!isSuperAdmin) {
      const roleConditions: string[] = [];
      if (roleNames.some(r => r.includes('finance'))) {
        roleConditions.push("aw.approval_role = 'finance'");
      }
      if (roleNames.some(r => r.includes('manage') || r.includes('manager'))) {
        roleConditions.push("aw.approval_role = 'management'");
      }
      
      if (roleConditions.length > 0) {
        roleFilter = `AND (aw.approval_role IS NULL OR ${roleConditions.join(' OR ')})`;
      } else {
        // User has no approval roles, only show if approval_role is NULL
        roleFilter = "AND aw.approval_role IS NULL";
      }
    }

    const query = `
      SELECT 
        ar.id,
        ar.document_type,
        ar.document_id,
        ar.document_number,
        ar.document_amount,
        ar.status,
        ar.requested_at,
        ar.request_notes,
        u.email AS requested_by_email,
        u.full_name AS requested_by_name,
        aw.workflow_name,
        aw.approval_role AS required_role
      FROM approval_requests ar
      INNER JOIN approval_workflows aw ON ar.workflow_id = aw.id
      INNER JOIN users u ON ar.requested_by = u.id
      WHERE ar.status = 'pending'
        AND ar.deleted_at IS NULL
        ${companyFilter}
        ${roleFilter}
      ORDER BY ar.requested_at ASC
    `;

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      total: result.rows.length,
      userRoles: roleNames,
      isSuperAdmin
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

/**
 * GET /api/approvals/badge-count
 * Get count of pending approvals for current user (for badge)
 */
router.get('/badge-count', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const userRoles = req.user!.roles || [];

    if (!companyId) {
      return res.json({ count: 0 });
    }

    const count = await getPendingApprovalsCount(userId, companyId, userRoles);

    res.json({ count });

  } catch (error) {
    console.error('Error fetching badge count:', error);
    res.json({ count: 0 }); // Return 0 on error (don't block UI)
  }
});

/**
 * GET /api/approvals/my-requests
 * Get approval requests created by current user
 */
router.get('/my-requests', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { status } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    let query = `
      SELECT 
        ar.id,
        ar.document_type,
        ar.document_id,
        ar.document_number,
        ar.document_amount,
        ar.status,
        ar.requested_at,
        ar.reviewed_at,
        ar.reviewer_notes,
        u.email AS reviewed_by_email,
        u.full_name AS reviewed_by_name,
        aw.workflow_name
      FROM approval_requests ar
      LEFT JOIN approval_workflows aw ON ar.workflow_id = aw.id
      LEFT JOIN users u ON ar.reviewed_by = u.id
      WHERE ar.company_id = $1
        AND ar.requested_by = $2
        AND ar.deleted_at IS NULL
    `;

    const params: any[] = [companyId, userId];

    if (status) {
      query += ` AND ar.status = $3`;
      params.push(status);
    }

    query += ` ORDER BY ar.requested_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching my requests:', error);
    res.status(500).json({ error: 'Failed to fetch your approval requests' });
  }
});

/**
 * POST /api/approvals/:id/approve
 * Approve a pending request
 */
router.post('/:id/approve', authenticate, requirePermission('approvals:approve'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const userRoles = req.user!.roles || [];

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    await client.query('BEGIN');

    // Get approval request with workflow details
    const requestResult = await client.query(`
      SELECT ar.*, aw.approval_role, aw.module
      FROM approval_requests ar
      INNER JOIN approval_workflows aw ON ar.workflow_id = aw.id
      WHERE ar.id = $1 AND ar.company_id = $2 AND ar.deleted_at IS NULL
    `, [id, companyId]);

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot approve request with status: ${request.status}` });
    }

    // Check if user has required role
    const roleNames = userRoles.map((r: any) => 
      (typeof r === 'string' ? r : (r?.name ?? r?.role_name ?? r?.role ?? '')).toLowerCase()
    );
    const isSuperAdmin = roleNames.some(r => r.includes('super') && r.includes('admin'));
    
    if (!isSuperAdmin && request.approval_role) {
      const hasRequiredRole = roleNames.some(r => r.includes(request.approval_role.toLowerCase()));
      if (!hasRequiredRole) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          error: `You do not have the required role (${request.approval_role}) to approve this request` 
        });
      }
    }

    // Update approval request
    await client.query(`
      UPDATE approval_requests
      SET status = 'approved',
          reviewed_by = $1,
          reviewed_at = CURRENT_TIMESTAMP,
          reviewer_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [userId, notes, id]);

    // Add to approval history
    await client.query(`
      INSERT INTO approval_history (approval_request_id, step_number, approved_by, action, notes, user_role, user_email)
      SELECT $1, 1, $2, 'approved', $3, $4, u.email
      FROM users u WHERE u.id = $2
    `, [id, userId, notes, roleNames.join(',')]);

    // Update document approval_status based on document_type
    const tableName = request.document_type === 'purchase_order' ? 'purchase_orders' 
                    : request.document_type === 'purchase_invoice' ? 'purchase_invoices'
                    : request.document_type === 'vendor_payment' ? 'vendor_payments'
                    : null;

    if (tableName) {
      await client.query(`
        UPDATE ${tableName}
        SET approval_status = 'approved', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [request.document_id]);
    }

    await client.query('COMMIT');

    res.json({
      message: 'Approval request approved successfully',
      data: { id, status: 'approved' }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/approvals/:id/reject
 * Reject a pending request
 */
router.post('/:id/reject', authenticate, requirePermission('approvals:approve'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const userRoles = req.user!.roles || [];

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection notes are required' });
    }

    await client.query('BEGIN');

    // Get approval request with workflow details
    const requestResult = await client.query(`
      SELECT ar.*, aw.approval_role, aw.module
      FROM approval_requests ar
      INNER JOIN approval_workflows aw ON ar.workflow_id = aw.id
      WHERE ar.id = $1 AND ar.company_id = $2 AND ar.deleted_at IS NULL
    `, [id, companyId]);

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot reject request with status: ${request.status}` });
    }

    // Check if user has required role (same logic as approve)
    const roleNames = userRoles.map((r: any) => 
      (typeof r === 'string' ? r : (r?.name ?? r?.role_name ?? r?.role ?? '')).toLowerCase()
    );
    const isSuperAdmin = roleNames.some(r => r.includes('super') && r.includes('admin'));
    
    if (!isSuperAdmin && request.approval_role) {
      const hasRequiredRole = roleNames.some(r => r.includes(request.approval_role.toLowerCase()));
      if (!hasRequiredRole) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          error: `You do not have the required role (${request.approval_role}) to reject this request` 
        });
      }
    }

    // Update approval request
    await client.query(`
      UPDATE approval_requests
      SET status = 'rejected',
          reviewed_by = $1,
          reviewed_at = CURRENT_TIMESTAMP,
          reviewer_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [userId, notes, id]);

    // Add to approval history
    await client.query(`
      INSERT INTO approval_history (approval_request_id, step_number, approved_by, action, notes, user_role, user_email)
      SELECT $1, 1, $2, 'rejected', $3, $4, u.email
      FROM users u WHERE u.id = $2
    `, [id, userId, notes, roleNames.join(',')]);

    // Update document approval_status
    const tableName = request.document_type === 'purchase_order' ? 'purchase_orders' 
                    : request.document_type === 'purchase_invoice' ? 'purchase_invoices'
                    : request.document_type === 'vendor_payment' ? 'vendor_payments'
                    : null;

    if (tableName) {
      await client.query(`
        UPDATE ${tableName}
        SET approval_status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [request.document_id]);
    }

    await client.query('COMMIT');

    res.json({
      message: 'Approval request rejected successfully',
      data: { id, status: 'rejected' }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/approvals/workflows
 * Get all approval workflows (for admin configuration)
 */
router.get('/workflows', authenticate, requireAnyPermission(['approvals:manage', 'system:admin']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const result = await pool.query(`
      SELECT 
        id,
        module,
        workflow_name,
        description,
        min_amount,
        max_amount,
        required_approvals_count,
        approval_role,
        is_active,
        approval_order,
        timeout_hours
      FROM approval_workflows
      WHERE company_id = $1 AND deleted_at IS NULL
      ORDER BY module, min_amount
    `, [companyId]);

    res.json({
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

export default router;
