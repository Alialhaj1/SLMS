import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();
router.use(authenticate, loadCompanyContext);

// GET /api/backups - List backup history
router.get('/', requirePermission('backup:read'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id,
             COALESCE(completed_at, started_at, created_at) AS date,
             COALESCE(file_size, 0) / (1024.0 * 1024.0) AS size_mb,
             COALESCE(status, 'unknown') AS status,
             COALESCE(duration_seconds, 0) AS duration_seconds,
             COALESCE(backup_type, 'full') AS type
      FROM backup_history
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch backups' });
  }
});

// POST /api/backups - Create a new backup
router.post('/', requirePermission('backup:create'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type = 'full' } = req.body;

    const result = await pool.query(
      `INSERT INTO backup_history (backup_type, file_name, status, started_at, triggered_by, trigger_type)
       VALUES ($1, $2, 'pending', NOW(), $3, 'manual')
       RETURNING *`,
      [type, `backup_${type}_${Date.now()}.sql`, userId]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Backup initiated' });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, message: 'Failed to create backup' });
  }
});

// POST /api/backups/:id/restore - Restore from a backup
router.post('/:id/restore', requirePermission('backup:restore'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const backup = await pool.query(
      "SELECT * FROM backup_history WHERE id = $1 AND status = 'completed'",
      [id]
    );

    if (backup.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Backup not found or not completed' });
    }

    res.json({ success: true, message: 'Restore initiated. This may take several minutes.' });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate restore' });
  }
});

// GET /api/backups/:id/download - Download a backup file
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const backup = await pool.query(
      "SELECT * FROM backup_history WHERE id = $1 AND status = 'completed'",
      [id]
    );

    if (backup.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    const { file_path, file_name } = backup.rows[0];
    if (!file_path) {
      return res.status(404).json({ success: false, message: 'Backup file not available' });
    }

    res.download(file_path, file_name);
  } catch (error: any) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ success: false, message: 'Failed to download backup' });
  }
});

export default router;
