/**
 * Soft Delete Utilities
 * Provides helpers for soft delete operations
 */

import pool from '../db';

interface SoftDeleteOptions {
  tableName: string;
  recordId: number;
  deletedBy: number;
  reason?: string;
}

interface RestoreOptions {
  tableName: string;
  recordId: number;
  restoredBy: number;
}

/**
 * Soft delete a record
 */
export async function softDelete(options: SoftDeleteOptions): Promise<void> {
  const { tableName, recordId, deletedBy, reason } = options;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update the record with deleted_at
    await client.query(
      `UPDATE ${tableName} SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2`,
      [deletedBy, recordId]
    );

    // Log to deleted_records
    await client.query(
      `INSERT INTO deleted_records (table_name, record_id, deleted_by, reason)
       VALUES ($1, $2, $3, $4)`,
      [tableName, recordId, deletedBy, reason || null]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Restore a soft deleted record
 */
export async function restore(options: RestoreOptions): Promise<void> {
  const { tableName, recordId, restoredBy } = options;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove deleted_at from record
    await client.query(
      `UPDATE ${tableName} SET deleted_at = NULL, deleted_by = NULL WHERE id = $1`,
      [recordId]
    );

    // Update deleted_records
    await client.query(
      `UPDATE deleted_records 
       SET restored_at = NOW(), restored_by = $1
       WHERE table_name = $2 AND record_id = $3 AND restored_at IS NULL`,
      [restoredBy, tableName, recordId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Permanently delete a record (requires special permission)
 */
export async function permanentDelete(tableName: string, recordId: number): Promise<void> {
  await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [recordId]);
}

/**
 * Check if a record is soft deleted
 */
export async function isDeleted(tableName: string, recordId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT deleted_at FROM ${tableName} WHERE id = $1`,
    [recordId]
  );
  
  if (result.rows.length === 0) return false;
  return result.rows[0].deleted_at !== null;
}

/**
 * Get soft deleted records
 */
export async function getDeletedRecords(tableName: string, limit = 50, offset = 0) {
  const result = await pool.query(
    `SELECT t.*, dr.deleted_at, dr.deleted_by, dr.reason,
            u.full_name as deleted_by_name
     FROM ${tableName} t
     INNER JOIN deleted_records dr ON dr.record_id = t.id AND dr.table_name = $1
     LEFT JOIN users u ON dr.deleted_by = u.id
     WHERE t.deleted_at IS NOT NULL AND dr.restored_at IS NULL
     ORDER BY dr.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tableName, limit, offset]
  );
  
  return result.rows;
}

/**
 * Get deleted records count
 */
export async function getDeletedCount(tableName: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM ${tableName} t
     INNER JOIN deleted_records dr ON dr.record_id = t.id AND dr.table_name = $1
     WHERE t.deleted_at IS NOT NULL AND dr.restored_at IS NULL`,
    [tableName]
  );
  
  return parseInt(result.rows[0].count);
}
