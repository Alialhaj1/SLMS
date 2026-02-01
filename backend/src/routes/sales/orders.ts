/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES ORDERS ROUTES                                                       ║
 * ║  API endpoints for sales order management with credit control              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac';
import salesOrderService from '../../services/salesOrderService';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// LIST ORDERS
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  requirePermission('sales_orders:view'),
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
        deliveryStatus: req.query.deliveryStatus as string,
        invoiceStatus: req.query.invoiceStatus as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      
      const result = await salesOrderService.list(companyId, filters);
      res.json({ data: result.data, total: result.total });
      
    } catch (error: any) {
      console.error('Error listing orders:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET SINGLE ORDER
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id',
  authenticate,
  requirePermission('sales_orders:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const order = await salesOrderService.getById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json({ data: order });
      
    } catch (error: any) {
      console.error('Error getting order:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE ORDER
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/',
  authenticate,
  requirePermission('sales_orders:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const userPermissions = (req as any).user.permissions || [];
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }
      
      // Check if user can skip credit check
      const canOverrideCredit = userPermissions.includes('sales_orders:credit_override');
      
      const input = {
        ...req.body,
        companyId,
        createdBy: userId,
        orderDate: new Date(req.body.orderDate),
        requestedDeliveryDate: req.body.requestedDeliveryDate ? new Date(req.body.requestedDeliveryDate) : undefined,
        promisedDeliveryDate: req.body.promisedDeliveryDate ? new Date(req.body.promisedDeliveryDate) : undefined,
        skipCreditCheck: req.body.skipCreditCheck && canOverrideCredit
      };
      
      const result = await salesOrderService.create(input);
      
      res.status(201).json({ 
        data: { 
          id: result.id, 
          orderNumber: result.orderNumber,
          creditCheckResult: result.creditCheckResult
        },
        message: result.creditCheckResult.requiresApproval 
          ? 'Order created - requires credit approval'
          : 'Order created successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// APPROVE ORDER
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/approve',
  authenticate,
  requirePermission('sales_orders:approve'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { overrideReason } = req.body;
      
      await salesOrderService.approve(id, userId, overrideReason);
      res.json({ message: 'Order approved successfully' });
      
    } catch (error: any) {
      console.error('Error approving order:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIRM ORDER
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/confirm',
  authenticate,
  requirePermission('sales_orders:confirm'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      await salesOrderService.confirm(id, userId);
      res.json({ message: 'Order confirmed successfully' });
      
    } catch (error: any) {
      console.error('Error confirming order:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CANCEL ORDER
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('sales_orders:cancel'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: 'Cancellation reason required' });
      }
      
      await salesOrderService.cancel(id, reason, userId);
      res.json({ message: 'Order cancelled successfully' });
      
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET DELIVERABLE ITEMS
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id/deliverable-items',
  authenticate,
  requirePermission('sales_orders:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const items = await salesOrderService.getDeliverableItems(id);
      res.json({ data: items });
      
    } catch (error: any) {
      console.error('Error getting deliverable items:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET INVOICEABLE ITEMS
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id/invoiceable-items',
  authenticate,
  requirePermission('sales_orders:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const items = await salesOrderService.getInvoiceableItems(id);
      res.json({ data: items });
      
    } catch (error: any) {
      console.error('Error getting invoiceable items:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
