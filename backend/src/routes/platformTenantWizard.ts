/**
 * ============================================================
 * Tenant Wizard Routes — Architecture §5.2
 * ============================================================
 *
 * 4-step wizard for creating a new tenant:
 *   Step 1: POST /validate          — validate company info
 *   Step 2: POST /validate-admin    — validate admin user info
 *   Step 3: GET  /available-modules — list available modules
 *   Step 4: (frontend-only review)
 *   Final:  POST /                  — create tenant (full provisioning)
 *
 * Automatic operations on creation:
 *   1. Create tenant record in `tenants` table
 *   2. Create company record in `companies` table
 *   3. Provision tenant schema (CREATE SCHEMA tenant_{code})
 *   4. Seed reference data (cities, payment terms, statuses, etc.)
 *   5. Create admin user (Tenant Owner)
 *   6. Assign roles + permissions
 *   7. Enable requested modules in `tenant_modules`
 *   8. Log to audit_logs + subscription_history
 *   9. (Future) Send welcome email, add webhook for Enterprise
 *
 * Access: platform.tenants.create
 * ============================================================
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { platformGate } from '../middleware/platformGateway';
import pool from '../db';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import { TenantSchemaService } from '../services/tenantSchemaService';
import logger from '../utils/logger';

const router = Router();

// ────────────────────────────────────────────
// Step 1: POST /validate — Validate company info
// ────────────────────────────────────────────
router.post('/validate', authenticate, platformGate('platform.tenants.create'), async (req: Request, res: Response) => {
  try {
    const { company_name, company_name_ar, company_code, country, currency, language, plan, vat_number } = req.body;
    const errors: Record<string, string> = {};

    // Required fields
    if (!company_name?.trim()) errors.company_name = 'Company name is required';
    if (company_name && company_name.trim().length < 2) errors.company_name = 'Company name must be at least 2 characters';

    // Auto-generate or validate company code
    let code = company_code?.trim().toUpperCase();
    if (!code) {
      // Auto-generate: first 3 letters + random suffix
      const base = (company_name || 'XXX').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      code = `${base}-${suffix}`;
    } else {
      if (!/^[A-Z0-9-]{2,20}$/.test(code)) {
        errors.company_code = 'Company code must be 2-20 characters: letters, numbers, hyphens only';
      }
    }

    // Check duplicate company code
    if (code && !errors.company_code) {
      const existing = await pool.query(
        `SELECT id FROM companies WHERE UPPER(code) = $1 AND deleted_at IS NULL
         UNION ALL
         SELECT id FROM tenants WHERE UPPER(company_code) = $1`,
        [code]
      );
      if (existing.rows.length > 0) {
        errors.company_code = 'Company code already exists';
      }
    }

    // Validate country
    const validCountries = ['SAU', 'UAE', 'KWT', 'BHR', 'OMN', 'QAT', 'EGY', 'JOR', 'IRQ', 'LBN'];
    if (country && !validCountries.includes(country)) {
      errors.country = `Invalid country. Valid: ${validCountries.join(', ')}`;
    }

    // Validate plan
    const validPlans = ['Starter', 'Professional', 'Enterprise', 'Free', 'Basic'];
    if (plan && !validPlans.includes(plan)) {
      errors.plan = `Invalid plan. Valid: ${validPlans.join(', ')}`;
    }

    // VAT number format (Saudi Arabia)
    if (vat_number && country === 'SAU' && !/^\d{15}$/.test(vat_number)) {
      errors.vat_number = 'Saudi VAT number must be 15 digits';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors, valid: false });
    }

    sendSuccess(res, {
      valid: true,
      generated_code: code,
      company_name: company_name.trim(),
      company_name_ar: company_name_ar?.trim() || null,
      country: country || 'SAU',
      currency: currency || 'SAR',
      language: language || 'ar',
      plan: plan || 'Starter',
    });
  } catch (err: any) {
    logger.error('Tenant wizard validation failed', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Validation failed', 500);
  }
});

// ────────────────────────────────────────────
// Step 2: POST /validate-admin — Validate admin user info
// ────────────────────────────────────────────
router.post('/validate-admin', authenticate, platformGate('platform.tenants.create'), async (req: Request, res: Response) => {
  try {
    const { admin_name, admin_email, admin_phone, admin_password } = req.body;
    const errors: Record<string, string> = {};

    if (!admin_name?.trim()) errors.admin_name = 'Admin name is required';
    if (!admin_email?.trim()) errors.admin_email = 'Admin email is required';

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (admin_email && !emailRegex.test(admin_email)) {
      errors.admin_email = 'Invalid email format';
    }

    // Check duplicate email
    if (admin_email && !errors.admin_email) {
      const existing = await pool.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
        [admin_email]
      );
      if (existing.rows.length > 0) {
        errors.admin_email = 'Email already in use by another account';
      }
    }

    // Password strength
    if (admin_password) {
      if (admin_password.length < 8) errors.admin_password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(admin_password)) errors.admin_password = 'Password must contain at least one uppercase letter';
      else if (!/[a-z]/.test(admin_password)) errors.admin_password = 'Password must contain at least one lowercase letter';
      else if (!/[0-9]/.test(admin_password)) errors.admin_password = 'Password must contain at least one number';
    }

    // Phone format (optional)
    if (admin_phone && !/^\+?[0-9]{8,15}$/.test(admin_phone.replace(/[\s-]/g, ''))) {
      errors.admin_phone = 'Invalid phone number format';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors, valid: false });
    }

    sendSuccess(res, {
      valid: true,
      admin_name: admin_name.trim(),
      admin_email: admin_email.trim().toLowerCase(),
      admin_phone: admin_phone || null,
    });
  } catch (err: any) {
    logger.error('Admin validation failed', { error: err.message });
    sendError(res, 'SERVER_ERROR', 'Validation failed', 500);
  }
});

// ────────────────────────────────────────────
// Step 3: GET /available-modules — List modules available for selection
// ────────────────────────────────────────────
router.get('/available-modules', authenticate, platformGate('platform.tenants.create'), async (req: Request, res: Response) => {
  try {
    const { plan } = req.query as Record<string, string>;

    const result = await pool.query(`
      SELECT module_code, module_name, name_ar, description, is_core, category, sort_order
      FROM modules
      WHERE is_active = true
      ORDER BY sort_order, module_code
    `);

    // Load plan limits if a plan is specified
    let planLimits: any = null;
    if (plan) {
      const planResult = await pool.query(
        `SELECT plan_name, max_users, max_companies, max_branches, features, price_monthly, price_yearly
         FROM subscription_plans WHERE LOWER(plan_name) = LOWER($1) AND is_active = true LIMIT 1`,
        [plan]
      );
      if (planResult.rows.length > 0) planLimits = planResult.rows[0];
    }

    sendSuccess(res, {
      modules: result.rows.map((m: any) => ({
        ...m,
        // Core modules are always included and cannot be deselected
        required: m.is_core,
      })),
      plan_limits: planLimits,
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', 'Failed to fetch modules', 500);
  }
});

// ────────────────────────────────────────────
// Final: POST / — Create tenant (full provisioning)
// ────────────────────────────────────────────
router.post('/', authenticate, platformGate('platform.tenants.create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      // Step 1: Company info
      company_name, company_name_ar, company_code, country, currency, language, plan,
      vat_number, contract_start, contract_end  ,status: initialStatus,
      // Step 2: Admin info
      admin_name, admin_email, admin_phone, admin_password,
      // Step 3: Modules
      modules: selectedModules, max_users, max_shipments,
      // From approved request (optional link)
      request_id,
    } = req.body;

    // ── Final validation ─────────────────────
    if (!company_name?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Company name is required', 400);
    if (!company_code?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Company code is required', 400);
    if (!admin_email?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Admin email is required', 400);
    if (!admin_name?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Admin name is required', 400);

    // Generate temp password if not provided
    const password = admin_password || `Slms@${Math.random().toString(36).substring(2, 8)}${Math.floor(Math.random() * 100)}`;
    const mustChangePassword = !admin_password; // force change if auto-generated

    const code = company_code.trim().toUpperCase();
    const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const domain = slug + '.slms.local';

    await client.query('BEGIN');

    // ── 1. Check duplicates ──────────────────
    const [dupCode, dupEmail] = await Promise.all([
      client.query(
        `SELECT id FROM companies WHERE UPPER(code) = $1 AND deleted_at IS NULL
         UNION SELECT id FROM tenants WHERE UPPER(company_code) = $1`,
        [code]
      ),
      client.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
        [admin_email]
      ),
    ]);
    if (dupCode.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'DUPLICATE', 'Company code already exists', 409);
    }
    if (dupEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'DUPLICATE', 'Admin email already in use', 409);
    }

    // ── 2. Create tenant record ──────────────
    const tenantResult = await client.query(
      `INSERT INTO tenants
        (name, name_ar, domain, company_code, slug, plan, status, max_users, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id`,
      [
        company_name.trim(), company_name_ar?.trim() || null, domain,
        code, slug, plan || 'Starter', initialStatus || 'active',
        max_users || 5,
      ]
    );
    const tenantId = tenantResult.rows[0].id;

    // ── 3. Create company record ─────────────
    // Disable COA seed trigger (it doesn't set tenant_id properly)
    try { await client.query('ALTER TABLE companies DISABLE TRIGGER trg_company_seed_default_coa'); } catch { /* may not exist */ }

    const companyResult = await client.query(
      `INSERT INTO companies (
        code, name, name_ar, tenant_code, slug, phone, country, email, currency,
        status, subscription_plan, is_active, tenant_type, tenant_id,
        subscription_status, tax_number, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 'standard', $12, 'active', $13, $14, NOW(), NOW())
      RETURNING id, code, name`,
      [
        code, company_name.trim(), company_name_ar?.trim() || null,
        code, slug, admin_phone || null, country || 'SAU', admin_email.trim(),
        currency || 'SAR', 'active', plan || 'Starter',
        tenantId, vat_number || null, (req as any).user?.id || null,
      ]
    );
    const company = companyResult.rows[0];

    try { await client.query('ALTER TABLE companies ENABLE TRIGGER trg_company_seed_default_coa'); } catch { /* ignore */ }

    // ── 4. Create Tenant Owner (admin user) ──
    const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const userResult = await client.query(
      `INSERT INTO users (email, password, full_name, phone, status, tenant_id, company_id,
                          is_tenant_admin, must_change_password, created_at)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, true, $7, NOW())
       RETURNING id, email`,
      [
        admin_email.trim().toLowerCase(), hashedPassword, admin_name.trim(),
        admin_phone || null, tenantId, company.id, mustChangePassword,
      ]
    );
    const adminUser = userResult.rows[0];

    // Link user to company
    await client.query(
      `INSERT INTO user_companies (user_id, company_id, is_default, created_at)
       VALUES ($1, $2, true, NOW()) ON CONFLICT DO NOTHING`,
      [adminUser.id, company.id]
    );

    // ── 5. Assign Tenant Owner role ──────────
    const ownerRole = await client.query(
      `SELECT id FROM roles WHERE LOWER(name) IN ('tenant_owner', 'admin', 'company_admin', 'tenant_admin')
       ORDER BY CASE LOWER(name) WHEN 'tenant_owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
       LIMIT 1`
    );
    if (ownerRole.rows.length > 0) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, company_id, assigned_at, assigned_by)
         VALUES ($1, $2, $3, NOW(), $4) ON CONFLICT DO NOTHING`,
        [adminUser.id, ownerRole.rows[0].id, company.id, (req as any).user?.id]
      );
    }

    // ── 6. Seed default tenant roles ─────────
    const defaultRoles = [
      { name: 'manager', display_name: 'Manager', desc: 'Department manager with approval rights' },
      { name: 'user', display_name: 'Standard User', desc: 'Regular user with basic access' },
      { name: 'viewer', display_name: 'Viewer', desc: 'Read-only access to all modules' },
    ];
    for (const role of defaultRoles) {
      await client.query(
        `INSERT INTO roles (name, display_name, description, company_id, tenant_id, is_system, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [role.name, role.display_name, role.desc, company.id, tenantId, adminUser.id]
      );
    }

    // ── 7. Enable requested modules ──────────
    const modulesToEnable: string[] = selectedModules || [];
    // Always enable core modules
    const coreModules = await client.query(`SELECT module_code FROM modules WHERE is_core = true AND is_active = true`);
    const allModules = new Set([...modulesToEnable, ...coreModules.rows.map((r: any) => r.module_code)]);

    for (const moduleCode of allModules) {
      await client.query(
        `INSERT INTO tenant_modules (tenant_id, module_code, is_enabled, created_at, updated_at)
         VALUES ($1, $2, true, NOW(), NOW())
         ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_enabled = true, updated_at = NOW()`,
        [tenantId, moduleCode]
      );
    }

    // ── 8. Seed reference data ───────────────
    // Use SAVEPOINTs so non-fatal step failures don't abort the whole transaction
    await client.query('SAVEPOINT step8');
    try {
      const fnCheck = await client.query(
        `SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'provision_company_master_data') as exists`
      );
      if (fnCheck.rows[0].exists) {
        await client.query(
          `SELECT provision_company_master_data($1, $2, $3, $4)`,
          [company.id, tenantId, country || 'SAU', adminUser.id]
        );
      }
    } catch (seedErr: any) {
      await client.query('ROLLBACK TO SAVEPOINT step8');
      logger.warn({ event: 'tenant_wizard_seed_warning', error: seedErr.message });
    }

    // ── 9. Create default branch ─────────────
    await client.query('SAVEPOINT step9');
    try {
      await client.query(
        `INSERT INTO branches (name, name_ar, code, company_id, tenant_id, is_main, is_active, created_by, created_at, updated_at)
         VALUES ($1, $2, 'HQ', $3, $4, true, true, $5, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [`${company_name.trim()} - Main Branch`, 'الفرع الرئيسي', company.id, tenantId, adminUser.id]
      );
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT step9');
    }

    // ── 10. Record subscription history ──────
    await client.query('SAVEPOINT step10');
    try {
      await client.query(
        `INSERT INTO subscription_history (tenant_id, new_plan, changed_by, change_reason, effective_from, metadata)
         VALUES ($1, $2, $3, 'Initial tenant creation via wizard', NOW(), $4)`,
        [tenantId, plan || 'Starter', (req as any).user?.id, JSON.stringify({
          modules: Array.from(allModules),
          max_users: max_users || 5,
          contract_start: contract_start || null,
          contract_end: contract_end || null,
        })]
      );
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT step10');
    }

    // ── 11. Audit log ────────────────────────
    await client.query('SAVEPOINT step11');
    try {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data, ip_address, created_at)
         VALUES ($1, 'tenant_created', 'tenant', $2, $3, $4, NOW())`,
        [
          (req as any).user?.id,
          tenantId.toString(),
          JSON.stringify({
            company_name, company_code: code, plan: plan || 'Starter',
            admin_email: admin_email.trim().toLowerCase(),
            modules: Array.from(allModules), max_users: max_users || 5,
          }),
          req.ip,
        ]
      );
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT step11');
    }

    // ── 12. Link to request if provided ──────
    if (request_id) {
      await client.query('SAVEPOINT step12');
      try {
        await client.query(
          `UPDATE tenant_requests
           SET status = 'provisioned', provisioned_tenant_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [tenantId, request_id]
        );
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT step12');
      }
    }

    await client.query('COMMIT');

    // ── 13. Schema provisioning (fire-and-forget, OUTSIDE transaction) ──
    // Provisioning creates 314 tables and can take 30+ seconds.
    // We send the response immediately and let it run in the background.
    const schemaPromise = TenantSchemaService.fullProvision(
      code, tenantId, company.id, country || 'SAU'
    ).then(() => {
      logger.info({ event: 'tenant_schema_provisioned', tenantId, code });
    }).catch((schemaErr: any) => {
      logger.error({
        event: 'tenant_schema_provision_failed',
        tenantId, code, error: schemaErr.message,
      });
    });

    // ── Response ─────────────────────────────
    logger.info({
      event: 'tenant_created_via_wizard',
      tenantId, companyId: company.id, adminUserId: adminUser.id,
      code, plan: plan || 'Starter', modules: Array.from(allModules),
    });

    sendSuccess(res, {
      tenant: {
        id: tenantId,
        name: company_name.trim(),
        code,
        slug,
        plan: plan || 'Starter',
        status: initialStatus || 'active',
      },
      company: {
        id: company.id,
        code: company.code,
        name: company.name,
      },
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        temporary_password: mustChangePassword ? password : undefined,
        must_change_password: mustChangePassword,
      },
      modules: Array.from(allModules),
      schema: { status: 'provisioning', note: 'Schema is being created in the background' },
      message: 'Tenant created successfully via wizard',
      message_ar: 'تم إنشاء حساب العميل بنجاح عبر المعالج',
    }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Tenant wizard creation failed', { error: err.message, stack: err.stack });
    sendError(res, 'SERVER_ERROR', 'Failed to create tenant', 500);
  } finally {
    client.release();
  }
});

export default router;
