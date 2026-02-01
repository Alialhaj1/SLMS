/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES QUOTATIONS ROUTES                                                   ║
 * ║  API endpoints for quotation management                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import salesQuotationService from '../../services/salesQuotationService';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// LIST QUOTATIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  requirePermission('sales_quotations:view'),
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
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      
      const result = await salesQuotationService.list(companyId, filters);
      res.json({ data: result.data, total: result.total });
      
    } catch (error: any) {
      console.error('Error listing quotations:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET SINGLE QUOTATION
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id',
  authenticate,
  requirePermission('sales_quotations:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const quotation = await salesQuotationService.getById(id);
      
      if (!quotation) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      
      res.json({ data: quotation });
      
    } catch (error: any) {
      console.error('Error getting quotation:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE QUOTATION
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/',
  authenticate,
  requirePermission('sales_quotations:create'),
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
        quotationDate: new Date(req.body.quotationDate),
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined
      };
      
      const result = await salesQuotationService.create(input);
      res.status(201).json({ 
        data: { id: result.id, quotationNumber: result.quotationNumber },
        message: 'Quotation created successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE QUOTATION
// ═══════════════════════════════════════════════════════════════════════════

router.put(
  '/:id',
  authenticate,
  requirePermission('sales_quotations:update'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const input = {
        ...req.body,
        updatedBy: userId,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined
      };
      
      await salesQuotationService.update(id, input);
      res.json({ message: 'Quotation updated successfully' });
      
    } catch (error: any) {
      console.error('Error updating quotation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SEND QUOTATION
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/send',
  authenticate,
  requirePermission('sales_quotations:send'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      await salesQuotationService.send(id, userId);
      res.json({ message: 'Quotation sent successfully' });
      
    } catch (error: any) {
      console.error('Error sending quotation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ACCEPT QUOTATION
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/accept',
  authenticate,
  requirePermission('sales_quotations:update'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { acceptedBy } = req.body;
      
      if (!acceptedBy) {
        return res.status(400).json({ error: 'acceptedBy is required' });
      }
      
      await salesQuotationService.accept(id, acceptedBy, userId);
      res.json({ message: 'Quotation accepted successfully' });
      
    } catch (error: any) {
      console.error('Error accepting quotation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// REJECT QUOTATION
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/reject',
  authenticate,
  requirePermission('sales_quotations:update'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }
      
      await salesQuotationService.reject(id, reason, userId);
      res.json({ message: 'Quotation rejected' });
      
    } catch (error: any) {
      console.error('Error rejecting quotation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CONVERT TO ORDER
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/convert',
  authenticate,
  requirePermission('sales_quotations:convert'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const result = await salesQuotationService.convertToOrder(id, userId);
      res.json({ 
        data: { orderId: result.orderId, orderNumber: result.orderNumber },
        message: 'Quotation converted to order successfully'
      });
      
    } catch (error: any) {
      console.error('Error converting quotation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET ITEM PRICES
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/prices/lookup',
  authenticate,
  requirePermission('sales_quotations:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).user.companyId;
      const { customerId, itemIds } = req.body;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }
      
      if (!itemIds || !Array.isArray(itemIds)) {
        return res.status(400).json({ error: 'itemIds array required' });
      }
      
      const prices = await salesQuotationService.getItemPrices(companyId, customerId, itemIds);
      
      // Convert Map to object for JSON response
      const priceData: Record<number, any> = {};
      prices.forEach((value, key) => {
        priceData[key] = value;
      });
      
      res.json({ data: priceData });
      
    } catch (error: any) {
      console.error('Error looking up prices:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
