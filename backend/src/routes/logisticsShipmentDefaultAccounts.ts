import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { z } from 'zod';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '50'), 10) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const upsertSchema = z.object({
  cost_type_code: z.string().min(1).max(30),
  debit_account_id: z.number().int().positive(),
  credit_account_id: z.number().int().positive(),
  is_active: z.boolean().optional().default(true),
});

/**
 * @route   GET /api/logistics-shipment-default-accounts
 * @access  Private (logistics:shipment_accounting_bridge:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_accounting_bridge:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const search = (req.query.search as string | undefined)?.trim();

      const where: string[] = ['d.deleted_at IS NULL', 'd.company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (search) {
        where.push(`d.cost_type_code ILIKE $${paramCount}`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      const count = await pool.query(
        `SELECT COUNT(*)::int AS total FROM logistics_shipment_cost_default_accounts d ${whereSql}`,
        params
      );
      const totalItems = count.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const list = await pool.query(
        `SELECT
           d.id,
           d.company_id,
           d.cost_type_code,
           d.debit_account_id,
           d.credit_account_id,
           d.is_active,
           a1.code AS debit_account_code,
           a1.name AS debit_account_name,
           a2.code AS credit_account_code,
           a2.name AS credit_account_name,
           d.created_at,
           d.updated_at
         FROM logistics_shipment_cost_default_accounts d
         LEFT JOIN accounts a1 ON a1.id = d.debit_account_id
         LEFT JOIN accounts a2 ON a2.id = d.credit_account_id
         ${whereSql}
         ORDER BY d.cost_type_code ASC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      return res.json({
        success: true,
        data: list.rows,
        total: totalItems,
        pagination: { currentPage: page, totalPages, totalItems, pageSize: limit },
      });
    } catch (error) {
      console.error('Error fetching shipment default accounts:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch default accounts' } });
    }
  }
);

/**
 * @route   POST /api/logistics-shipment-default-accounts
 * @desc    Upsert default accounts for a cost type
 * @access  Private (logistics:shipment_accounting_bridge:manage)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_accounting_bridge:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const companyId = req.companyId;
      const payload = upsertSchema.parse(req.body);
      const userId = (req as any).user?.id ?? null;

      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id
         FROM logistics_shipment_cost_default_accounts
         WHERE company_id = $1 AND cost_type_code = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [companyId, payload.cost_type_code.trim().toUpperCase()]
      );

      if (existing.rows.length > 0) {
        const id = existing.rows[0].id;
        await captureBeforeState(req as any, 'logistics_shipment_cost_default_accounts', id);

        const updated = await client.query(
          `UPDATE logistics_shipment_cost_default_accounts
           SET debit_account_id = $1,
               credit_account_id = $2,
               is_active = $3,
               updated_by = $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 AND company_id = $6
           RETURNING id, company_id, cost_type_code, debit_account_id, credit_account_id, is_active, created_at, updated_at`,
          [payload.debit_account_id, payload.credit_account_id, payload.is_active ?? true, userId, id, companyId]
        );

        await client.query('COMMIT');

        (req as any).auditContext = {
          ...(req as any).auditContext,
          action: 'update',
          resource: 'logistics_shipment_cost_default_accounts',
          resourceId: id,
          after: updated.rows[0],
        };

        return res.json({ success: true, data: updated.rows[0] });
      }

      const inserted = await client.query(
        `INSERT INTO logistics_shipment_cost_default_accounts (
          company_id, cost_type_code, debit_account_id, credit_account_id, is_active, created_by, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$6)
        RETURNING id, company_id, cost_type_code, debit_account_id, credit_account_id, is_active, created_at, updated_at`,
        [
          companyId,
          payload.cost_type_code.trim().toUpperCase(),
          payload.debit_account_id,
          payload.credit_account_id,
          payload.is_active ?? true,
          userId,
        ]
      );

      await client.query('COMMIT');

      (req as any).auditContext = {
        action: 'create',
        resource: 'logistics_shipment_cost_default_accounts',
        resourceId: inserted.rows[0].id,
        after: inserted.rows[0],
      };

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (error: any) {
      await client.query('ROLLBACK');

      if (error?.name === 'ZodError') {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', details: error.errors } });
      }

      console.error('Error upserting shipment default accounts:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to save default accounts' } });
    } finally {
      client.release();
    }
  }
);

export default router;
