import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';

const router = Router();

let hasMeasurementTypeColumn: boolean | null = null;

async function measurementTypeColumnExists(): Promise<boolean> {
  if (hasMeasurementTypeColumn !== null) return hasMeasurementTypeColumn;
  try {
    const result = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'units_of_measure'
         AND column_name = 'measurement_type'
       LIMIT 1`
    );
    hasMeasurementTypeColumn = (result.rowCount || 0) > 0;
  } catch {
    // Be conservative: if we cannot detect schema, assume column is missing.
    hasMeasurementTypeColumn = false;
  }
  return hasMeasurementTypeColumn;
}

router.use(authenticate);
router.use(loadCompanyContext);

// GET /api/unit-types (alias) - List unit types (units of measure)
router.get('/', requirePermission('master:items:view'), async (req: Request, res: Response) => {
  try {
    const companyId =
      (req as any).companyContext?.companyId ??
      (req as any).companyContext?.id ??
      (req as any).companyId;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, unit_category, is_active } = req.query;
    const params: any[] = [companyId];
    let paramIndex = 2;

    const hasMeasurementType = await measurementTypeColumnExists();

    let query = `
      SELECT
        u.id,
        u.code,
        COALESCE(u.name_en, u.name) AS name,
        u.name_ar,
        LOWER(COALESCE(u.unit_type, 'basic')) AS unit_category,
        ${hasMeasurementType ? 'UPPER(COALESCE(u.measurement_type, bu.measurement_type))' : 'NULL'} AS measurement_type,
        ${hasMeasurementType ? 'UPPER(COALESCE(u.measurement_type, bu.measurement_type))' : 'NULL'} AS unit_type_code,
        u.base_unit_id,
        bu.name_en AS base_unit_name,
        u.conversion_factor,
        COALESCE(u.symbol_en, u.symbol_ar) AS symbol,
        u.decimal_places,
        u.is_active,
        u.created_at
      FROM units_of_measure u
      LEFT JOIN units_of_measure bu ON u.base_unit_id = bu.id AND bu.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
        AND (u.company_id = $1 OR u.company_id IS NULL)
    `;

    if (search) {
      query += ` AND (u.code ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR u.name_en ILIKE $${paramIndex} OR u.name_ar ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (unit_category) {
      query += ` AND COALESCE(u.unit_type, 'basic') = $${paramIndex}`;
      params.push(unit_category);
      paramIndex++;
    }

    if (is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ` ORDER BY u.sort_order ASC, u.code ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total: result.rowCount || 0 });
  } catch (error) {
    console.error('Error fetching unit types:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch unit types' } });
  }
});

// POST /api/unit-types - Create unit
router.post('/', requirePermission('master:items:create'), async (req: Request, res: Response) => {
  try {
    const companyId =
      (req as any).companyContext?.companyId ??
      (req as any).companyContext?.id ??
      (req as any).companyId;
    const userId = (req as any).user?.id;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const {
      code,
      name,
      name_ar,
      unit_category,
      measurement_type,
      base_unit_id,
      conversion_factor,
      symbol,
      decimal_places,
      is_active = true,
    } = req.body;

    if (!code || !name) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    // Enforce base/conversion requirements
    const unitCategory = unit_category || 'basic';
    if (unitCategory !== 'basic') {
      if (!base_unit_id) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Base unit is required for derived/packaging units' } });
      }
      if (!conversion_factor || Number(conversion_factor) <= 0) {
        return res
          .status(400)
          .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Conversion factor must be > 0 for derived/packaging units' } });
      }
    }

    const duplicate = await pool.query(
      'SELECT id FROM units_of_measure WHERE code = $1 AND deleted_at IS NULL',
      [code]
    );
    if (duplicate.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Unit code already exists' } });
    }

    const hasMeasurementType = await measurementTypeColumnExists();

    if (hasMeasurementType) {
      const result = await pool.query(
        `INSERT INTO units_of_measure (
          company_id,
          code,
          name,
          name_en,
          name_ar,
          unit_type,
          measurement_type,
          base_unit_id,
          conversion_factor,
          symbol_en,
          decimal_places,
          is_active,
          created_by,
          updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id, code, COALESCE(name_en, name) AS name, name_ar, unit_type AS unit_category, measurement_type, base_unit_id, conversion_factor, symbol_en AS symbol, decimal_places, is_active, created_at`,
        [
          companyId,
          code,
          name,
          name,
          name_ar || null,
          unitCategory,
          unitCategory === 'basic' ? (measurement_type || null) : null,
          base_unit_id || null,
          unitCategory === 'basic' ? null : conversion_factor,
          symbol || null,
          decimal_places ?? 2,
          is_active,
          userId,
          userId,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    const result = await pool.query(
      `INSERT INTO units_of_measure (
        company_id,
        code,
        name,
        name_en,
        name_ar,
        unit_type,
        base_unit_id,
        conversion_factor,
        symbol_en,
        decimal_places,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id, code, COALESCE(name_en, name) AS name, name_ar, unit_type AS unit_category, NULL AS measurement_type, base_unit_id, conversion_factor, symbol_en AS symbol, decimal_places, is_active, created_at`,
      [
        companyId,
        code,
        name,
        name,
        name_ar || null,
        unitCategory,
        base_unit_id || null,
        unitCategory === 'basic' ? null : conversion_factor,
        symbol || null,
        decimal_places ?? 2,
        is_active,
        userId,
        userId,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating unit type:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create unit type' } });
  }
});

// PUT /api/unit-types/:id - Update unit
router.put('/:id', requirePermission('master:items:edit'), async (req: Request, res: Response) => {
  try {
    const companyId =
      (req as any).companyContext?.companyId ??
      (req as any).companyContext?.id ??
      (req as any).companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const {
      code,
      name,
      name_ar,
      unit_category,
      measurement_type,
      base_unit_id,
      conversion_factor,
      symbol,
      decimal_places,
      is_active,
    } = req.body;

    if (!code || !name) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Code and name are required' } });
    }

    const existing = await pool.query(
      'SELECT id FROM units_of_measure WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL)',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unit not found' } });
    }

    const duplicate = await pool.query(
      'SELECT id FROM units_of_measure WHERE code = $1 AND id <> $2 AND deleted_at IS NULL',
      [code, id]
    );
    if (duplicate.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'DUPLICATE_CODE', message: 'Unit code already exists' } });
    }

    const unitCategory = unit_category || 'basic';

    const hasMeasurementType = await measurementTypeColumnExists();

    if (hasMeasurementType) {
      const result = await pool.query(
        `UPDATE units_of_measure
         SET code = $1,
             name = $2,
             name_en = $2,
             name_ar = $3,
             unit_type = $4,
             measurement_type = $5,
             base_unit_id = $6,
             conversion_factor = $7,
             symbol_en = $8,
             decimal_places = $9,
             is_active = $10,
             updated_by = $11,
             updated_at = NOW()
         WHERE id = $12
         RETURNING id, code, COALESCE(name_en, name) AS name, name_ar, unit_type AS unit_category, measurement_type, base_unit_id, conversion_factor, symbol_en AS symbol, decimal_places, is_active, created_at`,
        [
          code,
          name,
          name_ar || null,
          unitCategory,
          unitCategory === 'basic' ? (measurement_type || null) : null,
          unitCategory === 'basic' ? null : base_unit_id || null,
          unitCategory === 'basic' ? null : conversion_factor,
          symbol || null,
          decimal_places ?? 2,
          is_active ?? true,
          userId,
          id,
        ]
      );

      return res.json({ success: true, data: result.rows[0] });
    }

    const result = await pool.query(
      `UPDATE units_of_measure
       SET code = $1,
           name = $2,
           name_en = $2,
           name_ar = $3,
           unit_type = $4,
           base_unit_id = $5,
           conversion_factor = $6,
           symbol_en = $7,
           decimal_places = $8,
           is_active = $9,
           updated_by = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING id, code, COALESCE(name_en, name) AS name, name_ar, unit_type AS unit_category, NULL AS measurement_type, base_unit_id, conversion_factor, symbol_en AS symbol, decimal_places, is_active, created_at`,
      [
        code,
        name,
        name_ar || null,
        unitCategory,
        unitCategory === 'basic' ? null : base_unit_id || null,
        unitCategory === 'basic' ? null : conversion_factor,
        symbol || null,
        decimal_places ?? 2,
        is_active ?? true,
        userId,
        id,
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating unit type:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update unit type' } });
  }
});

// DELETE /api/unit-types/:id - Soft delete unit
router.delete('/:id', requirePermission('master:items:delete'), async (req: Request, res: Response) => {
  try {
    const companyId =
      (req as any).companyContext?.companyId ??
      (req as any).companyContext?.id ??
      (req as any).companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const existing = await pool.query(
      'SELECT id FROM units_of_measure WHERE id = $1 AND deleted_at IS NULL AND (company_id = $2 OR company_id IS NULL)',
      [id, companyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unit not found' } });
    }

    // Block delete if used by active items
    const used = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM items
       WHERE deleted_at IS NULL AND (
         base_uom_id = $1 OR sales_uom_id = $1 OR purchase_uom_id = $1 OR
         base_unit_id = $1 OR sales_unit_id = $1 OR purchase_unit_id = $1
       )`,
      [id]
    );

    if (used.rows[0]?.cnt > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'IN_USE', message: 'Cannot delete unit type that is used by items' },
      });
    }

    await pool.query(
      'UPDATE units_of_measure SET deleted_at = NOW(), updated_by = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL',
      [userId, id]
    );

    res.json({ success: true, message: 'Unit type deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit type:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete unit type' } });
  }
});

export default router;
