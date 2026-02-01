import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const schema = z.object({
  name: z.string().min(1).max(150),
  rule_type: z.string().min(1).max(50),
  severity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  threshold_value: z.number().optional().nullable(),
  threshold_unit: z.string().max(20).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

/**
 * @route   GET /api/shipment-alert-rules
 * @desc    List shipment alert rules
 * @access  Private (logistics:shipment_alert_rules:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_alert_rules:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const search = (req.query.search as string | undefined)?.trim();

      const where: string[] = ['deleted_at IS NULL', 'company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 2;

      if (search) {
        where.push(`(
          name ILIKE $${paramCount}
          OR rule_type ILIKE $${paramCount}
          OR severity ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM shipment_alert_rules ${whereSql}`,
        params
      );
      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT id, company_id, name, rule_type, severity, threshold_value, threshold_unit, is_active, created_at, updated_at
         FROM shipment_alert_rules
         ${whereSql}
         ORDER BY updated_at DESC, id DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      return res.json({
        success: true,
        data: listResult.rows,
        total: totalItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
        },
      });
    } catch (error) {
      console.error('Error fetching shipment alert rules:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to fetch shipment alert rules' } });
    }
  }
);

/**
 * @route   POST /api/shipment-alert-rules
 * @desc    Create shipment alert rule
 * @access  Private (logistics:shipment_alert_rules:manage)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_alert_rules:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = schema.parse(req.body);

      const result = await pool.query(
        `INSERT INTO shipment_alert_rules (
          company_id, name, rule_type, severity, threshold_value, threshold_unit, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, company_id, name, rule_type, severity, threshold_value, threshold_unit, is_active, created_at, updated_at`,
        [
          companyId,
          payload.name.trim(),
          payload.rule_type.trim(),
          payload.severity,
          payload.threshold_value ?? null,
          payload.threshold_unit ?? null,
          payload.is_active ?? true,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating shipment alert rule:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to create shipment alert rule' } });
    }
  }
);

/**
 * @route   PUT /api/shipment-alert-rules/:id
 * @desc    Update shipment alert rule
 * @access  Private (logistics:shipment_alert_rules:manage)
 */
router.put(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_alert_rules:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_alert_rules', id);
      const payload = schema.partial().parse(req.body);

      const result = await pool.query(
        `UPDATE shipment_alert_rules
         SET
           name = COALESCE($1, name),
           rule_type = COALESCE($2, rule_type),
           severity = COALESCE($3, severity),
           threshold_value = COALESCE($4, threshold_value),
           threshold_unit = COALESCE($5, threshold_unit),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND company_id = $8 AND deleted_at IS NULL
         RETURNING id, company_id, name, rule_type, severity, threshold_value, threshold_unit, is_active, created_at, updated_at`,
        [
          payload.name !== undefined ? payload.name.trim() : null,
          payload.rule_type !== undefined ? payload.rule_type.trim() : null,
          payload.severity ?? null,
          payload.threshold_value !== undefined ? payload.threshold_value : null,
          payload.threshold_unit !== undefined ? payload.threshold_unit : null,
          payload.is_active !== undefined ? payload.is_active : null,
          id,
          companyId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment alert rule not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating shipment alert rule:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to update shipment alert rule' } });
    }
  }
);

/**
 * @route   DELETE /api/shipment-alert-rules/:id
 * @desc    Soft delete shipment alert rule
 * @access  Private (logistics:shipment_alert_rules:manage)
 */
router.delete(
  '/:id',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:shipment_alert_rules:manage'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid id' } });
      }

      await captureBeforeState(req as any, 'shipment_alert_rules', id);

      const result = await pool.query(
        `UPDATE shipment_alert_rules
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Shipment alert rule not found' } });
      }

      return res.json({ success: true, data: { id } });
    } catch (error) {
      console.error('Error deleting shipment alert rule:', error);
      return res.status(500).json({ success: false, error: { message: 'Failed to delete shipment alert rule' } });
    }
  }
);

export default router;
