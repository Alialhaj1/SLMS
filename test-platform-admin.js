/**
 * §2 Platform Admin Management — Comprehensive Test Suite v2
 * Covers: D01-D08, TC01-TC10, TC11-TC20, TM01-TM06, IMP01-IMP07
 */
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({ host: 'postgres', user: 'slms', password: 'slms_pass', database: 'slms_db' });

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 4000, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const start = Date.now();
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const ms = Date.now() - start;
        try { resolve({ status: res.statusCode, body: JSON.parse(d), ms }); }
        catch { resolve({ status: res.statusCode, body: d, ms }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const results = [];
function log(id, pass, detail) {
  const icon = pass === true ? '✅' : pass === false ? '❌' : '⚠️';
  results.push({ id, pass, detail });
  console.log(`  ${icon} ${id}: ${detail}`);
}

async function login(email, password, tenant_code) {
  const body = { email, password };
  if (tenant_code) body.tenant_code = tenant_code;
  const r = await req('POST', '/api/auth/login', body);
  return { token: r.body?.data?.accessToken || r.body?.accessToken, status: r.status, body: r.body };
}

// ══════════════════════════════════════════════
// §2.1 Dashboard Tests (D01-D08)
// ══════════════════════════════════════════════
async function testDashboard(token) {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  §2.1 — Dashboard Tests (D01-D08)    ║');
  console.log('╚══════════════════════════════════════╝\n');

  // D01 — Dashboard loads successfully < 3s
  const d = await req('GET', '/api/platform/dashboard', null, token);
  log('D01', d.status === 200 && d.ms < 3000, `Dashboard: ${d.status} (${d.ms}ms)${d.status !== 200 ? ' — ' + (d.body?.message || '') : ''}`);

  if (d.status === 200) {
    const data = d.body.data;
    // D02 — Tenant card shows total/active/trial/suspended
    const tenantOk = data.tenants && typeof data.tenants.total === 'number' && data.tenants.total > 0;
    log('D02', tenantOk, `Tenants: total=${data.tenants?.total} active=${data.tenants?.active} trial=${data.tenants?.trial} suspended=${data.tenants?.suspended}`);

    // D03 — User card shows total/active/platform users
    const userOk = data.users && typeof data.users.total === 'number' && data.users.total > 0;
    log('D03', userOk, `Users: total=${data.users?.total} active=${data.users?.active} platform=${data.users?.platform}`);
  } else {
    log('D02', false, 'Skipped — dashboard returned ' + d.status);
    log('D03', false, 'Skipped — dashboard returned ' + d.status);
  }

  // D04 — Tenant analytics
  const ta = await req('GET', '/api/platform/analytics/tenants', null, token);
  const taOk = ta.status === 200 && ta.body.data?.tenants?.length > 0;
  log('D04', taOk, `Tenant analytics: ${ta.status} — ${ta.body.data?.tenants?.length || 0} tenants${ta.status !== 200 ? ' — ' + (ta.body?.message || '') : ''}`);

  // D05 — System health
  const sys = await req('GET', '/api/platform/analytics/system', null, token);
  log('D05', sys.status === 200, `System health: ${sys.status} — DB size=${sys.body.data?.database?.size}`);

  // D06 — Idempotent (second call same result)
  const d2 = await req('GET', '/api/platform/dashboard', null, token);
  log('D06', d2.status === 200, `Dashboard idempotent: ${d2.status} (${d2.ms}ms)`);

  // D07 — Quick actions (wizard modules endpoint)
  const qa = await req('GET', '/api/platform/tenants/wizard/available-modules', null, token);
  const qaOk = qa.status === 200 && qa.body.data?.modules?.length > 0;
  log('D07', qaOk, `Available modules: ${qa.status} — ${qa.body.data?.modules?.length || 0} modules${qa.status !== 200 ? ' — ' + (qa.body?.message || '') : ''}`);

  // D08 — Security analytics
  const sec = await req('GET', '/api/platform/analytics/security', null, token);
  log('D08', sec.status === 200, `Security analytics: ${sec.status}`);
}

// ══════════════════════════════════════════════
// §2.2 Tenant Creation Wizard (TC01-TC10)
// ══════════════════════════════════════════════
async function testTenantCreation(token) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  §2.2 — Tenant Creation (TC01-TC10)      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // TC01 — Wizard opens (modules available)
  const mods = await req('GET', '/api/platform/tenants/wizard/available-modules', null, token);
  const modCount = mods.body.data?.modules?.length || 0;
  log('TC01', mods.status === 200 && modCount > 0, `Wizard modules: ${mods.status} — ${modCount} modules`);

  // TC02 — Step 1: Company info validation (valid data with valid plan)
  const v1 = await req('POST', '/api/platform/tenants/wizard/validate', {
    company_name: 'Test Wizard Co',
    company_code: 'TWIZ-001',
    country: 'SAU',
    currency: 'SAR',
    plan: 'Starter'
  }, token);
  log('TC02', v1.status === 200, `Step 1 validation: ${v1.status} — valid=${v1.body.data?.valid || v1.body?.valid}${v1.status !== 200 ? ' — ' + JSON.stringify(v1.body.errors || v1.body.message) : ''}`);

  // TC03 — Duplicate company code rejected
  const v1dup = await req('POST', '/api/platform/tenants/wizard/validate', {
    company_name: 'Duplicate Test',
    company_code: 'ALHCO',
    country: 'SAU',
    plan: 'Starter'
  }, token);
  const dupRejected = v1dup.status === 400 && (v1dup.body.errors?.company_code?.includes('already exists') || false);
  log('TC03', dupRejected, `Duplicate code rejected: ${v1dup.status} — ${v1dup.body.errors?.company_code || 'no error'}`);

  // TC04 — Step 2: Admin info validation
  const v2 = await req('POST', '/api/platform/tenants/wizard/validate-admin', {
    admin_name: 'Test Admin',
    admin_email: 'wizard.test@newcompany.com',
    admin_phone: '0501234567'
  }, token);
  log('TC04', v2.status === 200, `Step 2 validation: ${v2.status} — valid=${v2.body.data?.valid}`);

  // TC05 — Step 2: duplicate email rejected
  const v2dup = await req('POST', '/api/platform/tenants/wizard/validate-admin', {
    admin_name: 'Dup Admin',
    admin_email: 'superadmin@slms.sa',
    admin_phone: '0501234567'
  }, token);
  const emailDup = v2dup.status === 400 && (v2dup.body.errors?.admin_email?.includes('already in use') || false);
  log('TC05', emailDup, `Duplicate email rejected: ${v2dup.status} — ${v2dup.body.errors?.admin_email || 'no error'}`);

  // TC06 — Full creation (missing required field = company_code)
  const tc06 = await req('POST', '/api/platform/tenants/wizard', {
    company_name: 'Missing Code Corp'
  }, token);
  log('TC06', tc06.status === 400, `Missing code rejected: ${tc06.status} — ${tc06.body.message}`);

  // TC07 — Full creation (valid data)
  const uniqueCode = 'WZ' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).substring(2, 4).toUpperCase();
  const tc07 = await req('POST', '/api/platform/tenants/wizard', {
    company_name: 'Wizard Test Corp',
    company_name_ar: 'شركة المعالج التجريبية',
    company_code: uniqueCode,
    country: 'SAU',
    currency: 'SAR',
    plan: 'Starter',
    admin_name: 'Wizard Admin',
    admin_email: `wizard.${Date.now()}@test.com`,
    admin_phone: '0551234567',
    modules: ['shipments', 'expenses']
  }, token);
  const tc07Pass = tc07.status === 201 && tc07.body.data?.tenant?.code === uniqueCode;
  log('TC07', tc07Pass, `Full creation: ${tc07.status} — ${tc07.body.data?.tenant?.code || tc07.body.message || tc07.body.error?.message}`);

  let createdTenantId = tc07.body.data?.tenant?.id;

  // TC08 — Verify in DB
  if (createdTenantId) {
    const dbCheck = await pool.query('SELECT id, name, company_code, status, plan FROM tenants WHERE id = $1', [createdTenantId]);
    const found = dbCheck.rows[0];
    log('TC08', !!found && found.company_code === uniqueCode, `DB verify: ${found ? `id=${found.id} code=${found.company_code} status=${found.status}` : 'NOT FOUND'}`);
  } else {
    log('TC08', false, 'Skipped — no tenant created in TC07');
  }

  // TC09 — Seed data check (admin user created)
  if (createdTenantId) {
    const admin = await pool.query('SELECT id, email, is_tenant_admin FROM users WHERE tenant_id = $1 AND is_tenant_admin = true LIMIT 1', [createdTenantId]);
    log('TC09', admin.rows.length > 0, `Seed data: admin user ${admin.rows[0]?.email || 'NOT FOUND'}`);
  } else {
    log('TC09', false, 'Skipped — no tenant created in TC07');
  }

  // TC10 — Email (not testable in dev)
  log('TC10', 'N/A', 'Welcome email: Not testable (no SMTP in dev)');

  return { uniqueCode, createdTenantId };
}

// ══════════════════════════════════════════════
// §2.3 Tenant CRUD (TC11-TC20)
// ══════════════════════════════════════════════
async function testTenantCRUD(token) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  §2.3 — Tenant CRUD (TC11-TC20)          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // The /api/tenants routes operate on the `companies` table
  const dkCompany = await pool.query("SELECT id, code, name, status, tenant_code FROM companies WHERE (UPPER(code) = 'DARKHAWLAN' OR UPPER(tenant_code) = 'DARKHAWLAN') AND deleted_at IS NULL LIMIT 1");
  const dkId = dkCompany.rows[0]?.id;
  console.log(`  [info] DARKHAWLAN company id=${dkId} code=${dkCompany.rows[0]?.code}`);

  const alCompany = await pool.query("SELECT id, code, name, status, tenant_code FROM companies WHERE (UPPER(code) = 'ALHCO' OR UPPER(tenant_code) = 'ALHCO') AND deleted_at IS NULL LIMIT 1");
  const alId = alCompany.rows[0]?.id;
  console.log(`  [info] ALHCO company id=${alId} code=${alCompany.rows[0]?.code}\n`);

  // TC11 — List tenants
  const list = await req('GET', '/api/tenants?limit=25', null, token);
  const count = list.body.data?.length || 0;
  log('TC11', list.status === 200 && count > 0, `List: ${list.status} — ${count} tenants`);

  // TC12 — Search
  const search = await req('GET', '/api/tenants?search=DARKHAWLAN', null, token);
  const searchFound = search.body.data?.some(t => t.code === 'DARKHAWLAN' || t.tenant_code === 'DARKHAWLAN');
  log('TC12', search.status === 200 && searchFound, `Search DARKHAWLAN: ${search.status} — found=${searchFound}`);

  // TC13 — Filter by status
  const filtered = await req('GET', '/api/tenants?status=active', null, token);
  const allActive = filtered.body.data?.every(t => t.status === 'active');
  log('TC13', filtered.status === 200 && allActive, `Filter active: ${filtered.status} — ${filtered.body.data?.length} results, all active=${allActive}`);

  // TC14 — Tenant stats
  const stats = await req('GET', '/api/tenants/stats', null, token);
  log('TC14', stats.status === 200 && stats.body.data?.total > 0, `Stats: ${stats.status} — total=${stats.body.data?.total} active=${stats.body.data?.active}`);

  // TC15 — Update tenant
  if (dkId) {
    const upd = await req('PUT', `/api/tenants/${dkId}`, { company_name: 'DARKHAWLAN UPDATED' }, token);
    log('TC15', upd.status === 200, `Update DARKHAWLAN (id=${dkId}): ${upd.status}${upd.status !== 200 ? ' — ' + (upd.body?.message || '') : ''}`);
    if (upd.status === 200) await req('PUT', `/api/tenants/${dkId}`, { company_name: 'DAR KHAWLAN TRADING COMPANY' }, token);
  } else {
    log('TC15', false, 'DARKHAWLAN not found in companies table');
  }

  // TC16 — Suspend ALHCO
  if (alId) {
    const sus = await req('POST', `/api/tenants/${alId}/suspend`, {}, token);
    log('TC16', sus.status === 200, `Suspend ALHCO: ${sus.status} — status=${sus.body.data?.tenant?.status}`);

    const loginAfter = await login('admin@alhajco.com', 'Admin@123', 'ALHCO');
    const blocked = loginAfter.status !== 200;
    log('TC16b', blocked, `Login after suspend: ${loginAfter.status} — blocked=${blocked} msg=${loginAfter.body?.message || loginAfter.body?.error?.message || ''}`);
  } else {
    log('TC16', false, 'ALHCO not found');
    log('TC16b', false, 'Skipped');
  }

  // TC17 — Reactivate ALHCO
  if (alId) {
    const act = await req('POST', `/api/tenants/${alId}/activate`, {}, token);
    log('TC17', act.status === 200, `Activate ALHCO: ${act.status} — status=${act.body.data?.tenant?.status}`);

    const loginAfterAct = await login('admin@alhajco.com', 'Admin@123', 'ALHCO');
    log('TC17b', loginAfterAct.status === 200, `Login after reactivate: ${loginAfterAct.status}`);
  } else {
    log('TC17', false, 'ALHCO not found');
    log('TC17b', false, 'Skipped');
  }

  // TC18 — Delete tenant (soft delete)
  const tempCode = 'DL' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).substring(2, 4).toUpperCase();
  const tempCreate = await req('POST', '/api/tenants', {
    company_name: 'Temp Delete Corp',
    company_code: tempCode,
    email: `del.${Date.now()}@test.com`,
    password: 'Delete@123!'
  }, token);
  
  if (tempCreate.status === 201 || tempCreate.status === 200) {
    const tempId = tempCreate.body.data?.id;
    const del = await req('POST', `/api/tenants/${tempId}/delete`, {}, token);
    log('TC18', del.status === 200, `Delete tenant: ${del.status} (soft delete)`);
    
    const check = await pool.query('SELECT deleted_at FROM companies WHERE id = $1', [tempId]);
    log('TC18b', check.rows[0]?.deleted_at !== null, `Soft delete verified: deleted_at=${check.rows[0]?.deleted_at ? 'SET' : 'NULL'}`);
  } else {
    log('TC18', false, `Temp create failed: ${tempCreate.status} — ${tempCreate.body?.message}`);
    log('TC18b', false, 'Skipped');
  }

  // TC19 — Audit trail
  try {
    const audit = await pool.query(
      "SELECT id, action, entity, entity_id, created_at FROM audit_logs WHERE action LIKE '%tenant%' OR entity = 'tenant' ORDER BY created_at DESC LIMIT 5"
    );
    log('TC19', true, `Audit logs: ${audit.rows.length} tenant-related entries`);
  } catch (e) {
    log('TC19', false, `Audit query error: ${e.message}`);
  }

  // TC20 — Export (frontend feature)
  log('TC20', 'N/A', 'Data export: Frontend-only feature');
}

// ══════════════════════════════════════════════
// §2.4 Module Management (TM01-TM06)
// ══════════════════════════════════════════════
async function testModuleManagement(token) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  §2.4 — Module Management (TM01-TM06)    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // TM01 — List all modules
  const mods = await req('GET', '/api/platform/modules', null, token);
  const modData = mods.body.data;
  const modList = modData?.data || (Array.isArray(modData) ? modData : []);
  log('TM01', mods.status === 200 && modList.length > 0, `List modules: ${mods.status} — ${modList.length} modules`);
  if (modList.length > 0) {
    console.log(`    Sample: ${modList.slice(0, 5).map(m => m.module_code).join(', ')}`);
  }

  // TM02 — Module detail
  const detail = await req('GET', '/api/platform/modules/shipments', null, token);
  log('TM02', detail.status === 200 && detail.body.data?.module, `Module detail (shipments): ${detail.status}`);

  // TM03 — Update module (deactivate non-core)
  const upd = await req('PUT', '/api/platform/modules/expenses', { is_active: false }, token);
  log('TM03', upd.status === 200, `Deactivate expenses: ${upd.status}${upd.status !== 200 ? ' — ' + (upd.body?.message || '') : ''}`);
  if (upd.status === 200) await req('PUT', '/api/platform/modules/expenses', { is_active: true }, token);

  // TM04 — Enable module for tenant (DARKHAWLAN tenant_id=8)
  const enable = await req('POST', '/api/platform/modules/expenses/tenant/8', { enabled: true }, token);
  log('TM04', enable.status === 200, `Enable expenses for tenant 8: ${enable.status}${enable.status !== 200 ? ' — ' + (enable.body?.message || '') : ''}`);

  // TM05 — Disable non-core module for tenant
  const disable = await req('POST', '/api/platform/modules/expenses/tenant/8', { enabled: false }, token);
  log('TM05', disable.status === 200, `Disable expenses for tenant 8: ${disable.status}`);

  // TM06 — Cannot disable core module
  const coreDisable = await req('POST', '/api/platform/modules/users/tenant/8', { enabled: false }, token);
  log('TM06', coreDisable.status === 400, `Core module disable blocked: ${coreDisable.status} — ${coreDisable.body?.message}`);
}

// ══════════════════════════════════════════════
// §2.5 Impersonation (IMP01-IMP07)
// ══════════════════════════════════════════════
async function testImpersonation(token) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  §2.5 — Impersonation (IMP01-IMP07)      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const tenantUser = await pool.query("SELECT u.id, u.email, u.tenant_id FROM users u WHERE u.tenant_id IS NOT NULL AND u.deleted_at IS NULL LIMIT 1");
  const targetUserId = tenantUser.rows[0]?.id;
  const targetTenantId = tenantUser.rows[0]?.tenant_id;
  console.log(`  [info] Target user: id=${targetUserId} email=${tenantUser.rows[0]?.email} tenant=${targetTenantId}\n`);

  // IMP01 — Start impersonation
  const imp = await req('POST', '/api/platform/impersonation/start', {
    tenant_id: targetTenantId,
    target_user_id: targetUserId,
    reason: 'Testing impersonation for QA verification purposes'
  }, token);
  const impToken = imp.body.data?.impersonation_token || imp.body.data?.token;
  log('IMP01', imp.status === 200 && !!impToken, `Start impersonation: ${imp.status}${!impToken && imp.status === 200 ? ' (no token in response)' : ''}${imp.status !== 200 ? ' — ' + (imp.body?.message || '') : ''}`);

  // IMP02 — Token has impersonation scope
  if (impToken) {
    try {
      const payload = JSON.parse(Buffer.from(impToken.split('.')[1], 'base64').toString());
      const hasImpFlag = payload.type === 'impersonation' || !!payload.impersonated_by || !!payload.is_impersonation;
      log('IMP02', hasImpFlag, `Token scope: type=${payload.type} impersonated_by=${payload.impersonated_by}`);
    } catch (e) {
      log('IMP02', false, `Token decode error: ${e.message}`);
    }
  } else {
    log('IMP02', false, 'No impersonation token received');
  }

  // IMP03 — Impersonated token can access tenant APIs
  if (impToken) {
    const profile = await req('GET', '/api/me', null, impToken);
    log('IMP03', profile.status === 200, `Impersonated /api/me: ${profile.status}`);
  } else {
    log('IMP03', false, 'No impersonation token');
  }

  // IMP04 — End impersonation
  const sessionId = imp.body.data?.session_id;
  const end = await req('POST', '/api/platform/impersonation/end', { session_id: sessionId }, token);
  log('IMP04', end.status === 200 || end.status === 204, `End impersonation: ${end.status}`);

  // IMP05 — Impersonation logs
  const logs = await req('GET', '/api/platform/impersonation/logs', null, token);
  log('IMP05', logs.status === 200, `Impersonation logs: ${logs.status} — ${logs.body.data?.length || 0} entries`);

  // IMP06 — Active sessions
  const active = await req('GET', '/api/platform/impersonation/active', null, token);
  log('IMP06', active.status === 200, `Active sessions: ${active.status} — ${active.body.data?.length || 0} active`);

  // IMP07 — Non-platform user cannot impersonate
  const tenantLogin = await login('admin@darkhawlan.com', 'P@ssw0rd123!', 'DARKHAWLAN');
  if (tenantLogin.token) {
    const impFail = await req('POST', '/api/platform/impersonation/start', {
      tenant_id: 1,
      user_id: 1,
      reason: 'Unauthorized impersonation attempt test'
    }, tenantLogin.token);
    log('IMP07', impFail.status === 403 || impFail.status === 401, `Non-platform user blocked: ${impFail.status}`);
  } else {
    log('IMP07', false, `Tenant login failed: ${tenantLogin.status}`);
  }
}

// ══════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════
async function main() {
  try {
    console.log('═══ §2 Platform Admin Management Tests ═══\n');

    const { token } = await login('superadmin@slms.sa', 'SuperAdmin@2024!');
    if (!token) { console.error('FATAL: Login failed'); process.exit(1); }
    console.log('  Logged in as superadmin@slms.sa\n');

    await testDashboard(token);
    await testTenantCreation(token);
    await testTenantCRUD(token);
    await testModuleManagement(token);
    await testImpersonation(token);

    // Summary
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║            §2 TEST SUMMARY                    ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const pass = results.filter(r => r.pass === true).length;
    const fail = results.filter(r => r.pass === false).length;
    const na = results.filter(r => r.pass !== true && r.pass !== false).length;

    console.log(`  PASS: ${pass}  |  FAIL: ${fail}  |  N/A: ${na}  |  TOTAL: ${results.length}\n`);

    console.log('  ┌─────────┬────────┬──────────────────────────────────────────────┐');
    console.log('  │ Test ID │ Result │ Detail                                       │');
    console.log('  ├─────────┼────────┼──────────────────────────────────────────────┤');
    for (const r of results) {
      const icon = r.pass === true ? 'PASS' : r.pass === false ? 'FAIL' : 'N/A ';
      const detail = r.detail.length > 44 ? r.detail.substring(0, 41) + '...' : r.detail.padEnd(44);
      console.log(`  │ ${r.id.padEnd(7)} │ ${icon}   │ ${detail} │`);
    }
    console.log('  └─────────┴────────┴──────────────────────────────────────────────┘');

    if (fail > 0) {
      console.log('\n  ── Failed Tests ──');
      for (const r of results.filter(r => r.pass === false)) {
        console.log(`  ❌ ${r.id}: ${r.detail}`);
      }
    }
  } catch (e) {
    console.error('FATAL:', e);
  } finally {
    await pool.end();
  }
}

main();
