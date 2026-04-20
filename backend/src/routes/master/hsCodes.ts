import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { sendSuccess, sendError } from '../../utils/response';
import pool from '../../db';

const router = Router();

// ─── GET /stats ─────────────────────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = true) AS active,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_active = false) AS inactive
      FROM hs_codes
    `);
    sendSuccess(res, r.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
});

// ─── GET /export ────────────────────────────────────────────────
router.get('/export', authenticate, async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = `SELECT code, description_ar, description_en, duty_rate_ar, duty_rate_en, procedures, effective_date
                 FROM hs_codes WHERE deleted_at IS NULL`;
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (code ILIKE $1 OR description_en ILIKE $1 OR description_ar ILIKE $1 OR duty_rate_ar ILIKE $1 OR duty_rate_en ILIKE $1 OR procedures ILIKE $1)`;
    }
    query += ` ORDER BY code`;
    const result = await pool.query(query, params);

    // BOM for Excel Arabic support
    const BOM = '\uFEFF';
    const header = '"رمز النظام المنسق\nHarmonized Code"\t"الصنف باللغة العربية\nItem Arabic Name"\t"الصنف باللغة الانجليزية\nItem English Name"\t"فئة الرسم باللغة العربية\nArabic Duty Rate"\t"فئة الرسم باللغة الانجليزية\nEnglish Duty Rate"\t"الاجراءات\nProcedures"\t"التاريخ\nDate"';
    const rows = result.rows.map((r: any) => {
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [r.code, r.description_ar, r.description_en, r.duty_rate_ar, r.duty_rate_en, r.procedures, r.effective_date || ''].map(esc).join('\t');
    });
    const tsv = BOM + header + '\n' + rows.join('\n');

    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hs-codes.tsv"');
    res.send(tsv);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to export', 500);
  }
});

// ─── GET /all-ids ───────────────────────────────────────────────
router.get('/all-ids', authenticate, async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = `SELECT id FROM hs_codes WHERE deleted_at IS NULL`;
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (code ILIKE $1 OR description_en ILIKE $1 OR description_ar ILIKE $1 OR duty_rate_ar ILIKE $1 OR duty_rate_en ILIKE $1 OR procedures ILIKE $1)`;
    }
    query += ` ORDER BY id`;
    const result = await pool.query(query, params);
    sendSuccess(res, result.rows.map((r: any) => r.id));
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch IDs', 500);
  }
});

// ─── GET / ──────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '');

    let where = `deleted_at IS NULL`;
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (code ILIKE $1 OR description_en ILIKE $1 OR description_ar ILIKE $1 OR duty_rate_ar ILIKE $1 OR duty_rate_en ILIKE $1 OR procedures ILIKE $1)`;
    }

    const dataQ = `SELECT * FROM hs_codes WHERE ${where} ORDER BY code LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQ = `SELECT COUNT(*) FROM hs_codes WHERE ${where}`;

    const [dataR, countR] = await Promise.all([
      pool.query(dataQ, [...params, limit, offset]),
      pool.query(countQ, params),
    ]);
    const total = parseInt(countR.rows[0].count);
    sendSuccess(res, dataR.rows, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch HS codes', 500);
  }
});

// ─── GET /:id ───────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hs_codes WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (result.rows.length === 0) return sendError(res, 'NOT_FOUND', 'HS code not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch HS code', 500);
  }
});

// ─── POST / ─────────────────────────────────────────────────────
router.post('/', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { code, description_en, description_ar, duty_rate_ar, duty_rate_en, procedures, effective_date, is_active = true } = req.body;
    if (!code) return sendError(res, 'VALIDATION_ERROR', 'code is required', 400);
    if (!description_en && !description_ar) return sendError(res, 'VALIDATION_ERROR', 'description is required', 400);
    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);
    const dup = await pool.query(`SELECT id FROM hs_codes WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [code, companyId]);
    if (dup.rows.length > 0) return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    const result = await pool.query(
      `INSERT INTO hs_codes (company_id,code,description_en,description_ar,duty_rate_ar,duty_rate_en,procedures,effective_date,is_active,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
      [companyId, code, description_en || description_ar, description_ar || description_en, duty_rate_ar || null, duty_rate_en || null, procedures || null, effective_date || null, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'HS code created' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to create HS code', 500);
  }
});

// ─── POST /import ───────────────────────────────────────────────
router.post('/import', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { rows, mode = 'upsert' } = req.body; // mode: 'insert' | 'upsert'
    if (!Array.isArray(rows) || rows.length === 0) return sendError(res, 'VALIDATION_ERROR', 'rows array is required', 400);
    if (rows.length > 50000) return sendError(res, 'VALIDATION_ERROR', 'Maximum 50000 rows per import', 400);

    const companyId = (req as any).companyId || (req as any).user?.company_id;
    if (!companyId) return sendError(res, 'VALIDATION_ERROR', 'Company context required', 400);

    let inserted = 0, updated = 0, skipped = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        const code = String(row.code || '').trim().slice(0, 50);
        if (!code) { skipped++; continue; }
        const descEn = String(row.description_en || row.description_ar || '').trim().slice(0, 255);
        const descAr = String(row.description_ar || row.description_en || '').trim().slice(0, 255);
        const dutyRateAr = row.duty_rate_ar ? String(row.duty_rate_ar).trim().slice(0, 255) : null;
        const dutyRateEn = row.duty_rate_en ? String(row.duty_rate_en).trim().slice(0, 255) : null;
        const procs = row.procedures ? String(row.procedures).trim() : null;
        let effDate: string | null = null;
        if (row.effective_date) {
          const raw = String(row.effective_date).trim();
          // Handle Excel serial date numbers
          if (/^\d{5}$/.test(raw)) {
            const d = new Date((Number(raw) - 25569) * 86400000);
            effDate = d.toISOString().slice(0, 10);
          } else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            effDate = raw.slice(0, 10);
          } else {
            const d = new Date(raw);
            effDate = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
          }
        }

        const existing = await client.query(
          `SELECT id FROM hs_codes WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`, [code, companyId]
        );

        if (existing.rows.length > 0) {
          if (mode === 'upsert') {
            await client.query(
              `UPDATE hs_codes SET description_en=$1, description_ar=$2, duty_rate_ar=$3, duty_rate_en=$4,
               procedures=$5, effective_date=$6, updated_at=NOW() WHERE id=$7`,
              [descEn, descAr, dutyRateAr, dutyRateEn, procs, effDate, existing.rows[0].id]
            );
            updated++;
          } else {
            skipped++;
          }
        } else {
          await client.query(
            `INSERT INTO hs_codes (company_id,code,description_en,description_ar,duty_rate_ar,duty_rate_en,procedures,effective_date,is_active,created_at,updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())`,
            [companyId, code, descEn, descAr, dutyRateAr, dutyRateEn, procs, effDate]
          );
          inserted++;
        }
      }

      // ── Auto-create tariff entries from duty rate data ──
      let tariffsCreated = 0;
      for (const row of rows) {
        const code = String(row.code || '').trim().slice(0, 50);
        if (!code) continue;
        const rateStr = String(row.duty_rate_en || row.duty_rate_ar || '').trim().toLowerCase();
        if (!rateStr) continue;

        // Determine rule type and rate
        let dutyRatePercent = 0;
        let notesEn = '';
        let notesAr = '';
        const isProhibited = rateStr.includes('prohibit') || rateStr.includes('محظور') || rateStr.includes('ممنوع');
        const isExempt = rateStr.includes('exempt') || rateStr.includes('معف');

        if (isProhibited) {
          notesEn = 'Prohibited';
          notesAr = 'محظور';
          dutyRatePercent = 0;
        } else if (isExempt) {
          notesEn = 'Exempt';
          notesAr = 'معفاة';
          dutyRatePercent = 0;
        } else {
          const m = rateStr.match(/([\d.]+)\s*%?/);
          if (m) dutyRatePercent = parseFloat(m[1]);
        }

        const tariffEffFrom = row.effective_date
          ? (() => {
              const raw = String(row.effective_date).trim();
              if (/^\d{5}$/.test(raw)) {
                const d = new Date((Number(raw) - 25569) * 86400000);
                return d.toISOString().slice(0, 10);
              } else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
                return raw.slice(0, 10);
              } else {
                const d = new Date(raw);
                return isNaN(d.getTime()) ? '2024-01-01' : d.toISOString().slice(0, 10);
              }
            })()
          : '2024-01-01';

        // Upsert into customs_tariffs (company_id, hs_code, country_code='SA', effective_from)
        const existingTariff = await client.query(
          `SELECT id FROM customs_tariffs
           WHERE company_id = $1 AND hs_code = $2 AND country_code = 'SA' AND deleted_at IS NULL
           LIMIT 1`,
          [companyId, code]
        );
        if (existingTariff.rows.length > 0) {
          await client.query(
            `UPDATE customs_tariffs SET duty_rate_percent = $1, notes_en = $2, notes_ar = $3,
             effective_from = $4, updated_at = NOW() WHERE id = $5`,
            [dutyRatePercent, notesEn, notesAr, tariffEffFrom, existingTariff.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO customs_tariffs
             (company_id, hs_code, country_code, duty_rate_percent, effective_from, notes_en, notes_ar,
              is_active, duty_type_code, rate_type, rate_fixed, created_at, updated_at)
             VALUES ($1, $2, 'SA', $3, $4, $5, $6, true, 'import_duty', 'percentage', 0, NOW(), NOW())`,
            [companyId, code, dutyRatePercent, tariffEffFrom, notesEn, notesAr]
          );
          tariffsCreated++;
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    sendSuccess(res, { inserted, updated, skipped, total: rows.length });
  } catch (err: any) {
    console.error('HS-codes import error:', err.message, err.detail || '', err.hint || '');
    sendError(res, 'SERVER_ERROR', err.message || 'Import failed', 500);
  }
});

// ─── PUT /:id ───────────────────────────────────────────────────
router.put('/:id', authenticate, loadCompanyContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description_en, description_ar, duty_rate_ar, duty_rate_en, procedures, effective_date, is_active } = req.body;
    const existing = await pool.query(`SELECT * FROM hs_codes WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'HS code not found', 404);
    const result = await pool.query(
      `UPDATE hs_codes SET code=COALESCE($1,code), description_en=COALESCE($2,description_en),
       description_ar=COALESCE($3,description_ar), duty_rate_ar=COALESCE($4,duty_rate_ar),
       duty_rate_en=COALESCE($5,duty_rate_en), procedures=COALESCE($6,procedures),
       effective_date=COALESCE($7,effective_date), is_active=COALESCE($8,is_active), updated_at=NOW()
       WHERE id = $9 AND deleted_at IS NULL RETURNING *`,
      [code, description_en, description_ar, duty_rate_ar, duty_rate_en, procedures, effective_date, is_active, id]
    );
    res.json({ success: true, data: result.rows[0], message: 'HS code updated' });
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'DUPLICATE', 'Code already exists', 400);
    sendError(res, 'SERVER_ERROR', 'Failed to update HS code', 500);
  }
});

// ─── DELETE /bulk ───────────────────────────────────────────────
router.delete('/bulk', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return sendError(res, 'VALIDATION_ERROR', 'ids array required', 400);
    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `UPDATE hs_codes SET deleted_at = NOW() WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    );
    sendSuccess(res, { deleted: result.rowCount });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to bulk delete', 500);
  }
});

// ─── DELETE /:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT id FROM hs_codes WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (existing.rows.length === 0) return sendError(res, 'NOT_FOUND', 'HS code not found', 404);
    await pool.query(`UPDATE hs_codes SET deleted_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'HS code deleted' });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to delete HS code', 500);
  }
});

export default router;
