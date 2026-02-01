/**
 * Transaction Boundary Enforcement
 * Enterprise-grade transaction wrapper
 * 
 * Ensures atomicity for critical operations
 */

import { Pool, PoolClient } from 'pg';

/**
 * Transaction callback function type
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Transaction options
 */
export interface TransactionOptions {
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout?: number; // milliseconds
  retryOnDeadlock?: boolean;
  maxRetries?: number;
}

/**
 * Transaction Result
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  retryCount?: number;
}

/**
 * Transaction Wrapper
 * Guarantees ACID properties for critical operations
 */
export class TransactionManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute callback within transaction
   * Automatically handles BEGIN, COMMIT, ROLLBACK
   * 
   * @example
   * const result = await txManager.withTransaction(async (trx) => {
   *   await policyService.validateUpdate(itemId, companyId, fields, trx);
   *   await trx.query('UPDATE items SET ... WHERE id = $1', [itemId]);
   *   return updatedItem;
   * });
   */
  async withTransaction<T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const {
      isolationLevel = 'READ COMMITTED',
      timeout = 30000,
      retryOnDeadlock = true,
      maxRetries = 3,
    } = options;

    let retryCount = 0;

    while (retryCount <= maxRetries) {
      const client = await this.pool.connect();

      try {
        // Set statement timeout (prevent hanging transactions)
        await client.query(`SET statement_timeout = ${timeout}`);

        // Set isolation level
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);

        // Begin transaction
        await client.query('BEGIN');

        // Execute callback
        const result = await callback(client);

        // Commit transaction
        await client.query('COMMIT');

        return result;
      } catch (error: any) {
        // Rollback transaction
        await client.query('ROLLBACK').catch(() => {
          // Ignore rollback errors (connection might be closed)
        });

        // Check if deadlock error (PostgreSQL error code 40P01)
        const isDeadlock = error.code === '40P01';

        if (isDeadlock && retryOnDeadlock && retryCount < maxRetries) {
          retryCount++;
          console.warn(
            `Deadlock detected, retrying transaction (${retryCount}/${maxRetries})`,
            { error: error.message }
          );

          // Exponential backoff (50ms, 100ms, 200ms...)
          await this.sleep(50 * Math.pow(2, retryCount - 1));
          continue; // Retry
        }

        // Re-throw error if not retrying
        throw error;
      } finally {
        client.release();
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} retries`);
  }

  /**
   * Execute callback with savepoint (nested transaction)
   * 
   * @example
   * await txManager.withSavepoint(client, 'update_item', async (trx) => {
   *   await trx.query('UPDATE items SET ...');
   * });
   */
  async withSavepoint<T>(
    client: PoolClient,
    savepointName: string,
    callback: TransactionCallback<T>
  ): Promise<T> {
    try {
      // Create savepoint
      await client.query(`SAVEPOINT ${savepointName}`);

      // Execute callback
      const result = await callback(client);

      // Release savepoint (commit nested transaction)
      await client.query(`RELEASE SAVEPOINT ${savepointName}`);

      return result;
    } catch (error) {
      // Rollback to savepoint
      await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`).catch(() => {
        // Ignore rollback errors
      });

      throw error;
    }
  }

  /**
   * Check if operation is currently in transaction
   */
  isInTransaction(client: PoolClient): boolean {
    // Check if client has open transaction
    return (client as any)._inTransaction === true;
  }

  /**
   * Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global transaction manager instance
 * Use this in routes/services
 */
let transactionManager: TransactionManager | null = null;

export function initializeTransactionManager(pool: Pool): void {
  transactionManager = new TransactionManager(pool);
}

export function getTransactionManager(): TransactionManager {
  if (!transactionManager) {
    throw new Error('TransactionManager not initialized. Call initializeTransactionManager(pool) first.');
  }
  return transactionManager;
}

/**
 * Convenience wrapper for common use case
 * 
 * @example
 * const updatedItem = await withTransaction(pool, async (trx) => {
 *   await policyService.validateUpdate(itemId, companyId, fields, trx);
 *   const result = await trx.query('UPDATE items SET ... WHERE id = $1', [itemId]);
 *   return result.rows[0];
 * });
 */
export async function withTransaction<T>(
  pool: Pool,
  callback: TransactionCallback<T>,
  options?: TransactionOptions
): Promise<T> {
  const manager = new TransactionManager(pool);
  return manager.withTransaction(callback, options);
}

/**
 * Usage Examples:
 * 
 * Example 1: Simple transaction
 * ==============================
 * const updatedItem = await withTransaction(pool, async (trx) => {
 *   // All queries within this callback are atomic
 *   await trx.query('UPDATE items SET name = $1 WHERE id = $2', ['New Name', itemId]);
 *   await trx.query('INSERT INTO audit_logs (action, entity_id) VALUES ($1, $2)', ['update', itemId]);
 *   return { success: true };
 * });
 * 
 * Example 2: With policy validation
 * ==================================
 * const result = await withTransaction(pool, async (trx) => {
 *   // Validate within transaction (sees uncommitted changes)
 *   const policyService = new ItemPolicyService(pool);
 *   await policyService.validateUpdate(itemId, companyId, req.body);
 *   
 *   // Perform update
 *   const result = await trx.query(
 *     'UPDATE items SET base_uom_id = $1 WHERE id = $2 RETURNING *',
 *     [newUomId, itemId]
 *   );
 *   
 *   return result.rows[0];
 * });
 * 
 * Example 3: With deadlock retry
 * ================================
 * const result = await withTransaction(
 *   pool,
 *   async (trx) => {
 *     // Critical section (may deadlock)
 *     await trx.query('UPDATE items SET ... WHERE id = $1 FOR UPDATE', [itemId]);
 *     await trx.query('UPDATE warehouses SET ... WHERE id = $1 FOR UPDATE', [warehouseId]);
 *   },
 *   { retryOnDeadlock: true, maxRetries: 3 }
 * );
 * 
 * Example 4: With savepoint (nested transaction)
 * ===============================================
 * await withTransaction(pool, async (trx) => {
 *   await trx.query('UPDATE items SET ...');
 *   
 *   const txManager = getTransactionManager();
 *   
 *   try {
 *     // Nested transaction with savepoint
 *     await txManager.withSavepoint(trx, 'update_warehouse', async (nestedTrx) => {
 *       await nestedTrx.query('UPDATE warehouses SET ...');
 *     });
 *   } catch (error) {
 *     // Warehouse update failed, but item update still committed
 *     console.warn('Warehouse update failed, continuing with item update');
 *   }
 * });
 * 
 * Example 5: In route handler
 * ============================
 * router.put('/:id', async (req, res) => {
 *   try {
 *     const updatedItem = await withTransaction(pool, async (trx) => {
 *       // Policy validation
 *       const policyService = new ItemPolicyService(pool);
 *       await policyService.validateUpdate(itemId, companyId, req.body);
 *       
 *       // Mutation
 *       const result = await trx.query(
 *         'UPDATE items SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
 *         [req.body.name, itemId]
 *       );
 *       
 *       // Audit log
 *       await trx.query(
 *         'INSERT INTO audit_logs (action, entity_type, entity_id, user_id) VALUES ($1, $2, $3, $4)',
 *         ['update', 'item', itemId, req.user.id]
 *       );
 *       
 *       return result.rows[0];
 *     });
 *     
 *     res.json({ success: true, data: updatedItem });
 *   } catch (error: any) {
 *     res.status(409).json(error);
 *   }
 * });
 */
