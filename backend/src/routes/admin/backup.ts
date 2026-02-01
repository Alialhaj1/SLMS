import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac';
import pool from '../../db';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);
const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Backup directory path
const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

// Master data tables for backup (البيانات الرئيسية)
const MASTER_DATA_TABLES = [
  // Core Master Data
  'items', 'item_groups', 'item_categories', 'item_audit_trail',
  'units', 'units_of_measure', 'unit_conversions',
  'vendors', 'vendor_categories', 'vendor_types', 'vendor_statuses',
  'customers', 'customer_statuses',
  'projects', 'project_types', 'project_costs', 'project_items',
  'accounts', 'account_types', 'account_behaviors', 'account_level_types', 'default_accounts',
  'currencies', 'exchange_rates',
  'countries', 'cities', 'ports', 'regions', 'border_points',
  'customs_tariffs', 'hs_codes', 'customs_offices', 'customs_exemptions',
  'companies', 'branches', 'warehouses', 'warehouse_types',
  'cost_centers', 'profit_centers',
  'printed_templates',
  'users', 'user_roles', 'roles', 'role_permissions', 'permissions', 'permission_categories', 'permission_sets',
  'expense_types', 'request_expense_types', 'shipment_expense_types',
  'payment_methods', 'payment_terms', 'banks', 'bank_accounts',
  'tax_codes', 'tax_rates', 'tax_types',
  // Reference Data
  'reference_data', 'numbering_series', 'document_number_series',
  'incoterms', 'delivery_terms', 'supply_terms',
  'contract_types', 'contract_statuses', 'contract_approval_stages',
  'shipping_agents', 'insurance_companies', 'laboratories', 'clearance_offices',
  'invoice_types', 'bill_types',
  'system_settings', 'company_settings', 'system_policies', 'system_languages',
  'time_zones', 'harvest_schedules',
  // Workflows
  'approval_workflows', 'accounting_rules', 'accounting_rule_lines', 'accounting_rule_triggers',
  // Statuses
  'shipment_lifecycle_statuses', 'shipment_stages', 'shipment_event_types', 'shipment_event_sources',
  'sales_document_statuses', 'purchase_order_statuses', 'purchase_order_types',
  'request_statuses', 'customs_declaration_statuses', 'customs_declaration_types',
  'lc_statuses', 'lc_types', 'logistics_shipment_types',
  'linked_entity_types', 'contact_methods', 'address_types',
  'vendor_document_types', 'vendor_payment_terms', 'vendor_classifications', 'vendor_compliance',
  'role_templates'
];

// Transaction tables (بيانات المعاملات)
const TRANSACTION_TABLES = [
  // Core Transactions
  'shipments', 'logistics_shipments', 'logistics_shipment_items', 'logistics_shipment_costs',
  'logistics_shipment_receipts', 'logistics_shipment_receipt_lines',
  'transfer_requests', 'warehouse_transfers', 'warehouse_transfer_items',
  'vendor_payments', 'vendor_payment_allocations',
  'expense_requests', 'expense_request_items', 'expense_request_attachments',
  'payment_requests',
  'purchase_orders', 'purchase_order_items',
  'purchase_invoices', 'purchase_invoice_items', 'purchase_invoice_expenses',
  'sales_orders', 'sales_order_items',
  'sales_invoices', 'sales_invoice_items',
  'journal_entries', 'journal_entry_lines', 'journal_lines',
  'general_ledger',
  'customs_declarations', 'customs_declaration_items', 'customs_declaration_parties',
  'customs_declaration_containers', 'customs_declaration_fees', 'customs_declaration_payments',
  'customs_declaration_inspections', 'customs_declaration_attachments', 'customs_declaration_history',
  'letters_of_credit', 'lc_amendments', 'lc_documents', 'lc_payments', 'lc_alerts',
  'shipment_expenses', 'shipment_expense_distributions', 'shipment_cost_summary',
  'shipment_events', 'shipment_milestones', 'shipping_bills',
  'stock_movements', 'stock_adjustments', 'stock_adjustment_items',
  'inventory_movements', 'inventory_reservations', 'inventory_adjustments',
  'goods_receipts', 'goods_receipt_items',
  'approval_requests', 'approval_history', 'request_approval_history',
  'audit_logs', 'login_history', 'role_assignment_audit',
  'notifications', 'backup_history', 'backup_schedules'
];

// All critical tables (combined for full backup)
const ALL_TABLES = [...new Set([...MASTER_DATA_TABLES, ...TRANSACTION_TABLES])];


/**
 * @route   GET /api/admin/backup/dashboard
 * @desc    Get backup dashboard statistics
 * @access  Private (backup:view)
 */
router.get('/dashboard', requirePermission('backup:view'), async (req: Request, res: Response) => {
  try {
    // Get backup stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM backup_history WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours') as backups_last_24h,
        (SELECT COUNT(*) FROM backup_history WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') as failed_last_7d,
        (SELECT MAX(completed_at) FROM backup_history WHERE status = 'completed' AND backup_type = 'full') as last_full_backup,
        (SELECT MAX(completed_at) FROM backup_history WHERE status = 'completed' AND backup_type = 'master_data') as last_master_backup,
        (SELECT COALESCE(SUM(file_size), 0) FROM backup_history WHERE status = 'completed') as total_backup_size,
        (SELECT COUNT(*) FROM protected_tables WHERE protection_level = 'critical') as critical_tables_count,
        (SELECT COUNT(*) FROM backup_schedules WHERE is_active = true) as active_schedules
    `);

    // Get recent backups
    const recentBackups = await pool.query(`
      SELECT id, backup_type, file_name, file_size, status, started_at, completed_at, duration_seconds, trigger_type
      FROM backup_history
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get active schedules
    const schedules = await pool.query(`
      SELECT id, name, name_ar, backup_type, cron_expression, retention_days, is_active, last_run_at, next_run_at
      FROM backup_schedules
      WHERE is_active = true
      ORDER BY name
    `);

    // Get table row counts for protected tables
    const tableCountsResult = await pool.query(`
      SELECT table_name, protection_level, description_ar
      FROM protected_tables
      ORDER BY backup_priority, table_name
    `);

    const tableCounts: Record<string, any> = {};
    for (const table of tableCountsResult.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        tableCounts[table.table_name] = {
          count: parseInt(countResult.rows[0].count, 10),
          protection_level: table.protection_level,
          description_ar: table.description_ar
        };
      } catch (e) {
        tableCounts[table.table_name] = { count: 0, error: true };
      }
    }

    return res.json({
      stats: statsResult.rows[0],
      recentBackups: recentBackups.rows,
      schedules: schedules.rows,
      tableCounts
    });
  } catch (error: any) {
    console.error('Error fetching backup dashboard:', error);
    return res.status(500).json({ error: 'Failed to fetch backup dashboard' });
  }
});

/**
 * @route   GET /api/admin/backup/history
 * @desc    Get backup history with pagination
 * @access  Private (backup:view)
 */
router.get('/history', requirePermission('backup:view'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type as string;
    const status = req.query.status as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      whereClause += ` AND backup_type = $${paramIndex++}`;
      params.push(type);
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM backup_history ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT bh.*, u.email as triggered_by_email
       FROM backup_history bh
       LEFT JOIN users u ON bh.triggered_by = u.id
       ${whereClause}
       ORDER BY bh.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit
    });
  } catch (error: any) {
    console.error('Error fetching backup history:', error);
    return res.status(500).json({ error: 'Failed to fetch backup history' });
  }
});

/**
 * @route   POST /api/admin/backup/create
 * @desc    Create a new backup
 * @access  Private (backup:create)
 */
router.post('/create', requirePermission('backup:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const userId = (req as any).user?.id;
    const { type = 'full', tables, notes } = req.body;

    // Validate backup type
    if (!['full', 'master_data', 'custom'].includes(type)) {
      return res.status(400).json({ error: 'Invalid backup type' });
    }

    // Determine tables to backup
    let tablesToBackup: string[] = [];
    if (type === 'full') {
      tablesToBackup = []; // Empty means all tables
    } else if (type === 'master_data') {
      tablesToBackup = MASTER_DATA_TABLES;
    } else if (type === 'custom' && tables) {
      tablesToBackup = tables;
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `slms_${type}_${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, fileName);

    // Create backup record
    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO backup_history (backup_type, file_name, file_path, tables_included, status, triggered_by, trigger_type, notes)
       VALUES ($1, $2, $3, $4, 'running', $5, 'manual', $6)
       RETURNING id`,
      [type, fileName, filePath, tablesToBackup.length > 0 ? tablesToBackup : null, userId, notes]
    );

    const backupId = insertResult.rows[0].id;

    await client.query('COMMIT');

    // Execute backup in background
    executeBackup(backupId, type, tablesToBackup, filePath);

    return res.json({
      success: true,
      message: 'Backup started',
      backupId,
      fileName
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating backup:', error);
    return res.status(500).json({ error: 'Failed to create backup' });
  } finally {
    client.release();
  }
});

/**
 * Execute backup in background
 */
async function executeBackup(backupId: number, type: string, tables: string[], filePath: string) {
  const startTime = Date.now();
  
  try {
    // Build pg_dump command
    let command = `pg_dump -U ${process.env.POSTGRES_USER || 'slms'} -d ${process.env.POSTGRES_DB || 'slms_db'} -h ${process.env.POSTGRES_HOST || 'postgres'}`;
    
    if (tables.length > 0) {
      // Add table flags
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

    console.log(`Backup ${backupId} completed: ${filePath} (${fileSize} bytes)`);
  } catch (error: any) {
    console.error(`Backup ${backupId} failed:`, error);
    
    await pool.query(
      `UPDATE backup_history 
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE id = $1`,
      [backupId, error.message]
    );
  }
}

/**
 * @route   GET /api/admin/backup/download/:id
 * @desc    Download a backup file
 * @access  Private (backup:view)
 */
router.get('/download/:id', requirePermission('backup:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT file_name, file_path, status FROM backup_history WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];

    if (backup.status !== 'completed') {
      return res.status(400).json({ error: 'Backup is not ready for download' });
    }

    if (!fs.existsSync(backup.file_path)) {
      return res.status(404).json({ error: 'Backup file not found on disk' });
    }

    res.download(backup.file_path, backup.file_name);
  } catch (error: any) {
    console.error('Error downloading backup:', error);
    return res.status(500).json({ error: 'Failed to download backup' });
  }
});

/**
 * @route   DELETE /api/admin/backup/:id
 * @desc    Delete a backup
 * @access  Private (backup:delete)
 */
router.delete('/:id', requirePermission('backup:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT file_path FROM backup_history WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];

    // Delete file if exists
    if (backup.file_path && fs.existsSync(backup.file_path)) {
      fs.unlinkSync(backup.file_path);
    }

    // Delete record
    await pool.query(`DELETE FROM backup_history WHERE id = $1`, [id]);

    return res.json({ success: true, message: 'Backup deleted' });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    return res.status(500).json({ error: 'Failed to delete backup' });
  }
});

/**
 * @route   GET /api/admin/backup/schedules
 * @desc    Get backup schedules
 * @access  Private (backup:schedule)
 */
router.get('/schedules', requirePermission('backup:schedule'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM backup_schedules ORDER BY name
    `);

    return res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Error fetching backup schedules:', error);
    return res.status(500).json({ error: 'Failed to fetch backup schedules' });
  }
});

/**
 * @route   PUT /api/admin/backup/schedules/:id
 * @desc    Update a backup schedule
 * @access  Private (backup:schedule)
 */
router.put('/schedules/:id', requirePermission('backup:schedule'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active, cron_expression, retention_days } = req.body;

    const result = await pool.query(
      `UPDATE backup_schedules 
       SET is_active = COALESCE($2, is_active),
           cron_expression = COALESCE($3, cron_expression),
           retention_days = COALESCE($4, retention_days),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, is_active, cron_expression, retention_days]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    return res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating backup schedule:', error);
    return res.status(500).json({ error: 'Failed to update backup schedule' });
  }
});

/**
 * @route   GET /api/admin/backup/tables
 * @desc    Get list of protected tables with row counts
 * @access  Private (backup:view)
 */
router.get('/tables', requirePermission('backup:view'), async (req: Request, res: Response) => {
  try {
    const tablesResult = await pool.query(`
      SELECT table_name, protection_level, backup_priority, description, description_ar
      FROM protected_tables
      ORDER BY backup_priority, table_name
    `);

    const tables = [];
    for (const table of tablesResult.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        tables.push({
          ...table,
          row_count: parseInt(countResult.rows[0].count, 10)
        });
      } catch (e) {
        tables.push({
          ...table,
          row_count: 0,
          error: 'Table may not exist'
        });
      }
    }

    return res.json({ data: tables });
  } catch (error: any) {
    console.error('Error fetching protected tables:', error);
    return res.status(500).json({ error: 'Failed to fetch protected tables' });
  }
});

/**
 * @route   POST /api/admin/backup/restore/:id
 * @desc    Restore from a backup (DANGEROUS - super_admin only)
 * @access  Private (backup:restore)
 */
router.post('/restore/:id', requirePermission('backup:restore'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { tables, confirm } = req.body;

    // Require explicit confirmation
    if (confirm !== 'RESTORE_CONFIRMED') {
      return res.status(400).json({ 
        error: 'Restore requires explicit confirmation',
        hint: 'Send { confirm: "RESTORE_CONFIRMED" } in request body'
      });
    }

    const backupResult = await pool.query(
      `SELECT * FROM backup_history WHERE id = $1 AND status = 'completed'`,
      [id]
    );

    if (backupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Completed backup not found' });
    }

    const backup = backupResult.rows[0];

    if (!fs.existsSync(backup.file_path)) {
      return res.status(404).json({ error: 'Backup file not found on disk' });
    }

    // Create restore record
    const restoreResult = await pool.query(
      `INSERT INTO restore_history (backup_id, restore_type, tables_restored, status, triggered_by)
       VALUES ($1, $2, $3, 'running', $4)
       RETURNING id`,
      [id, tables ? 'partial' : 'full', tables || backup.tables_included, userId]
    );

    const restoreId = restoreResult.rows[0].id;

    // Execute restore in background
    executeRestore(restoreId, backup.file_path, tables);

    return res.json({
      success: true,
      message: 'Restore started',
      restoreId
    });
  } catch (error: any) {
    console.error('Error starting restore:', error);
    return res.status(500).json({ error: 'Failed to start restore' });
  }
});

/**
 * Execute restore in background
 */
async function executeRestore(restoreId: number, filePath: string, tables?: string[]) {
  const startTime = Date.now();
  
  try {
    let command = `psql -U ${process.env.POSTGRES_USER || 'slms'} -d ${process.env.POSTGRES_DB || 'slms_db'} -h ${process.env.POSTGRES_HOST || 'postgres'} < ${filePath}`;

    await execAsync(command);

    const duration = Math.round((Date.now() - startTime) / 1000);

    await pool.query(
      `UPDATE restore_history 
       SET status = 'completed', completed_at = NOW(), duration_seconds = $2
       WHERE id = $1`,
      [restoreId, duration]
    );

    console.log(`Restore ${restoreId} completed in ${duration}s`);
  } catch (error: any) {
    console.error(`Restore ${restoreId} failed:`, error);
    
    await pool.query(
      `UPDATE restore_history 
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE id = $1`,
      [restoreId, error.message]
    );
  }
}

/**
 * @route   GET /api/admin/backup/restore/history
 * @desc    Get restore history
 * @access  Private (backup:view)
 */
router.get('/restore/history', requirePermission('backup:view'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT rh.*, bh.file_name as backup_file_name, u.email as triggered_by_email
      FROM restore_history rh
      LEFT JOIN backup_history bh ON rh.backup_id = bh.id
      LEFT JOIN users u ON rh.triggered_by = u.id
      ORDER BY rh.created_at DESC
      LIMIT 20
    `);

    return res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Error fetching restore history:', error);
    return res.status(500).json({ error: 'Failed to fetch restore history' });
  }
});

export default router;
