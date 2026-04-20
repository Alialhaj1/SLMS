/**
 * Approval Documents API Routes
 * ==============================
 * Unified API for the approval workflow engine.
 * Handles: submit, approve, reject, post, void, recall, delegate, inbox, monitor, tracker.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';
import { ApprovalWorkflowEngine } from '../services/approvalWorkflowEngine';

const router = Router();

// All routes require auth + company context
router.use(authenticate, loadCompanyContext);

// ─── Inbox & My Documents ────────────────────────────────

/**
 * GET /api/approval-documents/inbox
 * Get documents pending current user's action
 */
router.get('/inbox', requirePermission('approval_documents:view'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.companyId;

    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const result = await ApprovalWorkflowEngine.getInbox({
      userId,
      companyId,
      documentType: req.query.documentType as string,
      priority: req.query.priority as string,
      search: req.query.search as string,
      amountMin: req.query.amountMin ? Number(req.query.amountMin) : undefined,
      amountMax: req.query.amountMax ? Number(req.query.amountMax) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

/**
 * GET /api/approval-documents/my-documents
 * Get documents created by current user
 */
router.get('/my-documents', requirePermission('approval_documents:view'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.companyId;

    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const result = await ApprovalWorkflowEngine.getMyDocuments(userId, companyId, {
      status: req.query.status,
      documentType: req.query.documentType,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching my documents:', error);
    res.status(500).json({ error: 'Failed to fetch your documents' });
  }
});

/**
 * GET /api/approval-documents/monitor
 * Dashboard with KPIs and all documents (for managers)
 */
router.get('/monitor', requirePermission('approval_documents:monitor'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.companyId;

    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const result = await ApprovalWorkflowEngine.getMonitorData({
      userId,
      companyId,
      documentType: req.query.documentType as string,
      priority: req.query.priority as string,
      status: req.query.status as string,
      createdBy: req.query.createdBy ? Number(req.query.createdBy) : undefined,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching monitor data:', error);
    res.status(500).json({ error: 'Failed to fetch monitor data' });
  }
});

/**
 * GET /api/approval-documents/inbox-count
 * Badge count for sidebar (lightweight)
 */
router.get('/inbox-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.companyId;

    if (!companyId) return res.json({ count: 0 });

    const result = await ApprovalWorkflowEngine.getInbox({
      userId,
      companyId,
      page: 1,
      limit: 1,
    });

    res.json({ count: result.total });
  } catch (error) {
    res.json({ count: 0 });
  }
});

// ─── Document Detail & Tracker ───────────────────────────

/**
 * GET /api/approval-documents/:id
 * Full document detail with timeline, steps, watchers
 */
router.get('/:id', requirePermission('approval_documents:view'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const detail = await ApprovalWorkflowEngine.getDocumentDetail(documentId);
    if (!detail) return res.status(404).json({ error: 'Document not found' });

    // Mark as viewed if current user is the assignee and hasn't viewed yet
    const userId = req.user!.id;
    if (detail.current_assignee === userId && ['pending_review'].includes(detail.status)) {
      await ApprovalWorkflowEngine.markAsViewed({
        documentId,
        actorId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

    res.json({ data: detail });
  } catch (error) {
    console.error('Error fetching document detail:', error);
    res.status(500).json({ error: 'Failed to fetch document detail' });
  }
});

/**
 * GET /api/approval-documents/:id/tracker
 * Document progress tracker with read receipts
 */
router.get('/:id/tracker', requirePermission('approval_documents:view'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const tracker = await ApprovalWorkflowEngine.getDocumentTracker(documentId);
    if (!tracker) return res.status(404).json({ error: 'Document not found' });

    res.json({ data: tracker });
  } catch (error) {
    console.error('Error fetching tracker:', error);
    res.status(500).json({ error: 'Failed to fetch tracker' });
  }
});

/**
 * GET /api/approval-documents/:id/timeline
 * Just the action timeline for a document
 */
router.get('/:id/timeline', requirePermission('approval_documents:view'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    const detail = await ApprovalWorkflowEngine.getDocumentDetail(documentId);
    if (!detail) return res.status(404).json({ error: 'Document not found' });

    res.json({ data: detail.timeline });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// ─── Document Actions ───────────────────────────────────

/**
 * POST /api/approval-documents/submit
 * Submit a new document for approval
 */
router.post('/submit', requirePermission('approval_documents:submit'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.companyId;

    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const {
      documentType, referenceId, referenceTable, documentNumber,
      title, amount, currency, branchId, notes, attachments,
      priority, dueDate, watchers
    } = req.body;

    if (!documentType || !referenceId || !referenceTable || !title) {
      return res.status(400).json({ error: 'documentType, referenceId, referenceTable, and title are required' });
    }

    const result = await ApprovalWorkflowEngine.submitDocument({
      companyId,
      documentType,
      referenceId,
      referenceTable,
      documentNumber,
      title,
      amount: amount || 0,
      currency: currency || 'SAR',
      createdBy: userId,
      branchId,
      notes,
      attachments,
      priority,
      dueDate,
      watchers,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.status(201).json({
      success: true,
      message: result.autoApproved
        ? 'Document auto-approved and posted (amount below threshold)'
        : 'Document submitted for approval',
      data: {
        approvalDocumentId: result.approvalDocumentId,
        status: result.status,
        autoApproved: result.autoApproved,
      }
    });
  } catch (error) {
    console.error('Error submitting document:', error);
    res.status(500).json({ error: 'Failed to submit document' });
  }
});

/**
 * POST /api/approval-documents/:id/approve
 * Approve document at current step
 */
router.post('/:id/approve', requireAnyPermission(['approval_documents:review', 'approval_documents:approve']), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const result = await ApprovalWorkflowEngine.approveDocument({
      documentId,
      actorId: req.user!.id,
      comment: req.body.comment,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(result.message.includes('cannot approve') ? 403 : 422).json({ error: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      data: { newStatus: result.newStatus },
    });
  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({ error: 'Failed to approve document' });
  }
});

/**
 * POST /api/approval-documents/:id/reject
 * Reject document — requires reason (min 10 chars)
 */
router.post('/:id/reject', requireAnyPermission(['approval_documents:review', 'approval_documents:approve']), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const { comment } = req.body;
    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({ error: 'Rejection reason is required (minimum 10 characters)' });
    }

    const result = await ApprovalWorkflowEngine.rejectDocument({
      documentId,
      actorId: req.user!.id,
      comment,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
});

/**
 * POST /api/approval-documents/:id/post
 * Post approved document — creates accounting entries
 */
router.post('/:id/post', requirePermission('approval_documents:post'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const { confirmToken, comment, postDate } = req.body;
    if (confirmToken !== 'CONFIRM') {
      return res.status(400).json({ error: 'Type CONFIRM to proceed with posting' });
    }

    const result = await ApprovalWorkflowEngine.postDocument({
      documentId,
      actorId: req.user!.id,
      confirmToken,
      comment,
      postDate,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error posting document:', error);
    res.status(500).json({ error: 'Failed to post document' });
  }
});

/**
 * POST /api/approval-documents/:id/void
 * Void a posted document — creates reversal entry
 */
router.post('/:id/void', requirePermission('approval_documents:void'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const { voidConfirm, reason } = req.body;
    if (voidConfirm !== 'VOID') {
      return res.status(400).json({ error: 'Type VOID to confirm cancellation' });
    }
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Void reason is required (minimum 10 characters)' });
    }

    const result = await ApprovalWorkflowEngine.voidDocument({
      documentId,
      actorId: req.user!.id,
      voidConfirm,
      reason,
      comment: reason,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error voiding document:', error);
    res.status(500).json({ error: 'Failed to void document' });
  }
});

/**
 * POST /api/approval-documents/:id/recall
 * Creator recalls a submitted document (before reviewer acts)
 */
router.post('/:id/recall', requirePermission('approval_documents:recall'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const result = await ApprovalWorkflowEngine.recallDocument({
      documentId,
      actorId: req.user!.id,
      comment: req.body.comment,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error recalling document:', error);
    res.status(500).json({ error: 'Failed to recall document' });
  }
});

/**
 * POST /api/approval-documents/:id/resubmit
 * Resubmit a rejected document after corrections
 */
router.post('/:id/resubmit', requirePermission('approval_documents:submit'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const result = await ApprovalWorkflowEngine.resubmitDocument({
      documentId,
      actorId: req.user!.id,
      comment: req.body.comment,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error resubmitting document:', error);
    res.status(500).json({ error: 'Failed to resubmit document' });
  }
});

/**
 * POST /api/approval-documents/:id/cancel
 * Cancel a draft/rejected document (by creator only)
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const result = await ApprovalWorkflowEngine.cancelDocument({
      documentId,
      actorId: req.user!.id,
      comment: req.body.comment,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error cancelling document:', error);
    res.status(500).json({ error: 'Failed to cancel document' });
  }
});

/**
 * POST /api/approval-documents/:id/delegate
 * Delegate current step to another user
 */
router.post('/:id/delegate', requirePermission('approval_documents:delegate'), async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const { toUserId, reason } = req.body;
    if (!toUserId) return res.status(400).json({ error: 'toUserId is required' });

    const result = await ApprovalWorkflowEngine.delegateStep({
      documentId,
      fromUserId: req.user!.id,
      toUserId: Number(toUserId),
      reason,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error delegating:', error);
    res.status(500).json({ error: 'Failed to delegate' });
  }
});

/**
 * POST /api/approval-documents/:id/remind
 * Creator sends a reminder to the current assignee
 */
router.post('/:id/remind', async (req: Request, res: Response) => {
  try {
    const documentId = Number(req.params.id);
    if (isNaN(documentId)) return res.status(400).json({ error: 'Invalid document ID' });

    const result = await ApprovalWorkflowEngine.sendReminder({
      documentId,
      actorId: req.user!.id,
      comment: req.body.comment,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// ─── Approval Routes Config ─────────────────────────────

/**
 * GET /api/approval-documents/routes
 * List approval route configurations for the company
 */
router.get('/routes/list', requirePermission('approval_routes:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const routes = await ApprovalWorkflowEngine.getRoutes(companyId);
    res.json({ data: routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch approval routes' });
  }
});

/**
 * GET /api/approval-documents/routes/:id
 * Get route detail with steps
 */
router.get('/routes/:id', requirePermission('approval_routes:view'), async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.params.id);
    if (isNaN(routeId)) return res.status(400).json({ error: 'Invalid route ID' });

    const route = await ApprovalWorkflowEngine.getRouteDetail(routeId);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    res.json({ data: route });
  } catch (error) {
    console.error('Error fetching route detail:', error);
    res.status(500).json({ error: 'Failed to fetch route detail' });
  }
});

/**
 * POST /api/approval-documents/routes
 * Create a new approval route with steps
 */
router.post('/routes', requirePermission('approval_routes:create'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;

    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const route = await ApprovalWorkflowEngine.createRoute({
      ...req.body,
      companyId,
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, data: route });
  } catch (error: any) {
    console.error('Error creating route:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An approval route with these parameters already exists' });
    }
    res.status(500).json({ error: 'Failed to create approval route' });
  }
});

/**
 * PATCH /api/approval-documents/routes/:id
 * Update an approval route
 */
router.patch('/routes/:id', requirePermission('approval_routes:edit'), async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.params.id);
    if (isNaN(routeId)) return res.status(400).json({ error: 'Invalid route ID' });

    const route = await ApprovalWorkflowEngine.updateRoute(routeId, req.body);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    res.json({ success: true, data: route });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ error: 'Failed to update approval route' });
  }
});

/**
 * PATCH /api/approval-documents/routes/:routeId/steps/:stepId
 * Assign a specific user or role to an approval step
 */
router.patch('/routes/:routeId/steps/:stepId', requirePermission('approval_routes:edit'), async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.params.routeId);
    const stepId = Number(req.params.stepId);
    if (isNaN(routeId) || isNaN(stepId)) return res.status(400).json({ error: 'Invalid ID' });

    const step = await ApprovalWorkflowEngine.updateRouteStep(routeId, stepId, req.body);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    res.json({ success: true, data: step });
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

/**
 * POST /api/approval-documents/routes/:routeId/steps
 * Add a new step to a route
 */
router.post('/routes/:routeId/steps', requirePermission('approval_routes:edit'), async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.params.routeId);
    if (isNaN(routeId)) return res.status(400).json({ error: 'Invalid route ID' });

    const step = await ApprovalWorkflowEngine.addRouteStep(routeId, req.body);
    if (!step) return res.status(404).json({ error: 'Route not found' });

    res.status(201).json({ success: true, data: step });
  } catch (error: any) {
    console.error('Error adding step:', error);
    res.status(500).json({ error: 'Failed to add step' });
  }
});

/**
 * DELETE /api/approval-documents/routes/:routeId/steps/:stepId
 * Remove a step from a route (reorders remaining steps)
 */
router.delete('/routes/:routeId/steps/:stepId', requirePermission('approval_routes:edit'), async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.params.routeId);
    const stepId = Number(req.params.stepId);
    if (isNaN(routeId) || isNaN(stepId)) return res.status(400).json({ error: 'Invalid ID' });

    const result = await ApprovalWorkflowEngine.removeRouteStep(routeId, stepId);
    if (!result) return res.status(404).json({ error: 'Step not found' });

    res.json({ success: true, message: 'Step removed and steps reordered' });
  } catch (error) {
    console.error('Error removing step:', error);
    res.status(500).json({ error: 'Failed to remove step' });
  }
});

/**
 * PUT /api/approval-documents/routes/:routeId/steps/reorder
 * Reorder steps in a route
 */
router.put('/routes/:routeId/steps/reorder', requirePermission('approval_routes:edit'), async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.params.routeId);
    if (isNaN(routeId)) return res.status(400).json({ error: 'Invalid route ID' });

    const { stepOrder } = req.body; // Array of step IDs in new order
    if (!Array.isArray(stepOrder) || stepOrder.length === 0) {
      return res.status(400).json({ error: 'stepOrder array is required' });
    }

    await ApprovalWorkflowEngine.reorderRouteSteps(routeId, stepOrder);
    res.json({ success: true, message: 'Steps reordered' });
  } catch (error) {
    console.error('Error reordering steps:', error);
    res.status(500).json({ error: 'Failed to reorder steps' });
  }
});

/**
 * DELETE /api/approval-documents/routes/:id
 * Soft-delete a route
 */
router.delete('/routes/:id', requirePermission('approval_routes:delete'), async (req: Request, res: Response) => {
  try {
    const routeId = Number(req.params.id);
    if (isNaN(routeId)) return res.status(400).json({ error: 'Invalid route ID' });

    const result = await ApprovalWorkflowEngine.deleteRoute(routeId);
    if (!result) return res.status(404).json({ error: 'Route not found' });

    res.json({ success: true, message: 'Route deleted' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

/**
 * POST /api/approval-documents/routes/:routeId/check-escalations
 * Manual trigger for SLA escalation check (also runs on cron)
 */
router.post('/routes/check-escalations', requirePermission('approval_documents:monitor'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return res.status(400).json({ error: 'Company context required' });

    const result = await ApprovalWorkflowEngine.checkAndEscalate(companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error checking escalations:', error);
    res.status(500).json({ error: 'Failed to check escalations' });
  }
});

export default router;
