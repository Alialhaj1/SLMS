/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES INVOICES ROUTES                                                     ║
 * ║  API endpoints for sales invoice management with GL posting                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import salesInvoiceService from '../../services/salesInvoiceService';
import { checkNeedsApproval, createApprovalRequest, isDocumentApproved } from '../../utils/approvalHelpers';
import pool from '../../db';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// LIST INVOICES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  requirePermission('sales_invoices:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).user.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }
      
      const filters = {
        status: req.query.status as string,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        salesRepId: req.query.salesRepId ? parseInt(req.query.salesRepId as string) : undefined,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        dueFromDate: req.query.dueFromDate ? new Date(req.query.dueFromDate as string) : undefined,
        dueToDate: req.query.dueToDate ? new Date(req.query.dueToDate as string) : undefined,
        overdue: req.query.overdue === 'true',
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      
      const result = await salesInvoiceService.list(companyId, filters);
      res.json({ data: result.data, total: result.total });
      
    } catch (error: any) {
      console.error('Error listing invoices:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET SINGLE INVOICE
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id',
  authenticate,
  requirePermission('sales_invoices:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await salesInvoiceService.getById(id);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json({ data: invoice });
      
    } catch (error: any) {
      console.error('Error getting invoice:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE INVOICE
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/',
  authenticate,
  requirePermission('sales_invoices:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }
      
      const input = {
        ...req.body,
        companyId,
        createdBy: userId,
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate)
      };
      
      const result = await salesInvoiceService.create(input);
      res.status(201).json({ 
        data: { id: result.id, invoiceNumber: result.invoiceNumber },
        message: 'Invoice created successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE FROM DELIVERY NOTE
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/from-delivery/:deliveryNoteId',
  authenticate,
  requirePermission('sales_invoices:create'),
  async (req: Request, res: Response) => {
    try {
      const deliveryNoteId = parseInt(req.params.deliveryNoteId);
      const userId = (req as any).user.id;
      const { invoiceDate, dueDate } = req.body;
      
      if (!invoiceDate || !dueDate) {
        return res.status(400).json({ error: 'invoiceDate and dueDate are required' });
      }
      
      const result = await salesInvoiceService.createFromDeliveryNote(
        deliveryNoteId,
        new Date(invoiceDate),
        new Date(dueDate),
        userId
      );
      
      res.status(201).json({ 
        data: { id: result.id, invoiceNumber: result.invoiceNumber },
        message: 'Invoice created from delivery note successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating invoice from delivery:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// APPROVE INVOICE
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/approve',
  authenticate,
  requirePermission('sales_invoices:approve'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      await salesInvoiceService.approve(id, userId);
      res.json({ message: 'Invoice approved successfully' });
      
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// POST INVOICE
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/post',
  authenticate,
  requirePermission('sales_invoices:post'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      // Get invoice details for approval check
      const invoiceResult = await pool.query(
        `SELECT invoice_number, total_amount FROM sales_invoices 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId]
      );

      if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = invoiceResult.rows[0];

      // Check if approval is required
      const approvalCheck = await checkNeedsApproval(
        companyId,
        'sales_invoices',
        parseFloat(invoice.total_amount)
      );

      if (approvalCheck.needsApproval) {
        const isApproved = await isDocumentApproved('sales_invoices', id);
        
        if (!isApproved) {
          // Create approval request if not exists
          const existingApproval = await pool.query(
            `SELECT id FROM approval_requests 
             WHERE document_type = 'sales_invoice' AND document_id = $1 
             AND company_id = $2 AND status = 'pending' AND deleted_at IS NULL`,
            [id, companyId]
          );

          if (existingApproval.rows.length === 0) {
            await createApprovalRequest(
              companyId,
              approvalCheck.workflowId!,
              'sales_invoice',
              id,
              invoice.invoice_number,
              parseFloat(invoice.total_amount),
              userId,
              'Auto-generated approval request on posting attempt'
            );
          }

          return res.status(403).json({
            error: 'Approval required before posting',
            approval_required: true,
            workflow_name: approvalCheck.workflowName,
            required_role: approvalCheck.approvalRole
          });
        }
      }
      
      const result = await salesInvoiceService.post(id, userId);
      res.json({ 
        data: { journalEntryId: result.journalEntryId },
        message: 'Invoice posted successfully'
      });
      
    } catch (error: any) {
      console.error('Error posting invoice:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// RECORD PAYMENT
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/payment',
  authenticate,
  requirePermission('sales_invoices:update'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { amount, paymentReference } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }
      
      await salesInvoiceService.recordPayment(id, amount, paymentReference || '', userId);
      res.json({ message: 'Payment recorded successfully' });
      
    } catch (error: any) {
      console.error('Error recording payment:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// VOID INVOICE
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/void',
  authenticate,
  requirePermission('sales_invoices:void'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: 'Void reason is required' });
      }
      
      await salesInvoiceService.void(id, reason, userId);
      res.json({ message: 'Invoice voided successfully' });
      
    } catch (error: any) {
      console.error('Error voiding invoice:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
