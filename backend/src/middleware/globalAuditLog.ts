/**
 * Global Audit Log Middleware
 * Automatically captures ALL POST/PUT/PATCH/DELETE requests from authenticated users.
 * Provides 100% audit coverage without per-route middleware.
 * Deduplicates with per-route auditLog middleware (via _auditCaptured flag).
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db';

function globalAuditLog(req: Request, res: Response, next: NextFunction): void {
  // Only audit mutations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const user = (req as any).user;
  if (!user) return next();

  // Capture original end to log after response
  const originalEnd = res.end;
  const startTime = Date.now();

  (res as any).end = function (...args: any[]) {
    // Check if per-route auditLog already captured this request
    if ((req as any)._auditCaptured) {
      return originalEnd.apply(res, args);
    }

    // Mark as globally captured
    (req as any)._auditCaptured = true;

    const duration = Date.now() - startTime;

    // Fire-and-forget audit log
    setImmediate(async () => {
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent, after_data) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            user.id,
            `${req.method} ${req.path}`,
            req.path.split('/')[2] || 'unknown', // e.g., 'users', 'shipments'
            req.ip || 'unknown',
            req.get('user-agent') || 'unknown',
            JSON.stringify({
              method: req.method,
              path: req.path,
              status: res.statusCode,
              duration_ms: duration,
              company_id: (req as any).companyId || null,
              tenant_id: (req as any).tenantId || user.tenant_id || null,
            })
          ]
        );
      } catch (err) {
        // Never fail the request due to audit logging
        console.error('Global audit log error:', err);
      }
    });

    return originalEnd.apply(res, args);
  };

  next();
}

export default globalAuditLog;
