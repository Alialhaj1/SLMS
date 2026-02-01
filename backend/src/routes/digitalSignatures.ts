import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import { errors, getPaginationParams, sendPaginated, sendSuccess } from '../utils/response';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();

const dbSignatureTypeSchema = z.enum(['manual', 'digital_certificate', 'biometric']);
const uiSignatureTypeSchema = z.enum(['image', 'certificate', 'biometric']);

// Canonical DB schema (matches migration 027_create_master_data_group1.sql)
const digitalSignatureDbSchema = z.object({
  user_id: z.number().int().positive().optional(),
  signature_name_en: z.string().min(1).max(255),
  signature_name_ar: z.string().min(1).max(255),
  signature_title_en: z.string().max(255).optional(),
  signature_title_ar: z.string().max(255).optional(),
  department: z.string().max(100).optional(),
  signature_image_url: z.string().max(500).optional(),
  signature_type: dbSignatureTypeSchema.default('manual'),
  certificate_path: z.string().max(500).optional(),
  certificate_issuer: z.string().max(255).optional(),
  certificate_serial: z.string().max(100).optional(),
  certificate_issued_date: z.string().optional(), // YYYY-MM-DD
  certificate_expiry_date: z.string().optional(), // YYYY-MM-DD
  signature_authority: z.string().max(255).optional(),
  requires_2fa: z.boolean().default(false),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // super_admin only override
  company_id: z.number().int().positive().optional(),
});

// Legacy UI schema (current frontend page)
const digitalSignatureUiSchema = z.object({
  signature_name: z.string().min(1),
  signer_name: z.string().optional(),
  signer_title: z.string().optional(),
  signature_type: uiSignatureTypeSchema.default('image'),
  signature_data: z.string().optional(),
  certificate_serial: z.string().optional(),
  certificate_issuer: z.string().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().default(true),
  company_id: z.number().int().positive().optional(),
  user_id: z.number().int().positive().optional(),
});

const createSignatureSchema = z.union([digitalSignatureDbSchema, digitalSignatureUiSchema]);
const updateSignatureSchema = z.union([
  digitalSignatureDbSchema.partial(),
  digitalSignatureUiSchema.partial(),
]);

type DbSignatureInsert = {
  company_id: number;
  user_id: number | null;
  signature_name_en: string;
  signature_name_ar: string;
  signature_title_en: string | null;
  signature_title_ar: string | null;
  department: string | null;
  signature_image_url: string | null;
  signature_type: 'manual' | 'digital_certificate' | 'biometric';
  certificate_path: string | null;
  certificate_issuer: string | null;
  certificate_serial: string | null;
  certificate_issued_date: string | null;
  certificate_expiry_date: string | null;
  signature_authority: string | null;
  requires_2fa: boolean;
  is_default: boolean;
  is_active: boolean;
};

function mapUiSignatureTypeToDb(type: 'image' | 'certificate' | 'biometric'): DbSignatureInsert['signature_type'] {
  if (type === 'image') return 'manual';
  if (type === 'certificate') return 'digital_certificate';
  return 'biometric';
}

function mapDbSignatureTypeToUi(type: DbSignatureInsert['signature_type']): 'image' | 'certificate' | 'biometric' {
  if (type === 'manual') return 'image';
  if (type === 'digital_certificate') return 'certificate';
  return 'biometric';
}

function mapInputToDbInsert(
  input: z.infer<typeof createSignatureSchema>,
  targetCompanyId: number
): DbSignatureInsert {
  const isDbShape = 'signature_name_en' in (input as any);
  const inputAny = input as any;

  const signatureType: DbSignatureInsert['signature_type'] = isDbShape
    ? ((inputAny.signature_type as DbSignatureInsert['signature_type']) ?? 'manual')
    : mapUiSignatureTypeToDb((inputAny.signature_type as any) ?? 'image');

  const signatureData = !isDbShape ? (inputAny.signature_data || null) : null;

  const signatureImageUrl = isDbShape
    ? (inputAny.signature_image_url || null)
    : (signatureType === 'digital_certificate' ? null : signatureData);

  const certificatePath = isDbShape
    ? (inputAny.certificate_path || null)
    : (signatureType === 'digital_certificate' ? signatureData : null);

  const signatureNameEn = isDbShape ? inputAny.signature_name_en : inputAny.signature_name;
  const signatureNameAr = isDbShape ? inputAny.signature_name_ar : inputAny.signature_name;

  const signatureTitleEn = isDbShape ? (inputAny.signature_title_en || null) : (inputAny.signer_title || null);
  const signatureTitleAr = isDbShape ? (inputAny.signature_title_ar || null) : (inputAny.signer_title || null);

  const signatureAuthority = isDbShape
    ? (inputAny.signature_authority || null)
    : (inputAny.signer_name || null);

  const issuedDate = isDbShape ? (inputAny.certificate_issued_date || null) : (inputAny.valid_from || null);
  const expiryDate = isDbShape ? (inputAny.certificate_expiry_date || null) : (inputAny.valid_until || null);

  return {
    company_id: targetCompanyId,
    user_id: (input.user_id ?? null) as any,
    signature_name_en: signatureNameEn,
    signature_name_ar: signatureNameAr,
    signature_title_en: signatureTitleEn,
    signature_title_ar: signatureTitleAr,
    department: isDbShape ? (inputAny.department || null) : null,
    signature_image_url: signatureImageUrl,
    signature_type: signatureType,
    certificate_path: certificatePath,
    certificate_issuer: inputAny.certificate_issuer || null,
    certificate_serial: inputAny.certificate_serial || null,
    certificate_issued_date: issuedDate,
    certificate_expiry_date: expiryDate,
    signature_authority: signatureAuthority,
    requires_2fa: isDbShape ? Boolean(inputAny.requires_2fa) : false,
    is_default: Boolean(inputAny.is_default ?? false),
    is_active: Boolean(inputAny.is_active ?? true),
  };
}

function mapDbRowToUi(row: any) {
  return {
    id: row.id,
    signature_name: row.signature_name_en || row.signature_name_ar || '-',
    signer_name: row.user_name || row.signature_authority || '-',
    signer_title: row.signature_title_en || row.signature_title_ar || '',
    signature_type: mapDbSignatureTypeToUi(row.signature_type),
    signature_data: row.signature_image_url || row.certificate_path || '',
    certificate_serial: row.certificate_serial || '',
    certificate_issuer: row.certificate_issuer || '',
    valid_from: row.certificate_issued_date || null,
    valid_until: row.certificate_expiry_date || null,
    is_default: Boolean(row.is_default),
    is_active: row.is_active,
    company_id: row.company_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.get('/', authenticate, loadCompanyContext, requirePermission('digital_signatures:view'), async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    const { page, limit, offset } = getPaginationParams(req.query);
    const { user_id, is_active, search } = req.query as any;

    let baseQuery = `
      FROM digital_signatures ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Company isolation is mandatory for this entity
    if (!companyId) {
      return errors.invalidInput(res, 'Company context required');
    }
    baseQuery += ` AND ds.company_id = $${paramIndex}`;
    params.push(companyId);
    paramIndex++;

    if (user_id) {
      baseQuery += ` AND ds.user_id = $${paramIndex}`;
      params.push(Number(user_id));
      paramIndex++;
    }

    if (is_active !== undefined) {
      baseQuery += ` AND ds.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    if (search) {
      baseQuery += ` AND (
        ds.signature_name_en ILIKE $${paramIndex}
        OR ds.signature_name_ar ILIKE $${paramIndex}
        OR ds.certificate_serial ILIKE $${paramIndex}
        OR u.email ILIKE $${paramIndex}
        OR u.full_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT ds.id) as total ${baseQuery}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `
        SELECT
          ds.id,
          ds.company_id,
          ds.numbering_series_id,
          ds.sequence_no,
          slms_format_sequence(ds.numbering_series_id, ds.sequence_no) as sequence_display,
          ds.user_id,
          ds.signature_name_en,
          ds.signature_name_ar,
          ds.signature_title_en,
          ds.signature_title_ar,
          ds.department,
          ds.signature_image_url,
          ds.signature_type,
          ds.certificate_path,
          ds.certificate_issuer,
          ds.certificate_serial,
          ds.certificate_issued_date,
          ds.certificate_expiry_date,
          ds.signature_authority,
          ds.requires_2fa,
          ds.is_default,
          ds.is_active,
          ds.created_at,
          ds.updated_at,
          u.email as user_email,
          u.full_name as user_name
        ${baseQuery}
        ORDER BY ds.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, limit, offset]
    );

    const uiRows = result.rows.map(mapDbRowToUi);
    return sendPaginated(res, uiRows, page, limit, total);
  } catch (error: any) {
    console.error('Error fetching digital signatures:', error);
    return errors.internal(res, 'Failed to fetch digital signatures');
  }
});

router.get('/:id', authenticate, loadCompanyContext, requirePermission('digital_signatures:view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    let query = `
      SELECT
        ds.id,
        ds.company_id,
        ds.numbering_series_id,
        ds.sequence_no,
        slms_format_sequence(ds.numbering_series_id, ds.sequence_no) as sequence_display,
        ds.user_id,
        ds.signature_name_en,
        ds.signature_name_ar,
        ds.signature_title_en,
        ds.signature_title_ar,
        ds.department,
        ds.signature_image_url,
        ds.signature_type,
        ds.certificate_path,
        ds.certificate_issuer,
        ds.certificate_serial,
        ds.certificate_issued_date,
        ds.certificate_expiry_date,
        ds.signature_authority,
        ds.requires_2fa,
        ds.is_default,
        ds.is_active,
        ds.company_id,
        ds.created_at,
        ds.updated_at,
        u.email as user_email,
        u.full_name as user_name
      FROM digital_signatures ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.id = $1 AND ds.deleted_at IS NULL
    `;
    const params: any[] = [id];

    if (!companyId) {
      return errors.invalidInput(res, 'Company context required');
    }

    query += ` AND ds.company_id = $2`;
    params.push(companyId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return errors.notFound(res, 'Digital signature');
    }

    return sendSuccess(res, mapDbRowToUi(result.rows[0]));
  } catch (error: any) {
    console.error('Error fetching digital signature:', error);
    return errors.internal(res, 'Failed to fetch digital signature');
  }
});

router.post('/', authenticate, loadCompanyContext, requirePermission('digital_signatures:create'), async (req: Request, res: Response) => {
  try {
    const parsed = createSignatureSchema.parse(req.body);
    const { id: actorUserId } = req.user!;

    const companyId = req.companyId;

    const targetCompanyId = req.user!.roles.includes('super_admin') && (parsed as any).company_id
      ? (parsed as any).company_id
      : companyId;

    if (!targetCompanyId) {
      return errors.invalidInput(res, 'Company context is required (select an active company)');
    }

    const insert = mapInputToDbInsert(parsed as any, targetCompanyId);

    // If this is an active signature tied to a user, deactivate others for that user within the company
    if (insert.is_active && insert.user_id) {
      await pool.query(
        `UPDATE digital_signatures SET is_active = FALSE, updated_by = $1, updated_at = NOW()
         WHERE user_id = $2 AND company_id = $3 AND deleted_at IS NULL`,
        [actorUserId, insert.user_id, targetCompanyId]
      );
    }

    // If this is the default signature, unset default on others in the company
    if (insert.is_default) {
      await pool.query(
        `UPDATE digital_signatures SET is_default = FALSE, updated_by = $1, updated_at = NOW()
         WHERE company_id = $2 AND deleted_at IS NULL`,
        [actorUserId, targetCompanyId]
      );
    }

    const result = await pool.query(
      `INSERT INTO digital_signatures (
        company_id,
        user_id,
        signature_name_en,
        signature_name_ar,
        signature_title_en,
        signature_title_ar,
        department,
        signature_image_url,
        signature_type,
        certificate_path,
        certificate_issuer,
        certificate_serial,
        certificate_issued_date,
        certificate_expiry_date,
        signature_authority,
        requires_2fa,
        is_default,
        is_active,
        created_by,
        updated_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
      RETURNING *`,
      [
        insert.company_id,
        insert.user_id,
        insert.signature_name_en,
        insert.signature_name_ar,
        insert.signature_title_en,
        insert.signature_title_ar,
        insert.department,
        insert.signature_image_url,
        insert.signature_type,
        insert.certificate_path,
        insert.certificate_issuer,
        insert.certificate_serial,
        insert.certificate_issued_date,
        insert.certificate_expiry_date,
        insert.signature_authority,
        insert.requires_2fa,
        insert.is_default,
        insert.is_active,
        actorUserId,
        actorUserId,
      ]
    );

    // Re-fetch with user join so UI gets user_name/user_email
    const created = await pool.query(
      `SELECT ds.*, u.email as user_email, u.full_name as user_name
       FROM digital_signatures ds
       LEFT JOIN users u ON ds.user_id = u.id
       WHERE ds.id = $1`,
      [result.rows[0].id]
    );

    return sendSuccess(res, mapDbRowToUi(created.rows[0]), 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errors.validationError(res, error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    }
    console.error('Error creating digital signature:', error);
    return errors.internal(res, 'Failed to create digital signature');
  }
});

router.put('/:id', authenticate, loadCompanyContext, requirePermission('digital_signatures:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateSignatureSchema.parse(req.body);
    const { id: actorUserId } = req.user!;

    const companyId = req.companyId;

    const checkQuery = companyId
      ? `SELECT id, user_id, company_id FROM digital_signatures WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`
      : `SELECT id, user_id, company_id FROM digital_signatures WHERE id = $1 AND deleted_at IS NULL`;
    const checkParams = companyId ? [id, companyId] : [id];
    const existing = await pool.query(checkQuery, checkParams);

    if (existing.rows.length === 0) {
      return errors.notFound(res, 'Digital signature');
    }

    const targetCompanyId = existing.rows[0].company_id;
    const mappedUpdate = mapInputToDbInsert(parsed as any, targetCompanyId);

    // If activating this signature and tied to a user, deactivate others for same user in same company
    if (mappedUpdate.is_active === true && mappedUpdate.user_id) {
      await pool.query(
        `UPDATE digital_signatures SET is_active = FALSE, updated_by = $1, updated_at = NOW()
         WHERE user_id = $2 AND id != $3 AND company_id = $4 AND deleted_at IS NULL`,
        [actorUserId, mappedUpdate.user_id, id, targetCompanyId]
      );
    }

    // If setting as default, unset default on others in same company
    if ((parsed as any).is_default === true) {
      await pool.query(
        `UPDATE digital_signatures SET is_default = FALSE, updated_by = $1, updated_at = NOW()
         WHERE company_id = $2 AND id != $3 AND deleted_at IS NULL`,
        [actorUserId, targetCompanyId, id]
      );
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    const updatable: Partial<DbSignatureInsert> = {
      user_id: mappedUpdate.user_id,
      signature_name_en: mappedUpdate.signature_name_en,
      signature_name_ar: mappedUpdate.signature_name_ar,
      signature_title_en: mappedUpdate.signature_title_en,
      signature_title_ar: mappedUpdate.signature_title_ar,
      department: mappedUpdate.department,
      signature_image_url: mappedUpdate.signature_image_url,
      signature_type: mappedUpdate.signature_type,
      certificate_path: mappedUpdate.certificate_path,
      certificate_issuer: mappedUpdate.certificate_issuer,
      certificate_serial: mappedUpdate.certificate_serial,
      certificate_issued_date: mappedUpdate.certificate_issued_date,
      certificate_expiry_date: mappedUpdate.certificate_expiry_date,
      signature_authority: mappedUpdate.signature_authority,
      requires_2fa: mappedUpdate.requires_2fa,
      is_default: mappedUpdate.is_default,
      is_active: mappedUpdate.is_active,
    };

    // Only update fields that were actually provided in the request
    Object.entries(parsed as any).forEach(([key, value]) => {
      if (value === undefined) return;

      // map legacy/UI keys to DB keys
      const isDbShape = key in (digitalSignatureDbSchema.shape as any);
      if (isDbShape) {
        if (key === 'company_id') return;
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push((updatable as any)[key]);
        paramCount++;
        return;
      }

      if (key === 'signature_name') {
        updateFields.push(`signature_name_en = $${paramCount}`);
        updateValues.push(updatable.signature_name_en);
        paramCount++;
        updateFields.push(`signature_name_ar = $${paramCount}`);
        updateValues.push(updatable.signature_name_ar);
        paramCount++;
        return;
      }
      if (key === 'signer_title') {
        updateFields.push(`signature_title_en = $${paramCount}`);
        updateValues.push(updatable.signature_title_en);
        paramCount++;
        updateFields.push(`signature_title_ar = $${paramCount}`);
        updateValues.push(updatable.signature_title_ar);
        paramCount++;
        return;
      }
      if (key === 'signer_name') {
        updateFields.push(`signature_authority = $${paramCount}`);
        updateValues.push(updatable.signature_authority);
        paramCount++;
        return;
      }
      if (key === 'signature_type') {
        updateFields.push(`signature_type = $${paramCount}`);
        updateValues.push(updatable.signature_type);
        paramCount++;
        return;
      }
      if (key === 'signature_data') {
        // Stored either as signature_image_url or certificate_path depending on type
        updateFields.push(`signature_image_url = $${paramCount}`);
        updateValues.push(updatable.signature_image_url);
        paramCount++;
        updateFields.push(`certificate_path = $${paramCount}`);
        updateValues.push(updatable.certificate_path);
        paramCount++;
        return;
      }
      if (key === 'valid_from') {
        updateFields.push(`certificate_issued_date = $${paramCount}`);
        updateValues.push(updatable.certificate_issued_date);
        paramCount++;
        return;
      }
      if (key === 'valid_until') {
        updateFields.push(`certificate_expiry_date = $${paramCount}`);
        updateValues.push(updatable.certificate_expiry_date);
        paramCount++;
        return;
      }
      if (key === 'certificate_serial') {
        updateFields.push(`certificate_serial = $${paramCount}`);
        updateValues.push(updatable.certificate_serial);
        paramCount++;
        return;
      }
      if (key === 'certificate_issuer') {
        updateFields.push(`certificate_issuer = $${paramCount}`);
        updateValues.push(updatable.certificate_issuer);
        paramCount++;
        return;
      }
      if (key === 'user_id') {
        updateFields.push(`user_id = $${paramCount}`);
        updateValues.push(updatable.user_id);
        paramCount++;
        return;
      }
      if (key === 'is_active') {
        updateFields.push(`is_active = $${paramCount}`);
        updateValues.push(updatable.is_active);
        paramCount++;
        return;
      }
      if (key === 'is_default') {
        updateFields.push(`is_default = $${paramCount}`);
        updateValues.push(updatable.is_default);
        paramCount++;
        return;
      }
    });

    if (updateFields.length === 0) {
      return errors.invalidInput(res, 'No valid fields provided for update');
    }

    updateFields.push(`updated_by = $${paramCount}`);
    updateValues.push(actorUserId);
    paramCount++;
    updateFields.push(`updated_at = NOW()`);

    updateValues.push(id);

    const result = await pool.query(
      `UPDATE digital_signatures SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    const updated = await pool.query(
      `SELECT ds.*, u.email as user_email, u.full_name as user_name
       FROM digital_signatures ds
       LEFT JOIN users u ON ds.user_id = u.id
       WHERE ds.id = $1`,
      [result.rows[0].id]
    );

    return sendSuccess(res, mapDbRowToUi(updated.rows[0]));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errors.validationError(res, error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    }
    console.error('Error updating digital signature:', error);
    return errors.internal(res, 'Failed to update digital signature');
  }
});

router.delete('/:id', authenticate, loadCompanyContext, requirePermission('digital_signatures:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user!;

    const companyId = req.companyId;

    const checkQuery = companyId
      ? `SELECT id FROM digital_signatures WHERE id = $1 AND deleted_at IS NULL AND company_id = $2`
      : `SELECT id FROM digital_signatures WHERE id = $1 AND deleted_at IS NULL`;
    const checkParams = companyId ? [id, companyId] : [id];
    const existing = await pool.query(checkQuery, checkParams);

    if (existing.rows.length === 0) {
      return errors.notFound(res, 'Digital signature');
    }

    await pool.query(
      `UPDATE digital_signatures 
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    return sendSuccess(res, { message: 'Digital signature deleted successfully' } as any);
  } catch (error: any) {
    console.error('Error deleting digital signature:', error);
    return errors.internal(res, 'Failed to delete digital signature');
  }
});

export default router;
