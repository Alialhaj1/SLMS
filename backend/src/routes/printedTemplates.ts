import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import { loadCompanyContext } from '../middleware/companyContext';
import { errors, getPaginationParams, sendPaginated, sendSuccess } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

const printedTemplateSchema = z.object({
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  template_type: z.string().min(1).max(50),
  module: z.string().max(50).optional(),
  language: z.enum(['en', 'ar', 'both']).optional(),
  header_html: z.string().optional(),
  body_html: z.string().optional(),
  footer_html: z.string().optional(),
  css: z.string().optional(),
  paper_size: z.string().max(20).optional(),
  orientation: z.string().max(20).optional(),
  margin_top: z.number().int().min(0).max(100).optional(),
  margin_bottom: z.number().int().min(0).max(100).optional(),
  margin_left: z.number().int().min(0).max(100).optional(),
  margin_right: z.number().int().min(0).max(100).optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // super_admin only override
  company_id: z.number().int().positive().optional(),
});

router.get('/', authenticate, loadCompanyContext, requirePermission('printed_templates:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    const { page, limit, offset } = getPaginationParams(req.query);
    const { template_type, is_active } = req.query as any;

    const where: string[] = ['deleted_at IS NULL', 'company_id = $1'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (template_type) {
      where.push(`template_type = $${paramIndex}`);
      params.push(String(template_type));
      paramIndex++;
    }

    if (is_active !== undefined) {
      where.push(`is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM printed_templates ${whereSql}`,
      params
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const result = await pool.query(
      `
        SELECT
          id,
          company_id,
          numbering_series_id,
          sequence_no,
          slms_format_sequence(numbering_series_id, sequence_no) as sequence_display,
          name_en,
          name_ar,
          template_type,
          module,
          language,
          header_html,
          body_html,
          footer_html,
          css,
          paper_size,
          orientation,
          margin_top,
          margin_bottom,
          margin_left,
          margin_right,
          is_default,
          is_active,
          preview_url,
          version,
          created_at,
          updated_at
        FROM printed_templates
        ${whereSql}
        ORDER BY template_type, name_en
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, limit, offset]
    );

    return sendPaginated(res, result.rows, page, limit, total);
  } catch (error: any) {
    logger.error('Error fetching printed templates', {
      errMessage: error?.message,
      errCode: error?.code,
      errDetail: error?.detail,
      errWhere: error?.where,
      errHint: error?.hint,
      errStack: error?.stack,
      companyId: req.companyId,
      query: req.query,
    });
    return errors.internal(res, 'Failed to fetch printed templates');
  }
});

router.get('/:id', authenticate, loadCompanyContext, requirePermission('printed_templates:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    const result = await pool.query(
      `
        SELECT
          id,
          company_id,
          numbering_series_id,
          sequence_no,
          slms_format_sequence(numbering_series_id, sequence_no) as sequence_display,
          name_en,
          name_ar,
          template_type,
          module,
          language,
          header_html,
          body_html,
          footer_html,
          css,
          paper_size,
          orientation,
          margin_top,
          margin_bottom,
          margin_left,
          margin_right,
          is_default,
          is_active,
          preview_url,
          version,
          created_at,
          updated_at
        FROM printed_templates
        WHERE id = $1 AND deleted_at IS NULL AND company_id = $2
      `,
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return errors.notFound(res, 'Printed template');
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error: any) {
    logger.error('Error fetching printed template', {
      errMessage: error?.message,
      errCode: error?.code,
      errDetail: error?.detail,
      errWhere: error?.where,
      errHint: error?.hint,
      errStack: error?.stack,
      companyId: req.companyId,
      templateId: req.params?.id,
    });
    return errors.internal(res, 'Failed to fetch printed template');
  }
});

router.post('/', authenticate, loadCompanyContext, requirePermission('printed_templates:create'), async (req: Request, res: Response) => {
  try {
    const validatedData = printedTemplateSchema.parse(req.body);
    const { id: userId } = req.user!;

    const companyId = req.companyId;
    const targetCompanyId = req.user!.roles.includes('super_admin') && validatedData.company_id
      ? validatedData.company_id
      : companyId;

    if (!targetCompanyId) return errors.invalidInput(res, 'Company context required');

    // If this template is set as default for its type, unset others
    if (validatedData.is_default) {
      await pool.query(
        `UPDATE printed_templates SET is_default = FALSE 
         WHERE template_type = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [validatedData.template_type, targetCompanyId]
      );
    }

    const result = await pool.query(
      `INSERT INTO printed_templates (
        company_id,
        name_en,
        name_ar,
        template_type,
        module,
        language,
        header_html,
        body_html,
        footer_html,
        css,
        paper_size,
        orientation,
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
        is_default,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [
        targetCompanyId,
        validatedData.name_en,
        validatedData.name_ar,
        validatedData.template_type,
        validatedData.module || null,
        validatedData.language || 'both',
        validatedData.header_html || null,
        validatedData.body_html || null,
        validatedData.footer_html || null,
        validatedData.css || null,
        validatedData.paper_size || 'A4',
        validatedData.orientation || 'portrait',
        validatedData.margin_top ?? 10,
        validatedData.margin_bottom ?? 10,
        validatedData.margin_left ?? 10,
        validatedData.margin_right ?? 10,
        validatedData.is_default,
        validatedData.is_active,
        userId,
        userId,
      ]
    );

    return sendSuccess(res, result.rows[0], 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errors.validationError(res, error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    }
    console.error('Error creating printed template:', error);
    return errors.internal(res, 'Failed to create printed template');
  }
});

router.put('/:id', authenticate, loadCompanyContext, requirePermission('printed_templates:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = printedTemplateSchema.partial().parse(req.body);
    const { id: userId } = req.user!;
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    const existing = await pool.query(
      `SELECT id, template_type FROM printed_templates WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`,
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return errors.notFound(res, 'Printed template');
    }

    // If this template is set as default for its type, unset others
    if (validatedData.is_default === true) {
      await pool.query(
        `UPDATE printed_templates SET is_default = FALSE 
         WHERE template_type = $1 AND id != $2 AND company_id = $3 AND deleted_at IS NULL`,
        [existing.rows[0].template_type, id, companyId]
      );
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
      `UPDATE printed_templates SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    return sendSuccess(res, result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errors.validationError(res, error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    }
    console.error('Error updating printed template:', error);
    return errors.internal(res, 'Failed to update printed template');
  }
});

router.delete('/:id', authenticate, loadCompanyContext, requirePermission('printed_templates:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user!;
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    const existing = await pool.query(
      `SELECT id FROM printed_templates WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`,
      [id, companyId]
    );

    if (existing.rows.length === 0) {
      return errors.notFound(res, 'Printed template');
    }

    await pool.query(
      `UPDATE printed_templates 
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    res.json({
      success: true,
      message: 'Printed template deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting printed template:', error);
    return errors.internal(res, 'Failed to delete printed template');
  }
});

export default router;
