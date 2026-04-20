/**
 * ============================================================
 * Platform Impersonation Routes — Architecture §5.3
 * ============================================================
 *
 * Complete impersonation lifecycle:
 *   POST /start       — start impersonation session (generate token)
 *   POST /end         — end active session (revoke token)
 *   GET  /logs        — list impersonation audit trail
 *   GET  /logs/:id    — single log entry detail
 *   GET  /active      — list currently active sessions
 *
 * Security:
 *   - Requires platform.tenants.impersonate permission
 *   - Mandatory reason (min 10 chars) — logged immutably
 *   - Token expires in 30 minutes
 *   - Impersonation tokens restricted (see auth.ts middleware)
 *   - Logs cannot be deleted (DB trigger protection)
 *
 * Access: platform.tenants.impersonate / platform.impersonation.read
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import { ImpersonationService } from '../services/impersonationService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// ────────────────────────────────────────────
// POST /start — Start impersonation session
// ────────────────────────────────────────────
router.post('/start', authenticate, platformGate('platform.tenants.impersonate'), async (req: Request, res: Response) => {
  try {
    const { tenant_id, target_user_id, reason } = req.body;
    const user = (req as any).user;

    if (!tenant_id) return sendError(res, 'VALIDATION_ERROR', 'tenant_id is required', 400);
    if (!reason?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Reason is required (min 10 characters)', 400);

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown';

    const session = await ImpersonationService.startSession({
      adminUserId: user.id,
      tenantId: parseInt(tenant_id),
      targetUserId: target_user_id ? parseInt(target_user_id) : undefined,
      reason: reason.trim(),
      ipAddress: ip,
      userAgent: req.get('User-Agent'),
    });

    sendSuccess(res, {
      session_id: session.sessionId,
      impersonation_token: session.impersonationToken,
      expires_at: session.expiresAt.toISOString(),
      tenant: session.tenant,
      target_user: session.targetUser,
      warning: 'This token grants access to the tenant account. All actions will be logged.',
      warning_ar: 'هذا الرمز يمنح الوصول لحساب العميل. جميع العمليات ستُسجَّل.',
    });
  } catch (err: any) {
    const statusCode = (err as any).statusCode || 500;
    const code = (err as any).code || 'SERVER_ERROR';
    sendError(res, code, err.message, statusCode);
  }
});

// ────────────────────────────────────────────
// POST /end — End impersonation session
// ────────────────────────────────────────────
router.post('/end', authenticate, platformGate('platform.tenants.impersonate'), async (req: Request, res: Response) => {
  try {
    const { session_id, jti } = req.body;

    if (!session_id && !jti) {
      return sendError(res, 'VALIDATION_ERROR', 'session_id or jti is required', 400);
    }

    await ImpersonationService.endSession({
      sessionId: session_id ? parseInt(session_id) : undefined,
      jti,
    });

    sendSuccess(res, { message: 'Impersonation session ended', message_ar: 'تم إنهاء جلسة الانتحال' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', err.message, 500);
  }
});

// ────────────────────────────────────────────
// GET /logs — List impersonation audit logs
// ────────────────────────────────────────────
router.get('/logs', authenticate, platformGate('platform.impersonation.read'), async (req: Request, res: Response) => {
  try {
    const { page, limit, from, to, admin_id, tenant_id } = req.query as Record<string, string>;

    const result = await ImpersonationService.listLogs({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      from,
      to,
      adminId: admin_id ? parseInt(admin_id) : undefined,
      tenantId: tenant_id ? parseInt(tenant_id) : undefined,
    });

    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch impersonation logs', 500);
  }
});

// ────────────────────────────────────────────
// GET /active — List currently active impersonation sessions
// ────────────────────────────────────────────
router.get('/active', authenticate, platformGate('platform.impersonation.read'), async (_req: Request, res: Response) => {
  try {
    const result = await ImpersonationService.listLogs({ page: 1, limit: 100 });
    const active = result.data.filter(log => !log.endedAt);
    sendSuccess(res, { data: active, total: active.length });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch active sessions', 500);
  }
});

// ────────────────────────────────────────────
// POST /cleanup — Admin: close expired sessions
// ────────────────────────────────────────────
router.post('/cleanup', authenticate, platformGate('platform.tenants.impersonate'), async (_req: Request, res: Response) => {
  try {
    const closed = await ImpersonationService.cleanupExpiredSessions();
    sendSuccess(res, { closed, message: `Closed ${closed} expired impersonation sessions` });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Cleanup failed', 500);
  }
});

export default router;
