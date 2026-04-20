/**
 * §13.3.12 — Tenant Data Export Route
 *
 * GET  /api/data-export/overview   — Get data overview (counts per table)
 * GET  /api/data-export/tables     — Get list of exportable tables
 * POST /api/data-export            — Export all data
 * POST /api/data-export/partial    — Export specific tables
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { TenantDataExportService } from '../services/tenantDataExportService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/overview', authenticate, requirePermission('tenant_data_export:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    const overview = await TenantDataExportService.getDataOverview(tenantId);
    sendSuccess(res, overview);
  } catch (err) {
    sendError(res, 'EXPORT_ERROR', 'Failed to get data overview', 500);
  }
});

router.get('/tables', authenticate, async (_req: Request, res: Response) => {
  try {
    const tables = TenantDataExportService.getExportableTables();
    sendSuccess(res, tables);
  } catch (err) {
    sendError(res, 'EXPORT_ERROR', 'Failed to get exportable tables', 500);
  }
});

router.post('/', authenticate, requirePermission('tenant_data_export:create' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    const data = await TenantDataExportService.exportAll(tenantId);

    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="tenant_${tenantId}_export_${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    sendError(res, 'EXPORT_ERROR', 'Failed to export tenant data', 500);
  }
});

router.post('/partial', authenticate, requirePermission('tenant_data_export:create' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) return sendError(res, 'NO_TENANT', 'Tenant context required', 400);

    const { tables } = req.body;
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'tables[] array is required', 400);
    }

    const data = await TenantDataExportService.exportTables(tenantId, tables);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="tenant_${tenantId}_partial_export_${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    sendError(res, 'EXPORT_ERROR', 'Failed to export tenant data', 500);
  }
});

export default router;
