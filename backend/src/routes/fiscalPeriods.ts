import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function monthName(month: number): string {
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return names[month - 1] || `Month ${month}`;
}

// =============================================
// GET /api/fiscal-periods - List accounting periods
// =============================================
router.get(
  '/',
  requireAnyPermission(['finance:periods:view', 'accounting:periods:view']),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT
          ap.id,
          ap.year,
          ap.month,
          ap.period_name,
          ap.start_date,
          ap.end_date,
          ap.status,
          ap.closed_at,
          ap.closed_by,
          ap.notes,
          ap.created_at,
          COALESCE(u.full_name, u.email) AS closed_by_name
         FROM accounting_periods ap
         LEFT JOIN users u ON u.id = ap.closed_by
         WHERE ap.company_id = $1
         ORDER BY ap.year DESC, ap.month ASC`,
        [req.companyId]
      );

      const data = result.rows.map((row: any) => {
        const fiscalYear = Number(row.year);
        const month = Number(row.month);
        return {
          id: row.id,
          code: `FP-${fiscalYear}-${String(month).padStart(2, '0')}`,
          name: row.period_name || `${monthName(month)} ${fiscalYear}`,
          name_ar: null,
          fiscal_year: fiscalYear,
          period_type: 'month',
          period_number: month,
          start_date: row.start_date,
          end_date: row.end_date,
          status: row.status,
          is_adjustment_period: false,
          is_year_end: month === 12,
          previous_period_id: null,
          closed_by: row.closed_by_name || null,
          closed_at: row.closed_at,
          notes: row.notes,
          created_at: row.created_at,
        };
      });

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching fiscal periods:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch fiscal periods' });
    }
  }
);

// =============================================
// POST /api/fiscal-periods/generate - Generate 12 monthly periods for a year
// =============================================
router.post(
  '/generate',
  requireAnyPermission(['finance:periods:manage', 'accounting:periods:manage', 'accounting:periods:create']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;

      const year = Number(req.body?.year);
      if (!Number.isInteger(year) || year < 1900 || year > 3000) {
        return res.status(400).json({ success: false, error: 'Invalid year' });
      }

      const fiscalYearId = await ensureFiscalYearId(companyId, year, userId);

      let created = 0;
      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const inserted = await pool.query(
          `INSERT INTO accounting_periods (
              company_id, fiscal_year_id, year, month, period_name,
              start_date, end_date, status, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, 'open', $8)
           ON CONFLICT (company_id, year, month) DO NOTHING
           RETURNING id`,
          [
            companyId,
            fiscalYearId,
            year,
            month,
            `${monthName(month)} ${year}`,
            startStr,
            endStr,
            userId ?? null,
          ]
        );
        if (inserted.rows.length > 0) created += 1;
      }

      return res.status(201).json({ success: true, data: { created } });
    } catch (error: any) {
      console.error('Error generating fiscal periods:', error);
      return res.status(500).json({ success: false, error: 'Failed to generate fiscal periods' });
    }
  }
);

async function ensureFiscalYearId(companyId: number, year: number, userId?: number): Promise<number | null> {
  // Create fiscal year record if it doesn't exist.
  // Uses calendar-year defaults (Jan 1 - Dec 31).
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const inserted = await pool.query(
    `INSERT INTO fiscal_years (company_id, year, name, start_date, end_date, created_by)
     VALUES ($1, $2, $3, $4::date, $5::date, $6)
     ON CONFLICT (company_id, year) DO NOTHING
     RETURNING id`,
    [companyId, year, String(year), startDate, endDate, userId ?? null]
  );

  if (inserted.rows.length > 0) {
    return inserted.rows[0].id;
  }

  const existing = await pool.query(
    `SELECT id FROM fiscal_years WHERE company_id = $1 AND year = $2 LIMIT 1`,
    [companyId, year]
  );

  return existing.rows[0]?.id ?? null;
}

// =============================================
// POST /api/fiscal-periods - Create period (monthly)
// =============================================
router.post(
  '/',
  requireAnyPermission(['finance:periods:manage', 'accounting:periods:create', 'accounting:periods:manage']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;

      const {
        fiscal_year,
        period_type,
        period_number,
        start_date,
        end_date,
        status,
        name,
        notes,
      } = req.body || {};

      const year = Number(fiscal_year);
      const month = Number(period_number);

      if (!Number.isInteger(year) || year < 1900 || year > 3000) {
        return res.status(400).json({ success: false, error: 'Invalid fiscal_year' });
      }

      if (period_type && period_type !== 'month') {
        return res.status(400).json({ success: false, error: 'Only monthly periods are supported' });
      }

      if (!Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, error: 'period_number must be between 1 and 12' });
      }

      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, error: 'start_date and end_date are required' });
      }

      const normalizedStatus = status === 'adjustment' ? 'closed' : status;
      if (normalizedStatus && !['open', 'closed', 'locked'].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const fiscalYearId = await ensureFiscalYearId(companyId, year, userId);

      const periodName = (name && String(name).trim()) || `${monthName(month)} ${year}`;

      const result = await pool.query(
        `INSERT INTO accounting_periods (
          company_id,
          fiscal_year_id,
          year,
          month,
          period_name,
          start_date,
          end_date,
          status,
          notes,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10)
        RETURNING id, year, month, period_name, start_date, end_date, status, notes, created_at`,
        [
          companyId,
          fiscalYearId,
          year,
          month,
          periodName,
          start_date,
          end_date,
          normalizedStatus || 'open',
          notes ?? null,
          userId ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error('Error creating fiscal period:', error);
      // Handle unique constraint violation cleanly
      if (String(error?.code) === '23505') {
        return res.status(409).json({ success: false, error: 'Period already exists for this year/month' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create fiscal period' });
    }
  }
);

// =============================================
// PUT /api/fiscal-periods/:id - Update period
// =============================================
router.put(
  '/:id',
  requireAnyPermission(['finance:periods:manage', 'accounting:periods:edit', 'accounting:periods:manage']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const { name, start_date, end_date, status, notes } = req.body || {};

      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, error: 'start_date and end_date are required' });
      }

      const normalizedStatus = status === 'adjustment' ? 'closed' : status;
      if (normalizedStatus && !['open', 'closed', 'locked'].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const exists = await pool.query(
        `SELECT 1 FROM accounting_periods WHERE id = $1 AND company_id = $2 LIMIT 1`,
        [id, companyId]
      );

      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Period not found' });
      }

      await pool.query(
        `UPDATE accounting_periods
         SET
           period_name = $1,
           start_date = $2::date,
           end_date = $3::date,
           status = $4,
           notes = $5,
           closed_at = CASE WHEN $4 = 'closed' AND status <> 'closed' THEN NOW() ELSE closed_at END,
           closed_by = CASE WHEN $4 = 'closed' AND status <> 'closed' THEN $6 ELSE closed_by END,
           locked_at = CASE WHEN $4 = 'locked' AND status <> 'locked' THEN NOW() ELSE locked_at END,
           locked_by = CASE WHEN $4 = 'locked' AND status <> 'locked' THEN $6 ELSE locked_by END,
           reopened_at = CASE WHEN $4 = 'open' AND status <> 'open' THEN NOW() ELSE reopened_at END,
           reopened_by = CASE WHEN $4 = 'open' AND status <> 'open' THEN $6 ELSE reopened_by END,
           updated_at = NOW()
         WHERE id = $7 AND company_id = $8`,
        [
          name ?? null,
          start_date,
          end_date,
          normalizedStatus || 'open',
          notes ?? null,
          userId ?? null,
          id,
          companyId,
        ]
      );

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating fiscal period:', error);
      return res.status(500).json({ success: false, error: 'Failed to update fiscal period' });
    }
  }
);

// =============================================
// DELETE /api/fiscal-periods/:id - Delete period
// =============================================
router.delete(
  '/:id',
  requireAnyPermission(['finance:periods:manage', 'accounting:periods:manage', 'accounting:periods:delete']),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const result = await pool.query(
        `DELETE FROM accounting_periods WHERE id = $1 AND company_id = $2`,
        [id, req.companyId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Period not found' });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting fiscal period:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete fiscal period' });
    }
  }
);

export default router;
