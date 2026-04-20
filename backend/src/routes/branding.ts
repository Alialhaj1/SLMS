/**
 * §13.3.4 — Branding / White-Label Route (replaces stub)
 *
 * Manages tenant branding settings (logo, colors, custom domain).
 * Uses the `branding` JSONB column + `custom_domain` on `tenants` table (migration 413).
 *
 * GET    /branding          — Get branding settings
 * PUT    /branding          — Update branding settings
 * DELETE /branding          — Reset to defaults
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/branding', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) {
      return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    }

    const result = await pool.query(
      `SELECT branding, custom_domain FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);
    }

    const { branding, custom_domain } = result.rows[0];
    sendSuccess(res, {
      branding: branding || getDefaultBranding(),
      custom_domain,
    });
  } catch (err) {
    sendError(res, 'BRANDING_ERROR', 'Failed to get branding settings', 500);
  }
});

router.put('/branding', authenticate, requirePermission('branding:update' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) {
      return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    }

    const { branding, custom_domain } = req.body;

    if (branding && typeof branding !== 'object') {
      return sendError(res, 'VALIDATION_ERROR', 'branding must be a JSON object', 400);
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (branding !== undefined) {
      updates.push(`branding = $${idx++}`);
      params.push(JSON.stringify(branding));
    }
    if (custom_domain !== undefined) {
      updates.push(`custom_domain = $${idx++}`);
      params.push(custom_domain);
    }

    if (updates.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Nothing to update', 400);
    }

    params.push(tenantId);
    const result = await pool.query(
      `UPDATE tenants SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING branding, custom_domain`,
      params
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);
    }

    sendSuccess(res, result.rows[0], 200, undefined, 'Branding updated');
  } catch (err) {
    sendError(res, 'BRANDING_ERROR', 'Failed to update branding', 500);
  }
});

router.delete('/branding', authenticate, requirePermission('branding:update' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    if (!tenantId) {
      return sendError(res, 'NO_TENANT', 'Tenant context required', 400);
    }

    await pool.query(
      `UPDATE tenants SET branding = NULL, custom_domain = NULL, updated_at = NOW() WHERE id = $1`,
      [tenantId]
    );

    sendSuccess(res, { branding: getDefaultBranding(), custom_domain: null }, 200, undefined, 'Branding reset to defaults');
  } catch (err) {
    sendError(res, 'BRANDING_ERROR', 'Failed to reset branding', 500);
  }
});

function getDefaultBranding() {
  return {
    logo_url: null,
    favicon_url: null,
    primary_color: '#2563eb',
    secondary_color: '#475569',
    font_family: 'Inter',
    company_name: null,
    login_background: null,
    email_header_logo: null,
  };
}

export default router;
