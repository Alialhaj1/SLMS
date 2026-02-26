import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { loadCompanyContext } from '../middleware/companyContext';
import { auditLog } from '../middleware/auditLog';
import { settingsRateLimiter } from '../middleware/rateLimiter';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
    must_change_password?: boolean;
    company_id?: number;
    companyId?: number;
    branch_id?: number;
  };
}

/**
 * GET /api/settings
 * Get system settings filtered by company context.
 * - Platform users (no companyId): see global settings (company_id IS NULL)
 * - Tenant users (with companyId): see global + company-specific overrides
 */
router.get(
  '/',
  authenticate,
  requirePermission('system_settings:view'),
  loadCompanyContext,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;

      // Get global settings + company-specific overrides
      // Company overrides take precedence via DISTINCT ON
      const result = await pool.query(
        `SELECT DISTINCT ON (key) id, key, value, data_type, category, description, is_public, updated_at, company_id
         FROM system_settings
         WHERE company_id IS NULL OR company_id = $1
         ORDER BY key, company_id DESC NULLS LAST`,
        [companyId || 0]
      );

      // Parse values based on data_type
      const settings = result.rows.map(row => ({
        ...row,
        value: parseSettingValue(row.value, row.data_type),
      }));

      // Group by category
      const grouped = settings.reduce((acc: any, setting: any) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {});

      res.json(grouped);
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }
);

/**
 * GET /api/settings/policies
 * Get system policies for feature flags and access control.
 * Returns policies from system_policies table in key-value format.
 */
router.get('/policies', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if system_policies table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'system_policies'
      ) AS exists`
    );

    if (!tableCheck.rows[0]?.exists) {
      // Table doesn't exist yet - return empty policies
      return res.json({ success: true, data: [] });
    }

    const result = await pool.query(
      `SELECT policy_key as key, policy_value as value, scope, is_active
       FROM system_policies
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY policy_key`
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Failed to fetch policies:', error);
    // Fail gracefully - return empty policies
    res.json({ success: true, data: [] });
  }
});

/**
 * GET /api/settings/public
 * Get public settings (no auth required)
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT key, value, data_type
       FROM system_settings
       WHERE is_public = true`
    );

    // Convert to key-value object
    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.key] = parseSettingValue(row.value, row.data_type);
      return acc;
    }, {});

    res.json(settings);
  } catch (error: any) {
    console.error('Failed to fetch public settings:', error);
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

/**
 * PUT /api/settings
 * Bulk update settings
 */
router.put(
  '/',
  authenticate,
  requirePermission('system_settings:edit'),
  loadCompanyContext,
  settingsRateLimiter,
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const updates = req.body; // { key1: value1, key2: value2, ... }
      const companyId = req.companyId;

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        for (const [key, value] of Object.entries(updates)) {
          // Get setting data type (from global or company-specific settings)
          const settingResult = await client.query(
            'SELECT data_type FROM system_settings WHERE key = $1 AND (company_id IS NULL OR company_id = $2) ORDER BY company_id DESC NULLS LAST LIMIT 1',
            [key, companyId || 0]
          );

          if (settingResult.rows.length === 0) {
            throw new Error(`Setting not found: ${key}`);
          }

          const dataType = settingResult.rows[0].data_type;

          // Validate value based on data type
          const validatedValue = validateSettingValue(value, dataType);

          if (companyId) {
            // Tenant user: upsert a company-specific override
            await client.query(
              `INSERT INTO system_settings (key, value, data_type, category, description, is_public, company_id, updated_by, updated_at)
               SELECT $3, $1, data_type, category, description, is_public, $4, $2, NOW()
               FROM system_settings WHERE key = $3 AND company_id IS NULL
               ON CONFLICT (key, company_id) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
              [String(validatedValue), req.user!.id, key, companyId]
            );
          } else {
            // Platform user: update global setting
            await client.query(
              `UPDATE system_settings 
               SET value = $1, updated_by = $2, updated_at = NOW()
               WHERE key = $3 AND company_id IS NULL`,
              [String(validatedValue), req.user!.id, key]
            );
          }
        }

        await client.query('COMMIT');

        res.json({ message: 'Settings updated successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      res.status(500).json({ 
        error: 'Failed to update settings',
        message: error.message 
      });
    }
  }
);

/**
 * PUT /api/settings/:key
 * Update single setting
 */
router.put(
  '/:key',
  authenticate,
  requirePermission('system_settings:edit'),
  loadCompanyContext,
  settingsRateLimiter,
  auditLog,
  async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const companyId = req.companyId;

      // Get setting (global or company-specific)
      const settingResult = await pool.query(
        'SELECT * FROM system_settings WHERE key = $1 AND (company_id IS NULL OR company_id = $2) ORDER BY company_id DESC NULLS LAST LIMIT 1',
        [key, companyId || 0]
      );

      if (settingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Setting not found' });
      }

      const setting = settingResult.rows[0];

      // Validate value
      const validatedValue = validateSettingValue(value, setting.data_type);

      let result;
      if (companyId) {
        // Tenant user: create/update company-specific override
        result = await pool.query(
          `INSERT INTO system_settings (key, value, data_type, category, description, is_public, company_id, updated_by, updated_at)
           VALUES ($3, $1, $5, $6, $7, $8, $4, $2, NOW())
           ON CONFLICT (key, company_id) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()
           RETURNING *`,
          [String(validatedValue), req.user!.id, key, companyId,
           setting.data_type, setting.category, setting.description, setting.is_public]
        );
      } else {
        // Platform user: update global setting
        result = await pool.query(
          `UPDATE system_settings 
           SET value = $1, updated_by = $2, updated_at = NOW()
           WHERE key = $3 AND company_id IS NULL
           RETURNING *`,
          [String(validatedValue), req.user!.id, key]
        );
      }

      const updated = result.rows[0];
      updated.value = parseSettingValue(updated.value, updated.data_type);

      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update setting:', error);
      res.status(500).json({ 
        error: 'Failed to update setting',
        message: error.message 
      });
    }
  }
);

/**
 * Helper: Parse setting value based on data type
 */
function parseSettingValue(value: string, dataType: string): any {
  if (value === null || value === undefined) return null;

  switch (dataType) {
    case 'number':
      return parseFloat(value);
    case 'boolean':
      return value === 'true' || value === '1';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

/**
 * Helper: Validate setting value based on data type
 */
function validateSettingValue(value: any, dataType: string): any {
  switch (dataType) {
    case 'number':
      const num = Number(value);
      if (isNaN(num)) throw new Error('Value must be a number');
      return num;
    
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error('Value must be a boolean');
      }
      return value;
    
    case 'json':
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      // Verify it's valid JSON
      JSON.parse(String(value));
      return String(value);
    
    case 'string':
    default:
      return String(value);
  }
}

export default router;
