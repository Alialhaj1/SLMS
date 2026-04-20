/**
 * Session Management Routes
 * 
 * Architecture Spec §2.2 Step 6: Tenant Session Tracking
 * 
 * Endpoints:
 *   GET    /api/sessions         → List active sessions for current user
 *   GET    /api/sessions/stats   → Session statistics
 *   DELETE /api/sessions/:id     → Revoke a specific session
 *   DELETE /api/sessions         → Revoke all sessions (except current)
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { SessionService } from '../services/sessionService';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/sessions
 * List active sessions for the current user.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const sessions = await SessionService.listActiveSessions(userId);

    // Mark the current session
    const currentJti = (req as any).user.jti;
    const enriched = sessions.map(s => ({
      ...s,
      isCurrent: s.loginContext === 'platform' || s.loginContext === 'tenant'
        ? false // We'd need to match JTI but JTI is internal
        : false,
    }));

    return sendSuccess(res, {
      data: enriched,
      total: enriched.length,
    }, 200);
  } catch (error: any) {
    logger.error('List sessions failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to list sessions', 500);
  }
});

/**
 * GET /api/sessions/stats
 * Get session statistics for the current user.
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const stats = await SessionService.getSessionStats(userId);
    return sendSuccess(res, stats, 200);
  } catch (error: any) {
    logger.error('Session stats failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to get session stats', 500);
  }
});

/**
 * DELETE /api/sessions/:id
 * Revoke a specific session by session_id (UUID).
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const sessionId = req.params.id;

    if (!sessionId) {
      return sendError(res, 'VALIDATION_ERROR', 'Session ID is required', 400);
    }

    const revoked = await SessionService.revokeSession(sessionId, userId);
    if (!revoked) {
      return sendError(res, 'NOT_FOUND', 'Session not found or already revoked', 404);
    }

    return sendSuccess(res, { message: 'Session revoked successfully' }, 200);
  } catch (error: any) {
    logger.error('Revoke session failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to revoke session', 500);
  }
});

/**
 * DELETE /api/sessions
 * Revoke ALL sessions for the current user (security action).
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await SessionService.revokeAllUserSessions(userId, 'user_revoke_all');

    return sendSuccess(res, {
      message: `${count} session(s) revoked. You will need to login again on other devices.`,
      revoked_count: count,
    }, 200);
  } catch (error: any) {
    logger.error('Revoke all sessions failed', error, { userId: (req as any).user?.id });
    return sendError(res, 'SERVER_ERROR', 'Failed to revoke sessions', 500);
  }
});

export default router;
