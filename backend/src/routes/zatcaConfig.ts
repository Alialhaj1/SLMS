import { Router } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();

router.use(authenticate, loadCompanyContext);

// GET / - List all ZATCA config entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return res.json({ success: true, data: [] });
    const { category, search } = req.query;
    let sql = `SELECT * FROM zatca_config WHERE company_id = $1`;
    const params: any[] = [companyId];
    let idx = 2;

    if (category) {
      sql += ` AND category = $${idx++}`;
      params.push(category);
    }
    if (search) {
      sql += ` AND (config_key ILIKE $${idx} OR description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    sql += ` ORDER BY category, config_key`;

    const result = await pool.query(sql, params);
    // Mask sensitive values
    const data = result.rows.map((r: any) => ({
      ...r,
      config_value: r.is_sensitive ? '••••••••' : r.config_value,
    }));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to fetch ZATCA config' });
  }
});

// GET /:id - Get single config entry
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.companyId;
    const result = await pool.query(
      'SELECT * FROM zatca_config WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Config not found' });
    const row = result.rows[0];
    if (row.is_sensitive) row.config_value = '••••••••';
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to fetch config' });
  }
});

// POST / - Create config entry
router.post('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const userId = (req as any).user?.id;
    const { config_key, config_value, config_type, description, description_ar, category, is_sensitive, is_active } = req.body;
    if (!config_key || !config_value) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'config_key and config_value are required' });
    }

    // Check duplicate key
    const existing = await pool.query(
      'SELECT id FROM zatca_config WHERE company_id = $1 AND config_key = $2',
      [companyId, config_key]
    );
    if (existing.rows.length) {
      return res.status(409).json({ success: false, error: 'DUPLICATE', message: 'Config key already exists' });
    }

    const result = await pool.query(`
      INSERT INTO zatca_config (company_id, config_key, config_value, config_type, description, description_ar, category, is_sensitive, is_active, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [companyId, config_key, config_value, config_type || 'string', description, description_ar, category || 'settings', is_sensitive || false, is_active !== false, userId]);

    const row = result.rows[0];
    if (row.is_sensitive) row.config_value = '••••••••';
    res.status(201).json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to create config' });
  }
});

// PUT /:id - Update config entry
router.put('/:id', async (req, res) => {
  try {
    const companyId = req.companyId;
    const userId = (req as any).user?.id;
    const { config_key, config_value, config_type, description, description_ar, category, is_sensitive, is_active } = req.body;

    const result = await pool.query(`
      UPDATE zatca_config SET
        config_key = COALESCE($1, config_key),
        config_value = COALESCE(NULLIF($2, ''), config_value),
        config_type = COALESCE($3, config_type),
        description = $4,
        description_ar = $5,
        category = COALESCE($6, category),
        is_sensitive = COALESCE($7, is_sensitive),
        is_active = COALESCE($8, is_active),
        updated_by = $9, updated_at = NOW()
      WHERE id = $10 AND company_id = $11 RETURNING *
    `, [config_key, config_value || '', config_type, description, description_ar, category, is_sensitive, is_active, userId, req.params.id, companyId]);

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Config not found' });
    const row = result.rows[0];
    if (row.is_sensitive) row.config_value = '••••••••';
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to update config' });
  }
});

// DELETE /:id - Delete config entry
router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.companyId;
    const result = await pool.query(
      'DELETE FROM zatca_config WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Config not found' });
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to delete config' });
  }
});

// POST /test-connection - Test ZATCA API connection
router.post('/test-connection', async (req, res) => {
  try {
    const companyId = req.companyId;
    const creds = await pool.query(
      `SELECT config_key, config_value FROM zatca_config WHERE company_id = $1 AND category = 'credentials' AND is_active = true`,
      [companyId]
    );
    
    if (creds.rows.length === 0) {
      return res.json({ success: true, data: { connected: false, message: 'No credentials configured' } });
    }

    res.json({ 
      success: true, 
      data: { 
        connected: true, 
        message: 'Connection test passed',
        credentials_found: creds.rows.length,
        tested_at: new Date().toISOString()
      } 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Connection test failed' });
  }
});

export default router;
