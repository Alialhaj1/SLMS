import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import { loadCompanyContext } from '../middleware/companyContext';
import { errors, getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

const normalizeRoleName = (role: unknown): string => {
  if (typeof role !== 'string') return '';
  return role.trim().toLowerCase();
};

// Validation schemas
const numberingSeriesSchema = z.object({
  module: z.string().min(1).max(50),
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  current_number: z.number().int().min(1).default(1),
  padding_length: z.number().int().min(0).max(10).default(6),
  format: z.string().max(100).optional(),
  notes_en: z.string().optional(),
  notes_ar: z.string().optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().optional(), // Optional in schema, validated in handler
});

// POST /api/numbering-series/bootstrap - Ensure default numbering series exists for all company-scoped tables
router.post('/bootstrap', authenticate, loadCompanyContext, requirePermission('numbering_series:create'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return errors.invalidInput(res, 'Company context required');
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }

    const excludedTables = new Set<string>([
      'numbering_series',
      'migrations',
    ]);

    const tablesResult = await pool.query(
      `
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'company_id'
      ORDER BY table_name
      `
    );

    const tables = tablesResult.rows
      .map((r: any) => String(r.table_name))
      .filter((t: string) => t && !excludedTables.has(t));

    let created = 0;
    let existing = 0;

    const makePrefix = (tableName: string): string => {
      const parts = tableName.split('_').filter(Boolean);
      const initials = parts.map(p => p[0]).join('').toUpperCase();
      const raw = (initials || tableName.slice(0, 3).toUpperCase()).slice(0, 6);
      const prefix = raw.length <= 9 ? `${raw}-` : raw;
      return prefix.slice(0, 10);
    };

    for (const tableName of tables) {
      const module = tableName;
      const prefix = makePrefix(tableName);
      const notesEn = `Auto-created default numbering series for table: ${tableName}`;
      const notesAr = `تم إنشاء تسلسل ترقيم افتراضي تلقائياً للجدول: ${tableName}`;

      const insertResult = await pool.query(
        `
        INSERT INTO numbering_series (
          company_id, module, prefix, suffix, current_number, padding_length,
          format, notes_en, notes_ar, is_active, created_by, updated_by, deleted_at
        )
        VALUES ($1::INTEGER, $2::VARCHAR(50), $3::VARCHAR(10), NULL, 1, 6, NULL, $4::TEXT, $5::TEXT, TRUE, $6::INTEGER, $6::INTEGER, NULL)
        ON CONFLICT (company_id, module) WHERE (deleted_at IS NULL)
        DO NOTHING
        RETURNING id
        `,
        [companyId, module, prefix, notesEn, notesAr, userId]
      );

      if (insertResult.rowCount && insertResult.rowCount > 0) {
        created++;
      } else {
        existing++;
      }
    }

    return res.json({
      success: true,
      data: {
        company_id: companyId,
        total_tables: tables.length,
        created,
        existing,
      },
    });
  } catch (error: any) {
    console.error('Error bootstrapping numbering series:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to bootstrap numbering series' },
    });
  }
});

// GET /api/numbering-series - List all numbering series
router.get('/', authenticate, loadCompanyContext, requirePermission('numbering_series:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return errors.invalidInput(res, 'Company context required');
    }
    const { page, limit, offset } = getPaginationParams(req.query);
    const { module, is_active } = req.query;

    const where: string[] = ['deleted_at IS NULL', `company_id = $1`];
    const params: any[] = [companyId];

    if (module) {
      params.push(String(module));
      where.push(`module = $${params.length}`);
    }

    if (is_active !== undefined) {
      params.push(String(is_active) === 'true');
      where.push(`is_active = $${params.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::INT AS total FROM numbering_series ${whereSql}`,
      params
    );
    const total = Number(countResult.rows?.[0]?.total ?? 0);

    const paramIndex = params.length + 1;
    const dataResult = await pool.query(
      `
      SELECT id, module, prefix, suffix, current_number, padding_length, format,
             notes_en, notes_ar, is_active, company_id,
             created_at, updated_at, created_by, updated_by
      FROM numbering_series
      ${whereSql}
      ORDER BY module, prefix, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, limit, offset]
    );

    // Prevent 304 responses (empty body) which break frontend JSON parsing
    res.setHeader('Cache-Control', 'no-store');
    return sendPaginated(res, dataResult.rows, page, limit, total);
  } catch (error: any) {
    console.error('Error fetching numbering series:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch numbering series' },
    });
  }
});

// GET /api/numbering-series/:id - Get single numbering series
router.get('/:id', authenticate, loadCompanyContext, requirePermission('numbering_series:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    if (!companyId) {
      return errors.invalidInput(res, 'Company context required');
    }

    let query = `
      SELECT id, module, prefix, suffix, current_number, padding_length, format,
             notes_en, notes_ar, is_active, company_id,
             created_at, updated_at, created_by, updated_by
      FROM numbering_series
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const params: any[] = [id];

    query += ` AND company_id = $2`;
    params.push(companyId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Numbering series not found' },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching numbering series:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch numbering series' },
    });
  }
});

// POST /api/numbering-series - Create new numbering series
router.post('/', authenticate, loadCompanyContext, requirePermission('numbering_series:create'), async (req: Request, res: Response) => {
  console.log('🎯 POST handler reached!');
  try {
    console.log('📝 Received request body:', JSON.stringify(req.body, null, 2));
    const validatedData = numberingSeriesSchema.parse(req.body);
    console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2));
    const { id: userId } = req.user!;

    const companyId = req.companyId;
    const isSuperAdmin = (req.user?.roles || []).map(normalizeRoleName).includes('super_admin');
    const targetCompanyId = isSuperAdmin && validatedData.company_id
      ? validatedData.company_id
      : companyId;

    if (!targetCompanyId) return errors.invalidInput(res, 'Company context required');

    const result = await pool.query(
      `INSERT INTO numbering_series (
        module, prefix, suffix, current_number, padding_length, format,
        notes_en, notes_ar, is_active, company_id, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        validatedData.module,
        validatedData.prefix || null,
        validatedData.suffix || null,
        validatedData.current_number,
        validatedData.padding_length,
        validatedData.format || null,
        validatedData.notes_en || null,
        validatedData.notes_ar || null,
        validatedData.is_active,
        targetCompanyId,
        userId,
        userId,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('❌ Error in POST handler:', error);
    if (error instanceof z.ZodError) {
      console.error('🔴 Zod validation errors:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        success: false,
        error: { message: 'Validation error', details: error.errors },
      });
    }
    console.error('Error creating numbering series:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create numbering series' },
    });
  }
});

// PUT /api/numbering-series/:id - Update numbering series
router.put('/:id', authenticate, loadCompanyContext, requirePermission('numbering_series:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = numberingSeriesSchema.partial().parse(req.body);
    const { id: userId } = req.user!;
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    // Check if exists and user has access
    const existing = await pool.query(
      `SELECT id FROM numbering_series WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`,
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Numbering series not found' },
      });
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'company_id') {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    updateFields.push(`updated_by = $${paramCount}`);
    updateValues.push(userId);
    paramCount++;

    updateFields.push(`updated_at = NOW()`);

    updateValues.push(id);

    const result = await pool.query(
      `UPDATE numbering_series SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation error', details: error.errors },
      });
    }
    console.error('Error updating numbering series:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update numbering series' },
    });
  }
});

// DELETE /api/numbering-series/:id - Soft delete numbering series
router.delete('/:id', authenticate, loadCompanyContext, requirePermission('numbering_series:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user!;
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    // Check if exists and user has access
    const existing = await pool.query(
      `SELECT id FROM numbering_series WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`,
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Numbering series not found' },
      });
    }

    await pool.query(
      `UPDATE numbering_series 
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    res.json({
      success: true,
      message: 'Numbering series deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting numbering series:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete numbering series' },
    });
  }
});

export default router;
