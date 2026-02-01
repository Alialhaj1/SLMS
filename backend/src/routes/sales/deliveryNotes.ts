/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  DELIVERY NOTES ROUTES                                                     ║
 * ║  API endpoints for delivery note management with inventory posting         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import deliveryNoteService from '../../services/deliveryNoteService';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// LIST DELIVERY NOTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  requirePermission('delivery_notes:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).user.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }
      
      const filters = {
        status: req.query.status as string,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        salesOrderId: req.query.salesOrderId ? parseInt(req.query.salesOrderId as string) : undefined,
        warehouseId: req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        invoiced: req.query.invoiced === 'true' ? true : req.query.invoiced === 'false' ? false : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };
      
      const result = await deliveryNoteService.list(companyId, filters);
      res.json({ data: result.data, total: result.total });
      
    } catch (error: any) {
      console.error('Error listing delivery notes:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// GET SINGLE DELIVERY NOTE
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:id',
  authenticate,
  requirePermission('delivery_notes:view'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deliveryNote = await deliveryNoteService.getById(id);
      
      if (!deliveryNote) {
        return res.status(404).json({ error: 'Delivery note not found' });
      }
      
      res.json({ data: deliveryNote });
      
    } catch (error: any) {
      console.error('Error getting delivery note:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE DELIVERY NOTE
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/',
  authenticate,
  requirePermission('delivery_notes:create'),
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
        deliveryDate: new Date(req.body.deliveryDate)
      };
      
      const result = await deliveryNoteService.create(input);
      res.status(201).json({ 
        data: { id: result.id, deliveryNumber: result.deliveryNumber },
        message: 'Delivery note created successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating delivery note:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE FROM ORDER (AUTO-FILL)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/from-order/:orderId',
  authenticate,
  requirePermission('delivery_notes:create'),
  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const userId = (req as any).user.id;
      const { warehouseId } = req.body;
      
      if (!warehouseId) {
        return res.status(400).json({ error: 'warehouseId is required' });
      }
      
      const result = await deliveryNoteService.createFromOrder(orderId, warehouseId, userId);
      res.status(201).json({ 
        data: { id: result.id, deliveryNumber: result.deliveryNumber },
        message: 'Delivery note created from order successfully'
      });
      
    } catch (error: any) {
      console.error('Error creating delivery from order:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// POST INVENTORY
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/post-inventory',
  authenticate,
  requirePermission('delivery_notes:post'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      await deliveryNoteService.postInventory(id, userId);
      res.json({ message: 'Inventory posted successfully' });
      
    } catch (error: any) {
      console.error('Error posting inventory:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// DISPATCH
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/dispatch',
  authenticate,
  requirePermission('delivery_notes:dispatch'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      await deliveryNoteService.dispatch(id, userId);
      res.json({ message: 'Delivery dispatched successfully' });
      
    } catch (error: any) {
      console.error('Error dispatching delivery:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIRM DELIVERY
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:id/confirm-delivery',
  authenticate,
  requirePermission('delivery_notes:update'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { receivedBy } = req.body;
      
      if (!receivedBy) {
        return res.status(400).json({ error: 'receivedBy is required' });
      }
      
      await deliveryNoteService.confirmDelivery(id, receivedBy, userId);
      res.json({ message: 'Delivery confirmed successfully' });
      
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
