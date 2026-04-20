-- ============================================================================
-- Migration 415: QA Standards — §15
-- Testing standards, Definition of Done, Git branching policies
-- ============================================================================

-- §15.1 — Testing Level Definitions
CREATE TABLE IF NOT EXISTS qa_testing_levels (
  id                SERIAL PRIMARY KEY,
  test_type         VARCHAR(50) NOT NULL UNIQUE,       -- unit | integration | e2e | security | performance | accessibility
  tool_name         VARCHAR(200) NOT NULL,              -- e.g. "Vitest", "Supertest", "Playwright"
  coverage_target   VARCHAR(200) NOT NULL,              -- e.g. "≥ 80% للـ business logic"
  responsible_role  VARCHAR(100) NOT NULL,              -- e.g. "المطور", "QA Engineer"
  description       TEXT,
  is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
  run_frequency     VARCHAR(50) NOT NULL DEFAULT 'per_commit', -- per_commit | per_pr | per_sprint | pre_release
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- §15.2 — Definition of Done Checklist Items
CREATE TABLE IF NOT EXISTS qa_dod_checklist (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL UNIQUE,           -- e.g. "code_review", "unit_tests_80"
  title_ar      VARCHAR(500) NOT NULL,                 -- Arabic description
  title_en      VARCHAR(500) NOT NULL,                 -- English description
  category      VARCHAR(50) NOT NULL DEFAULT 'general', -- code | testing | docs | security | ux | deployment
  is_required   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature/PR DoD compliance tracking
CREATE TABLE IF NOT EXISTS qa_dod_compliance (
  id              SERIAL PRIMARY KEY,
  reference_type  VARCHAR(50) NOT NULL,                -- feature | pull_request | release
  reference_id    VARCHAR(200) NOT NULL,               -- feature name, PR number, or release version
  checklist_id    INT NOT NULL REFERENCES qa_dod_checklist(id) ON DELETE CASCADE,
  is_met          BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     INT,                                 -- user id
  verified_at     TIMESTAMPTZ,
  notes           TEXT,
  tenant_id       INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reference_type, reference_id, checklist_id)
);

-- §15.3 — Git Branch Policies
CREATE TABLE IF NOT EXISTS qa_branch_policies (
  id                  SERIAL PRIMARY KEY,
  branch_pattern      VARCHAR(100) NOT NULL UNIQUE,    -- e.g. "main", "develop", "feature/{name}"
  purpose_ar          VARCHAR(500) NOT NULL,
  purpose_en          VARCHAR(500) NOT NULL,
  who_can_push        VARCHAR(200) NOT NULL,           -- e.g. "لا أحد مباشرة", "Pull Request only"
  merge_condition_ar  VARCHAR(500) NOT NULL,
  merge_condition_en  VARCHAR(500) NOT NULL,
  is_protected        BOOLEAN NOT NULL DEFAULT FALSE,
  requires_review     BOOLEAN NOT NULL DEFAULT TRUE,
  min_reviewers       INT NOT NULL DEFAULT 1,
  requires_ci_pass    BOOLEAN NOT NULL DEFAULT TRUE,
  auto_delete_on_merge BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Test run results tracking (CI/CD integration)
CREATE TABLE IF NOT EXISTS qa_test_runs (
  id              SERIAL PRIMARY KEY,
  test_type       VARCHAR(50) NOT NULL,               -- unit | integration | e2e | security | performance | accessibility
  run_source      VARCHAR(100),                       -- CI pipeline name, manual, etc.
  branch          VARCHAR(200),
  commit_hash     VARCHAR(64),
  total_tests     INT NOT NULL DEFAULT 0,
  passed          INT NOT NULL DEFAULT 0,
  failed          INT NOT NULL DEFAULT 0,
  skipped         INT NOT NULL DEFAULT 0,
  coverage_pct    NUMERIC(5,2),                       -- e.g. 82.50
  duration_ms     INT,                                -- execution time
  status          VARCHAR(30) NOT NULL DEFAULT 'completed', -- running | completed | failed | error
  report_url      VARCHAR(500),
  metadata        JSONB DEFAULT '{}',                 -- extra info (lighthouse score, k6 p95, etc.)
  tenant_id       INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quality gate definitions (pass/fail thresholds)
CREATE TABLE IF NOT EXISTS qa_quality_gates (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT,
  test_type     VARCHAR(50) NOT NULL,
  metric        VARCHAR(100) NOT NULL,               -- coverage_pct | pass_rate | lighthouse_score | p95_latency
  operator      VARCHAR(10) NOT NULL DEFAULT '>=',   -- >=, <=, ==, >, <
  threshold     NUMERIC(10,2) NOT NULL,              -- e.g. 80.00
  is_blocking   BOOLEAN NOT NULL DEFAULT TRUE,       -- if true, blocks merge/deploy
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_qa_dod_compliance_ref ON qa_dod_compliance(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_type ON qa_test_runs(test_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_test_runs_branch ON qa_test_runs(branch, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed §15.1 — Testing Levels
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO qa_testing_levels (test_type, tool_name, coverage_target, responsible_role, description, run_frequency, sort_order) VALUES
  ('unit',          'Vitest',               '≥ 80% للـ business logic',                  'المطور',              'Unit tests for individual functions and modules',   'per_commit',  1),
  ('integration',   'Supertest',            'كل API endpoint',                          'المطور',              'Integration tests for every API endpoint',          'per_commit',  2),
  ('e2e',           'Playwright',           'User journeys الرئيسية',                   'QA Engineer',         'End-to-end tests for critical user journeys',       'per_pr',      3),
  ('security',      'OWASP ZAP + Manual',   'كل endpoint قبل الإطلاق',                 'Security Engineer',   'Security scans and penetration testing',            'pre_release', 4),
  ('performance',   'k6',                   '100 مستخدم متزامن ≥ 95th percentile < 500ms', 'DevOps',          'Load and performance testing',                      'pre_release', 5),
  ('accessibility', 'axe-core',             'WCAG 2.1 AA',                              'Frontend Dev',        'Accessibility compliance testing',                  'per_pr',      6)
ON CONFLICT (test_type) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed §15.2 — Definition of Done Checklist
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO qa_dod_checklist (code, title_ar, title_en, category, sort_order) VALUES
  ('code_review',       'الكود مكتوب ومراجع من زميل (Code Review)',                            'Code written and peer-reviewed (Code Review)',                     'code',       1),
  ('unit_tests_80',     'Unit Tests تغطي > 80% من الكود الجديد',                               'Unit Tests cover > 80% of new code',                              'testing',    2),
  ('api_tests',         'API Tests تغطي كل الـ endpoints الجديدة',                             'API Tests cover all new endpoints',                               'testing',    3),
  ('no_console_log',    'لا console.log في الكود النهائي',                                     'No console.log in final code',                                    'code',       4),
  ('no_orphan_todo',    'لا TODO أو FIXME بدون issue مربوط',                                   'No TODO or FIXME without linked issue',                           'code',       5),
  ('docs_updated',      'الوثائق محدَّثة (Swagger + README)',                                   'Documentation updated (Swagger + README)',                        'docs',       6),
  ('no_error_leak',     'لا رسائل أخطاء تكشف تفاصيل داخلية',                                   'No error messages expose internal details',                       'security',   7),
  ('rtl_working',       'RTL يعمل بشكل صحيح',                                                  'RTL works correctly',                                             'ux',         8),
  ('cross_browser',     'الشاشة تعمل على Chrome + Firefox + Safari',                           'Screen works on Chrome + Firefox + Safari',                       'ux',         9),
  ('no_warnings',       'لا warnings في Console',                                              'No warnings in Console',                                          'code',       10),
  ('lighthouse_85',     'Performance Lighthouse ≥ 85',                                         'Performance Lighthouse ≥ 85',                                     'ux',         11),
  ('staging_tested',    'تم اختباره في staging قبل production',                                 'Tested in staging before production',                             'deployment', 12)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed §15.3 — Git Branch Policies
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO qa_branch_policies (branch_pattern, purpose_ar, purpose_en, who_can_push, merge_condition_ar, merge_condition_en, is_protected, requires_review, min_reviewers, requires_ci_pass, auto_delete_on_merge, sort_order) VALUES
  ('main',              'كود الإنتاج',                'Production code',             'لا أحد مباشرة',         'عند Release فقط',              'On Release only',                TRUE,  TRUE,  2, TRUE,  FALSE, 1),
  ('develop',           'التطوير الرئيسي',            'Main development branch',     'عبر Pull Request فقط',  'Sprint Review',                 'Sprint Review',                  TRUE,  TRUE,  1, TRUE,  FALSE, 2),
  ('feature/{name}',    'ميزة جديدة',                 'New feature',                 'المطور المسؤول',        'عند اكتمال الميزة',             'When feature is complete',       FALSE, TRUE,  1, TRUE,  TRUE,  3),
  ('fix/{name}',        'إصلاح bug',                  'Bug fix',                     'المطور المسؤول',        'فوراً بعد الاختبار',            'Immediately after testing',      FALSE, TRUE,  1, TRUE,  TRUE,  4),
  ('release/{version}', 'تحضير الإصدار',              'Release preparation',         'Tech Lead',             'بعد UAT',                       'After UAT',                      TRUE,  TRUE,  2, TRUE,  FALSE, 5),
  ('hotfix/{name}',     'إصلاح عاجل في production',   'Urgent production fix',       'Tech Lead',             'فوراً',                        'Immediately',                    FALSE, TRUE,  1, TRUE,  TRUE,  6)
ON CONFLICT (branch_pattern) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed Quality Gates
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO qa_quality_gates (name, description, test_type, metric, operator, threshold, is_blocking) VALUES
  ('Unit Coverage Gate',       'Minimum unit test coverage',                  'unit',          'coverage_pct',      '>=', 80.00,  TRUE),
  ('Integration Pass Rate',    'All integration tests must pass',             'integration',   'pass_rate',         '>=', 100.00, TRUE),
  ('E2E Pass Rate',            'E2E tests pass rate',                         'e2e',           'pass_rate',         '>=', 95.00,  TRUE),
  ('Lighthouse Performance',   'Minimum Lighthouse performance score',        'accessibility', 'lighthouse_score',  '>=', 85.00,  TRUE),
  ('API Latency P95',          'P95 latency under 500ms at 100 concurrent',  'performance',   'p95_latency',       '<=', 500.00, TRUE),
  ('WCAG AA Compliance',       'No critical accessibility violations',        'accessibility', 'pass_rate',         '>=', 100.00, TRUE),
  ('Security Scan Clean',      'No high/critical findings in OWASP ZAP',     'security',      'pass_rate',         '>=', 100.00, TRUE)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Permissions
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO permissions (permission_code, resource, action, description) VALUES
  ('qa_standards:view',    'qa_standards', 'view',   'View QA standards, DoD, and branch policies'),
  ('qa_standards:manage',  'qa_standards', 'manage', 'Manage QA standards configuration'),
  ('qa_test_runs:view',    'qa_test_runs', 'view',   'View test run results'),
  ('qa_test_runs:create',  'qa_test_runs', 'create', 'Submit test run results (CI/CD)')
ON CONFLICT (permission_code) DO NOTHING;
