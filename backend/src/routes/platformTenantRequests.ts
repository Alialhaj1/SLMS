/**
 * ============================================================
 * Tenant Requests Routes — Architecture §5.1 #6
 * ============================================================
 *
 * Account signup request lifecycle:
 *   pending → under_review → approved (→ provisioned) | rejected
 *
 * Public: POST /submit — anyone can submit a request
 * Platform: GET /, PUT /:id/review, POST /:id/approve, POST /:id/reject
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import pool from '../db';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// ────────────────────────────────────────────
// POST /submit — Public: submit an account request
// ────────────────────────────────────────────
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const {
      company_name, company_name_ar, country, currency, language, plan,
      admin_name, admin_email, admin_phone,
      requested_modules, max_users, max_shipments,
      vat_number, referral_code,
    } = req.body;

    // Validation
    if (!company_name?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Company name is required', 400);
    if (!admin_name?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Admin name is required', 400);
    if (!admin_email?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Admin email is required', 400);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(admin_email)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid email format', 400);
    }

    // Check for duplicate pending request
    const existing = await pool.query(
      `SELECT id FROM tenant_requests WHERE LOWER(admin_email) = LOWER($1) AND status IN ('pending', 'under_review')`,
      [admin_email]
    );
    if (existing.rows.length > 0) {
      return sendError(res, 'DUPLICATE', 'A pending request already exists for this email', 409);
    }

    // Auto-generate company code
    const codeBase = company_name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const codeSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const companyCode = `${codeBase}-${codeSuffix}`;

    const result = await pool.query(
      `INSERT INTO tenant_requests
        (company_name, company_name_ar, company_code, country, currency, language, plan,
         admin_name, admin_email, admin_phone,
         requested_modules, max_users, max_shipments,
         vat_number, referral_code, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'web', 'pending')
       RETURNING id, company_code, status, created_at`,
      [
        company_name.trim(), company_name_ar?.trim() || null, companyCode,
        country || 'SAU', currency || 'SAR', language || 'ar', plan || 'Starter',
        admin_name.trim(), admin_email.trim().toLowerCase(), admin_phone || null,
        JSON.stringify(requested_modules || []),
        max_users || 5, max_shipments || null,
        vat_number || null, referral_code || null,
      ]
    );

    logger.info({ event: 'tenant_request_submitted', email: admin_email, requestId: result.rows[0].id });

    sendSuccess(res, {
      request_id: result.rows[0].id,
      company_code: result.rows[0].company_code,
      status: 'pending',
      message: 'Account request submitted successfully. You will be notified once reviewed.',
      message_ar: 'تم تقديم طلب الحساب بنجاح. سيتم إشعارك عند المراجعة.',
    }, 201);
  } catch (err: any) {
    logger.error('Failed to submit tenant request', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to submit request', 500);
  }
});

// ────────────────────────────────────────────
// GET / — Platform: list all requests with filters
// ────────────────────────────────────────────
router.get('/', authenticate, platformGate('platform.requests.read'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '25', status, search } = req.query as Record<string, string>;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const conditions: string[] = ['tr.deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`tr.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(tr.company_name ILIKE $${idx} OR tr.admin_email ILIKE $${idx} OR tr.admin_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_requests tr ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT tr.*, ru.full_name as reviewer_name
       FROM tenant_requests tr
       LEFT JOIN users ru ON ru.id = tr.reviewed_by
       ${whereClause}
       ORDER BY tr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    );

    sendSuccess(res, { data: result.rows, total, page: parseInt(page), limit: safeLimit });
  } catch (err: any) {
    logger.error('Failed to list tenant requests', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Failed to list requests', 500);
  }
});

// ────────────────────────────────────────────
// GET /stats — Summary counts by status
// ────────────────────────────────────────────
router.get('/stats', authenticate, platformGate('platform.requests.read'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) as count FROM tenant_requests WHERE deleted_at IS NULL GROUP BY status`
    );
    const stats: Record<string, number> = {};
    for (const r of result.rows) {
      stats[r.status] = parseInt(r.count, 10);
    }
    sendSuccess(res, stats);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch request stats', 500);
  }
});

// ────────────────────────────────────────────
// GET /:id — Single request detail
// ────────────────────────────────────────────
router.get('/:id', authenticate, platformGate('platform.requests.read'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);

    const result = await pool.query(
      `SELECT tr.*, ru.full_name as reviewer_name, ru.email as reviewer_email
       FROM tenant_requests tr
       LEFT JOIN users ru ON ru.id = tr.reviewed_by
       WHERE tr.id = $1 AND tr.deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Request not found', 404);

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch request', 500);
  }
});

// ────────────────────────────────────────────
// PUT /:id/review — Mark as under review
// ────────────────────────────────────────────
router.put('/:id/review', authenticate, platformGate('platform.requests.approve'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);

    const result = await pool.query(
      `UPDATE tenant_requests
       SET status = 'under_review', reviewed_by = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'pending' AND deleted_at IS NULL
       RETURNING id, status`,
      [(req as any).user?.id, id]
    );
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Request not found or not in pending status', 404);

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to update request', 500);
  }
});

// ────────────────────────────────────────────
// POST /:id/approve — Approve request (does NOT provision yet — separate step)
// ────────────────────────────────────────────
router.post('/:id/approve', authenticate, platformGate('platform.requests.approve'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);

    const { notes } = req.body;

    const result = await pool.query(
      `UPDATE tenant_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2, updated_at = NOW()
       WHERE id = $3 AND status IN ('pending', 'under_review') AND deleted_at IS NULL
       RETURNING *`,
      [(req as any).user?.id, notes || null, id]
    );
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Request not found or already processed', 404);

    logger.info({ event: 'tenant_request_approved', requestId: id, approvedBy: (req as any).user?.id });

    sendSuccess(res, {
      request: result.rows[0],
      message: 'Request approved. Use the Tenant Wizard to provision the account.',
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to approve request', 500);
  }
});

// ────────────────────────────────────────────
// POST /:id/reject — Reject request
// ────────────────────────────────────────────
router.post('/:id/reject', authenticate, platformGate('platform.requests.reject'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return sendError(res, 'VALIDATION_ERROR', 'Invalid request ID', 400);

    const { reason } = req.body;
    if (!reason?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Rejection reason is required', 400);

    const result = await pool.query(
      `UPDATE tenant_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW()
       WHERE id = $3 AND status IN ('pending', 'under_review') AND deleted_at IS NULL
       RETURNING id, status, rejection_reason`,
      [(req as any).user?.id, reason.trim(), id]
    );
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'Request not found or already processed', 404);

    logger.info({ event: 'tenant_request_rejected', requestId: id, rejectedBy: (req as any).user?.id });

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to reject request', 500);
  }
});

export default router;
