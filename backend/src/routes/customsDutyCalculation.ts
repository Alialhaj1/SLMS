import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../middleware/auditLog';
import { loadCompanyContext } from '../middleware/companyContext';
import { z } from 'zod';

const router = Router();

const calcSchema = z.object({
  hs_code: z.string().min(1).max(50),
  country_code: z.string().min(1).max(10).default('SA'),
  customs_value: z.number().positive(),
  effective_date: z.string().optional(), // yyyy-mm-dd
});

function toIsoDate(input?: string) {
  const raw = String(input ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function detectRuleType(notesEn: string | null, notesAr: string | null) {
  const en = (notesEn ?? '').toLowerCase();
  const ar = (notesAr ?? '').toLowerCase();
  if (en.includes('prohibited') || ar.includes('ممنوع') || ar.includes('محظور')) return 'PROHIBITED';
  if (en.includes('exempt') || ar.includes('معف')) return 'EXEMPT';
  return 'DUTY';
}

/**
 * @route   POST /api/customs-duty-calculation
 * @desc    Calculate duty for HS code and customs value (uses current effective tariff)
 * @access  Private (logistics:customs_tariffs:view)
 */
router.post(
  '/',
  authenticate,
  loadCompanyContext,
  requirePermission('logistics:customs_tariffs:view'),
  auditLog,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId;
      const payload = calcSchema.parse(req.body);
      const effectiveDate = toIsoDate(payload.effective_date);

      const tariffResult = await pool.query(
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
           ct.notes_ar
         FROM customs_tariffs ct
         LEFT JOIN hs_codes hs
           ON hs.company_id = ct.company_id
          AND hs.code = ct.hs_code
          AND hs.deleted_at IS NULL
         WHERE ct.company_id = $1
           AND ct.deleted_at IS NULL
           AND ct.is_active = TRUE
           AND ct.hs_code = $2
           AND ct.country_code = $3
           AND ct.effective_from <= $4::date
           AND (ct.effective_to IS NULL OR ct.effective_to >= $4::date)
         ORDER BY ct.effective_from DESC
         LIMIT 1`,
        [companyId, payload.hs_code, payload.country_code, effectiveDate]
      );

      if (tariffResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'No applicable tariff rule found for this HS/country/date' },
        });
      }

      const rule = tariffResult.rows[0];
      const dutyRate = Number(rule.duty_rate_percent ?? 0);
      const dutyAmount = Math.round(payload.customs_value * (dutyRate / 100) * 100) / 100;
      const ruleType = detectRuleType(rule.notes_en ?? null, rule.notes_ar ?? null);

      return res.json({
        success: true,
        data: {
          effective_date: effectiveDate,
          hs_code: rule.hs_code,
          hs_description_en: rule.hs_description_en,
          hs_description_ar: rule.hs_description_ar,
          country_code: rule.country_code,
          tariff_id: rule.id,
          duty_rate_percent: dutyRate,
          customs_value: payload.customs_value,
          duty_amount: dutyAmount,
          rule_type: ruleType,
          notes_en: rule.notes_en,
          notes_ar: rule.notes_ar,
        },
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: error.errors },
        });
      }

      console.error('Error calculating customs duty:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to calculate duty' },
      });
    }
  }
);

export default router;
