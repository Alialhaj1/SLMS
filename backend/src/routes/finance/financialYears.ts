import { Router } from 'express';
import { z } from 'zod';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext, requireCompany } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { auditLog, captureBeforeState } from '../../middleware/auditLog';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);
router.use(requireCompany);

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function* monthIteratorInclusive(startDate: Date, endDate: Date) {
  let cursor = startOfMonth(startDate);
  const end = startOfMonth(endDate);
  while (cursor.getTime() <= end.getTime()) {
    yield cursor;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
}

async function ensureNoOverlap(companyId: number, start: string, end: string, excludeId?: number) {
  const params: any[] = [companyId, start, end];
  let excludeClause = '';
  if (excludeId) {
    params.push(excludeId);
    excludeClause = 'AND id <> $4';
  }

  const overlap = await pool.query(
    `SELECT 1
     FROM fiscal_years
     WHERE company_id = $1
       AND deleted_at IS NULL
       ${excludeClause}
       AND NOT (end_date < $2 OR start_date > $3)
     LIMIT 1`,
    params
  );

  if (overlap.rows.length > 0) {
    return false;
  }

  return true;
}

async function fiscalYearHasTransactions(companyId: number, fiscalYearId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS(
      SELECT 1
      FROM journal_entries je
      JOIN accounting_periods ap ON ap.id = je.accounting_period_id
      WHERE je.company_id = $1 AND ap.fiscal_year_id = $2
      LIMIT 1
    ) AS has_any`,
    [companyId, fiscalYearId]
  );
  return Boolean(result.rows?.[0]?.has_any);
}

router.get('/', requirePermission('finance:financial_year:view'), async (req, res) => {
  const companyId = req.companyId as number;

  const result = await pool.query(
    `SELECT id,
            name AS year_name,
            start_date,
            end_date,
            CASE WHEN is_closed THEN 'closed' ELSE 'open' END AS status,
            is_default,
            created_at,
            updated_at
     FROM fiscal_years
     WHERE company_id = $1 AND deleted_at IS NULL
     ORDER BY is_default DESC, start_date DESC`,
    [companyId]
  );

  return res.json({ success: true, data: result.rows });
});

router.post('/', requirePermission('finance:financial_year:create'), auditLog, async (req, res) => {
  const companyId = req.companyId as number;
  const userId = req.user?.id;

  const schema = z.object({
    year_name: z.string().trim().min(1).max(100),
    start_date: z.string().min(10).max(10),
    end_date: z.string().min(10).max(10),
    is_default: z.boolean().optional(),
  });

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid financial year data' });
  }

  if (input.start_date > input.end_date) {
    return res.status(400).json({ error: 'Start date must be before end date' });
  }

  const ok = await ensureNoOverlap(companyId, input.start_date, input.end_date);
  if (!ok) {
    return res.status(409).json({ error: 'Financial year dates overlap an existing year' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (input.is_default) {
      await client.query(
        `UPDATE fiscal_years
         SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND deleted_at IS NULL AND is_default = TRUE`,
        [companyId]
      );
    }

    const fyResult = await client.query(
      `INSERT INTO fiscal_years (company_id, year, name, start_date, end_date, is_closed, is_default, created_by)
       VALUES ($1, $2, $3, $4::date, $5::date, FALSE, $6, $7)
       RETURNING id,
                 name AS year_name,
                 start_date,
                 end_date,
                 CASE WHEN is_closed THEN 'closed' ELSE 'open' END AS status,
                 is_default,
                 created_at,
                 updated_at`,
      [
        companyId,
        Number(input.start_date.slice(0, 4)),
        input.year_name,
        input.start_date,
        input.end_date,
        Boolean(input.is_default),
        userId ?? null,
      ]
    );

    const fiscalYearId = fyResult.rows[0].id as number;

    const start = new Date(input.start_date + 'T00:00:00.000Z');
    const end = new Date(input.end_date + 'T00:00:00.000Z');

    for (const monthStart of monthIteratorInclusive(start, end)) {
      const periodStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1));
      const periodEnd = endOfMonth(monthStart);

      // Clip to fiscal year boundaries
      const clippedStart = periodStart < start ? start : periodStart;
      const clippedEnd = periodEnd > end ? end : periodEnd;

      await client.query(
        `INSERT INTO accounting_periods (company_id, fiscal_year_id, year, month, period_name, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, 'open')
         ON CONFLICT (company_id, year, month)
         DO NOTHING`,
        [
          companyId,
          fiscalYearId,
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth() + 1,
          `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`,
          clippedStart.toISOString().slice(0, 10),
          clippedEnd.toISOString().slice(0, 10),
        ]
      );
    }

    await client.query('COMMIT');

    (req as any).auditContext = {
      ...(req as any).auditContext,
      after: fyResult.rows[0],
    };

    return res.status(201).json({ success: true, data: fyResult.rows[0] });
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to create financial year' });
  } finally {
    client.release();
  }
});

router.put(
  '/:id',
  requirePermission('finance:financial_year:update'),
  auditLog,
  async (req, res) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id;
    const fiscalYearId = Number(req.params.id);

    if (!Number.isFinite(fiscalYearId)) {
      return res.status(400).json({ error: 'Invalid fiscal year ID' });
    }

    const schema = z.object({
      year_name: z.string().trim().min(1).max(50).optional(),
      start_date: z.string().min(10).max(10).optional(),
      end_date: z.string().min(10).max(10).optional(),
      is_default: z.boolean().optional(),
    });

    let input: z.infer<typeof schema>;
    try {
      input = schema.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid financial year data' });
    }

    const existing = await pool.query(
      `SELECT id, start_date, end_date, is_closed
       FROM fiscal_years
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [fiscalYearId, companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Financial year not found' });
    }

    if (existing.rows[0].is_closed) {
      return res.status(409).json({ error: 'Closed financial year cannot be edited' });
    }

    const nextStart = input.start_date ?? String(existing.rows[0].start_date).slice(0, 10);
    const nextEnd = input.end_date ?? String(existing.rows[0].end_date).slice(0, 10);

    if (nextStart > nextEnd) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    const hasTx = await fiscalYearHasTransactions(companyId, fiscalYearId);
    if (hasTx && (input.start_date || input.end_date)) {
      return res.status(409).json({ error: 'Financial year dates cannot be changed after transactions exist' });
    }

    const ok = await ensureNoOverlap(companyId, nextStart, nextEnd, fiscalYearId);
    if (!ok) {
      return res.status(409).json({ error: 'Financial year dates overlap an existing year' });
    }

    await captureBeforeState(req as any, 'fiscal_years', fiscalYearId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (input.is_default) {
        await client.query(
          `UPDATE fiscal_years
           SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP
           WHERE company_id = $1 AND deleted_at IS NULL AND is_default = TRUE`,
          [companyId]
        );
      }

      const updateResult = await client.query(
        `UPDATE fiscal_years
         SET name = COALESCE($3, name),
             start_date = COALESCE($4::date, start_date),
             end_date = COALESCE($5::date, end_date),
             is_default = COALESCE($6, is_default),
             updated_at = CURRENT_TIMESTAMP,
         WHERE id = $7 AND company_id = $1 AND deleted_at IS NULL
         RETURNING id,
                   name AS year_name,
                   start_date,
                   end_date,
                   CASE WHEN is_closed THEN 'closed' ELSE 'open' END AS status,
                   is_default,
                   created_at,
                   updated_at`,
        [companyId, userId ?? null, input.year_name ?? null, input.start_date ?? null, input.end_date ?? null, input.is_default ?? null, fiscalYearId]
      );

      await client.query('COMMIT');

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: updateResult.rows[0],
      };

      return res.json({ success: true, data: updateResult.rows[0] });
    } catch {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to update financial year' });
    } finally {
      client.release();
    }
  }
);

router.post(
  '/:id/set-default',
  requirePermission('finance:financial_year:update'),
  async (req, res) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id;
    const fiscalYearId = Number(req.params.id);

    if (!Number.isFinite(fiscalYearId)) {
      return res.status(400).json({ error: 'Invalid fiscal year ID' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(
        `SELECT id, is_closed
         FROM fiscal_years
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [fiscalYearId, companyId]
      );

      if (exists.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Financial year not found' });
      }

      if (exists.rows[0].is_closed) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Closed financial year cannot be set as default' });
      }

      await client.query(
        `UPDATE fiscal_years
         SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND deleted_at IS NULL AND is_default = TRUE`,
        [companyId]
      );

      await client.query(
        `UPDATE fiscal_years
         SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [fiscalYearId, companyId]
      );

      await client.query('COMMIT');
      return res.json({ success: true });
    } catch {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to set default financial year' });
    } finally {
      client.release();
    }
  }
);

router.post(
  '/:id/close',
  requirePermission('finance:financial_year:close'),
  auditLog,
  async (req, res) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id;
    const fiscalYearId = Number(req.params.id);

    if (!Number.isFinite(fiscalYearId)) {
      return res.status(400).json({ error: 'Invalid fiscal year ID' });
    }

    await captureBeforeState(req as any, 'fiscal_years', fiscalYearId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(
        `SELECT id, is_closed
         FROM fiscal_years
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [fiscalYearId, companyId]
      );

      if (exists.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Financial year not found' });
      }

      if (exists.rows[0].is_closed) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Financial year is already closed' });
      }

      await client.query(
        `UPDATE accounting_periods
         SET status = 'closed',
             closed_at = CURRENT_TIMESTAMP,
             closed_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND fiscal_year_id = $2`,
        [companyId, fiscalYearId, userId ?? null]
      );

      await client.query(
        `UPDATE fiscal_years
         SET is_closed = TRUE,
             closed_at = CURRENT_TIMESTAMP,
             closed_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $1 AND deleted_at IS NULL`,
        [companyId, fiscalYearId, userId ?? null]
      );

      await client.query('COMMIT');

      const after = await pool.query(
        `SELECT id,
                name AS year_name,
                start_date,
                end_date,
                CASE WHEN is_closed THEN 'closed' ELSE 'open' END AS status,
                is_default,
                created_at,
                updated_at
         FROM fiscal_years
         WHERE id = $1 AND company_id = $2`,
        [fiscalYearId, companyId]
      );

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: after.rows?.[0] || { id: fiscalYearId, company_id: companyId, status: 'closed' },
      };

      return res.json({ success: true });
    } catch {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to close financial year' });
    } finally {
      client.release();
    }
  }
);

router.delete(
  '/:id',
  requirePermission('finance:financial_year:update'),
  auditLog,
  async (req, res) => {
    const companyId = req.companyId as number;
    const userId = req.user?.id;
    const fiscalYearId = Number(req.params.id);

    if (!Number.isFinite(fiscalYearId)) {
      return res.status(400).json({ error: 'Invalid fiscal year ID' });
    }

    const exists = await pool.query(
      `SELECT id, is_closed
       FROM fiscal_years
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [fiscalYearId, companyId]
    );

    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Financial year not found' });
    }

    if (exists.rows[0].is_closed) {
      return res.status(409).json({ error: 'Closed financial year cannot be deleted' });
    }

    const hasTx = await fiscalYearHasTransactions(companyId, fiscalYearId);
    if (hasTx) {
      return res.status(409).json({ error: 'Financial year is in use and cannot be deleted' });
    }

    await captureBeforeState(req as any, 'fiscal_years', fiscalYearId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM accounting_periods
         WHERE company_id = $1 AND fiscal_year_id = $2`,
        [companyId, fiscalYearId]
      );

      await client.query(
        `UPDATE fiscal_years
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND company_id = $1 AND deleted_at IS NULL`,
        [companyId, fiscalYearId]
      );

      await client.query('COMMIT');

      (req as any).auditContext = {
        ...(req as any).auditContext,
        after: { deleted: true, id: fiscalYearId, company_id: companyId },
      };
      return res.json({ success: true });
    } catch {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to delete financial year' });
    } finally {
      client.release();
    }
  }
);

export default router;
