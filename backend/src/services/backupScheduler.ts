import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import pool from '../db';
import logger from '../utils/logger';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'postgres';
const POSTGRES_USER = process.env.POSTGRES_USER || 'slms';
const POSTGRES_DB = process.env.POSTGRES_DB || 'slms_db';

// Master data tables
const MASTER_DATA_TABLES = [
  'items', 'item_groups', 'units', 'vendors', 'customers', 'projects',
  'accounts', 'currencies', 'countries', 'cities', 'ports', 'customs_tariffs',
  'companies', 'branches', 'warehouses', 'cost_centers', 'printed_templates',
  'users', 'roles', 'permissions', 'role_permissions', 'expense_types',
  'shipment_expense_types', 'payment_methods', 'banks', 'tax_codes'
];

// Transaction tables
const TRANSACTION_TABLES = [
  'shipments', 'vendor_payments', 'expense_requests', 'purchase_orders',
  'sales_orders', 'journal_entries', 'general_ledger', 'purchase_invoices',
  'sales_invoices', 'customs_declarations'
];

/**
 * Execute a backup with the given parameters
 */
async function executeBackup(
  backupType: string,
  tables: string[],
  triggerType: 'scheduled' | 'pre_migration'
): Promise<void> {
  const startTime = Date.now();
  
  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `slms_${backupType}_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  // Create backup record
  const insertResult = await pool.query(
    `INSERT INTO backup_history (backup_type, file_name, file_path, tables_included, status, trigger_type)
     VALUES ($1, $2, $3, $4, 'running', $5)
     RETURNING id`,
    [backupType, fileName, filePath, tables.length > 0 ? tables : null, triggerType]
  );

  const backupId = insertResult.rows[0].id;

  try {
    // Build pg_dump command
    let command = `pg_dump -U ${POSTGRES_USER} -d ${POSTGRES_DB} -h ${POSTGRES_HOST}`;
    
    if (tables.length > 0) {
      const tableFlags = tables.map(t => `-t ${t}`).join(' ');
      command += ` ${tableFlags}`;
    }
    
    command += ` > ${filePath}`;

    // Execute backup
    await execAsync(command);

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Calculate checksum
    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Update backup record
    await pool.query(
      `UPDATE backup_history 
       SET status = 'completed', completed_at = NOW(), file_size = $2, duration_seconds = $3, checksum = $4
       WHERE id = $1`,
      [backupId, fileSize, duration, checksum]
    );

    // Update schedule last_run_at
    await pool.query(
      `UPDATE backup_schedules SET last_run_at = NOW() WHERE backup_type = $1`,
      [backupType]
    );

    logger.info(`Scheduled backup completed: ${fileName} (${fileSize} bytes, ${duration}s)`);
  } catch (error: any) {
    logger.error(`Scheduled backup failed: ${error.message}`);
    
    await pool.query(
      `UPDATE backup_history 
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE id = $1`,
      [backupId, error.message]
    );
  }
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups(): Promise<void> {
  try {
    const schedulesResult = await pool.query(`
      SELECT DISTINCT backup_type, retention_days 
      FROM backup_schedules 
      WHERE is_active = true
    `);

    for (const schedule of schedulesResult.rows) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - schedule.retention_days);

      // Find old backups
      const oldBackups = await pool.query(
        `SELECT id, file_path FROM backup_history 
         WHERE backup_type = $1 
         AND status = 'completed' 
         AND created_at < $2`,
        [schedule.backup_type, cutoffDate]
      );

      for (const backup of oldBackups.rows) {
        try {
          // Delete file if exists
          if (backup.file_path && fs.existsSync(backup.file_path)) {
            fs.unlinkSync(backup.file_path);
          }

          // Delete record
          await pool.query(`DELETE FROM backup_history WHERE id = $1`, [backup.id]);
          
          logger.info(`Cleaned up old backup: ${backup.file_path}`);
        } catch (err: any) {
          logger.error(`Failed to cleanup backup ${backup.id}: ${err.message}`);
        }
      }
    }
  } catch (error: any) {
    logger.error(`Backup cleanup failed: ${error.message}`);
  }
}

/**
 * Initialize backup scheduler
 */
export function initBackupScheduler(): void {
  logger.info('Initializing backup scheduler...');

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info(`Created backup directory: ${BACKUP_DIR}`);
  }

  // Full backup - Daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('Starting scheduled full backup...');
    await executeBackup('full', [], 'scheduled');
  });

  // Master data backup - Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Starting scheduled master data backup...');
    await executeBackup('master_data', MASTER_DATA_TABLES, 'scheduled');
  });

  // Transaction backup - Every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Starting scheduled transaction backup...');
    await executeBackup('custom', TRANSACTION_TABLES, 'scheduled');
  });

  // Cleanup old backups - Daily at 4 AM
  cron.schedule('0 4 * * *', async () => {
    logger.info('Starting backup cleanup...');
    await cleanupOldBackups();
  });

  logger.info('Backup scheduler initialized with schedules:');
  logger.info('  - Full backup: Daily at 3:00 AM');
  logger.info('  - Master data: Every 6 hours');
  logger.info('  - Transactions: Every hour');
  logger.info('  - Cleanup: Daily at 4:00 AM');
}

/**
 * Create a pre-migration backup
 */
export async function createPreMigrationBackup(migrationName: string): Promise<void> {
  logger.info(`Creating pre-migration backup for: ${migrationName}`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `slms_pre_migration_${migrationName}_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  try {
    const command = `pg_dump -U ${POSTGRES_USER} -d ${POSTGRES_DB} -h ${POSTGRES_HOST} > ${filePath}`;
    await execAsync(command);
    
    const stats = fs.statSync(filePath);
    
    await pool.query(
      `INSERT INTO backup_history (backup_type, file_name, file_path, file_size, status, trigger_type, notes, completed_at)
       VALUES ('pre_migration', $1, $2, $3, 'completed', 'pre_migration', $4, NOW())`,
      [fileName, filePath, stats.size, `Pre-migration backup for: ${migrationName}`]
    );

    logger.info(`Pre-migration backup created: ${fileName}`);
  } catch (error: any) {
    logger.error(`Pre-migration backup failed: ${error.message}`);
    throw error;
  }
}

export default {
  initBackupScheduler,
  createPreMigrationBackup
};
