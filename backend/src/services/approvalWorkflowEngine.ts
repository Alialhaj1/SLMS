/**
 * Approval Workflow Engine
 * ========================
 * Core business logic for the multi-level document approval system.
 *
 * Flow:  Creator(A) → submit → Reviewer(B) → approve → Approver(C) → post → GL
 *        At any review/approve step: reject → back to Creator(A)
 *        After posting: void → reversal entry + notifications
 *
 * Principles:
 *   - No accounting effect until fully posted
 *   - Every action logged in WORM audit (approval_actions)
 *   - Creator cannot approve their own documents
 *   - SLA tracking with escalation
 *   - Delegation support
 */

import pool from '../db';
import { PoolClient } from 'pg';
import { NotificationService } from './notificationService';

// ─── Types ───────────────────────────────────────────────

export interface SubmitDocumentParams {
  companyId: number;
  tenantId?: number;
  documentType: string;
  referenceId: number;
  referenceTable: string;
  documentNumber?: string;
  title: string;
  amount: number;
  currency?: string;
  createdBy: number;
  branchId?: number;
  notes?: string;
  attachments?: any[];
  priority?: string;
  dueDate?: string;
  watchers?: number[];
  ipAddress?: string;
  userAgent?: string;
}

export interface ActionParams {
  documentId: number;
  actorId: number;
  comment?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PostParams extends ActionParams {
  confirmToken: string;
  postDate?: string;
}

export interface VoidParams extends ActionParams {
  voidConfirm: string;
  reason: string;
}

export interface DelegateParams {
  documentId: number;
  fromUserId: number;
  toUserId: number;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface InboxFilters {
  userId: number;
  companyId: number;
  documentType?: string;
  priority?: string;
  status?: string;
  search?: string;
  amountMin?: number;
  amountMax?: number;
  page?: number;
  limit?: number;
}

export interface MonitorFilters extends InboxFilters {
  createdBy?: number;
  dateFrom?: string;
  dateTo?: string;
  slaStatus?: 'overdue' | 'warning' | 'ok';
}

// ─── Service ─────────────────────────────────────────────

export class ApprovalWorkflowEngine {

  /**
   * Submit a document for approval.
   * Finds the matching route, creates the approval_documents record,
   * assigns to first step, sends notifications.
   */
  static async submitDocument(params: SubmitDocumentParams): Promise<{
    success: boolean;
    approvalDocumentId?: number;
    status?: string;
    autoApproved?: boolean;
    message?: string;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Find matching approval route
      const routeResult = await client.query(
        `SELECT * FROM find_approval_route($1, $2, $3)`,
        [params.companyId, params.documentType, params.amount || 0]
      );

      let routeId: number | null = null;
      let autoApproveBelow: number | null = null;
      let slaHours = 24;
      let totalSteps = 0;

      if (routeResult.rows.length > 0) {
        const route = routeResult.rows[0];
        routeId = route.route_id;
        autoApproveBelow = route.auto_approve_below;
        slaHours = route.sla_hours || 24;
        totalSteps = Number(route.step_count) || 0;
      }

      // 2. Check auto-approve
      if (autoApproveBelow && params.amount < autoApproveBelow) {
        // Auto-approve: create the document as posted directly
        const docResult = await client.query(
          `INSERT INTO approval_documents
           (tenant_id, company_id, document_number, document_type, reference_id, reference_table,
            title, amount, currency, status, route_id, current_step, total_steps,
            created_by, branch_id, notes, attachments, priority, due_date,
            submitted_at, approved_at, posted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'posted', $10, $11, $11,
                   $12, $13, $14, $15, $16, $17, NOW(), NOW(), NOW())
           RETURNING id`,
          [
            params.tenantId, params.companyId, params.documentNumber,
            params.documentType, params.referenceId, params.referenceTable,
            params.title, params.amount, params.currency || 'SAR',
            routeId, totalSteps,
            params.createdBy, params.branchId, params.notes,
            JSON.stringify(params.attachments || []),
            params.priority || 'normal', params.dueDate
          ]
        );
        const docId = docResult.rows[0].id;

        // Log auto-approve action
        await this.logAction(client, {
          documentId: docId, action: 'submitted', actorId: params.createdBy,
          comment: 'Auto-approved: amount below threshold',
          ipAddress: params.ipAddress, userAgent: params.userAgent
        });
        await this.logAction(client, {
          documentId: docId, action: 'posted', actorId: params.createdBy,
          comment: `Auto-posted: amount (${params.amount}) < auto_approve_below (${autoApproveBelow})`,
          ipAddress: params.ipAddress, userAgent: params.userAgent
        });

        // Link back to source table
        await this.linkToSource(client, params.referenceTable, params.referenceId, docId);

        await client.query('COMMIT');
        return { success: true, approvalDocumentId: docId, status: 'posted', autoApproved: true };
      }

      // 3. No route found — check if approval is required
      if (!routeId || totalSteps === 0) {
        // No route configured — create as draft (can be posted directly)
        const docResult = await client.query(
          `INSERT INTO approval_documents
           (tenant_id, company_id, document_number, document_type, reference_id, reference_table,
            title, amount, currency, status, route_id, current_step, total_steps,
            created_by, branch_id, notes, attachments, priority, due_date, submitted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NULL, 0, 0,
                   $10, $11, $12, $13, $14, $15, NULL)
           RETURNING id`,
          [
            params.tenantId, params.companyId, params.documentNumber,
            params.documentType, params.referenceId, params.referenceTable,
            params.title, params.amount, params.currency || 'SAR',
            params.createdBy, params.branchId, params.notes,
            JSON.stringify(params.attachments || []),
            params.priority || 'normal', params.dueDate
          ]
        );
        const docId = docResult.rows[0].id;
        await this.linkToSource(client, params.referenceTable, params.referenceId, docId);

        await client.query('COMMIT');
        return { success: true, approvalDocumentId: docId, status: 'draft', message: 'No approval route configured. Document saved as draft.' };
      }

      // 4. Normal flow: create as pending_review, assign to step 1
      const firstStep = await client.query(
        `SELECT ars.*, r.name AS role_name
         FROM approval_route_steps ars
         LEFT JOIN roles r ON r.id = ars.role_id
         WHERE ars.route_id = $1
         ORDER BY ars.step_number ASC
         LIMIT 1`,
        [routeId]
      );

      let assigneeId: number | null = null;
      if (firstStep.rows.length > 0) {
        const step = firstStep.rows[0];
        assigneeId = step.user_id;

        // If no specific user, find by role (check for delegation)
        if (!assigneeId && step.role_id) {
          assigneeId = await this.findAssigneeByRole(client, step.role_id, params.companyId, params.documentType);
        }
      }

      const docResult = await client.query(
        `INSERT INTO approval_documents
         (tenant_id, company_id, document_number, document_type, reference_id, reference_table,
          title, amount, currency, status, route_id, current_step, total_steps,
          created_by, branch_id, notes, attachments, priority, due_date,
          current_assignee, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_review', $10, 1, $11,
                 $12, $13, $14, $15, $16, $17, $18, NOW())
         RETURNING id`,
        [
          params.tenantId, params.companyId, params.documentNumber,
          params.documentType, params.referenceId, params.referenceTable,
          params.title, params.amount, params.currency || 'SAR',
          routeId, totalSteps,
          params.createdBy, params.branchId, params.notes,
          JSON.stringify(params.attachments || []),
          params.priority || 'normal', params.dueDate, assigneeId
        ]
      );
      const docId = docResult.rows[0].id;

      // Log submission
      await this.logAction(client, {
        documentId: docId, action: 'submitted', actorId: params.createdBy,
        ipAddress: params.ipAddress, userAgent: params.userAgent
      });

      // Link back to source table
      await this.linkToSource(client, params.referenceTable, params.referenceId, docId);

      // Add watchers
      if (params.watchers && params.watchers.length > 0) {
        for (const watcherId of params.watchers) {
          await client.query(
            `INSERT INTO approval_watchers (document_id, user_id, added_by)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [docId, watcherId, params.createdBy]
          );
        }
      }

      await client.query('COMMIT');

      // Send notification to assignee (after commit)
      if (assigneeId) {
        await this.notifyUser(assigneeId, params.companyId, 'approval_pending', {
          documentId: docId,
          documentNumber: params.documentNumber,
          documentType: params.documentType,
          title: params.title,
          amount: params.amount,
          currency: params.currency || 'SAR',
          createdByUserId: params.createdBy,
        });
      }

      return { success: true, approvalDocumentId: docId, status: 'pending_review' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark a document as viewed (read receipt)
   */
  static async markAsViewed(params: ActionParams): Promise<void> {
    const client = await pool.connect();
    try {
      // Update status to under_review if pending_review
      await client.query(
        `UPDATE approval_documents SET status = 'under_review'
         WHERE id = $1 AND status = 'pending_review'`,
        [params.documentId]
      );

      await this.logAction(client, {
        documentId: params.documentId,
        action: 'viewed',
        actorId: params.actorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      // Notify creator that document was viewed
      const doc = await this.getDocument(params.documentId);
      if (doc) {
        await this.notifyUser(doc.created_by, doc.company_id, 'approval_viewed', {
          documentId: doc.id,
          documentNumber: doc.document_number,
          viewedByUserId: params.actorId,
        });
      }
    } finally {
      client.release();
    }
  }

  /**
   * Approve a document at the current step.
   * If all steps complete → status = approved (ready for posting).
   * If more steps → advance to next step.
   */
  static async approveDocument(params: ActionParams): Promise<{
    success: boolean;
    newStatus: string;
    message: string;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, newStatus: '', message: 'Document not found' };
      }

      // Validate status
      if (!['pending_review', 'under_review', 'pending_approval'].includes(doc.status)) {
        await client.query('ROLLBACK');
        return { success: false, newStatus: doc.status, message: `Cannot approve document in status: ${doc.status}` };
      }

      // Conflict of interest: creator cannot approve
      if (doc.created_by === params.actorId) {
        await client.query('ROLLBACK');
        return { success: false, newStatus: doc.status, message: 'You cannot approve a document you created' };
      }

      // Same-user multi-step conflict (configurable per route)
      const routeConfig = doc.route_id ? await client.query(
        `SELECT allow_same_approver FROM approval_routes WHERE id = $1`, [doc.route_id]
      ) : null;
      const allowSameApprover = routeConfig?.rows[0]?.allow_same_approver || false;

      if (!allowSameApprover) {
        const priorApproval = await client.query(
          `SELECT 1 FROM approval_actions
           WHERE document_id = $1 AND actor_id = $2 AND action = 'approved'
           LIMIT 1`,
          [params.documentId, params.actorId]
        );
        if (priorApproval.rows.length > 0) {
          await client.query('ROLLBACK');
          return { success: false, newStatus: doc.status, message: 'You already approved this document at a previous step' };
        }
      }

      // Log the approval action with digital signature
      const currentStep = await this.getCurrentStep(client, doc.route_id, doc.current_step);
      const signatureId = await this.findUserSignature(client, params.actorId, doc.company_id);
      await this.logAction(client, {
        documentId: params.documentId,
        stepId: currentStep?.id,
        stepNumber: doc.current_step,
        action: 'approved',
        actorId: params.actorId,
        comment: params.comment,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        signatureId,
      });

      // Check if there are more steps
      const nextStep = await this.getNextStep(client, doc.route_id, doc.current_step);

      let newStatus: string;
      let nextAssignee: number | null = null;

      if (nextStep) {
        // Check if next step should be skipped (conditional logic)
        let effectiveNextStep = nextStep;
        if (this.shouldSkipStep(effectiveNextStep, doc)) {
          // Try the step after the skipped one
          const stepAfterSkipped = await this.getNextStep(client, doc.route_id, effectiveNextStep.step_number);
          if (stepAfterSkipped) {
            effectiveNextStep = stepAfterSkipped;
          } else {
            effectiveNextStep = null; // All remaining steps skipped → fully approved
          }
        }

        if (effectiveNextStep) {
          // Advance to next step — use pending_approval for 'approve' type, pending_review for 'review'
          newStatus = effectiveNextStep.step_type === 'approve' ? 'pending_approval' : 'pending_review';
          nextAssignee = effectiveNextStep.user_id;
          if (!nextAssignee && effectiveNextStep.role_id) {
            nextAssignee = await this.findAssigneeByRole(client, effectiveNextStep.role_id, doc.company_id, doc.document_type);
          }

          await client.query(
            `UPDATE approval_documents
             SET status = $2::approval_doc_status, current_step = $3, current_assignee = $4
             WHERE id = $1`,
            [params.documentId, newStatus, effectiveNextStep.step_number, nextAssignee]
          );
        } else {
          // All steps complete (including skipped) — ready for posting
          newStatus = 'pending_post';
          await client.query(
            `UPDATE approval_documents
             SET status = 'pending_post', approved_at = NOW(), current_assignee = $2
             WHERE id = $1`,
            [params.documentId, params.actorId]
          );
        }
      } else {
        // All steps complete — ready for posting
        newStatus = 'pending_post';
        // Assignee for posting is the same approver
        await client.query(
          `UPDATE approval_documents
           SET status = 'pending_post', approved_at = NOW(), current_assignee = $2
           WHERE id = $1`,
          [params.documentId, params.actorId]
        );
      }

      await client.query('COMMIT');

      // Send notifications
      // Notify creator about progress
      await this.notifyUser(doc.created_by, doc.company_id, 'approval_approved', {
        documentId: doc.id,
        documentNumber: doc.document_number,
        documentType: doc.document_type,
        approvedByUserId: params.actorId,
        newStatus,
      });

      // Notify next assignee if applicable
      if (nextAssignee && nextAssignee !== params.actorId) {
        await this.notifyUser(nextAssignee, doc.company_id, 'approval_pending', {
          documentId: doc.id,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          title: doc.title,
          amount: doc.amount,
          currency: doc.currency,
        });
      }

      // Notify watchers
      await this.notifyWatchers(doc.id, 'approved', doc.company_id, {
        documentNumber: doc.document_number,
        approvedByUserId: params.actorId,
      });

      return {
        success: true,
        newStatus,
        message: nextStep ? 'Document approved. Forwarded to next step.' : 'Document fully approved. Ready for posting.',
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a document. Returns to creator with reason.
   */
  static async rejectDocument(params: ActionParams): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!params.comment || params.comment.trim().length < 10) {
      return { success: false, message: 'Rejection reason is required (minimum 10 characters)' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document not found' };
      }

      if (!['pending_review', 'under_review', 'pending_approval', 'pending_post'].includes(doc.status)) {
        await client.query('ROLLBACK');
        return { success: false, message: `Cannot reject document in status: ${doc.status}` };
      }

      // Log rejection with digital signature
      const currentStep = await this.getCurrentStep(client, doc.route_id, doc.current_step);
      const signatureId = await this.findUserSignature(client, params.actorId, doc.company_id);
      await this.logAction(client, {
        documentId: params.documentId,
        stepId: currentStep?.id,
        stepNumber: doc.current_step,
        action: 'rejected',
        actorId: params.actorId,
        comment: params.comment,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        signatureId,
      });

      // Reset to rejected — creator must fix and resubmit
      await client.query(
        `UPDATE approval_documents
         SET status = 'rejected', current_step = 0, current_assignee = created_by,
             rejected_at = NOW(), rejection_count = rejection_count + 1
         WHERE id = $1`,
        [params.documentId]
      );

      // Reset the source document back to draft so creator can fix and resubmit
      await this.resetSourceDocument(client, doc.reference_table, doc.reference_id);

      await client.query('COMMIT');

      // Notify creator with rejection reason
      await this.notifyUser(doc.created_by, doc.company_id, 'approval_rejected', {
        documentId: doc.id,
        documentNumber: doc.document_number,
        documentType: doc.document_type,
        rejectedByUserId: params.actorId,
        reason: params.comment,
        priority: 'high',
      });

      // Notify watchers
      await this.notifyWatchers(doc.id, 'rejected', doc.company_id, {
        documentNumber: doc.document_number,
        rejectedByUserId: params.actorId,
        reason: params.comment,
      });

      return { success: true, message: 'Document rejected. Creator has been notified.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Post a document — creates the accounting effect.
   * This is the final step: document gets its GL entries.
   */
  static async postDocument(params: PostParams): Promise<{
    success: boolean;
    message: string;
  }> {
    if (params.confirmToken !== 'CONFIRM') {
      return { success: false, message: 'Invalid confirmation token. Type CONFIRM to proceed.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document not found' };
      }

      if (doc.status !== 'pending_post') {
        await client.query('ROLLBACK');
        return { success: false, message: `Cannot post document in status: ${doc.status}. Must be fully approved (pending_post) first.` };
      }

      // Log posting action with digital signature
      const postSignatureId = await this.findUserSignature(client, params.actorId, doc.company_id);
      await this.logAction(client, {
        documentId: params.documentId,
        action: 'posted',
        actorId: params.actorId,
        comment: params.comment || 'Document posted to accounting',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        signatureId: postSignatureId,
      });

      // Update document status
      await client.query(
        `UPDATE approval_documents
         SET status = 'posted', posted_at = NOW(), current_assignee = NULL
         WHERE id = $1`,
        [params.documentId]
      );

      // Mark the source document as posted
      await this.postSourceDocument(client, doc.reference_table, doc.reference_id, params.actorId);

      await client.query('COMMIT');

      // Notify all parties
      const usersToNotify = new Set<number>();
      usersToNotify.add(doc.created_by);
      // Get all actors from actions
      const actorsResult = await pool.query(
        `SELECT DISTINCT actor_id FROM approval_actions WHERE document_id = $1`,
        [doc.id]
      );
      actorsResult.rows.forEach((r: any) => usersToNotify.add(r.actor_id));

      for (const userId of usersToNotify) {
        await this.notifyUser(userId, doc.company_id, 'approval_posted', {
          documentId: doc.id,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          postedByUserId: params.actorId,
        });
      }

      await this.notifyWatchers(doc.id, 'posted', doc.company_id, {
        documentNumber: doc.document_number,
        postedByUserId: params.actorId,
      });

      return { success: true, message: 'Document posted successfully. Accounting entries created.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Void a posted document — creates a reversal entry.
   */
  static async voidDocument(params: VoidParams): Promise<{
    success: boolean;
    message: string;
  }> {
    if (params.voidConfirm !== 'VOID') {
      return { success: false, message: 'Type VOID to confirm cancellation.' };
    }
    if (!params.reason || params.reason.trim().length < 10) {
      return { success: false, message: 'Void reason is required (minimum 10 characters)' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document not found' };
      }

      if (doc.status !== 'posted') {
        await client.query('ROLLBACK');
        return { success: false, message: `Cannot void document in status: ${doc.status}. Only posted documents can be voided.` };
      }

      // Log void action with digital signature
      const voidSignatureId = await this.findUserSignature(client, params.actorId, doc.company_id);
      await this.logAction(client, {
        documentId: params.documentId,
        action: 'voided',
        actorId: params.actorId,
        comment: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        signatureId: voidSignatureId,
      });

      // Update document status
      await client.query(
        `UPDATE approval_documents
         SET status = 'voided', voided_at = NOW(), current_assignee = NULL
         WHERE id = $1`,
        [params.documentId]
      );

      // Void the source document (create reversal if needed)
      await this.voidSourceDocument(client, doc.reference_table, doc.reference_id, params.actorId, params.reason);

      await client.query('COMMIT');

      // Notify all parties
      const usersToNotify = new Set<number>();
      usersToNotify.add(doc.created_by);
      const actorsResult = await pool.query(
        `SELECT DISTINCT actor_id FROM approval_actions WHERE document_id = $1`,
        [doc.id]
      );
      actorsResult.rows.forEach((r: any) => usersToNotify.add(r.actor_id));

      for (const userId of usersToNotify) {
        await this.notifyUser(userId, doc.company_id, 'approval_voided', {
          documentId: doc.id,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          voidedByUserId: params.actorId,
          reason: params.reason,
          priority: 'high',
        });
      }

      await this.notifyWatchers(doc.id, 'voided', doc.company_id, {
        documentNumber: doc.document_number,
        voidedByUserId: params.actorId,
        reason: params.reason,
      });

      return { success: true, message: 'Document voided. Reversal entry created.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Recall a submitted document — only if not yet acted upon.
   */
  static async recallDocument(params: ActionParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document not found' };
      }

      // Only creator can recall
      if (doc.created_by !== params.actorId) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Only the document creator can recall it' };
      }

      // Can only recall if pending_review (not yet acted on)
      if (doc.status !== 'pending_review') {
        await client.query('ROLLBACK');
        return { success: false, message: `Cannot recall document in status: ${doc.status}. Can only recall pending documents.` };
      }

      // Check if reviewer has already started reviewing
      const viewedResult = await client.query(
        `SELECT 1 FROM approval_actions WHERE document_id = $1 AND action = 'viewed' LIMIT 1`,
        [params.documentId]
      );
      if (viewedResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document has already been viewed by the reviewer. Cannot recall.' };
      }

      // Log recall
      await this.logAction(client, {
        documentId: params.documentId,
        action: 'recalled',
        actorId: params.actorId,
        comment: params.comment || 'Document recalled by creator',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      // Reset to draft
      await client.query(
        `UPDATE approval_documents
         SET status = 'draft', current_step = 0, current_assignee = NULL,
             submitted_at = NULL
         WHERE id = $1`,
        [params.documentId]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Document recalled successfully. Returned to draft.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resubmit a rejected document after corrections.
   */
  static async resubmitDocument(params: ActionParams): Promise<{
    success: boolean;
    approvalDocumentId?: number;
    message: string;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document not found' };
      }

      if (doc.created_by !== params.actorId) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Only the document creator can resubmit' };
      }

      if (doc.status !== 'rejected' && doc.status !== 'draft') {
        await client.query('ROLLBACK');
        return { success: false, message: `Cannot resubmit document in status: ${doc.status}` };
      }

      // Find first step assignee
      let assigneeId: number | null = null;
      if (doc.route_id) {
        const firstStep = await client.query(
          `SELECT ars.*, r.name AS role_name
           FROM approval_route_steps ars
           LEFT JOIN roles r ON r.id = ars.role_id
           WHERE ars.route_id = $1
           ORDER BY ars.step_number ASC LIMIT 1`,
          [doc.route_id]
        );
        if (firstStep.rows.length > 0) {
          const step = firstStep.rows[0];
          assigneeId = step.user_id;
          if (!assigneeId && step.role_id) {
            assigneeId = await this.findAssigneeByRole(client, step.role_id, doc.company_id, doc.document_type);
          }
        }
      }

      // Log resubmission
      await this.logAction(client, {
        documentId: params.documentId,
        action: 'resubmitted',
        actorId: params.actorId,
        comment: params.comment || 'Document resubmitted after corrections',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      // Update status back to pending_review
      await client.query(
        `UPDATE approval_documents
         SET status = 'pending_review', current_step = 1, current_assignee = $2,
             submitted_at = NOW(), rejected_at = NULL
         WHERE id = $1`,
        [params.documentId, assigneeId]
      );

      await client.query('COMMIT');

      // Notify assignee
      if (assigneeId) {
        await this.notifyUser(assigneeId, doc.company_id, 'approval_resubmitted', {
          documentId: doc.id,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          title: doc.title,
          amount: doc.amount,
          resubmittedByUserId: params.actorId,
        });
      }

      return { success: true, approvalDocumentId: doc.id, message: 'Document resubmitted for review.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel a document (by creator). Only for draft/rejected.
   */
  static async cancelDocument(params: ActionParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document not found' };
      }

      if (doc.created_by !== params.actorId) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Only the document creator can cancel it' };
      }

      if (!['draft', 'rejected'].includes(doc.status)) {
        await client.query('ROLLBACK');
        return { success: false, message: `Cannot cancel document in status: ${doc.status}` };
      }

      await this.logAction(client, {
        documentId: params.documentId,
        action: 'cancelled',
        actorId: params.actorId,
        comment: params.comment || 'Document cancelled by creator',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      await client.query(
        `UPDATE approval_documents SET status = 'cancelled', current_assignee = NULL WHERE id = $1`,
        [params.documentId]
      );

      // Reset the source document back to draft so it can be corrected
      await this.resetSourceDocument(client, doc.reference_table, doc.reference_id);

      await client.query('COMMIT');
      return { success: true, message: 'Document cancelled.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delegate current step to another user.
   */
  static async delegateStep(params: DelegateParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const doc = await this.getDocumentForUpdate(client, params.documentId);
      if (!doc) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Document not found' };
      }

      if (doc.current_assignee !== params.fromUserId) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Only the current assignee can delegate' };
      }

      // Creator cannot be delegated to (conflict of interest)
      if (doc.created_by === params.toUserId) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Cannot delegate to the document creator' };
      }

      await this.logAction(client, {
        documentId: params.documentId,
        action: 'delegated',
        actorId: params.fromUserId,
        comment: params.reason || `Delegated to user #${params.toUserId}`,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { delegated_to: params.toUserId },
      });

      await client.query(
        `UPDATE approval_documents SET current_assignee = $2 WHERE id = $1`,
        [params.documentId, params.toUserId]
      );

      await client.query('COMMIT');

      // Notify new assignee
      await this.notifyUser(params.toUserId, doc.company_id, 'approval_delegated', {
        documentId: doc.id,
        documentNumber: doc.document_number,
        documentType: doc.document_type,
        title: doc.title,
        amount: doc.amount,
        delegatedByUserId: params.fromUserId,
      });

      return { success: true, message: 'Step delegated successfully.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send a reminder to the current assignee.
   */
  static async sendReminder(params: ActionParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const doc = await this.getDocument(params.documentId);
    if (!doc) return { success: false, message: 'Document not found' };
    if (doc.created_by !== params.actorId) return { success: false, message: 'Only creator can send reminders' };
    if (!doc.current_assignee) return { success: false, message: 'No current assignee to remind' };

    await this.logAction(pool, {
      documentId: params.documentId,
      action: 'reminded',
      actorId: params.actorId,
      comment: params.comment || 'Reminder sent',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await this.notifyUser(doc.current_assignee, doc.company_id, 'approval_reminder', {
      documentId: doc.id,
      documentNumber: doc.document_number,
      documentType: doc.document_type,
      title: doc.title,
      amount: doc.amount,
      reminderByUserId: params.actorId,
      priority: 'high',
    });

    return { success: true, message: 'Reminder sent.' };
  }

  // ─── Inbox & Monitor Queries ───────────────────────────

  /**
   * Get pending documents for a user's inbox.
   */
  static async getInbox(filters: InboxFilters): Promise<{
    data: any[];
    total: number;
  }> {
    const { userId, companyId, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let where = `ad.company_id = $1 AND ad.current_assignee = $2 AND ad.deleted_at IS NULL
                  AND ad.status NOT IN ('draft', 'posted', 'voided', 'cancelled')`;
    const params: any[] = [companyId, userId];
    let paramIdx = 3;

    if (filters.documentType) {
      where += ` AND ad.document_type = $${paramIdx}`;
      params.push(filters.documentType);
      paramIdx++;
    }
    if (filters.priority) {
      where += ` AND ad.priority = $${paramIdx}`;
      params.push(filters.priority);
      paramIdx++;
    }
    if (filters.amountMin) {
      where += ` AND ad.amount >= $${paramIdx}`;
      params.push(filters.amountMin);
      paramIdx++;
    }
    if (filters.amountMax) {
      where += ` AND ad.amount <= $${paramIdx}`;
      params.push(filters.amountMax);
      paramIdx++;
    }
    if (filters.search) {
      where += ` AND (ad.title ILIKE $${paramIdx} OR ad.document_number ILIKE $${paramIdx})`;
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM approval_documents ad WHERE ${where}`, params
    );

    const dataResult = await pool.query(
      `SELECT ad.*,
              u.full_name AS creator_name, u.email AS creator_email,
              ar.name_ar AS route_name_ar, ar.name_en AS route_name_en, ar.sla_hours,
              EXTRACT(EPOCH FROM (NOW() - ad.submitted_at))/3600 AS hours_since_submitted,
              (SELECT MAX(acted_at) FROM approval_actions WHERE document_id = ad.id) AS last_action_at
       FROM approval_documents ad
       LEFT JOIN users u ON u.id = ad.created_by
       LEFT JOIN approval_routes ar ON ar.id = ad.route_id
       WHERE ${where}
       ORDER BY
         CASE ad.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         ad.submitted_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get my documents (as creator).
   */
  static async getMyDocuments(userId: number, companyId: number, filters: any = {}): Promise<{
    data: any[];
    total: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let where = `ad.company_id = $1 AND ad.created_by = $2 AND ad.deleted_at IS NULL`;
    const params: any[] = [companyId, userId];
    let paramIdx = 3;

    if (filters.status) {
      where += ` AND ad.status = $${paramIdx}`;
      params.push(filters.status);
      paramIdx++;
    }
    if (filters.documentType) {
      where += ` AND ad.document_type = $${paramIdx}`;
      params.push(filters.documentType);
      paramIdx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM approval_documents ad WHERE ${where}`, params
    );

    const dataResult = await pool.query(
      `SELECT ad.*,
              cu.full_name AS assignee_name,
              ar.name_ar AS route_name_ar, ar.name_en AS route_name_en, ar.sla_hours,
              EXTRACT(EPOCH FROM (NOW() - ad.submitted_at))/3600 AS hours_since_submitted
       FROM approval_documents ad
       LEFT JOIN users u ON u.id = ad.created_by
       LEFT JOIN users cu ON cu.id = ad.current_assignee
       LEFT JOIN approval_routes ar ON ar.id = ad.route_id
       WHERE ${where}
       ORDER BY ad.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Monitor dashboard — KPIs and all documents.
   */
  static async getMonitorData(filters: MonitorFilters): Promise<{
    kpis: any;
    data: any[];
    total: number;
  }> {
    const { userId, companyId, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // KPIs
    const kpiResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('pending_review','under_review','pending_approval','pending_post')) AS pending_total,
         COUNT(*) FILTER (WHERE current_assignee = $2 AND status NOT IN ('draft','posted','voided','cancelled')) AS pending_mine,
         COUNT(*) FILTER (WHERE status IN ('pending_review','under_review') AND submitted_at < NOW() - INTERVAL '1 hour' * COALESCE((SELECT sla_hours FROM approval_routes WHERE id = route_id), 24)) AS sla_overdue,
         COUNT(*) FILTER (WHERE status = 'posted' AND posted_at::date = CURRENT_DATE) AS posted_today,
         COUNT(*) FILTER (WHERE status = 'rejected' AND rejected_at::date = CURRENT_DATE) AS rejected_today,
         COALESCE(SUM(amount) FILTER (WHERE status = 'posted' AND posted_at::date = CURRENT_DATE), 0) AS posted_amount_today,
         ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(posted_at, NOW()) - submitted_at))/3600) FILTER (WHERE submitted_at IS NOT NULL AND status = 'posted'), 1) AS avg_approval_hours
       FROM approval_documents
       WHERE company_id = $1 AND deleted_at IS NULL`,
      [companyId, userId]
    );

    // Data
    let where = `ad.company_id = $1 AND ad.deleted_at IS NULL`;
    const params: any[] = [companyId];
    let paramIdx = 2;

    if (filters.status) {
      where += ` AND ad.status = $${paramIdx}`;
      params.push(filters.status);
      paramIdx++;
    }
    if (filters.documentType) {
      where += ` AND ad.document_type = $${paramIdx}`;
      params.push(filters.documentType);
      paramIdx++;
    }
    if (filters.priority) {
      where += ` AND ad.priority = $${paramIdx}`;
      params.push(filters.priority);
      paramIdx++;
    }
    if (filters.createdBy) {
      where += ` AND ad.created_by = $${paramIdx}`;
      params.push(filters.createdBy);
      paramIdx++;
    }
    if (filters.dateFrom) {
      where += ` AND ad.created_at >= $${paramIdx}`;
      params.push(filters.dateFrom);
      paramIdx++;
    }
    if (filters.dateTo) {
      where += ` AND ad.created_at <= $${paramIdx}`;
      params.push(filters.dateTo);
      paramIdx++;
    }
    if (filters.search) {
      where += ` AND (ad.title ILIKE $${paramIdx} OR ad.document_number ILIKE $${paramIdx})`;
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM approval_documents ad WHERE ${where}`, params
    );

    const dataResult = await pool.query(
      `SELECT ad.*,
              u.full_name AS creator_name, u.email AS creator_email,
              cu.full_name AS assignee_name,
              ar.name_ar AS route_name_ar, ar.name_en AS route_name_en, ar.sla_hours,
              EXTRACT(EPOCH FROM (NOW() - ad.submitted_at))/3600 AS hours_since_submitted,
              (SELECT MAX(acted_at) FROM approval_actions WHERE document_id = ad.id) AS last_action_at
       FROM approval_documents ad
       LEFT JOIN users u ON u.id = ad.created_by
       LEFT JOIN users cu ON cu.id = ad.current_assignee
       LEFT JOIN approval_routes ar ON ar.id = ad.route_id
       WHERE ${where}
       ORDER BY ad.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return {
      kpis: kpiResult.rows[0] || {},
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get document detail with full timeline.
   */
  static async getDocumentDetail(documentId: number): Promise<any> {
    const docResult = await pool.query(
      `SELECT ad.*,
              u.full_name AS creator_name, u.email AS creator_email,
              cu.full_name AS assignee_name,
              ar.name_ar AS route_name_ar, ar.name_en AS route_name_en, ar.sla_hours
       FROM approval_documents ad
       LEFT JOIN users u ON u.id = ad.created_by
       LEFT JOIN users cu ON cu.id = ad.current_assignee
       LEFT JOIN approval_routes ar ON ar.id = ad.route_id
       WHERE ad.id = $1 AND ad.deleted_at IS NULL`,
      [documentId]
    );

    if (docResult.rows.length === 0) return null;

    const doc = docResult.rows[0];

    // Get timeline (actions) with digital signature data
    const actionsResult = await pool.query(
      `SELECT aa.*,
              u.full_name AS actor_name, u.email AS actor_email,
              du.full_name AS delegated_by_name,
              ds.signature_name_en, ds.signature_name_ar,
              ds.signature_title_en, ds.signature_title_ar,
              ds.signature_image_url, ds.signature_type AS sig_type,
              ds.signature_authority
       FROM approval_actions aa
       LEFT JOIN users u ON u.id = aa.actor_id
       LEFT JOIN users du ON du.id = aa.delegated_by
       LEFT JOIN digital_signatures ds ON ds.id = aa.signature_id
       WHERE aa.document_id = $1
       ORDER BY aa.created_at ASC`,
      [documentId]
    );

    // Get route steps
    const stepsResult = await pool.query(
      `SELECT ars.*,
              r.name AS role_name, r.display_name AS role_display_name,
              u.full_name AS assigned_user_name
       FROM approval_route_steps ars
       LEFT JOIN roles r ON r.id = ars.role_id
       LEFT JOIN users u ON u.id = ars.user_id
       WHERE ars.route_id = $1
       ORDER BY ars.step_number ASC`,
      [doc.route_id]
    );

    // Get watchers
    const watchersResult = await pool.query(
      `SELECT aw.*, u.full_name AS user_name, u.email AS user_email
       FROM approval_watchers aw
       LEFT JOIN users u ON u.id = aw.user_id
       WHERE aw.document_id = $1`,
      [documentId]
    );

    return {
      ...doc,
      timeline: actionsResult.rows,
      steps: stepsResult.rows,
      watchers: watchersResult.rows,
    };
  }

  /**
   * Get document tracker info (progress + read receipts).
   */
  static async getDocumentTracker(documentId: number): Promise<any> {
    const detail = await this.getDocumentDetail(documentId);
    if (!detail) return null;

    // Build progress stages
    const stages = [
      { key: 'created', label_ar: 'إنشاء', label_en: 'Created', completed: true, time: detail.created_at },
      { key: 'submitted', label_ar: 'إرسال', label_en: 'Submitted', completed: !!detail.submitted_at, time: detail.submitted_at },
    ];

    // Add route steps
    if (detail.steps) {
      for (const step of detail.steps) {
        const stepAction = detail.timeline.find(
          (a: any) => a.step_number === step.step_number && ['approved', 'posted'].includes(a.action)
        );
        stages.push({
          key: `step_${step.step_number}`,
          label_ar: step.label_ar || (step.step_type === 'review' ? 'مراجعة' : 'اعتماد'),
          label_en: step.label_en || (step.step_type === 'review' ? 'Review' : 'Approve'),
          completed: !!stepAction,
          time: stepAction?.acted_at || null,
        });
      }
    }

    stages.push({
      key: 'posted',
      label_ar: 'تعميد',
      label_en: 'Posted',
      completed: detail.status === 'posted' || detail.status === 'voided',
      time: detail.posted_at,
    });

    // Read receipts
    const readReceipts = detail.timeline
      .filter((a: any) => a.action === 'viewed')
      .map((a: any) => ({
        userId: a.actor_id,
        userName: a.actor_name,
        viewedAt: a.acted_at,
      }));

    // Time per stage calculation
    const timePerStage: any[] = [];
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].time && stages[i - 1].time) {
        const diff = (new Date(stages[i].time).getTime() - new Date(stages[i - 1].time).getTime()) / (1000 * 60 * 60);
        timePerStage.push({
          from: stages[i - 1].key,
          to: stages[i].key,
          hours: Math.round(diff * 10) / 10,
        });
      }
    }

    return {
      document: detail,
      stages,
      readReceipts,
      timePerStage,
      slaHours: detail.sla_hours,
      currentStage: stages.find((s: any) => !s.completed)?.key || 'completed',
    };
  }

  // ─── Approval Routes CRUD ─────────────────────────────

  static async getRoutes(companyId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT ar.*,
              (SELECT COUNT(*) FROM approval_route_steps WHERE route_id = ar.id) AS step_count,
              (SELECT COUNT(*) FROM approval_documents WHERE route_id = ar.id AND deleted_at IS NULL) AS document_count
       FROM approval_routes ar
       WHERE (ar.company_id = $1 OR ar.company_id IS NULL) AND ar.deleted_at IS NULL
       ORDER BY ar.document_type, ar.min_amount`,
      [companyId]
    );
    return result.rows;
  }

  static async getRouteDetail(routeId: number): Promise<any> {
    const routeResult = await pool.query(
      `SELECT * FROM approval_routes WHERE id = $1 AND deleted_at IS NULL`, [routeId]
    );
    if (routeResult.rows.length === 0) return null;

    const stepsResult = await pool.query(
      `SELECT ars.*,
              r.name AS role_name, r.display_name AS role_display_name,
              u.full_name AS assigned_user_name
       FROM approval_route_steps ars
       LEFT JOIN roles r ON r.id = ars.role_id
       LEFT JOIN users u ON u.id = ars.user_id
       WHERE ars.route_id = $1
       ORDER BY ars.step_number ASC`,
      [routeId]
    );

    return { ...routeResult.rows[0], steps: stepsResult.rows };
  }

  static async createRoute(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const routeResult = await client.query(
        `INSERT INTO approval_routes
         (tenant_id, company_id, name_ar, name_en, document_type, is_active,
          min_amount, max_amount, auto_approve_below, require_all_steps,
          sla_hours, description_ar, description_en, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          data.tenantId, data.companyId, data.nameAr, data.nameEn,
          data.documentType, data.isActive !== false,
          data.minAmount || 0, data.maxAmount, data.autoApproveBelow,
          data.requireAllSteps !== false, data.slaHours || 24,
          data.descriptionAr, data.descriptionEn, data.createdBy
        ]
      );

      const route = routeResult.rows[0];

      // Insert steps
      if (data.steps && data.steps.length > 0) {
        for (const step of data.steps) {
          await client.query(
            `INSERT INTO approval_route_steps
             (route_id, step_number, step_type, role_id, user_id, department,
              approval_type, can_delegate, is_mandatory, escalate_after_hours,
              escalate_to_user_id, note_required_on_reject, label_ar, label_en)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              route.id, step.stepNumber, step.stepType || 'review',
              step.roleId, step.userId, step.department,
              step.approvalType || 'any_one', step.canDelegate !== false,
              step.isMandatory !== false, step.escalateAfterHours,
              step.escalateToUserId, step.noteRequiredOnReject !== false,
              step.labelAr, step.labelEn
            ]
          );
        }
      }

      await client.query('COMMIT');
      return route;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateRoute(routeId: number, data: any): Promise<any> {
    const result = await pool.query(
      `UPDATE approval_routes SET
         name_ar = COALESCE($2, name_ar),
         name_en = COALESCE($3, name_en),
         is_active = COALESCE($4, is_active),
         min_amount = COALESCE($5, min_amount),
         max_amount = $6,
         auto_approve_below = $7,
         sla_hours = COALESCE($8, sla_hours),
         description_ar = $9,
         description_en = $10,
         allow_same_approver = COALESCE($11, allow_same_approver),
         escalation_enabled = COALESCE($12, escalation_enabled),
         escalation_role_id = $13,
         updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        routeId, data.nameAr || data.name_ar, data.nameEn || data.name_en,
        data.isActive ?? data.is_active,
        data.minAmount ?? data.min_amount, data.maxAmount ?? data.max_amount,
        data.autoApproveBelow ?? data.auto_approve_below,
        data.slaHours ?? data.sla_hours,
        data.descriptionAr ?? data.description_ar, data.descriptionEn ?? data.description_en,
        data.allowSameApprover ?? data.allow_same_approver,
        data.escalationEnabled ?? data.escalation_enabled,
        data.escalationRoleId ?? data.escalation_role_id ?? null,
      ]
    );
    return result.rows[0];
  }

  /** Decode HTML entities that the XSS sanitizer may have applied to operator strings */
  private static decodeOperator(val: string | null | undefined): string | null {
    if (!val) return null;
    return val.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
  }

  static async updateRouteStep(routeId: number, stepId: number, data: any): Promise<any> {
    const result = await pool.query(
      `UPDATE approval_route_steps SET
         user_id = $3,
         role_id = COALESCE($4, role_id),
         can_delegate = COALESCE($5, can_delegate),
         step_type = COALESCE($6, step_type),
         label_en = COALESCE($7, label_en),
         label_ar = COALESCE($8, label_ar),
         approval_type = COALESCE($9, approval_type),
         escalate_after_hours = $10,
         escalate_to_user_id = $11,
         condition_field = $12,
         condition_operator = $13,
         condition_value = $14,
         skip_if_condition_met = COALESCE($15, skip_if_condition_met)
       WHERE id = $2 AND route_id = $1
       RETURNING *`,
      [
        routeId, stepId,
        data.user_id ?? null,
        data.role_id ?? null,
        data.can_delegate ?? null,
        data.step_type ?? null,
        data.label_en ?? null,
        data.label_ar ?? null,
        data.approval_type ?? null,
        data.escalate_after_hours ?? null,
        data.escalate_to_user_id ?? null,
        data.condition_field ?? null,
        this.decodeOperator(data.condition_operator) ?? null,
        data.condition_value ?? null,
        data.skip_if_condition_met ?? null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Add a new step to a route (at the end, or at a specific position).
   */
  static async addRouteStep(routeId: number, data: any): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify route exists
      const routeCheck = await client.query(
        `SELECT id FROM approval_routes WHERE id = $1 AND deleted_at IS NULL`, [routeId]
      );
      if (routeCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Get next step number (or use provided position)
      let stepNumber = data.stepNumber;
      if (!stepNumber) {
        const maxResult = await client.query(
          `SELECT COALESCE(MAX(step_number), 0) + 1 AS next FROM approval_route_steps WHERE route_id = $1`, [routeId]
        );
        stepNumber = maxResult.rows[0].next;
      } else {
        // Shift existing steps at this position up
        await client.query(
          `UPDATE approval_route_steps SET step_number = step_number + 1
           WHERE route_id = $1 AND step_number >= $2`,
          [routeId, stepNumber]
        );
      }

      const result = await client.query(
        `INSERT INTO approval_route_steps
         (route_id, step_number, step_type, role_id, user_id, department,
          approval_type, can_delegate, is_mandatory, escalate_after_hours,
          escalate_to_user_id, note_required_on_reject, label_ar, label_en,
          condition_field, condition_operator, condition_value, skip_if_condition_met)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          routeId, stepNumber, data.stepType || 'review',
          data.roleId || null, data.userId || null, data.department || null,
          data.approvalType || 'any_one', data.canDelegate !== false,
          data.isMandatory !== false, data.escalateAfterHours || null,
          data.escalateToUserId || null, data.noteRequiredOnReject !== false,
          data.labelAr || null, data.labelEn || null,
          data.conditionField || null, this.decodeOperator(data.conditionOperator) || null,
          data.conditionValue || null, data.skipIfConditionMet || false,
        ]
      );

      // Update total_steps count on any active documents using this route
      await client.query(
        `UPDATE approval_documents SET total_steps = (
           SELECT COUNT(*) FROM approval_route_steps WHERE route_id = $1
         ) WHERE route_id = $1 AND status IN ('draft')`,
        [routeId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a step from a route and reorder remaining steps.
   */
  static async removeRouteStep(routeId: number, stepId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const delResult = await client.query(
        `DELETE FROM approval_route_steps WHERE id = $1 AND route_id = $2 RETURNING step_number`,
        [stepId, routeId]
      );
      if (delResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const deletedStepNumber = delResult.rows[0].step_number;

      // Reorder: shift down steps that came after the deleted one
      await client.query(
        `UPDATE approval_route_steps SET step_number = step_number - 1
         WHERE route_id = $1 AND step_number > $2`,
        [routeId, deletedStepNumber]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reorder steps in a route.
   * @param stepOrder Array of step IDs in the desired order
   */
  static async reorderRouteSteps(routeId: number, stepOrder: number[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // First, offset all step_numbers to avoid unique constraint violations
      const offset = 10000;
      for (let i = 0; i < stepOrder.length; i++) {
        await client.query(
          `UPDATE approval_route_steps SET step_number = $1
           WHERE id = $2 AND route_id = $3`,
          [offset + i + 1, stepOrder[i], routeId]
        );
      }
      // Then set final step_numbers
      for (let i = 0; i < stepOrder.length; i++) {
        await client.query(
          `UPDATE approval_route_steps SET step_number = $1
           WHERE id = $2 AND route_id = $3`,
          [i + 1, stepOrder[i], routeId]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft-delete a route.
   */
  static async deleteRoute(routeId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE approval_routes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [routeId]
    );
    return result.rows.length > 0;
  }

  /**
   * SLA Escalation — check all overdue documents and escalate.
   * Called manually or by cron job.
   */
  static async checkAndEscalate(companyId: number): Promise<{ escalated: number; reminded: number }> {
    let escalated = 0;
    let reminded = 0;

    // Find overdue documents with escalation-enabled routes
    const overdueResult = await pool.query(
      `SELECT ad.id, ad.document_number, ad.document_type, ad.title,
              ad.current_assignee, ad.current_step, ad.company_id,
              ad.submitted_at, ar.sla_hours, ar.escalation_enabled, ar.escalation_role_id,
              ars.escalate_after_hours, ars.escalate_to_user_id
       FROM approval_documents ad
       JOIN approval_routes ar ON ar.id = ad.route_id
       LEFT JOIN approval_route_steps ars ON ars.route_id = ar.id AND ars.step_number = ad.current_step
       WHERE ad.company_id = $1
         AND ad.status IN ('pending_review', 'under_review', 'pending_approval')
         AND ad.submitted_at IS NOT NULL
         AND ad.deleted_at IS NULL
         AND ad.submitted_at < NOW() - INTERVAL '1 hour' * COALESCE(ar.sla_hours, 24)`,
      [companyId]
    );

    for (const doc of overdueResult.rows) {
      // Check if already escalated for this step
      const alreadyEscalated = await pool.query(
        `SELECT 1 FROM approval_actions
         WHERE document_id = $1 AND action = 'escalated' AND step_number = $2 LIMIT 1`,
        [doc.id, doc.current_step]
      );
      if (alreadyEscalated.rows.length > 0) continue;

      // Step-level escalation
      if (doc.escalate_after_hours && doc.escalate_to_user_id) {
        const stepOverdue = new Date(doc.submitted_at).getTime() + (doc.escalate_after_hours * 3600000);
        if (Date.now() > stepOverdue) {
          // Reassign to escalation user
          await pool.query(
            `UPDATE approval_documents SET current_assignee = $2 WHERE id = $1`,
            [doc.id, doc.escalate_to_user_id]
          );
          await this.logAction(pool, {
            documentId: doc.id,
            stepNumber: doc.current_step,
            action: 'escalated',
            actorId: 0, // system
            comment: `SLA exceeded (${doc.sla_hours}h). Escalated to user ${doc.escalate_to_user_id}.`,
          });
          await this.notifyUser(doc.escalate_to_user_id, doc.company_id, 'approval_pending', {
            documentId: doc.id,
            documentNumber: doc.document_number,
            documentType: doc.document_type,
            title: doc.title,
            priority: 'high',
            isEscalation: true,
          });
          escalated++;
          continue;
        }
      }

      // Route-level escalation
      if (doc.escalation_enabled && doc.escalation_role_id) {
        const newAssignee = await this.findAssigneeByRole(
          pool as any, doc.escalation_role_id, doc.company_id, doc.document_type
        );
        if (newAssignee) {
          await pool.query(
            `UPDATE approval_documents SET current_assignee = $2 WHERE id = $1`,
            [doc.id, newAssignee]
          );
          await this.logAction(pool, {
            documentId: doc.id,
            stepNumber: doc.current_step,
            action: 'escalated',
            actorId: 0,
            comment: `SLA exceeded (${doc.sla_hours}h). Escalated to role-based assignee.`,
          });
          await this.notifyUser(newAssignee, doc.company_id, 'approval_pending', {
            documentId: doc.id,
            documentNumber: doc.document_number,
            documentType: doc.document_type,
            title: doc.title,
            priority: 'high',
            isEscalation: true,
          });
          escalated++;
          continue;
        }
      }

      // No escalation configured — just send a reminder to current assignee
      if (doc.current_assignee) {
        await this.notifyUser(doc.current_assignee, doc.company_id, 'approval_reminder', {
          documentId: doc.id,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          title: doc.title,
          priority: 'high',
          isOverdue: true,
        });
        reminded++;
      }
    }

    return { escalated, reminded };
  }

  // ─── Internal Helpers ─────────────────────────────────

  /**
   * Evaluate whether a step should be skipped based on its condition.
   * condition_field: 'amount' | 'document_type' | 'branch_id' etc.
   * condition_operator: '>' | '<' | '>=' | '<=' | '=' | '!='
   * condition_value: threshold (string, cast as needed)
   * skip_if_condition_met: if true → skip this step when condition is TRUE
   */
  private static shouldSkipStep(step: any, doc: any): boolean {
    if (!step.condition_field || !step.condition_operator || step.condition_value === null || step.condition_value === undefined) {
      return false;
    }
    const field = step.condition_field;
    const op = step.condition_operator;
    const threshold = step.condition_value;
    const docValue = doc[field];
    if (docValue === null || docValue === undefined) return false;

    let conditionMet = false;
    const numDoc = parseFloat(docValue);
    const numThreshold = parseFloat(threshold);
    const isNumeric = !isNaN(numDoc) && !isNaN(numThreshold);

    switch (op) {
      case '>':  conditionMet = isNumeric ? numDoc > numThreshold  : String(docValue) > threshold; break;
      case '<':  conditionMet = isNumeric ? numDoc < numThreshold  : String(docValue) < threshold; break;
      case '>=': conditionMet = isNumeric ? numDoc >= numThreshold : String(docValue) >= threshold; break;
      case '<=': conditionMet = isNumeric ? numDoc <= numThreshold : String(docValue) <= threshold; break;
      case '=':  conditionMet = isNumeric ? numDoc === numThreshold : String(docValue) === threshold; break;
      case '!=': conditionMet = isNumeric ? numDoc !== numThreshold : String(docValue) !== threshold; break;
      default: return false;
    }

    return step.skip_if_condition_met ? conditionMet : false;
  }

  private static async getDocument(documentId: number): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM approval_documents WHERE id = $1 AND deleted_at IS NULL`,
      [documentId]
    );
    return result.rows[0] || null;
  }

  private static async getDocumentForUpdate(client: PoolClient, documentId: number): Promise<any> {
    const result = await client.query(
      `SELECT * FROM approval_documents WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [documentId]
    );
    return result.rows[0] || null;
  }

  private static async getCurrentStep(client: PoolClient, routeId: number | null, stepNumber: number): Promise<any> {
    if (!routeId) return null;
    const result = await client.query(
      `SELECT * FROM approval_route_steps WHERE route_id = $1 AND step_number = $2`,
      [routeId, stepNumber]
    );
    return result.rows[0] || null;
  }

  private static async getNextStep(client: PoolClient, routeId: number | null, currentStepNumber: number): Promise<any> {
    if (!routeId) return null;
    const result = await client.query(
      `SELECT * FROM approval_route_steps WHERE route_id = $1 AND step_number > $2
       ORDER BY step_number ASC LIMIT 1`,
      [routeId, currentStepNumber]
    );
    return result.rows[0] || null;
  }

  private static async findAssigneeByRole(
    client: PoolClient, roleId: number, companyId: number, documentType: string
  ): Promise<number | null> {
    // Check for active delegation first
    const delegationResult = await client.query(
      `SELECT d.to_user_id FROM approval_delegations d
       WHERE d.from_user_id IN (
         SELECT ur.user_id FROM user_roles ur WHERE ur.role_id = $1
       )
       AND d.is_active = true
       AND NOW() BETWEEN d.valid_from AND d.valid_until
       AND (d.document_types = '{}' OR $3::approval_document_type = ANY(d.document_types))
       AND (d.company_id = $2 OR d.company_id IS NULL)
       LIMIT 1`,
      [roleId, companyId, documentType]
    );

    if (delegationResult.rows.length > 0) {
      return delegationResult.rows[0].to_user_id;
    }

    // Find a user with this role in this company
    const userResult = await client.query(
      `SELECT ur.user_id
       FROM user_roles ur
       INNER JOIN user_companies uc ON uc.user_id = ur.user_id AND uc.company_id = $2
       WHERE ur.role_id = $1
       LIMIT 1`,
      [roleId, companyId]
    );

    return userResult.rows[0]?.user_id || null;
  }

  private static async logAction(clientOrPool: any, params: {
    documentId: number;
    stepId?: number;
    stepNumber?: number;
    action: string;
    actorId: number;
    delegatedBy?: number;
    comment?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
    signatureId?: number | null;
  }): Promise<void> {
    await clientOrPool.query(
      `INSERT INTO approval_actions
       (document_id, step_id, step_number, action, actor_id, delegated_by,
        comment, ip_address, user_agent, metadata, signature_id, acted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        params.documentId, params.stepId || null, params.stepNumber || null,
        params.action, params.actorId, params.delegatedBy || null,
        params.comment || null, params.ipAddress || null,
        params.userAgent || null, JSON.stringify(params.metadata || {}),
        params.signatureId || null,
      ]
    );
  }

  /**
   * Find the active digital signature for a user in a specific company.
   * Returns the signature ID if found, null otherwise.
   */
  private static async findUserSignature(clientOrPool: any, userId: number, companyId: number): Promise<number | null> {
    const result = await clientOrPool.query(
      `SELECT id FROM digital_signatures
       WHERE user_id = $1 AND company_id = $2 AND is_active = TRUE AND deleted_at IS NULL
       ORDER BY is_default DESC, updated_at DESC
       LIMIT 1`,
      [userId, companyId]
    );
    return result.rows[0]?.id || null;
  }

  private static async linkToSource(client: PoolClient, table: string, referenceId: number, approvalDocId: number): Promise<void> {
    // Safely update the source table with the approval document ID
    const allowedTables = ['journal_entries', 'payment_vouchers', 'receipt_vouchers', 'purchase_orders', 'expense_requests', 'shipment_expenses'];
    if (!allowedTables.includes(table)) return;

    try {
      await client.query(
        `UPDATE ${table} SET approval_document_id = $1 WHERE id = $2`,
        [approvalDocId, referenceId]
      );
    } catch {
      // Column may not exist yet — fail silently
    }
  }

  private static async postSourceDocument(client: PoolClient, table: string, referenceId: number, actorId: number): Promise<void> {
    const allowedTables = ['journal_entries', 'payment_vouchers', 'receipt_vouchers', 'purchase_orders', 'expense_requests', 'shipment_expenses'];
    if (!allowedTables.includes(table)) return;

    try {
      await client.query('SAVEPOINT post_source');

      if (table === 'journal_entries') {
        await client.query(
          `UPDATE journal_entries SET status = 'posted', posted_by = $2, posted_at = NOW() WHERE id = $1`,
          [referenceId, actorId]
        );
      } else if (table === 'payment_vouchers') {
        await client.query(
          `UPDATE payment_vouchers SET status = 'posted', posted_by = $2, posted_at = NOW() WHERE id = $1`,
          [referenceId, actorId]
        );
      } else if (table === 'receipt_vouchers') {
        await client.query(
          `UPDATE receipt_vouchers SET status = 'posted', posted_by = $2, posted_at = NOW() WHERE id = $1`,
          [referenceId, actorId]
        );
      } else if (table === 'purchase_orders') {
        await client.query(
          `UPDATE purchase_orders SET approval_status = 'approved' WHERE id = $1`,
          [referenceId]
        );
      } else if (table === 'expense_requests') {
        await client.query(
          `UPDATE expense_requests SET status = 'approved', approved_by = $2, approved_at = NOW() WHERE id = $1`,
          [referenceId, actorId]
        );
      } else if (table === 'shipment_expenses') {
        await client.query(
          `UPDATE shipment_expenses SET approval_status = 'approved', approved_by = $2, approved_at = NOW() WHERE id = $1`,
          [referenceId, actorId]
        );
      }

      await client.query('RELEASE SAVEPOINT post_source');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT post_source');
    }
  }

  private static async voidSourceDocument(client: PoolClient, table: string, referenceId: number, actorId: number, reason: string): Promise<void> {
    const allowedTables = ['journal_entries', 'payment_vouchers', 'receipt_vouchers', 'shipment_expenses', 'expense_requests'];
    if (!allowedTables.includes(table)) return;

    try {
      // Use SAVEPOINT so source-document errors don't abort the main transaction
      await client.query('SAVEPOINT void_source');

      if (table === 'journal_entries') {
        await client.query(
          `UPDATE journal_entries SET status = 'reversed' WHERE id = $1`,
          [referenceId]
        );
      } else if (table === 'payment_vouchers') {
        await client.query(
          `UPDATE payment_vouchers SET status = 'reversed', voided_by = $2, voided_at = NOW() WHERE id = $1`,
          [referenceId, actorId]
        );
      } else if (table === 'receipt_vouchers') {
        await client.query(
          `UPDATE receipt_vouchers SET status = 'reversed', reversed_by = $2, reversed_at = NOW(), reversal_reason = $3 WHERE id = $1`,
          [referenceId, actorId, reason]
        );
      } else if (table === 'shipment_expenses') {
        await client.query(
          `UPDATE shipment_expenses SET approval_status = 'draft', approval_document_id = NULL, approved_by = NULL, approved_at = NULL, is_posted = false WHERE id = $1`,
          [referenceId]
        );
      } else if (table === 'expense_requests') {
        await client.query(
          `UPDATE expense_requests
           SET status_id = (SELECT id FROM request_statuses WHERE code = 'DRAFT' LIMIT 1),
               approval_document_id = NULL,
               approved_by = NULL, approved_at = NULL
           WHERE id = $1`,
          [referenceId]
        );
      }

      await client.query('RELEASE SAVEPOINT void_source');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT void_source');
    }
  }

  private static async resetSourceDocument(client: PoolClient, table: string, referenceId: number): Promise<void> {
    const allowedTables = ['journal_entries', 'payment_vouchers', 'receipt_vouchers', 'purchase_orders', 'expense_requests', 'shipment_expenses'];
    if (!allowedTables.includes(table)) return;

    try {
      await client.query('SAVEPOINT reset_source');

      if (table === 'shipment_expenses') {
        await client.query(
          `UPDATE shipment_expenses SET approval_status = 'draft', approval_document_id = NULL WHERE id = $1`,
          [referenceId]
        );
      } else if (table === 'expense_requests') {
        await client.query(
          `UPDATE expense_requests
           SET status_id = (SELECT id FROM request_statuses WHERE code = 'DRAFT' LIMIT 1),
               approval_document_id = NULL,
               approved_by = NULL, approved_at = NULL
           WHERE id = $1`,
          [referenceId]
        );
      } else if (table === 'journal_entries') {
        await client.query(
          `UPDATE journal_entries SET status = 'draft' WHERE id = $1 AND status NOT IN ('posted','reversed')`,
          [referenceId]
        );
      } else if (table === 'payment_vouchers') {
        await client.query(
          `UPDATE payment_vouchers SET status = 'draft' WHERE id = $1 AND status NOT IN ('posted','reversed')`,
          [referenceId]
        );
      } else if (table === 'purchase_orders') {
        await client.query(
          `UPDATE purchase_orders SET approval_status = 'draft' WHERE id = $1 AND approval_status NOT IN ('approved','rejected')`,
          [referenceId]
        );
      }

      await client.query('RELEASE SAVEPOINT reset_source');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT reset_source');
    }
  }

  private static async notifyUser(userId: number, companyId: number, type: string, payload: any): Promise<void> {
    try {
      await NotificationService.create({
        type,
        category: 'user',
        priority: payload.priority || 'normal',
        titleKey: `notifications.${type}.title`,
        messageKey: `notifications.${type}.message`,
        payload,
        targetUserId: userId,
        companyId,
        actionUrl: `/approvals/tracker/${payload.documentId}`,
        relatedEntityType: 'approval_document',
        relatedEntityId: payload.documentId,
      });
    } catch (error) {
      console.error('Failed to send approval notification:', error);
    }
  }

  private static async notifyWatchers(documentId: number, event: string, companyId: number, payload: any): Promise<void> {
    try {
      const watchers = await pool.query(
        `SELECT user_id FROM approval_watchers WHERE document_id = $1 AND $2 = ANY(notify_on)`,
        [documentId, event]
      );
      for (const watcher of watchers.rows) {
        await this.notifyUser(watcher.user_id, companyId, `approval_${event}`, {
          ...payload,
          documentId,
          isWatcher: true,
        });
      }
    } catch (error) {
      console.error('Failed to notify watchers:', error);
    }
  }
}

export default ApprovalWorkflowEngine;
