/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES RETURNS & CREDIT NOTES ROUTES                                       ║
 * ║  API endpoints for returns management and credit note issuance             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { SalesReturnService, CreditNoteService } from '../../services/salesReturnService';

const router = Router();
const salesReturnService = new SalesReturnService();
const creditNoteService = new CreditNoteService();

// ═══════════════════════════════════════════════════════════════════════════
// SALES RETURNS
// ═══════════════════════════════════════════════════════════════════════════

// List returns
router.get(
  '/returns',
  authenticate,
  requirePermission('sales_returns:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).user.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }
      
      const filters = {
        status: req.query.status as string,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        salesInvoiceId: req.query.salesInvoiceId ? parseInt(req.query.salesInvoiceId as string) : undefined,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      
      const result = await salesReturnService.list(companyId, filters);
      res.json({ data: result.data, total: result.total });
      
    } catch (error: any) {
      console.error('Error listing returns:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get single return
router.get(
  '/returns/:id',
  authenticate,
  requirePermission('sales_returns:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const salesReturn = await salesReturnService.getById(id);
      
      if (!salesReturn) {
        return res.status(404).json({ error: 'Return not found' });
      }
      
      res.json({ data: salesReturn });
      
    } catch (error: any) {
      console.error('Error getting return:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create return
router.post(
  '/returns',
  authenticate,
  requirePermission('sales_returns:create'),
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
        returnDate: new Date(req.body.returnDate)
      };
      
      const result = await salesReturnService.create(input);
      res.status(201).json({ 
        data: { id: result.id, returnNumber: result.returnNumber },
        message: 'Return created successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating return:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Approve return
router.post(
  '/returns/:id/approve',
  authenticate,
  requirePermission('sales_returns:approve'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      await salesReturnService.approve(id, userId);
      res.json({ message: 'Return approved successfully' });
      
    } catch (error: any) {
      console.error('Error approving return:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Receive goods
router.post(
  '/returns/:id/receive',
  authenticate,
  requirePermission('sales_returns:receive'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      await salesReturnService.receiveGoods(id, userId);
      res.json({ message: 'Goods received successfully' });
      
    } catch (error: any) {
      console.error('Error receiving goods:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Create credit note from return
router.post(
  '/returns/:id/create-credit-note',
  authenticate,
  requirePermission('credit_notes:create'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const result = await salesReturnService.createCreditNoteFromReturn(id, userId);
      res.json({ 
        data: { creditNoteId: result.creditNoteId, creditNoteNumber: result.creditNoteNumber },
        message: 'Credit note created successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating credit note:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CREDIT NOTES
// ═══════════════════════════════════════════════════════════════════════════

// List credit notes
router.get(
  '/credit-notes',
  authenticate,
  requirePermission('credit_notes:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).user.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }
      
      const filters = {
        status: req.query.status as string,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        creditType: req.query.creditType as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        hasBalance: req.query.hasBalance === 'true',
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      
      const result = await creditNoteService.list(companyId, filters);
      res.json({ data: result.data, total: result.total });
      
    } catch (error: any) {
      console.error('Error listing credit notes:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get single credit note
router.get(
  '/credit-notes/:id',
  authenticate,
  requirePermission('credit_notes:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const creditNote = await creditNoteService.getById(id);
      
      if (!creditNote) {
        return res.status(404).json({ error: 'Credit note not found' });
      }
      
      res.json({ data: creditNote });
      
    } catch (error: any) {
      console.error('Error getting credit note:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create credit note (standalone)
router.post(
  '/credit-notes',
  authenticate,
  requirePermission('credit_notes:create'),
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
        creditNoteDate: new Date(req.body.creditNoteDate)
      };
      
      const result = await creditNoteService.create(input);
      res.status(201).json({ 
        data: { id: result.id, creditNoteNumber: result.creditNoteNumber },
        message: 'Credit note created successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating credit note:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Post credit note
router.post(
  '/credit-notes/:id/post',
  authenticate,
  requirePermission('credit_notes:post'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const result = await creditNoteService.post(id, userId);
      res.json({ 
        data: { journalEntryId: result.journalEntryId },
        message: 'Credit note posted successfully'
      });
      
    } catch (error: any) {
      console.error('Error posting credit note:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Apply credit note to invoice
router.post(
  '/credit-notes/:id/apply',
  authenticate,
  requirePermission('credit_notes:apply'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { invoiceId, amount } = req.body;
      
      if (!invoiceId || !amount) {
        return res.status(400).json({ error: 'invoiceId and amount are required' });
      }
      
      await creditNoteService.applyToInvoice(id, invoiceId, amount, userId);
      res.json({ message: 'Credit note applied successfully' });
      
    } catch (error: any) {
      console.error('Error applying credit note:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
