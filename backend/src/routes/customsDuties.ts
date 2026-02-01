import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { auditLog } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';

const router = Router();

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseEffectiveDate(query: any): string {
  const raw = String(query.effective_date ?? '').trim();
  // Expect ISO date yyyy-mm-dd; fall back to today
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @route   GET /api/customs-duties
 * @desc    List current effective duty rules (latest tariff per HS/country)
 * @access  Private (logistics:customs_tariffs:view OR customs_duties:view)
 */
router.get(
  '/',
  authenticate,
  loadCompanyContext,
  requireAnyPermission(['logistics:customs_tariffs:view', 'customs_duties:view']),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const { page, limit, offset } = parsePagination(req.query);
      const effectiveDate = parseEffectiveDate(req.query);
      const search = (req.query.search as string | undefined)?.trim();
      const country_code = (req.query.country_code as string | undefined)?.trim();

      const where: string[] = [
        'ct.deleted_at IS NULL',
        'ct.company_id = $1',
        'ct.is_active = TRUE',
        'ct.effective_from <= $2::date',
        '(ct.effective_to IS NULL OR ct.effective_to >= $2::date)',
      ];
      const params: any[] = [companyId, effectiveDate];
      let paramCount = 3;

      if (country_code) {
        where.push(`ct.country_code = $${paramCount}`);
        params.push(country_code);
        paramCount++;
      }

      if (search) {
        where.push(`(
          ct.hs_code ILIKE $${paramCount}
          OR ct.country_code ILIKE $${paramCount}
          OR hs.description_en ILIKE $${paramCount}
          OR hs.description_ar ILIKE $${paramCount}
        )`);
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;

      // Count distinct effective rows (one per HS/country)
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM (
           SELECT DISTINCT ON (ct.hs_code, ct.country_code) ct.id
           FROM customs_tariffs ct
           LEFT JOIN hs_codes hs
             ON hs.company_id = ct.company_id
            AND hs.code = ct.hs_code
            AND hs.deleted_at IS NULL
           ${whereSql}
           ORDER BY ct.hs_code, ct.country_code, ct.effective_from DESC
         ) x`,
        params
      );

      const totalItems = countResult.rows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      const listResult = await pool.query(
        `SELECT
           ct.id,
           ct.hs_code,
           hs.description_en AS hs_description_en,
           hs.description_ar AS hs_description_ar,
           ct.country_code,
           ct.duty_rate_percent,
           ct.effective_from,
           ct.effective_to,
           ct.notes_en,
           ct.notes_ar,
           CASE
             WHEN COALESCE(ct.notes_en, '') ILIKE '%prohibited%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%ممنوع%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%محظور%'
               THEN 'PROHIBITED'
             WHEN COALESCE(ct.notes_en, '') ILIKE '%exempt%'
               OR COALESCE(ct.notes_ar, '') ILIKE '%معف%'
               THEN 'EXEMPT'
             ELSE 'DUTY'
           END AS rule_type
         FROM (
           SELECT DISTINCT ON (ct.hs_code, ct.country_code) ct.*
           FROM customs_tariffs ct
           LEFT JOIN hs_codes hs
             ON hs.company_id = ct.company_id
            AND hs.code = ct.hs_code
            AND hs.deleted_at IS NULL
           ${whereSql}
           ORDER BY ct.hs_code, ct.country_code, ct.effective_from DESC
           LIMIT $${paramCount} OFFSET $${paramCount + 1}
         ) ct
         LEFT JOIN hs_codes hs
           ON hs.company_id = ct.company_id
          AND hs.code = ct.hs_code
          AND hs.deleted_at IS NULL
         ORDER BY ct.hs_code ASC, ct.country_code ASC`,
        [...params, limit, offset]
      );

      return res.json({
        success: true,
        data: listResult.rows,
        total: totalItems,
        meta: {
          effective_date: effectiveDate,
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
        },
      });
    } catch (error) {
      console.error('Error fetching customs duties:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch customs duties' },
      });
    }
  }
);

export default router;
