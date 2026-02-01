/**
 * WAREHOUSES API
 * Middlewares: ✅ Auth, ✅ Company Context, ✅ RBAC, ✅ Audit
 * Soft Delete: ✅ deleted_at
 */

import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

router.get(
  '/',
  requirePermission('master:warehouses:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const { search, is_active, warehouse_type, warehouse_type_id } = req.query;

      let query = `
        SELECT
          w.id,
          w.code,
          w.name,
          w.name_ar,
          w.warehouse_type,
          w.warehouse_type_id,
          w.cost_center_id,
          wt.code AS warehouse_type_code,
          wt.name AS warehouse_type_name,
          wt.name_ar AS warehouse_type_name_ar,
          wt.warehouse_category AS warehouse_type_category,
          cc.code AS cost_center_code,
          cc.name AS cost_center_name,
          cc.name_ar AS cost_center_name_ar,
          w.address AS location,
          NULL::text AS city,
          NULL::text AS country,
          w.city_id,
          w.country_id,
          w.manager_name,
          w.phone AS manager_phone,
          w.email,
          NULL::numeric AS capacity,
          w.is_active,
          w.created_at,
          w.updated_at,
          w.deleted_at
        FROM warehouses w
        LEFT JOIN warehouse_types wt
          ON wt.id = w.warehouse_type_id
          AND wt.company_id = w.company_id
          AND wt.deleted_at IS NULL
        LEFT JOIN cost_centers cc
          ON cc.id = w.cost_center_id
          AND cc.company_id = w.company_id
          AND cc.deleted_at IS NULL
        WHERE w.company_id = $1 AND w.deleted_at IS NULL
      `;
      const params: any[] = [companyId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        query += ` AND (w.name ILIKE $${paramCount} OR w.code ILIKE $${paramCount} OR w.address ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (is_active !== undefined) {
        paramCount++;
        query += ` AND is_active = $${paramCount}`;
        params.push(is_active === 'true');
      }

      if (warehouse_type) {
        paramCount++;
        query += ` AND warehouse_type = $${paramCount}`;
        params.push(warehouse_type);
      }

      if (warehouse_type_id) {
        const parsedTypeId = Number(warehouse_type_id);
        if (!Number.isFinite(parsedTypeId) || parsedTypeId <= 0) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid warehouse_type_id' } });
        }
        paramCount++;
        query += ` AND w.warehouse_type_id = $${paramCount}`;
        params.push(parsedTypeId);
      }

      query += ` ORDER BY code`;

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows, total: result.rowCount });
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch warehouses' } });
    }
  }
);

router.post(
  '/',
  requirePermission('master:warehouses:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }
      const {
        code,
        name,
        name_ar,
        warehouse_type,
        warehouse_type_id,
        cost_center_id,
        location,
        city_id,
        country_id,
        manager_name,
        manager_phone,
        email,
        is_active = true,
      } = req.body;

      if (!code || !name) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
      }

      const duplicateCheck = await pool.query(
        'SELECT id FROM warehouses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, code]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Warehouse code already exists' } });
      }

      let resolvedWarehouseTypeId: number | null = null;
      let resolvedWarehouseTypeLegacy: string | null = warehouse_type || null;

      if (warehouse_type_id !== undefined && warehouse_type_id !== null && warehouse_type_id !== '') {
        const parsedTypeId = Number(warehouse_type_id);
        if (!Number.isFinite(parsedTypeId) || parsedTypeId <= 0) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid warehouse_type_id' } });
        }
        const typeRow = await pool.query(
          `SELECT id, warehouse_category FROM warehouse_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
          [parsedTypeId, companyId]
        );
        if (typeRow.rowCount === 0) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Warehouse type not found' } });
        }
        resolvedWarehouseTypeId = parsedTypeId;
        resolvedWarehouseTypeLegacy = typeRow.rows[0].warehouse_category;
      } else {
        // Default to company default warehouse type if exists
        const defaultType = await pool.query(
          `SELECT id, warehouse_category FROM warehouse_types WHERE company_id = $1 AND is_default = TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1`,
          [companyId]
        );
        if (defaultType.rowCount > 0) {
          resolvedWarehouseTypeId = defaultType.rows[0].id;
          resolvedWarehouseTypeLegacy = defaultType.rows[0].warehouse_category;
        }
      }

      let resolvedCostCenterId: number | null = null;
      if (cost_center_id !== undefined) {
        if (cost_center_id === null || cost_center_id === '') {
          resolvedCostCenterId = null;
        } else {
          const parsedCostCenterId = Number(cost_center_id);
          if (!Number.isFinite(parsedCostCenterId) || parsedCostCenterId <= 0) {
            return res
              .status(400)
              .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid cost_center_id' } });
          }
          const ccRow = await pool.query(
            `SELECT id FROM cost_centers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
            [parsedCostCenterId, companyId]
          );
          if (ccRow.rowCount === 0) {
            return res
              .status(400)
              .json({ success: false, error: { code: 'INVALID_COST_CENTER', message: 'Cost center not found' } });
          }
          resolvedCostCenterId = parsedCostCenterId;
        }
      }

      const result = await pool.query(
        `INSERT INTO warehouses (
          company_id,
          code,
          name,
          name_ar,
          warehouse_type,
          warehouse_type_id,
          cost_center_id,
          address,
          city_id,
          country_id,
          manager_name,
          phone,
          email,
          is_active,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        RETURNING id, code, name, name_ar, warehouse_type, warehouse_type_id, cost_center_id, address AS location, city_id, country_id, manager_name, phone AS manager_phone, email, is_active, created_at, updated_at, deleted_at`,
        [
          companyId,
          code.toUpperCase(),
          name,
          name_ar || null,
          resolvedWarehouseTypeLegacy || 'storage',
          resolvedWarehouseTypeId,
          resolvedCostCenterId,
          location || null,
          city_id || null,
          country_id || null,
          manager_name || null,
          manager_phone || null,
          email || null,
          is_active,
          userId,
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Warehouse created successfully' });
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create warehouse' } });
    }
  }
);

router.put(
  '/:id',
  requirePermission('master:warehouses:edit'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const existingWarehouse = await pool.query(
        'SELECT * FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingWarehouse.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse not found' } });
      }

      const {
        code,
        name,
        name_ar,
        warehouse_type,
        warehouse_type_id,
        cost_center_id,
        location,
        city_id,
        country_id,
        manager_name,
        manager_phone,
        email,
        is_active,
      } = req.body;

      const warehouseTypeIdProvided = Object.prototype.hasOwnProperty.call(req.body, 'warehouse_type_id');
      const costCenterIdProvided = Object.prototype.hasOwnProperty.call(req.body, 'cost_center_id');

      let resolvedWarehouseTypeId: number | null = null;
      let resolvedWarehouseTypeLegacy: string | null = null;
      if (warehouseTypeIdProvided) {
        if (warehouse_type_id === null || warehouse_type_id === '') {
          resolvedWarehouseTypeId = null;
          resolvedWarehouseTypeLegacy = warehouse_type ?? null;
        } else {
          const parsedTypeId = Number(warehouse_type_id);
          if (!Number.isFinite(parsedTypeId) || parsedTypeId <= 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid warehouse_type_id' } });
          }
          const typeRow = await pool.query(
            `SELECT id, warehouse_category FROM warehouse_types WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
            [parsedTypeId, companyId]
          );
          if (typeRow.rowCount === 0) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Warehouse type not found' } });
          }
          resolvedWarehouseTypeId = parsedTypeId;
          resolvedWarehouseTypeLegacy = typeRow.rows[0].warehouse_category;
        }
      }

      let resolvedCostCenterId: number | null = null;
      if (costCenterIdProvided) {
        if (cost_center_id === null || cost_center_id === '') {
          resolvedCostCenterId = null;
        } else {
          const parsedCostCenterId = Number(cost_center_id);
          if (!Number.isFinite(parsedCostCenterId) || parsedCostCenterId <= 0) {
            return res
              .status(400)
              .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid cost_center_id' } });
          }
          const ccRow = await pool.query(
            `SELECT id FROM cost_centers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
            [parsedCostCenterId, companyId]
          );
          if (ccRow.rowCount === 0) {
            return res
              .status(400)
              .json({ success: false, error: { code: 'INVALID_COST_CENTER', message: 'Cost center not found' } });
          }
          resolvedCostCenterId = parsedCostCenterId;
        }
      }

      const result = await pool.query(
        `UPDATE warehouses
         SET
           code = COALESCE($1, code),
           name = COALESCE($2, name),
           name_ar = COALESCE($3, name_ar),
           warehouse_type = COALESCE($4, warehouse_type),
           warehouse_type_id = CASE WHEN $15 THEN $5 ELSE warehouse_type_id END,
           cost_center_id = CASE WHEN $17 THEN $16 ELSE cost_center_id END,
           address = COALESCE($6, address),
           city_id = COALESCE($7, city_id),
           country_id = COALESCE($8, country_id),
           manager_name = COALESCE($9, manager_name),
           phone = COALESCE($10, phone),
           email = COALESCE($11, email),
           is_active = COALESCE($12, is_active),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $13 AND company_id = $14 AND deleted_at IS NULL
         RETURNING id, code, name, name_ar, warehouse_type, warehouse_type_id, cost_center_id, address AS location, city_id, country_id, manager_name, phone AS manager_phone, email, is_active, created_at, updated_at, deleted_at`,
        [
          code ? String(code).toUpperCase() : null,
          name ?? null,
          name_ar ?? null,
          // If warehouse_type_id is provided, we prefer derived category for legacy field.
          resolvedWarehouseTypeLegacy ?? warehouse_type ?? null,
          resolvedWarehouseTypeId,
          location ?? null,
          city_id ?? null,
          country_id ?? null,
          manager_name ?? null,
          manager_phone ?? null,
          email ?? null,
          typeof is_active === 'boolean' ? is_active : null,
          id,
          companyId,
          warehouseTypeIdProvided,
          resolvedCostCenterId,
          costCenterIdProvided,
        ]
      );

      res.json({ success: true, data: result.rows[0], message: 'Warehouse updated successfully' });
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update warehouse' } });
    }
  }
);

router.delete(
  '/:id',
  requirePermission('master:warehouses:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const existingWarehouse = await pool.query(
        'SELECT * FROM warehouses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );

      if (existingWarehouse.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse not found' } });
      }

      const inUse = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM warehouse_locations wl WHERE wl.warehouse_id = $1',
        [id]
      );
      if (inUse.rows[0]?.cnt > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'HAS_LOCATIONS', message: 'Cannot delete warehouse with locations. Delete locations first.' },
        });
      }

      await pool.query(
        `UPDATE warehouses
         SET deleted_at = CURRENT_TIMESTAMP,
             is_deleted = TRUE,
             deleted_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $3`,
        [userId, id, companyId]
      );

      res.json({ success: true, message: 'Warehouse deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete warehouse' } });
    }
  }
);

router.post(
  '/:id/restore',
  requirePermission('master:warehouses:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const result = await pool.query(
        `UPDATE warehouses 
        SET deleted_at = NULL,
            is_deleted = FALSE,
            deleted_by = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NOT NULL
        RETURNING *`,
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse not found or already active' } });
      }

      res.json({ success: true, data: result.rows[0], message: 'Warehouse restored successfully' });
    } catch (error: any) {
      console.error('Error restoring warehouse:', error);
      res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message: 'Failed to restore warehouse' } });
    }
  }
);

export default router;
