/**
 * Soft-lock Mechanism for Multi-step Processes
 * Prevents concurrent modifications during approval workflows
 * 
 * CTO Requirement: "منع تعديل item أثناء approval مستقبليًا"
 * 
 * Use Cases:
 * 1. Item under approval workflow (Phase 3)
 * 2. Accounting period close in progress
 * 3. Bulk operation in progress
 * 4. Data migration in progress
 * 
 * Why Soft-lock (not hard database lock):
 * - Database locks block other transactions (bad for UX)
 * - Soft-lock is application-level (graceful error messages)
 * - Can show WHO locked and WHEN
 * - Can expire automatically after timeout
 */

import pool from '../db';

/**
 * Lock types (extensible for Phase 3+)
 */
export enum LockType {
  APPROVAL_WORKFLOW = 'approval_workflow',
  ACCOUNTING_PERIOD = 'accounting_period',
  BULK_OPERATION = 'bulk_operation',
  DATA_MIGRATION = 'data_migration',
}

/**
 * Lock status
 */
export enum LockStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RELEASED = 'released',
}

/**
 * Process lock structure
 */
export interface ProcessLock {
  entity_type: string; // 'item', 'group', 'shipment', etc.
  entity_id: number;
  lock_type: LockType;
  locked_by_user_id: number;
  locked_by_user_name?: string;
  locked_at: Date;
  expires_at?: Date;
  status: LockStatus;
  metadata?: Record<string, any>; // e.g., { approval_id: 123 }
}

/**
 * Acquire soft-lock on entity
 */
export async function acquireLock(
  entityType: string,
  entityId: number,
  lockType: LockType,
  userId: number,
  options?: {
    expiresInMinutes?: number; // Auto-expire after X minutes (default: 30)
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if already locked
    const existingLock = await client.query(
      `SELECT * FROM process_locks
       WHERE entity_type = $1 AND entity_id = $2 AND status = $3
       ORDER BY locked_at DESC LIMIT 1`,
      [entityType, entityId, LockStatus.ACTIVE]
    );

    if (existingLock.rows.length > 0) {
      const lock = existingLock.rows[0];

      // Check if expired
      if (lock.expires_at && new Date(lock.expires_at) < new Date()) {
        // Auto-expire
        await client.query(
          `UPDATE process_locks SET status = $1 WHERE id = $2`,
          [LockStatus.EXPIRED, lock.id]
        );
      } else {
        // Still active
        await client.query('COMMIT');
        return {
          success: false,
          error: `Entity is locked by ${lock.locked_by_user_name || 'another user'} since ${lock.locked_at}`,
        };
      }
    }

    // Acquire new lock
    const expiresAt = options?.expiresInMinutes
      ? new Date(Date.now() + options.expiresInMinutes * 60 * 1000)
      : new Date(Date.now() + 30 * 60 * 1000); // Default: 30 minutes

    await client.query(
      `INSERT INTO process_locks (entity_type, entity_id, lock_type, locked_by_user_id, locked_at, expires_at, status, metadata)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)`,
      [entityType, entityId, lockType, userId, expiresAt, LockStatus.ACTIVE, JSON.stringify(options?.metadata || {})]
    );

    await client.query('COMMIT');

    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Failed to acquire lock:', error);
    return { success: false, error: 'Failed to acquire lock' };
  } finally {
    client.release();
  }
}

/**
 * Release soft-lock on entity
 */
export async function releaseLock(
  entityType: string,
  entityId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `UPDATE process_locks
       SET status = $1, released_at = NOW()
       WHERE entity_type = $2 AND entity_id = $3 AND locked_by_user_id = $4 AND status = $5`,
      [LockStatus.RELEASED, entityType, entityId, userId, LockStatus.ACTIVE]
    );

    if (result.rowCount === 0) {
      return { success: false, error: 'No active lock found or not owned by user' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to release lock:', error);
    return { success: false, error: 'Failed to release lock' };
  }
}

/**
 * Check if entity is locked
 */
export async function isLocked(
  entityType: string,
  entityId: number
): Promise<{ locked: boolean; lock?: ProcessLock }> {
  try {
    const result = await pool.query(
      `SELECT pl.*, u.name as locked_by_user_name
       FROM process_locks pl
       LEFT JOIN users u ON pl.locked_by_user_id = u.id
       WHERE pl.entity_type = $1 AND pl.entity_id = $2 AND pl.status = $3
       ORDER BY pl.locked_at DESC LIMIT 1`,
      [entityType, entityId, LockStatus.ACTIVE]
    );

    if (result.rows.length === 0) {
      return { locked: false };
    }

    const lock = result.rows[0];

    // Check if expired
    if (lock.expires_at && new Date(lock.expires_at) < new Date()) {
      // Auto-expire
      await pool.query(
        `UPDATE process_locks SET status = $1 WHERE id = $2`,
        [LockStatus.EXPIRED, lock.id]
      );
      return { locked: false };
    }

    return { locked: true, lock };
  } catch (error: any) {
    console.error('Failed to check lock:', error);
    return { locked: false };
  }
}

/**
 * Migration SQL (run this in Phase 3):
 * 
 * CREATE TABLE IF NOT EXISTS process_locks (
 *   id SERIAL PRIMARY KEY,
 *   entity_type VARCHAR(50) NOT NULL,  -- 'item', 'group', 'shipment', etc.
 *   entity_id INTEGER NOT NULL,
 *   lock_type VARCHAR(50) NOT NULL,    -- 'approval_workflow', 'accounting_period', etc.
 *   locked_by_user_id INTEGER NOT NULL REFERENCES users(id),
 *   locked_at TIMESTAMP NOT NULL DEFAULT NOW(),
 *   expires_at TIMESTAMP,
 *   released_at TIMESTAMP,
 *   status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active', 'expired', 'released'
 *   metadata JSONB,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_process_locks_entity ON process_locks(entity_type, entity_id, status);
 * CREATE INDEX idx_process_locks_user ON process_locks(locked_by_user_id);
 * CREATE INDEX idx_process_locks_expires ON process_locks(expires_at) WHERE status = 'active';
 */

/**
 * Usage Examples:
 * 
 * // Before starting approval workflow
 * const lockResult = await acquireLock('item', itemId, LockType.APPROVAL_WORKFLOW, userId, {
 *   expiresInMinutes: 60,
 *   metadata: { approval_id: 123 }
 * });
 * 
 * if (!lockResult.success) {
 *   return res.status(409).json({ error: lockResult.error });
 * }
 * 
 * // During PUT/DELETE, check if locked
 * const { locked, lock } = await isLocked('item', itemId);
 * if (locked) {
 *   return ErrorResponseBuilder.conflict(res, {
 *     code: 'ENTITY_LOCKED',
 *     message: `Item is locked by ${lock.locked_by_user_name}`,
 *     hint: `This item is currently in ${lock.lock_type} process. Please try again later.`,
 *     entity: 'item',
 *     entity_id: itemId,
 *   });
 * }
 * 
 * // After approval workflow completes
 * await releaseLock('item', itemId, userId);
 */

/**
 * Auto-cleanup job (run every 10 minutes):
 * 
 * setInterval(async () => {
 *   await pool.query(
 *     `UPDATE process_locks SET status = $1
 *      WHERE status = $2 AND expires_at < NOW()`,
 *     [LockStatus.EXPIRED, LockStatus.ACTIVE]
 *   );
 * }, 10 * 60 * 1000);
 */
