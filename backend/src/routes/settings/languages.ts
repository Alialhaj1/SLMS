import { Router } from 'express';
import { z } from 'zod';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext, requireCompany } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);
router.use(requireCompany);

async function ensureCompanyLanguages(companyId: number) {
  const existing = await pool.query('SELECT 1 FROM company_languages WHERE company_id = $1 LIMIT 1', [companyId]);
  if (existing.rows.length > 0) return;

  // Seed from system_languages (only EN/AR in current UI)
  await pool.query(
    `INSERT INTO company_languages (company_id, language_code, is_enabled, is_default)
     SELECT $1, sl.code, TRUE, (sl.code = 'en')
     FROM system_languages sl
     WHERE sl.code IN ('en', 'ar')`,
    [companyId]
  );
}

router.get('/', requirePermission('settings:language:view'), async (req, res) => {
  try {
    const companyId = req.companyId as number;
    await ensureCompanyLanguages(companyId);

    const result = await pool.query(
      `SELECT cl.language_code AS code,
              COALESCE(sl.name_native, sl.name_en) AS name,
              cl.is_enabled,
              cl.is_default
       FROM company_languages cl
       JOIN system_languages sl ON sl.code = cl.language_code
       WHERE cl.company_id = $1
       ORDER BY cl.is_default DESC, cl.language_code ASC`,
      [companyId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load company languages' });
  }
});

router.put('/default', requirePermission('settings:language:update'), auditLog, async (req, res) => {
  const companyId = req.companyId as number;
  const userId = req.user?.id;

  const schema = z.object({ language_code: z.string().trim().min(2).max(10) });
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid language code' });
  }

  await ensureCompanyLanguages(companyId);

  const code = input.language_code;

  const exists = await pool.query(
    'SELECT language_code, is_enabled FROM company_languages WHERE company_id = $1 AND language_code = $2',
    [companyId, code]
  );

  if (exists.rows.length === 0) {
    return res.status(404).json({ error: 'Language not found for company' });
  }

  if (!exists.rows[0].is_enabled) {
    return res.status(409).json({ error: 'Language must be enabled to set as default' });
  }

  const before = await pool.query(
    `SELECT language_code, is_enabled, is_default
     FROM company_languages
     WHERE company_id = $1
     ORDER BY is_default DESC, language_code ASC`,
    [companyId]
  );

  (req as any).auditContext = {
    ...(req as any).auditContext,
    before: before.rows,
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE company_languages
       SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP, updated_by = $2
       WHERE company_id = $1`,
      [companyId, userId ?? null]
    );

    await client.query(
      `UPDATE company_languages
       SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP, updated_by = $3
       WHERE company_id = $1 AND language_code = $2`,
      [companyId, code, userId ?? null]
    );

    await client.query('COMMIT');

    const after = await pool.query(
      `SELECT language_code, is_enabled, is_default
       FROM company_languages
       WHERE company_id = $1
       ORDER BY is_default DESC, language_code ASC`,
      [companyId]
    );

    (req as any).auditContext = {
      ...(req as any).auditContext,
      after: after.rows,
    };

    return res.json({ success: true, data: { language_code: code } });
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to update default language' });
  } finally {
    client.release();
  }
});

router.put('/:code', requirePermission('settings:language:update'), auditLog, async (req, res) => {
  const companyId = req.companyId as number;
  const userId = req.user?.id;
  const code = String(req.params.code);

  const schema = z.object({ is_enabled: z.boolean() });
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid request' });
  }

  await ensureCompanyLanguages(companyId);

  const existing = await pool.query(
    'SELECT is_default FROM company_languages WHERE company_id = $1 AND language_code = $2',
    [companyId, code]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Language not found for company' });
  }

  if (existing.rows[0].is_default && input.is_enabled === false) {
    return res.status(409).json({ error: 'Default language cannot be disabled' });
  }

  const before = await pool.query(
    `SELECT language_code, is_enabled, is_default
     FROM company_languages
     WHERE company_id = $1 AND language_code = $2`,
    [companyId, code]
  );

  (req as any).auditContext = {
    ...(req as any).auditContext,
    before: before.rows?.[0] || null,
  };

  await pool.query(
    `UPDATE company_languages
     SET is_enabled = $3, updated_at = CURRENT_TIMESTAMP, updated_by = $4
     WHERE company_id = $1 AND language_code = $2`,
    [companyId, code, input.is_enabled, userId ?? null]
  );

  const after = await pool.query(
    `SELECT language_code, is_enabled, is_default
     FROM company_languages
     WHERE company_id = $1 AND language_code = $2`,
    [companyId, code]
  );

  (req as any).auditContext = {
    ...(req as any).auditContext,
    after: after.rows?.[0] || null,
  };

  return res.json({ success: true });
});

export default router;
