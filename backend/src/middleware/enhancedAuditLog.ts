/**
 * Enhanced Audit Log Middleware
 * Provides detailed before/after state capture for master data mutations.
 * Used by master data routes (cities, companies, customers, etc.)
 */
import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { logger } from '../utils/logger';

/**
 * Express middleware for individual route-level audit logging.
 * Captures before-state on entry and after-state on response finish.
 * 
 * @param entity - The entity type being audited (e.g., 'cities', 'companies')
 */
export function enhancedAudit(entity: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const startTime = Date.now();
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const companyId = (req as any).companyId;
    const entityId = req.params.id;

    // Capture before-state for updates/deletes
    let beforeState: any = null;
    if (entityId && (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      try {
        const result = await pool.query(
          `SELECT * FROM ${entity} WHERE id = $1`,
          [entityId]
        );
        beforeState = result.rows[0] || null;
      } catch (e) {
        // Table might not match entity name directly
      }
    }

    // Store original json method to capture response
    const originalJson = res.json.bind(res);
    (res as any).__enhancedAuditEntity = entity;

    res.json = function (body: any) {
      // Log audit asynchronously on response
      const afterState = body?.data || body;
      const duration = Date.now() - startTime;

      if (userId) {
        pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before_state, after_state, ip_address, user_agent, company_id, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            userId,
            req.method,
            entity,
            entityId || afterState?.id || null,
            beforeState ? JSON.stringify(beforeState) : null,
            afterState ? JSON.stringify(afterState) : null,
            req.ip || req.headers['x-forwarded-for'] || 'unknown',
            req.headers['user-agent'] || 'unknown',
            companyId || null,
            duration,
          ]
        ).catch(err => {
          logger.warn(`Enhanced audit log failed for ${entity}:`, err.message);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Apply enhanced audit logging to all mutating routes on a router.
 * Call this after defining all routes on the router.
 * 
 * @param router - Express Router instance
 * @param entity - The entity type being audited
 */
export function applyEnhancedAudit(router: Router, entity: string): void {
  // Apply audit middleware to the router for all mutating methods
  router.use(enhancedAudit(entity));
}
