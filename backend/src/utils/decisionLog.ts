/**
 * Decision Logging Utility
 * Logs authorization decisions for audit, disputes, and internal reviews
 * 
 * CTO Requirement: "Decision Logging (خفيف) - عند منع عملية: log (user, permission, entity, reason)"
 * 
 * Why Decision Logging is critical:
 * 1. Audit trails - "Who tried to do what and was blocked?"
 * 2. Dispute resolution - "User claims they should have access"
 * 3. Security monitoring - "Unusual permission denial patterns?"
 * 4. UX improvement - "Which permissions are most frequently blocked?"
 * 
 * Important: NO sensitive data stored (passwords, tokens, etc.)
 */

import pool from '../db';
import { Permission } from '../types/permissions';

/**
 * Decision outcome
 */
export enum DecisionOutcome {
  ALLOWED = 'allowed',
  DENIED = 'denied',
}

/**
 * Decision reason codes
 */
export enum DenialReason {
  INSUFFICIENT_PERMISSION = 'insufficient_permission',
  ENTITY_LOCKED = 'entity_locked',
  POLICY_VIOLATION = 'policy_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  COMPANY_MISMATCH = 'company_mismatch',
  ACCOUNTING_PERIOD_CLOSED = 'accounting_period_closed',
  CONCURRENT_MODIFICATION = 'concurrent_modification',
}

/**
 * Decision log entry
 */
export interface DecisionLog {
  user_id: number;
  user_email?: string;
  permission: Permission | string;
  entity_type?: string; // 'item', 'group', 'shipment', etc.
  entity_id?: number;
  outcome: DecisionOutcome;
  denial_reason?: DenialReason;
  additional_context?: Record<string, any>; // e.g., { has_movement: true }
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

/**
 * Log authorization decision
 */
export async function logDecision(
  userId: number,
  permission: Permission | string,
  outcome: DecisionOutcome,
  options?: {
    entityType?: string;
    entityId?: number;
    denialReason?: DenialReason;
    additionalContext?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO decision_logs
       (user_id, permission, entity_type, entity_id, outcome, denial_reason, additional_context, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        userId,
        permission,
        options?.entityType || null,
        options?.entityId || null,
        outcome,
        options?.denialReason || null,
        JSON.stringify(options?.additionalContext || {}),
        options?.ipAddress || null,
        options?.userAgent || null,
      ]
    );
  } catch (error: any) {
    // Don't throw - decision logging failure should NOT block operations
    console.error('Failed to log decision:', error);
  }
}

/**
 * Convenience function: Log denial
 */
export async function logDenial(
  userId: number,
  permission: Permission | string,
  reason: DenialReason,
  options?: {
    entityType?: string;
    entityId?: number;
    additionalContext?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  return logDecision(userId, permission, DecisionOutcome.DENIED, {
    ...options,
    denialReason: reason,
  });
}

/**
 * Convenience function: Log allow
 */
export async function logAllow(
  userId: number,
  permission: Permission | string,
  options?: {
    entityType?: string;
    entityId?: number;
    additionalContext?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  return logDecision(userId, permission, DecisionOutcome.ALLOWED, options);
}

/**
 * Get decision logs for user (admin only)
 */
export async function getUserDecisionLogs(
  userId: number,
  options?: {
    limit?: number;
    offset?: number;
    outcome?: DecisionOutcome;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<DecisionLog[]> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let query = `
    SELECT dl.*, u.email as user_email
    FROM decision_logs dl
    LEFT JOIN users u ON dl.user_id = u.id
    WHERE dl.user_id = $1
  `;

  const params: any[] = [userId];
  let paramIndex = 2;

  if (options?.outcome) {
    query += ` AND dl.outcome = $${paramIndex}`;
    params.push(options.outcome);
    paramIndex++;
  }

  if (options?.startDate) {
    query += ` AND dl.created_at >= $${paramIndex}`;
    params.push(options.startDate);
    paramIndex++;
  }

  if (options?.endDate) {
    query += ` AND dl.created_at <= $${paramIndex}`;
    params.push(options.endDate);
    paramIndex++;
  }

  query += ` ORDER BY dl.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get denied permissions summary (for UX improvement)
 * Returns most frequently denied permissions
 */
export async function getDeniedPermissionsSummary(options?: {
  days?: number;
  limit?: number;
}): Promise<Array<{ permission: string; denial_count: number; most_common_reason: string }>> {
  const days = options?.days || 30;
  const limit = options?.limit || 10;

  const result = await pool.query(
    `SELECT
       permission,
       COUNT(*) as denial_count,
       MODE() WITHIN GROUP (ORDER BY denial_reason) as most_common_reason
     FROM decision_logs
     WHERE outcome = $1
       AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY permission
     ORDER BY denial_count DESC
     LIMIT $2`,
    [DecisionOutcome.DENIED, limit]
  );

  return result.rows;
}

/**
 * Migration SQL (run in Phase 3):
 * 
 * CREATE TABLE IF NOT EXISTS decision_logs (
 *   id SERIAL PRIMARY KEY,
 *   user_id INTEGER NOT NULL REFERENCES users(id),
 *   permission VARCHAR(100) NOT NULL,
 *   entity_type VARCHAR(50),
 *   entity_id INTEGER,
 *   outcome VARCHAR(20) NOT NULL,  -- 'allowed', 'denied'
 *   denial_reason VARCHAR(50),     -- 'insufficient_permission', 'entity_locked', etc.
 *   additional_context JSONB,      -- e.g., { has_movement: true }
 *   ip_address VARCHAR(45),
 *   user_agent TEXT,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_decision_logs_user ON decision_logs(user_id, created_at DESC);
 * CREATE INDEX idx_decision_logs_outcome ON decision_logs(outcome, created_at DESC);
 * CREATE INDEX idx_decision_logs_permission ON decision_logs(permission, outcome);
 * 
 * -- Auto-cleanup old logs (optional, after 90 days)
 * CREATE OR REPLACE FUNCTION cleanup_old_decision_logs()
 * RETURNS void AS $$
 * BEGIN
 *   DELETE FROM decision_logs WHERE created_at < NOW() - INTERVAL '90 days';
 * END;
 * $$ LANGUAGE plpgsql;
 */

/**
 * Usage Examples:
 * 
 * // In middleware/rbac.ts
 * import { logDenial, DenialReason } from '../utils/decisionLog';
 * 
 * export function requirePermission(permission: Permission) {
 *   return async (req: Request, res: Response, next: NextFunction) => {
 *     const user = (req as any).user;
 * 
 *     if (!user.permissions.includes(permission)) {
 *       // Log the denial
 *       await logDenial(user.id, permission, DenialReason.INSUFFICIENT_PERMISSION, {
 *         ipAddress: req.ip,
 *         userAgent: req.get('user-agent'),
 *       });
 * 
 *       return ErrorResponseBuilder.forbidden(res, {
 *         code: ErrorCode.FORBIDDEN,
 *         message: 'Insufficient permissions',
 *       });
 *     }
 * 
 *     next();
 *   };
 * }
 * 
 * // In items route (policy violation)
 * if (hasMovement) {
 *   await logDenial(userId, Permission.ITEM_EDIT, DenialReason.POLICY_VIOLATION, {
 *     entityType: 'item',
 *     entityId: itemId,
 *     additionalContext: { has_movement: true },
 *   });
 * 
 *   return ErrorResponseBuilder.conflict(res, ErrorFactory.itemPolicyLocked(...));
 * }
 * 
 * // Admin dashboard - most denied permissions
 * const deniedSummary = await getDeniedPermissionsSummary({ days: 7, limit: 5 });
 * // Returns: [{ permission: 'ITEM_OVERRIDE_POLICY', denial_count: 23, most_common_reason: 'insufficient_permission' }]
 */
