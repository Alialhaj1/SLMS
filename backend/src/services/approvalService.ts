/**
 * Approval Service — Shared logic for 3-level approval workflow
 * 
 * Flow: DRAFT → SUBMITTED → REVIEWED → APPROVED (or REJECTED at any stage)
 * 
 * Roles:
 *   - Requester (مقدم الطلب): Creates and submits
 *   - Reviewer (المراجع): Reviews submitted requests
 *   - Approver (المعتمد): Final approval
 */

import pool from '../db';

export interface ApprovalActionParams {
  requestType: 'expense' | 'transfer' | 'payment';
  requestId: number;
  companyId: number;
  userId: number;
  action: 'created' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'executed' | 'cancelled' | 'printed';
  previousStatusId: number;
  newStatusId: number;
  comments?: string;
  rejectionReason?: string;
  signatureId?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record an action in request_approval_history
 */
export async function recordApprovalHistory(params: ApprovalActionParams): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO request_approval_history 
       (company_id, request_type, request_id, action, previous_status_id, new_status_id,
        performed_by, performed_at, comments, rejection_reason, signature_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12)`,
      [
        params.companyId,
        params.requestType,
        params.requestId,
        params.action,
        params.previousStatusId,
        params.newStatusId,
        params.userId,
        params.comments || null,
        params.rejectionReason || null,
        params.signatureId || null,
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );
  } catch (error) {
    console.error('[ApprovalService] Failed to record history:', error);
  }
}

/**
 * Create approval notification for a user
 */
export async function createApprovalNotification(params: {
  companyId: number;
  userId: number;
  requestType: string;
  requestId: number;
  notificationType: string;
  title: string;
  titleAr: string;
  message?: string;
  messageAr?: string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO approval_notifications 
       (company_id, user_id, request_type, request_id, notification_type, title, title_ar, message, message_ar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.companyId,
        params.userId,
        params.requestType,
        params.requestId,
        params.notificationType,
        params.title,
        params.titleAr,
        params.message || null,
        params.messageAr || null,
      ]
    );
  } catch (error) {
    console.error('[ApprovalService] Failed to create notification:', error);
  }
}

/**
 * Notify relevant users about a request action
 * - On submit: notify reviewers/approvers
 * - On review: notify approvers
 * - On approve/reject: notify requester
 */
export async function notifyOnAction(params: {
  companyId: number;
  requestType: string;
  requestId: number;
  requestNumber: string;
  action: string;
  actorId: number;
  requestedBy: number;
}): Promise<void> {
  try {
    const { companyId, requestType, requestId, requestNumber, action, actorId, requestedBy } = params;
    const typeLabel = requestType === 'expense' ? 'Expense Request' : requestType === 'transfer' ? 'Transfer Request' : 'Payment Request';
    const typeLabelAr = requestType === 'expense' ? 'طلب مصروف' : requestType === 'transfer' ? 'طلب تحويل' : 'طلب سداد';

    // Get users with review/approve permissions for this company
    const permMap: Record<string, string[]> = {
      expense: ['expense_requests:approve', 'expense_requests:review'],
      transfer: ['transfer_requests:approve', 'transfer_requests:review'],
      payment: ['payment_requests:approve', 'payment_requests:review'],
    };
    const perms = permMap[requestType] || [];

    if (action === 'submitted') {
      // Notify users with review/approve permissions
      const reviewers = await pool.query(
        `SELECT DISTINCT u.id FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE u.tenant_id = $1 AND u.deleted_at IS NULL AND u.id != $2
           AND p.permission_code = ANY($3)`,
        [companyId, actorId, perms]
      );

      for (const reviewer of reviewers.rows) {
        await createApprovalNotification({
          companyId,
          userId: reviewer.id,
          requestType,
          requestId,
          notificationType: 'new_request',
          title: `New ${typeLabel}: ${requestNumber}`,
          titleAr: `${typeLabelAr} جديد: ${requestNumber}`,
          message: `A new ${typeLabel.toLowerCase()} has been submitted and requires your review.`,
          messageAr: `تم تقديم ${typeLabelAr} جديد ويحتاج إلى مراجعتك.`,
        });
      }
    } else if (action === 'reviewed') {
      // Notify users with approve permissions
      const approvers = await pool.query(
        `SELECT DISTINCT u.id FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE u.tenant_id = $1 AND u.deleted_at IS NULL AND u.id != $2
           AND p.permission_code = $3`,
        [companyId, actorId, `${requestType}_requests:approve`]
      );

      for (const approver of approvers.rows) {
        await createApprovalNotification({
          companyId,
          userId: approver.id,
          requestType,
          requestId,
          notificationType: 'reviewed',
          title: `${typeLabel} Reviewed: ${requestNumber}`,
          titleAr: `تمت مراجعة ${typeLabelAr}: ${requestNumber}`,
          message: `${typeLabel} has been reviewed and is awaiting your approval.`,
          messageAr: `تمت مراجعة ${typeLabelAr} وبانتظار اعتمادك.`,
        });
      }

      // Also notify requester
      if (requestedBy !== actorId) {
        await createApprovalNotification({
          companyId,
          userId: requestedBy,
          requestType,
          requestId,
          notificationType: 'reviewed',
          title: `Your ${typeLabel} Reviewed: ${requestNumber}`,
          titleAr: `تمت مراجعة ${typeLabelAr} الخاص بك: ${requestNumber}`,
        });
      }
    } else if (action === 'approved' || action === 'rejected') {
      // Notify requester
      if (requestedBy !== actorId) {
        const statusLabel = action === 'approved' ? 'Approved' : 'Rejected';
        const statusLabelAr = action === 'approved' ? 'تم اعتماد' : 'تم رفض';
        await createApprovalNotification({
          companyId,
          userId: requestedBy,
          requestType,
          requestId,
          notificationType: action,
          title: `${typeLabel} ${statusLabel}: ${requestNumber}`,
          titleAr: `${statusLabelAr} ${typeLabelAr}: ${requestNumber}`,
        });
      }
    }
  } catch (error) {
    console.error('[ApprovalService] Failed to notify:', error);
  }
}

/**
 * Get the approval history with user details and signatures for a request
 */
export async function getApprovalHistory(requestType: string, requestId: number) {
  const result = await pool.query(
    `SELECT rah.*, 
            u.full_name as performer_name, u.email as performer_email,
            u.signature_image_url as performer_signature_url,
            u.signature_title_en as performer_title_en,
            u.signature_title_ar as performer_title_ar,
            ds.signature_image_url as digital_signature_url,
            ds.signature_name_en as digital_signature_name,
            ps.code as previous_status_code, ps.name_ar as previous_status_name_ar,
            ns.code as new_status_code, ns.name_ar as new_status_name_ar
     FROM request_approval_history rah
     LEFT JOIN users u ON u.id = rah.performed_by
     LEFT JOIN digital_signatures ds ON ds.id = rah.signature_id
     LEFT JOIN request_statuses ps ON ps.id = rah.previous_status_id
     LEFT JOIN request_statuses ns ON ns.id = rah.new_status_id
     WHERE rah.request_type = $1 AND rah.request_id = $2
     ORDER BY rah.performed_at ASC`,
    [requestType, requestId]
  );
  return result.rows;
}
