/**
 * Approval Helper Functions
 * ==========================
 * Utilities for checking and creating approval requests
 */

import pool from '../db';

export interface ApprovalCheckResult {
  needsApproval: boolean;
  workflowId?: number;
  workflowName?: string;
  approvalRole?: string;
}

/**
 * Check if a document needs approval based on company workflows
 * @param companyId - Company ID
 * @param module - Module name ('purchase_orders', 'purchase_invoices', 'vendor_payments')
 * @param amount - Document amount
 * @returns ApprovalCheckResult
 */
export async function checkNeedsApproval(
  companyId: number,
  module: string,
  amount: number
): Promise<ApprovalCheckResult> {
  try {
    const result = await pool.query(`
      SELECT id, workflow_name, approval_role
      FROM approval_workflows
      WHERE company_id = $1
        AND module = $2
        AND is_active = true
        AND deleted_at IS NULL
        AND $3 >= COALESCE(min_amount, 0)
        AND ($3 <= max_amount OR max_amount IS NULL)
      ORDER BY min_amount DESC
      LIMIT 1
    `, [companyId, module, amount]);

    if (result.rows.length === 0) {
      return { needsApproval: false };
    }

    const workflow = result.rows[0];
    return {
      needsApproval: true,
      workflowId: workflow.id,
      workflowName: workflow.workflow_name,
      approvalRole: workflow.approval_role
    };

  } catch (error) {
    console.error('Error checking approval needs:', error);
    throw error;
  }
}

/**
 * Create an approval request for a document
 * @param companyId - Company ID
 * @param workflowId - Workflow ID (from checkNeedsApproval)
 * @param documentType - 'purchase_order', 'purchase_invoice', 'vendor_payment'
 * @param documentId - Document ID
 * @param documentNumber - Document number (for display)
 * @param documentAmount - Document amount
 * @param requestedBy - User ID who created the document
 * @param requestNotes - Optional notes
 * @returns approval_request_id
 */
export async function createApprovalRequest(
  companyId: number,
  workflowId: number,
  documentType: string,
  documentId: number,
  documentNumber: string,
  documentAmount: number,
  requestedBy: number,
  requestNotes?: string
): Promise<number> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create approval request
    const result = await client.query(`
      INSERT INTO approval_requests (
        company_id,
        workflow_id,
        document_type,
        document_id,
        document_number,
        document_amount,
        requested_by,
        request_notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING id
    `, [
      companyId,
      workflowId,
      documentType,
      documentId,
      documentNumber,
      documentAmount,
      requestedBy,
      requestNotes || null
    ]);

    const approvalRequestId = result.rows[0].id;

    // Update document to link approval request
    const tableName = documentType === 'purchase_order' ? 'purchase_orders'
                    : documentType === 'purchase_invoice' ? 'purchase_invoices'
                    : documentType === 'vendor_payment' ? 'vendor_payments'
                    : null;

    if (tableName) {
      await client.query(`
        UPDATE ${tableName}
        SET approval_status = 'pending',
            approval_request_id = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [approvalRequestId, documentId]);
    }

    await client.query('COMMIT');

    return approvalRequestId;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating approval request:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if document is approved (can be posted)
 * @param documentType - 'purchase_order', 'purchase_invoice', 'vendor_payment'
 * @param documentId - Document ID
 * @returns boolean - true if approved or no approval needed
 */
export async function isDocumentApproved(
  documentType: string,
  documentId: number
): Promise<boolean> {
  try {
    const tableName = documentType === 'purchase_order' ? 'purchase_orders'
                    : documentType === 'purchase_invoice' ? 'purchase_invoices'
                    : documentType === 'vendor_payment' ? 'vendor_payments'
                    : null;

    if (!tableName) {
      throw new Error(`Unknown document type: ${documentType}`);
    }

    const result = await pool.query(`
      SELECT approval_status FROM ${tableName}
      WHERE id = $1 AND deleted_at IS NULL
    `, [documentId]);

    if (result.rows.length === 0) {
      throw new Error(`Document not found: ${documentType} ${documentId}`);
    }

    const approvalStatus = result.rows[0].approval_status;

    // If no approval needed or already approved, allow posting
    return approvalStatus === 'not_required' || 
           approvalStatus === 'approved' || 
           approvalStatus === null;

  } catch (error) {
    console.error('Error checking document approval:', error);
    throw error;
  }
}

/**
 * Get pending approvals count for a user (based on role)
 * @param userId - User ID
 * @param companyId - Company ID
 * @param userRoles - Array of role names
 * @returns count of pending approvals
 */
export async function getPendingApprovalsCount(
  userId: number,
  companyId: number,
  userRoles: string[]
): Promise<number> {
  try {
    // Normalize role names
    const roleNames = userRoles.map(r => 
      (typeof r === 'string' ? r : (r as any)?.name ?? '').toLowerCase()
    );

    const isSuperAdmin = roleNames.some(r => r.includes('super') && r.includes('admin'));

    // Super admin sees all pending approvals
    if (isSuperAdmin) {
      const result = await pool.query(`
        SELECT COUNT(*) FROM approval_requests
        WHERE company_id = $1 AND status = 'pending' AND deleted_at IS NULL
      `, [companyId]);
      return parseInt(result.rows[0].count, 10);
    }

    // Build role filter
    const roleConditions: string[] = [];
    if (roleNames.some(r => r.includes('finance'))) {
      roleConditions.push("aw.approval_role = 'finance'");
    }
    if (roleNames.some(r => r.includes('manage') || r.includes('manager'))) {
      roleConditions.push("aw.approval_role = 'management'");
    }

    if (roleConditions.length === 0) {
      // User has no approval roles
      const result = await pool.query(`
        SELECT COUNT(*) FROM approval_requests ar
        INNER JOIN approval_workflows aw ON ar.workflow_id = aw.id
        WHERE ar.company_id = $1 
          AND ar.status = 'pending' 
          AND ar.deleted_at IS NULL
          AND aw.approval_role IS NULL
      `, [companyId]);
      return parseInt(result.rows[0].count, 10);
    }

    const roleFilter = `(aw.approval_role IS NULL OR ${roleConditions.join(' OR ')})`;

    const result = await pool.query(`
      SELECT COUNT(*) FROM approval_requests ar
      INNER JOIN approval_workflows aw ON ar.workflow_id = aw.id
      WHERE ar.company_id = $1 
        AND ar.status = 'pending' 
        AND ar.deleted_at IS NULL
        AND ${roleFilter}
    `, [companyId]);

    return parseInt(result.rows[0].count, 10);

  } catch (error) {
    console.error('Error getting pending approvals count:', error);
    return 0;
  }
}
