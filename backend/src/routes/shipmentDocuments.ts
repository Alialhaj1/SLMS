/**
 * §13.3.6 — Shipment Documents Route (now powered by generic DocumentService)
 *
 * Provides backward-compatible routes for shipment-specific documents.
 * Delegates to the shared DocumentService with entity_type='shipment'.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { DocumentService } from '../services/documentService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

/**
 * GET / — List documents for a specific shipment (via query param)
 * Usage: GET /api/shipment-documents?shipment_id=123
 */
router.get('/', authenticate, requirePermission('documents:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const shipmentId = parseInt(req.query.shipment_id as string);

    if (!shipmentId) {
      return sendError(res, 'VALIDATION_ERROR', 'shipment_id query param is required', 400);
    }

    const docs = await DocumentService.listByEntity('shipment', shipmentId, tenantId);
    sendSuccess(res, docs);
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to list shipment documents', 500);
  }
});

/**
 * GET /:id — Get a specific document
 */
router.get('/:id', authenticate, requirePermission('documents:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const doc = await DocumentService.getById(parseInt(req.params.id), tenantId);
    if (!doc) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
    sendSuccess(res, doc);
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to get document', 500);
  }
});

/**
 * DELETE /:id — Delete a document
 */
router.delete('/:id', authenticate, requirePermission('documents:delete' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const deleted = await DocumentService.delete(parseInt(req.params.id), tenantId);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Document deleted');
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to delete document', 500);
  }
});

export default router;
