/**
 * CUSTOMER CLASSIFICATIONS API
 * Route: /api/customer-classifications
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requireAnyPermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

const CLASSIFICATION_TYPES = ['size', 'industry', 'region', 'priority', 'custom'] as const;

type ClassificationType = (typeof CLASSIFICATION_TYPES)[number];

function isValidClassificationType(value: any): value is ClassificationType {
  return typeof value === 'string' && (CLASSIFICATION_TYPES as readonly string[]).includes(value);
}

router.get(
  '/',
  requireAnyPermission([
    'master:customer_classifications:view',
    'customer_classifications:view',
    // temporary compatibility: existing roles may only have customers permissions
    'master:customers:view',
  ]),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { search, classification_type, is_active } = req.query as {
        search?: string;
        classification_type?: string;
        is_active?: string;
      };

      let query = `
        SELECT
          cc.*, 
          p.name AS parent_name,
          0::INTEGER AS customer_count
        FROM customer_classifications cc
        LEFT JOIN customer_classifications p
          ON p.id = cc.parent_id
          AND p.company_id = cc.company_id
          AND p.deleted_at IS NULL
        WHERE cc.company_id = $1
          AND cc.deleted_at IS NULL
      `;

      const params: any[] = [companyId];
      let paramIndex = 1;

      if (search) {
        paramIndex++;
        query += ` AND (cc.code ILIKE $${paramIndex} OR cc.name ILIKE $${paramIndex} OR cc.name_ar ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
      }

      if (classification_type) {
        paramIndex++;
        query += ` AND cc.classification_type = $${paramIndex}`;
        params.push(classification_type);
      }

      if (is_active !== undefined) {
        paramIndex++;
        query += ` AND cc.is_active = $${paramIndex}`;
        params.push(is_active === 'true');
      }

      query += ` ORDER BY cc.classification_type, cc.code`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      console.error('Error fetching customer classifications:', error);
      res.status(500).json({ error: 'Failed to fetch customer classifications' });
    }
  }
);

router.get(
  '/:id',
  requireAnyPermission([
    'master:customer_classifications:view',
    'customer_classifications:view',
    'master:customers:view',
  ]),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const { id } = req.params;
      const result = await pool.query(
        `
        SELECT
          cc.*, 
          p.name AS parent_name,
          0::INTEGER AS customer_count
        FROM customer_classifications cc
        LEFT JOIN customer_classifications p
          ON p.id = cc.parent_id
          AND p.company_id = cc.company_id
          AND p.deleted_at IS NULL
        WHERE cc.company_id = $1
          AND cc.id = $2
          AND cc.deleted_at IS NULL
        `,
        [companyId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Customer classification not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error fetching customer classification:', error);
      res.status(500).json({ error: 'Failed to fetch customer classification' });
    }
  }
);

router.post(
  '/',
  requireAnyPermission([
    'master:customer_classifications:manage',
    'master:customer_classifications:create',
    'customer_classifications:manage',
    'customer_classifications:create',
    // temporary compatibility
    'master:customers:create',
  ]),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const userId = req.user?.id ?? null;

      const {
        code,
        name,
        name_ar,
        classification_type,
        parent_id,
        credit_limit_default,
        payment_terms_default,
        discount_percentage,
        color,
        is_active,
        description,
      } = req.body;

      const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const normalizedName = typeof name === 'string' ? name.trim() : '';

      if (!normalizedCode || !normalizedName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!isValidClassificationType(classification_type)) {
        return res.status(400).json({ error: 'Invalid classification_type' });
      }

      const parentIdValue = typeof parent_id === 'number' && parent_id > 0 ? parent_id : null;
      if (parentIdValue) {
        const parentCheck = await pool.query(
          `SELECT id FROM customer_classifications WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL`,
          [companyId, parentIdValue]
        );
        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid parent_id' });
        }
      }

      const dupCheck = await pool.query(
        `SELECT id FROM customer_classifications WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL`,
        [companyId, normalizedCode]
      );

      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Classification code already exists' });
      }

      const result = await pool.query(
        `
        INSERT INTO customer_classifications (
          company_id,
          code,
          name,
          name_ar,
          classification_type,
          parent_id,
          credit_limit_default,
          payment_terms_default,
          discount_percentage,
          color,
          is_active,
          description,
          created_by,
          updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING *
        `,
        [
          companyId,
          normalizedCode,
          normalizedName,
          typeof name_ar === 'string' && name_ar.trim() ? name_ar.trim() : null,
          classification_type,
          parentIdValue,
          typeof credit_limit_default === 'number' ? credit_limit_default : 0,
          typeof payment_terms_default === 'number' ? payment_terms_default : 30,
          typeof discount_percentage === 'number' ? discount_percentage : 0,
          typeof color === 'string' && color.trim() ? color.trim() : 'blue',
          typeof is_active === 'boolean' ? is_active : true,
          typeof description === 'string' && description.trim() ? description.trim() : null,
          userId,
          userId,
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Customer classification created successfully' });
    } catch (error: any) {
      console.error('Error creating customer classification:', error);
      res.status(500).json({ error: 'Failed to create customer classification' });
    }
  }
);

router.put(
  '/:id',
  requireAnyPermission([
    'master:customer_classifications:manage',
    'master:customer_classifications:edit',
    'customer_classifications:manage',
    'customer_classifications:edit',
    // temporary compatibility
    'master:customers:edit',
  ]),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const userId = req.user?.id ?? null;
      const { id } = req.params;

      const existing = await pool.query(
        `SELECT * FROM customer_classifications WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [companyId, id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Customer classification not found' });
      }

      const body = req.body ?? {};

      if (Object.prototype.hasOwnProperty.call(body, 'classification_type')) {
        if (body.classification_type !== null && body.classification_type !== undefined && !isValidClassificationType(body.classification_type)) {
          return res.status(400).json({ error: 'Invalid classification_type' });
        }
      }

      const setClauses: string[] = [];
      const params: any[] = [];
      let idx = 0;

      if (Object.prototype.hasOwnProperty.call(body, 'code')) {
        const normalizedCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
        if (!normalizedCode) {
          return res.status(400).json({ error: 'code is required' });
        }

        const dupCheck = await pool.query(
          `SELECT id FROM customer_classifications WHERE company_id = $1 AND code = $2 AND id <> $3 AND deleted_at IS NULL`,
          [companyId, normalizedCode, id]
        );
        if (dupCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Classification code already exists' });
        }

        idx++;
        setClauses.push(`code = $${idx}`);
        params.push(normalizedCode);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        const normalizedName = typeof body.name === 'string' ? body.name.trim() : '';
        if (!normalizedName) {
          return res.status(400).json({ error: 'name is required' });
        }
        idx++;
        setClauses.push(`name = $${idx}`);
        params.push(normalizedName);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'name_ar')) {
        idx++;
        setClauses.push(`name_ar = $${idx}`);
        params.push(typeof body.name_ar === 'string' && body.name_ar.trim() ? body.name_ar.trim() : null);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'classification_type')) {
        idx++;
        setClauses.push(`classification_type = $${idx}`);
        params.push(body.classification_type);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'parent_id')) {
        const parentIdValue = typeof body.parent_id === 'number' && body.parent_id > 0 ? body.parent_id : null;
        if (parentIdValue !== null) {
          if (parentIdValue === Number(id)) {
            return res.status(400).json({ error: 'parent_id cannot reference itself' });
          }
          const parentCheck = await pool.query(
            `SELECT id FROM customer_classifications WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL`,
            [companyId, parentIdValue]
          );
          if (parentCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid parent_id' });
          }
        }

        idx++;
        setClauses.push(`parent_id = $${idx}`);
        params.push(parentIdValue);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'credit_limit_default')) {
        if (body.credit_limit_default !== null && body.credit_limit_default !== undefined && typeof body.credit_limit_default !== 'number') {
          return res.status(400).json({ error: 'credit_limit_default must be a number' });
        }
        idx++;
        setClauses.push(`credit_limit_default = $${idx}`);
        params.push(body.credit_limit_default);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'payment_terms_default')) {
        if (body.payment_terms_default !== null && body.payment_terms_default !== undefined && typeof body.payment_terms_default !== 'number') {
          return res.status(400).json({ error: 'payment_terms_default must be a number' });
        }
        idx++;
        setClauses.push(`payment_terms_default = $${idx}`);
        params.push(body.payment_terms_default);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'discount_percentage')) {
        if (body.discount_percentage !== null && body.discount_percentage !== undefined && typeof body.discount_percentage !== 'number') {
          return res.status(400).json({ error: 'discount_percentage must be a number' });
        }
        idx++;
        setClauses.push(`discount_percentage = $${idx}`);
        params.push(body.discount_percentage);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'color')) {
        idx++;
        setClauses.push(`color = $${idx}`);
        params.push(typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
        if (body.is_active !== null && body.is_active !== undefined && typeof body.is_active !== 'boolean') {
          return res.status(400).json({ error: 'is_active must be a boolean' });
        }
        idx++;
        setClauses.push(`is_active = $${idx}`);
        params.push(body.is_active);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        idx++;
        setClauses.push(`description = $${idx}`);
        params.push(typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null);
      }

      idx++;
      setClauses.push(`updated_by = $${idx}`);
      params.push(userId);

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      if (setClauses.length <= 2) {
        return res.status(400).json({ error: 'No updatable fields provided' });
      }

      idx++;
      const companyParam = idx;
      params.push(companyId);
      idx++;
      const idParam = idx;
      params.push(id);

      const updated = await pool.query(
        `
        UPDATE customer_classifications
        SET ${setClauses.join(', ')}
        WHERE company_id = $${companyParam} AND id = $${idParam} AND deleted_at IS NULL
        RETURNING *
        `,
        params
      );

      res.json({ success: true, data: updated.rows[0], message: 'Customer classification updated successfully' });
    } catch (error: any) {
      console.error('Error updating customer classification:', error);
      res.status(500).json({ error: 'Failed to update customer classification' });
    }
  }
);

router.delete(
  '/:id',
  requireAnyPermission([
    'master:customer_classifications:manage',
    'master:customer_classifications:delete',
    'customer_classifications:manage',
    'customer_classifications:delete',
    // temporary compatibility
    'master:customers:delete',
  ]),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const userId = req.user?.id ?? null;
      const { id } = req.params;

      const existing = await pool.query(
        `SELECT id FROM customer_classifications WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [companyId, id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Customer classification not found' });
      }

      await pool.query(
        `
        UPDATE customer_classifications
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $2 AND id = $3 AND deleted_at IS NULL
        `,
        [userId, companyId, id]
      );

      res.json({ success: true, message: 'Customer classification deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting customer classification:', error);
      res.status(500).json({ error: 'Failed to delete customer classification' });
    }
  }
);

export default router;
