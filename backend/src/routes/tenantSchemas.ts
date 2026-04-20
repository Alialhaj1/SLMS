/**
 * ============================================================
 * Tenant Schema Management Routes
 * ============================================================
 * Architecture Document §3: عزل البيانات — Multi-Tenancy
 *
 * Platform-admin endpoints for managing tenant schemas:
 *   GET    /api/tenant-schemas        — List all schemas
 *   GET    /api/tenant-schemas/:id    — Get schema details
 *   POST   /api/tenant-schemas/:id/provision   — Provision schema
 *   POST   /api/tenant-schemas/:id/validate    — Validate integrity
 *   POST   /api/tenant-schemas/:id/suspend     — Suspend schema
 *   POST   /api/tenant-schemas/:id/activate    — Reactivate schema
 *   GET    /api/tenant-schemas/:id/stats       — Table row counts
 *   DELETE /api/tenant-schemas/:id             — Drop schema (force)
 * ============================================================
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePlatformUser } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../db';
import { TenantSchemaService } from '../services/tenantSchemaService';

const router = Router();

// All routes require platform admin
router.use(authenticate, requirePlatformUser as any);

// ────────────────────────────────────────────
// GET /api/tenant-schemas — List all tenant schemas
// ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await TenantSchemaService.listSchemas({
      status: status as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    sendSuccess(res, result.data, 200, { total: result.total });
  } catch (err: any) {
    console.error('[TenantSchemas] List error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to list tenant schemas', 500);
  }
});

// ────────────────────────────────────────────
// GET /api/tenant-schemas/:tenantId — Get schema details
// ────────────────────────────────────────────
router.get('/:tenantId', async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    }

    const schema = await TenantSchemaService.getSchemaByTenantId(tenantId);
    if (!schema) {
      return sendError(res, 'NOT_FOUND', 'No schema found for this tenant', 404);
    }

    sendSuccess(res, schema);
  } catch (err: any) {
    console.error('[TenantSchemas] Get error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to get schema details', 500);
  }
});

// ────────────────────────────────────────────
// POST /api/tenant-schemas/:tenantId/provision — Provision schema
// ────────────────────────────────────────────
router.post('/:tenantId/provision', async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    }

    // Get tenant info
    const tenantResult = await pool.query(
      `SELECT t.id, t.company_code, c.id AS company_id, c.country
       FROM tenants t
       LEFT JOIN companies c ON c.tenant_id = t.id AND c.deleted_at IS NULL
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Tenant not found', 404);
    }

    const tenant = tenantResult.rows[0];

    // Check if already provisioned
    const existing = await TenantSchemaService.getSchemaByTenantId(tenantId);
    if (existing && existing.status === 'active') {
      return sendError(res, 'ALREADY_EXISTS', 'Schema already provisioned and active', 409);
    }

    // Provision
    const result = await TenantSchemaService.fullProvision(
      tenant.company_code,
      tenantId,
      tenant.company_id,
      tenant.country || 'SAU'
    );

    sendSuccess(res, {
      schema: result.provision.schema,
      tables_created: result.provision.tables_created,
      fks_created: result.provision.fks_created,
      seed_result: result.seed,
      errors: result.provision.errors?.length ? result.provision.errors : undefined,
    }, 201);
  } catch (err: any) {
    console.error('[TenantSchemas] Provision error:', err);
    sendError(res, 'SERVER_ERROR', err?.message || 'Failed to provision schema', 500);
  }
});

// ────────────────────────────────────────────
// POST /api/tenant-schemas/:tenantId/validate — Validate integrity
// ────────────────────────────────────────────
router.post('/:tenantId/validate', async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    }

    const schema = await TenantSchemaService.getSchemaByTenantId(tenantId);
    if (!schema) {
      return sendError(res, 'NOT_FOUND', 'No schema found for this tenant', 404);
    }

    const validation = await TenantSchemaService.validateSchema(schema.schema_name);
    sendSuccess(res, validation);
  } catch (err: any) {
    console.error('[TenantSchemas] Validate error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to validate schema', 500);
  }
});

// ────────────────────────────────────────────
// POST /api/tenant-schemas/:tenantId/suspend — Suspend schema
// ────────────────────────────────────────────
router.post('/:tenantId/suspend', async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    }

    await TenantSchemaService.suspendSchema(tenantId);
    sendSuccess(res, { message: 'Schema suspended' });
  } catch (err: any) {
    console.error('[TenantSchemas] Suspend error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to suspend schema', 500);
  }
});

// ────────────────────────────────────────────
// POST /api/tenant-schemas/:tenantId/activate — Reactivate schema
// ────────────────────────────────────────────
router.post('/:tenantId/activate', async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    }

    await TenantSchemaService.activateSchema(tenantId);
    sendSuccess(res, { message: 'Schema activated' });
  } catch (err: any) {
    console.error('[TenantSchemas] Activate error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to activate schema', 500);
  }
});

// ────────────────────────────────────────────
// GET /api/tenant-schemas/:tenantId/stats — Schema row counts
// ────────────────────────────────────────────
router.get('/:tenantId/stats', async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    }

    const schema = await TenantSchemaService.getSchemaByTenantId(tenantId);
    if (!schema) {
      return sendError(res, 'NOT_FOUND', 'No schema found for this tenant', 404);
    }

    const stats = await TenantSchemaService.getSchemaStats(schema.schema_name);
    sendSuccess(res, {
      schema: schema.schema_name,
      status: schema.status,
      tables: stats,
      total_tables: stats.length,
      total_rows: stats.reduce((sum, s) => sum + s.row_count, 0),
    });
  } catch (err: any) {
    console.error('[TenantSchemas] Stats error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to get schema stats', 500);
  }
});

// ────────────────────────────────────────────
// DELETE /api/tenant-schemas/:tenantId — Drop schema
// ────────────────────────────────────────────
router.delete('/:tenantId', async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid tenant ID', 400);
    }

    const schema = await TenantSchemaService.getSchemaByTenantId(tenantId);
    if (!schema) {
      return sendError(res, 'NOT_FOUND', 'No schema found for this tenant', 404);
    }

    const force = req.query.force === 'true';
    const result = await TenantSchemaService.dropSchema(schema.tenant_code, force);

    if (result.error) {
      return sendError(res, 'DROP_FAILED', result.error, 400);
    }

    sendSuccess(res, result);
  } catch (err: any) {
    console.error('[TenantSchemas] Drop error:', err);
    sendError(res, 'SERVER_ERROR', 'Failed to drop schema', 500);
  }
});

export default router;
