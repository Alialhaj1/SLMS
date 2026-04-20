/**
 * §13.2.4 — SSE Notification Stream Route
 *
 * GET /api/notifications/stream — Server-Sent Events for real-time notifications
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { registerSSEClient } from '../services/sseNotificationService';

const router = Router();

/**
 * GET /stream — Subscribe to real-time notification stream via SSE
 *
 * Client usage:
 *   const es = new EventSource('/api/notifications/stream', {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 *   es.addEventListener('notification', (e) => { console.log(JSON.parse(e.data)); });
 */
router.get('/stream', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  registerSSEClient(req, res, user.id, user.tenant_id || null);
});

export default router;
