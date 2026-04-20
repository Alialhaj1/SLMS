/**
 * §13.1.5 — IP Whitelist Route
 *
 * Manages tenant IP whitelists.
 *
 * GET    /api/ip-whitelist               — List whitelist entries
 * POST   /api/ip-whitelist               — Add IP/CIDR
 * DELETE /api/ip-whitelist/:id           — Remove entry
 * POST   /api/ip-whitelist/:id/toggle    — Toggle enabled
 * POST   /api/ip-whitelist/test          — Test if IP is allowed
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { IpWhitelistService } from '../middleware/ipWhitelist';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', authenticate, requirePermission('ip_whitelist:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    const entries = await IpWhitelistService.list(tenantId);
    sendSuccess(res, entries);
  } catch (err) {
    sendError(res, 'IP_WHITELIST_ERROR', 'Failed to list IP whitelist', 500);
  }
});

router.post('/', authenticate, requirePermission('ip_whitelist:create' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);

    const { ip_address, description } = req.body;
    if (!ip_address) return sendError(res, 'VALIDATION_ERROR', 'ip_address is required', 400);

    const userId = (req as any).user.id;
    const entry = await IpWhitelistService.add(tenantId, ip_address, description, userId);
    sendSuccess(res, entry, 201, undefined, 'IP whitelist entry added');
  } catch (err) {
    sendError(res, 'IP_WHITELIST_ERROR', 'Failed to add IP to whitelist', 500);
  }
});

router.delete('/:id', authenticate, requirePermission('ip_whitelist:delete' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    const deleted = await IpWhitelistService.remove(tenantId, parseInt(req.params.id));
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Whitelist entry not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'IP whitelist entry removed');
  } catch (err) {
    sendError(res, 'IP_WHITELIST_ERROR', 'Failed to remove IP from whitelist', 500);
  }
});

router.post('/:id/toggle', authenticate, requirePermission('ip_whitelist:update' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    const { is_active } = req.body;
    const isActive = is_active !== undefined ? Boolean(is_active) : true;
    const entry = await IpWhitelistService.toggle(tenantId, parseInt(req.params.id), isActive);
    if (!entry) return sendError(res, 'NOT_FOUND', 'Whitelist entry not found', 404);
    sendSuccess(res, entry, 200, undefined, 'IP whitelist entry toggled');
  } catch (err) {
    sendError(res, 'IP_WHITELIST_ERROR', 'Failed to toggle whitelist entry', 500);
  }
});

router.post('/test', authenticate, requirePermission('ip_whitelist:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    const { ip_address } = req.body;
    if (!ip_address) return sendError(res, 'VALIDATION_ERROR', 'ip_address is required', 400);
    const allowed = await IpWhitelistService.testIp(tenantId, ip_address);
    sendSuccess(res, { ip_address, allowed });
  } catch (err) {
    sendError(res, 'IP_WHITELIST_ERROR', 'Failed to test IP', 500);
  }
});

export default router;
