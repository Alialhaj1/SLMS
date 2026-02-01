import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

async function ensureFiscalYearId(companyId: number, year: number, userId?: number): Promise<number> {
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

  if (!existing.rows[0]?.id) {
    throw new Error('Failed to resolve fiscal year');
  }

  return existing.rows[0].id;
}

// =============================================
// GET /api/budgets
// =============================================
router.get(
  '/',
  requireAnyPermission(['accounting:budgets:view']),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const { year, status, category, search } = req.query as any;

      const params: any[] = [req.companyId];
      let idx = 2;

      let where = 'WHERE b.company_id = $1';
      if (year) {
        where += ` AND fy.year = $${idx}`;
        params.push(Number(year));
        idx++;
      }
      if (status && ['draft', 'pending', 'approved', 'active', 'closed'].includes(String(status))) {
        where += ` AND b.status = $${idx}`;
        params.push(String(status));
        idx++;
      }
      if (category && ['revenue', 'expense', 'capital'].includes(String(category))) {
        where += ` AND b.category = $${idx}`;
        params.push(String(category));
        idx++;
      }
      if (search) {
        where += ` AND (b.code ILIKE $${idx} OR b.name ILIKE $${idx} OR COALESCE(b.name_ar,'') ILIKE $${idx} OR COALESCE(b.department,'') ILIKE $${idx} OR COALESCE(b.department_ar,'') ILIKE $${idx})`;
        params.push(`%${String(search)}%`);
        idx++;
      }

      const result = await pool.query(
        `SELECT
           b.id,
           b.code,
           b.name,
           b.name_ar,
           fy.year AS fiscal_year,
           b.department,
           b.department_ar,
           b.category,
           b.budgeted_amount,
           b.actual_amount,
           (b.budgeted_amount - b.actual_amount) AS variance,
           CASE WHEN b.budgeted_amount = 0 THEN 0 ELSE ((b.budgeted_amount - b.actual_amount) / b.budgeted_amount) * 100 END AS variance_percent,
           b.status,
           b.start_date,
           b.end_date,
           b.notes
         FROM budgets b
         JOIN fiscal_years fy ON fy.id = b.fiscal_year_id
         ${where}
         ORDER BY fy.year DESC, b.code ASC`,
        params
      );

      return res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error('Error fetching budgets:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch budgets' });
    }
  }
);

// =============================================
// POST /api/budgets
// =============================================
router.post(
  '/',
  requireAnyPermission(['accounting:budgets:create', 'accounting:budgets:edit']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const userId = req.user?.id as number | undefined;

      const {
        code,
        name,
        name_ar,
        fiscal_year,
        department,
        department_ar,
        category,
        budgeted_amount,
        start_date,
        end_date,
        status,
        notes,
      } = req.body || {};

      const normalizedCode = String(code || '').trim();
      const normalizedName = String(name || '').trim();

      if (!normalizedCode) return res.status(400).json({ success: false, error: 'code is required' });
      if (!normalizedName) return res.status(400).json({ success: false, error: 'name is required' });

      const year = Number(fiscal_year);
      if (!Number.isInteger(year) || year < 1900 || year > 3000) {
        return res.status(400).json({ success: false, error: 'Invalid fiscal_year' });
      }

      if (!['revenue', 'expense', 'capital'].includes(String(category))) {
        return res.status(400).json({ success: false, error: 'Invalid category' });
      }

      const fiscalYearId = await ensureFiscalYearId(companyId, year, userId);

      const amount = Number(budgeted_amount || 0);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ success: false, error: 'Invalid budgeted_amount' });
      }

      const normalizedStatus = status && ['draft', 'pending', 'approved', 'active', 'closed'].includes(String(status))
        ? String(status)
        : 'draft';

      const result = await pool.query(
        `INSERT INTO budgets (
          company_id, fiscal_year_id,
          code, name, name_ar,
          department, department_ar,
          category,
          budgeted_amount,
          status,
          start_date, end_date,
          notes,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12::date, $13, $14)
        RETURNING id`,
        [
          companyId,
          fiscalYearId,
          normalizedCode,
          normalizedName,
          name_ar ?? null,
          department ?? null,
          department_ar ?? null,
          String(category),
          amount,
          normalizedStatus,
          start_date ?? null,
          end_date ?? null,
          notes ?? null,
          userId ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: { id: result.rows[0].id } });
    } catch (error: any) {
      console.error('Error creating budget:', error);
      if (String(error?.code) === '23505') {
        return res.status(409).json({ success: false, error: 'Budget code already exists' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create budget' });
    }
  }
);

// =============================================
// PUT /api/budgets/:id
// =============================================
router.put(
  '/:id',
  requireAnyPermission(['accounting:budgets:edit']),
  requireCompany,
  async (req: any, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const {
        name,
        name_ar,
        department,
        department_ar,
        category,
        budgeted_amount,
        start_date,
        end_date,
        status,
        notes,
      } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }

      if (category && !['revenue', 'expense', 'capital'].includes(String(category))) {
        return res.status(400).json({ success: false, error: 'Invalid category' });
      }

      const amount = Number(budgeted_amount || 0);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ success: false, error: 'Invalid budgeted_amount' });
      }

      const normalizedStatus = status && ['draft', 'pending', 'approved', 'active', 'closed'].includes(String(status))
        ? String(status)
        : undefined;

      const exists = await pool.query(
        `SELECT 1 FROM budgets WHERE id = $1 AND company_id = $2 LIMIT 1`,
        [id, companyId]
      );
      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      await pool.query(
        `UPDATE budgets
         SET
           name = $1,
           name_ar = $2,
           department = $3,
           department_ar = $4,
           category = COALESCE($5, category),
           budgeted_amount = $6,
           status = COALESCE($7, status),
           start_date = $8::date,
           end_date = $9::date,
           notes = $10,
           updated_at = NOW()
         WHERE id = $11 AND company_id = $12`,
        [
          String(name).trim(),
          name_ar ?? null,
          department ?? null,
          department_ar ?? null,
          category ?? null,
          amount,
          normalizedStatus ?? null,
          start_date ?? null,
          end_date ?? null,
          notes ?? null,
          id,
          companyId,
        ]
      );

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating budget:', error);
      return res.status(500).json({ success: false, error: 'Failed to update budget' });
    }
  }
);

// =============================================
// DELETE /api/budgets/:id
// =============================================
router.delete(
  '/:id',
  requireAnyPermission(['accounting:budgets:delete']),
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const companyId = req.companyId as number;
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: 'Invalid id' });
      }

      const result = await pool.query(
        `DELETE FROM budgets WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete budget' });
    }
  }
);

export default router;
