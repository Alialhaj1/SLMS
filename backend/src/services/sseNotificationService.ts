/**
 * §13.2.4 — Server-Sent Events (SSE) Notification Service
 *
 * Provides real-time in-app notifications without page reload.
 * Clients connect via GET /api/notifications/stream (EventSource).
 * Falls back to polling if SSE is not available.
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// ─── Active SSE Connections ──────────────────────────────────────────────────
interface SSEClient {
  userId: number;
  tenantId: number | null;
  res: Response;
  connectedAt: Date;
}

const clients = new Map<string, SSEClient>(); // key: `${userId}-${random}`

/**
 * Register an SSE connection for a user.
 * Call this from a GET endpoint.
 */
export function registerSSEClient(req: Request, res: Response, userId: number, tenantId: number | null): string {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to notification stream' })}\n\n`);

  const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  clients.set(clientId, { userId, tenantId, res, connectedAt: new Date() });

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch { clearInterval(heartbeat); }
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
    logger.debug('SSE client disconnected', { clientId, userId });
  });

  logger.debug('SSE client connected', { clientId, userId });
  return clientId;
}

/**
 * Send notification to a specific user (all their connected clients).
 */
export function sendNotificationToUser(userId: number, event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let sent = 0;

  for (const [_id, client] of clients) {
    if (client.userId === userId) {
      try {
        client.res.write(payload);
        sent++;
      } catch {
        // Connection dead — will be cleaned up on next heartbeat
      }
    }
  }

  if (sent > 0) {
    logger.debug('SSE notification sent', { userId, event, clientCount: sent });
  }
}

/**
 * Send notification to all users in a tenant.
 */
export function sendNotificationToTenant(tenantId: number, event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [_id, client] of clients) {
    if (client.tenantId === tenantId) {
      try { client.res.write(payload); } catch { /* dead conn */ }
    }
  }
}

/**
 * Broadcast to ALL connected users (platform-wide announcements).
 */
export function broadcastNotification(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [_id, client] of clients) {
    try { client.res.write(payload); } catch { /* dead conn */ }
  }
}

/**
 * Get connected client count (for monitoring).
 */
export function getSSEClientCount(): { total: number; byTenant: Record<number, number> } {
  const byTenant: Record<number, number> = {};
  for (const [_id, client] of clients) {
    if (client.tenantId) {
      byTenant[client.tenantId] = (byTenant[client.tenantId] || 0) + 1;
    }
  }
  return { total: clients.size, byTenant };
}
