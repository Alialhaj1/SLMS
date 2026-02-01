import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

const ALLOWED_CATEGORIES = new Set(['main', 'sub', 'external', 'transit', 'quarantine']);

router.use(authenticate);
router.use(loadCompanyContext);

router.get('/', requirePermission('master:warehouses:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, warehouse_category, is_active } = req.query as any;

    const params: any[] = [companyId];
    let paramCount = 1;

    let sql = `
      SELECT
        wt.id,
        wt.code,
        wt.name,
        wt.name_ar,
        wt.warehouse_category,
        wt.parent_id,
        parent.name AS parent_name,
        wt.gl_account_id,
        a.code AS gl_account_code,
        a.name AS gl_account_name,
        a.name_ar AS gl_account_name_ar,
        wt.allows_sales,
        wt.allows_purchases,
        wt.allows_transfers,
        wt.is_default,
        wt.is_active,
        wt.description,
        wt.created_at,
        wt.updated_at,
        wt.deleted_at
      FROM warehouse_types wt
      LEFT JOIN warehouse_types parent ON parent.id = wt.parent_id
      LEFT JOIN accounts a ON a.id = wt.gl_account_id AND a.deleted_at IS NULL
      WHERE wt.company_id = $1 AND wt.deleted_at IS NULL
    `;

    if (search) {
      paramCount++;
      sql += ` AND (wt.code ILIKE $${paramCount} OR wt.name ILIKE $${paramCount} OR COALESCE(wt.name_ar,'') ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (warehouse_category) {
      paramCount++;
      sql += ` AND wt.warehouse_category = $${paramCount}`;
      params.push(String(warehouse_category));
    }

    if (typeof is_active === 'string') {
      paramCount++;
      sql += ` AND wt.is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    sql += ' ORDER BY wt.code';

    const result = await pool.query(sql, params);
    return res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    console.error('Error fetching warehouse types:', error);
    return res
      .status(500)
      .json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch warehouse types' } });
  }
});

router.post('/', requirePermission('master:warehouses:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id ?? null;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const {
      code,
      name,
      name_ar,
      warehouse_category,
      parent_id,
      gl_account_id,
      allows_sales,
      allows_purchases,
      allows_transfers,
      is_default,
      is_active,
      description,
    } = req.body ?? {};

    if (!code || !name || !warehouse_category) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'code, name and warehouse_category are required' } });
    }

    if (!ALLOWED_CATEGORIES.has(String(warehouse_category))) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid warehouse_category' } });
    }

    if (parent_id) {
      const parent = await client.query(
        'SELECT id FROM warehouse_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [parent_id, companyId]
      );
      if (parent.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: { code: 'PARENT_NOT_FOUND', message: 'Parent warehouse type not found' } });
      }
    }

    if (gl_account_id) {
      const gl = await client.query(
        'SELECT id FROM accounts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [gl_account_id, companyId]
      );
      if (gl.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: { code: 'GL_ACCOUNT_NOT_FOUND', message: 'GL account not found' } });
      }
    }

    await client.query('BEGIN');

    if (is_default === true) {
      await client.query(
        'UPDATE warehouse_types SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE company_id = $1 AND deleted_at IS NULL',
        [companyId, userId]
      );
    }

    const insert = await client.query(
      `INSERT INTO warehouse_types (
        company_id,
        code,
        name,
        name_ar,
        warehouse_category,
        parent_id,
        gl_account_id,
        allows_sales,
        allows_purchases,
        allows_transfers,
        is_default,
        is_active,
        description,
        created_by,
        updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
      RETURNING id, code, name, name_ar, warehouse_category, parent_id, gl_account_id, allows_sales, allows_purchases, allows_transfers, is_default, is_active, description, created_at, updated_at`,
      [
        companyId,
        String(code).toUpperCase(),
        name,
        name_ar || null,
        String(warehouse_category),
        parent_id || null,
        gl_account_id || null,
        allows_sales !== undefined ? !!allows_sales : true,
        allows_purchases !== undefined ? !!allows_purchases : true,
        allows_transfers !== undefined ? !!allows_transfers : true,
        !!is_default,
        is_active !== undefined ? !!is_active : true,
        description || null,
        userId,
      ]
    );

    await client.query('COMMIT');

    const row = insert.rows[0];
    const parentName = parent_id
      ? (
          await client.query('SELECT name FROM warehouse_types WHERE id = $1', [parent_id])
        ).rows[0]?.name ?? null
      : null;

    return res.status(201).json({ success: true, data: { ...row, parent_name: parentName }, message: 'Warehouse type created successfully' });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }

    if (error?.code === '23505') {
      return res
        .status(409)
        .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Warehouse type code already exists' } });
    }

    console.error('Error creating warehouse type:', error);
    return res
      .status(500)
      .json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create warehouse type' } });
  } finally {
    client.release();
  }
});

router.put('/:id', requirePermission('master:warehouses:edit'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id ?? null;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { id } = req.params;
    const existing = await client.query(
      'SELECT * FROM warehouse_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse type not found' } });
    }

    const {
      code,
      name,
      name_ar,
      warehouse_category,
      parent_id,
      gl_account_id,
      allows_sales,
      allows_purchases,
      allows_transfers,
      is_default,
      is_active,
      description,
    } = req.body ?? {};

    if (warehouse_category !== undefined && !ALLOWED_CATEGORIES.has(String(warehouse_category))) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid warehouse_category' } });
    }

    if (parent_id !== undefined && parent_id) {
      if (Number(parent_id) === Number(id)) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'parent_id cannot equal id' } });
      }
      const parent = await client.query(
        'SELECT id FROM warehouse_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [parent_id, companyId]
      );
      if (parent.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: { code: 'PARENT_NOT_FOUND', message: 'Parent warehouse type not found' } });
      }
    }

    if (gl_account_id !== undefined && gl_account_id) {
      const gl = await client.query(
        'SELECT id FROM accounts WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [gl_account_id, companyId]
      );
      if (gl.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: { code: 'GL_ACCOUNT_NOT_FOUND', message: 'GL account not found' } });
      }
    }

    await client.query('BEGIN');

    if (is_default === true) {
      await client.query(
        'UPDATE warehouse_types SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE company_id = $1 AND deleted_at IS NULL',
        [companyId, userId]
      );
    }

    const updated = await client.query(
      `UPDATE warehouse_types
       SET
         code = COALESCE($1, code),
         name = COALESCE($2, name),
         name_ar = COALESCE($3, name_ar),
         warehouse_category = COALESCE($4, warehouse_category),
         parent_id = COALESCE($5, parent_id),
         gl_account_id = COALESCE($6, gl_account_id),
         allows_sales = COALESCE($7, allows_sales),
         allows_purchases = COALESCE($8, allows_purchases),
         allows_transfers = COALESCE($9, allows_transfers),
         is_default = COALESCE($10, is_default),
         is_active = COALESCE($11, is_active),
         description = COALESCE($12, description),
         updated_by = $13,
         updated_at = CURRENT_TIMESTAMP
      WHERE id = $14 AND company_id = $15 AND deleted_at IS NULL
      RETURNING id, code, name, name_ar, warehouse_category, parent_id, gl_account_id, allows_sales, allows_purchases, allows_transfers, is_default, is_active, description, created_at, updated_at`,
      [
        code !== undefined ? String(code).toUpperCase() : null,
        name ?? null,
        name_ar ?? null,
        warehouse_category ?? null,
        parent_id !== undefined ? parent_id || null : null,
        gl_account_id !== undefined ? gl_account_id || null : null,
        allows_sales !== undefined ? !!allows_sales : null,
        allows_purchases !== undefined ? !!allows_purchases : null,
        allows_transfers !== undefined ? !!allows_transfers : null,
        is_default !== undefined ? !!is_default : null,
        typeof is_active === 'boolean' ? is_active : null,
        description !== undefined ? description || null : null,
        userId,
        id,
        companyId,
      ]
    );

    await client.query('COMMIT');

    const row = updated.rows[0];
    const parentName = row.parent_id
      ? (await client.query('SELECT name FROM warehouse_types WHERE id = $1', [row.parent_id])).rows[0]?.name ?? null
      : null;

    return res.json({ success: true, data: { ...row, parent_name: parentName }, message: 'Warehouse type updated successfully' });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }

    if (error?.code === '23505') {
      return res
        .status(409)
        .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Warehouse type code already exists' } });
    }

    console.error('Error updating warehouse type:', error);
    return res
      .status(500)
      .json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update warehouse type' } });
  } finally {
    client.release();
  }
});

router.delete('/:id', requirePermission('master:warehouses:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id ?? null;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id FROM warehouse_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse type not found' } });
    }

    await pool.query(
      `UPDATE warehouse_types
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = $3
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId, userId]
    );

    return res.json({ success: true, message: 'Warehouse type deleted successfully' });
  } catch (error) {
    console.error('Error deleting warehouse type:', error);
    return res
      .status(500)
      .json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete warehouse type' } });
  }
});

export default router;
