import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

type BankRow = {
  id: number;
  code: string;
  swift_code: string | null;
  name: string;
  name_ar: string | null;
  is_active: boolean;
  country_id: number | null;
  country_name: string | null;
  country_name_ar: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: BankRow) {
  return {
    id: row.id,
    code: row.code,
    swift_code: row.swift_code,
    name: row.name,
    name_ar: row.name_ar,
    is_active: row.is_active,
    country_id: row.country_id,
    country_name: row.country_name,
    country_name_ar: row.country_name_ar,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// =============================================
// GET /api/banks
// =============================================
router.get(
  '/',
  requireAnyPermission([
    'master:banks:view',
    'master:view',
    // tolerate older / alternative namespaces
    'finance:bank_accounts:view',
    'finance:bank_accounts:manage',
    'master:finance:view',
  ]),
  async (req: Request, res: Response) => {
    try {
      const { search, is_active, country_id } = req.query;

      let query = `SELECT
        b.id,
        b.code,
        b.swift_code,
        b.name,
        b.name_ar,
        b.is_active,
        b.country_id,
        c.name AS country_name,
        c.name_ar AS country_name_ar,
        b.created_at,
        b.updated_at
      FROM banks b
      LEFT JOIN countries c ON c.id = b.country_id AND c.deleted_at IS NULL
      WHERE b.deleted_at IS NULL`;

      const params: any[] = [];
      let idx = 0;

      if (search) {
        idx++;
        query += ` AND (b.code ILIKE $${idx} OR b.name ILIKE $${idx} OR b.name_ar ILIKE $${idx} OR b.swift_code ILIKE $${idx})`;
        params.push(`%${String(search)}%`);
      }

      if (is_active !== undefined) {
        idx++;
        query += ` AND b.is_active = $${idx}`;
        params.push(is_active === 'true');
      }

      if (country_id !== undefined) {
        const cid = Number(country_id);
        if (Number.isFinite(cid) && cid > 0) {
          idx++;
          query += ` AND b.country_id = $${idx}`;
          params.push(cid);
        }
      }

      query += ` ORDER BY b.is_active DESC, b.name ASC`;

      const result = await pool.query(query, params);
      return res.json({ success: true, data: result.rows.map(mapRow), total: result.rowCount });
    } catch (error) {
      console.error('Error fetching banks:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch banks' });
    }
  }
);

// =============================================
// POST /api/banks
// =============================================
router.post(
  '/',
  requireAnyPermission([
    'master:banks:create',
    'master:create',
    // tolerate older namespaces
    'master:finance:create',
  ]),
  async (req: any, res: Response) => {
    try {
      const userId = req.user?.id as number | undefined;
      const { code, name, name_ar, swift_code, country_id, is_active = true } = req.body || {};

      if (!code || !String(code).trim()) {
        return res.status(400).json({ success: false, error: 'code is required' });
      }
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }

      const bankCode = String(code).trim().toUpperCase();
      const exists = await pool.query(
        `SELECT 1 FROM banks WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
        [bankCode]
      );
      if (exists.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Bank code already exists' });
      }

      const inserted = await pool.query(
        `INSERT INTO banks (country_id, code, swift_code, name, name_ar, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         RETURNING *`,
        [
          country_id ? Number(country_id) : null,
          bankCode,
          swift_code ? String(swift_code).trim().toUpperCase() : null,
          String(name).trim(),
          name_ar ? String(name_ar).trim() : null,
          Boolean(is_active),
          userId ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (error: any) {
      console.error('Error creating bank:', error);
      if (String(error?.code) === '23503') {
        return res.status(400).json({ success: false, error: 'Invalid country_id' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create bank' });
    }
  }
);

// =============================================
// PUT /api/banks/:id
// =============================================
router.put(
  '/:id',
  requireAnyPermission([
    'master:banks:edit',
    'master:edit',
    // tolerate older namespaces
    'master:finance:update',
  ]),
  async (req: any, res: Response) => {
    try {
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const { name, name_ar, swift_code, country_id, is_active } = req.body || {};

      const existing = await pool.query(`SELECT 1 FROM banks WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Bank not found' });
      }

      const updated = await pool.query(
        `UPDATE banks
         SET
           name = COALESCE($1, name),
           name_ar = COALESCE($2, name_ar),
           swift_code = COALESCE($3, swift_code),
           country_id = COALESCE($4, country_id),
           is_active = COALESCE($5, is_active),
           updated_by = $6,
           updated_at = NOW()
         WHERE id = $7 AND deleted_at IS NULL
         RETURNING *`,
        [
          name !== undefined ? String(name).trim() : null,
          name_ar !== undefined ? (name_ar ? String(name_ar).trim() : null) : null,
          swift_code !== undefined ? (swift_code ? String(swift_code).trim().toUpperCase() : null) : null,
          country_id !== undefined ? (country_id ? Number(country_id) : null) : null,
          is_active !== undefined ? Boolean(is_active) : null,
          userId ?? null,
          id,
        ]
      );

      return res.json({ success: true, data: updated.rows[0] });
    } catch (error: any) {
      console.error('Error updating bank:', error);
      if (String(error?.code) === '23503') {
        return res.status(400).json({ success: false, error: 'Invalid country_id' });
      }
      return res.status(500).json({ success: false, error: 'Failed to update bank' });
    }
  }
);

// =============================================
// DELETE /api/banks/:id (soft delete)
// =============================================
router.delete(
  '/:id',
  requireAnyPermission([
    'master:banks:delete',
    'master:delete',
    // tolerate older namespaces
    'master:finance:delete',
  ]),
  async (req: any, res: Response) => {
    try {
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const existing = await pool.query(`SELECT 1 FROM banks WHERE id = $1 AND deleted_at IS NULL`, [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Bank not found' });
      }

      const inUse = await pool.query(
        `SELECT 1 FROM bank_accounts WHERE bank_id = $1 AND deleted_at IS NULL LIMIT 1`,
        [id]
      );
      if (inUse.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Bank is in use by bank accounts' });
      }

      await pool.query(
        `UPDATE banks
         SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), updated_by = $2
         WHERE id = $1 AND deleted_at IS NULL`,
        [id, userId ?? null]
      );

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting bank:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete bank' });
    }
  }
);

export default router;
