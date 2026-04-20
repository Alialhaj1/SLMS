-- ============================================================================
-- Migration 414: Development Roadmap — §14
-- Sprint planning/tracking + Technology stack registry
-- ============================================================================

-- §14.1 — Sprint Planning Table
CREATE TABLE IF NOT EXISTS development_sprints (
  id              SERIAL PRIMARY KEY,
  sprint_number   INT NOT NULL UNIQUE,
  name            VARCHAR(100) NOT NULL,                 -- e.g. "Sprint 0"
  duration        VARCHAR(50) NOT NULL,                  -- e.g. "أسبوع 1-2"
  focus_area      VARCHAR(200) NOT NULL,                 -- e.g. "البنية التحتية"
  focus_area_en   VARCHAR(200) NOT NULL,                 -- e.g. "Infrastructure"
  deliverables    TEXT NOT NULL,                          -- e.g. "Setup DB + Auth JWT + CI/CD + Environments"
  status          VARCHAR(30) NOT NULL DEFAULT 'planned', -- planned | in_progress | completed | blocked
  progress_pct    INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  start_date      DATE,
  end_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- §14.2 — Technology Stack Registry
CREATE TABLE IF NOT EXISTS technology_stack (
  id            SERIAL PRIMARY KEY,
  layer         VARCHAR(50) NOT NULL,      -- e.g. "Backend Runtime", "Frontend", "Database"
  category      VARCHAR(50) NOT NULL,      -- e.g. "runtime", "framework", "orm", "ui", "testing"
  name          VARCHAR(100) NOT NULL,     -- e.g. "Node.js 20 LTS"
  purpose       VARCHAR(300) NOT NULL,     -- e.g. "Runtime"
  alternative   VARCHAR(200),              -- e.g. "Bun (تجريبي)"
  is_primary    BOOLEAN NOT NULL DEFAULT TRUE,
  adoption_status VARCHAR(30) NOT NULL DEFAULT 'recommended', -- recommended | adopted | deprecated | evaluating
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(layer, name)
);

-- Sprint milestone dependencies (which sprints depend on which)
CREATE TABLE IF NOT EXISTS sprint_dependencies (
  id                  SERIAL PRIMARY KEY,
  sprint_id           INT NOT NULL REFERENCES development_sprints(id) ON DELETE CASCADE,
  depends_on_sprint_id INT NOT NULL REFERENCES development_sprints(id) ON DELETE CASCADE,
  dependency_type     VARCHAR(30) NOT NULL DEFAULT 'finish_to_start', -- finish_to_start | start_to_start
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sprint_id, depends_on_sprint_id),
  CHECK(sprint_id != depends_on_sprint_id)
);

-- Sprint deliverable items (granular task tracking within a sprint)
CREATE TABLE IF NOT EXISTS sprint_deliverables (
  id            SERIAL PRIMARY KEY,
  sprint_id     INT NOT NULL REFERENCES development_sprints(id) ON DELETE CASCADE,
  title         VARCHAR(300) NOT NULL,
  description   TEXT,
  status        VARCHAR(30) NOT NULL DEFAULT 'not_started', -- not_started | in_progress | completed | blocked
  priority      VARCHAR(20) NOT NULL DEFAULT 'medium', -- low | medium | high | critical
  assigned_to   VARCHAR(200),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed §14.1 — Sprint Roadmap
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO development_sprints (sprint_number, name, duration, focus_area, focus_area_en, deliverables, status) VALUES
  (0,  'Sprint 0',  'أسبوع 1-2',   'البنية التحتية',           'Infrastructure',             'Setup DB + Auth JWT + CI/CD + Environments', 'planned'),
  (1,  'Sprint 1',  'أسبوع 3-4',   'Multi-Tenancy Core',       'Multi-Tenancy Core',         'Schema Creation + Tenant Middleware + Data Isolation', 'planned'),
  (2,  'Sprint 2',  'أسبوع 5-6',   'Auth & RBAC',              'Auth & RBAC',                'Login + 2FA + Roles + Permissions + Module Gating', 'planned'),
  (3,  'Sprint 3',  'أسبوع 7-8',   'Platform Admin',           'Platform Admin',             'إدارة العملاء + Wizard + Impersonation + Audit Logs', 'planned'),
  (4,  'Sprint 4',  'أسبوع 9-10',  'Master Data',              'Master Data',                '24 جدول مرجعي + Seeding + Platform UI', 'planned'),
  (5,  'Sprint 5',  'أسبوع 11-12', 'Tenant Dashboard',         'Tenant Dashboard',           'لوحة تحكم العميل + بيانات الشركة + الفروع', 'planned'),
  (6,  'Sprint 6',  'أسبوع 13-14', 'Users & Roles (Tenant)',   'Users & Roles (Tenant)',     'CRUD المستخدمين + الأدوار + الصلاحيات', 'planned'),
  (7,  'Sprint 7',  'أسبوع 15-16', 'Notifications & Search',   'Notifications & Search',     'إشعارات + Global Search + Activity Timeline', 'planned'),
  (8,  'Sprint 8',  'أسبوع 17-18', 'Security Hardening',       'Security Hardening',         'Penetration Testing + OWASP + Performance', 'planned'),
  (9,  'Sprint 9',  'أسبوع 19-20', 'UAT & Bug Fixing',         'UAT & Bug Fixing',           'اختبار شامل + إصلاح + Regression', 'planned'),
  (10, 'Sprint 10', 'أسبوع 21',    'Soft Launch',              'Soft Launch',                'إطلاق لعملاء beta محدودين', 'planned'),
  (11, 'Sprint 11+','أسبوع 22+',   'Business Modules',         'Business Modules',           'وحدات الشحن، المشتريات، الجمارك...', 'planned')
ON CONFLICT (sprint_number) DO NOTHING;

-- Sprint dependencies (linear progression)
INSERT INTO sprint_dependencies (sprint_id, depends_on_sprint_id, dependency_type)
SELECT s2.id, s1.id, 'finish_to_start'
FROM development_sprints s1
JOIN development_sprints s2 ON s2.sprint_number = s1.sprint_number + 1
WHERE s1.sprint_number < 11
ON CONFLICT (sprint_id, depends_on_sprint_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed §14.2 — Technology Stack
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO technology_stack (layer, category, name, purpose, alternative, is_primary, adoption_status) VALUES
  -- Backend
  ('Backend',  'runtime',    'Node.js 20 LTS',     'Runtime',                                'Bun (تجريبي)',          TRUE,  'adopted'),
  ('Backend',  'framework',  'Fastify 4',           'API Framework',                          'Express.js',            TRUE,  'recommended'),
  ('Backend',  'orm',        'Prisma 5',            'Database ORM + Migrations',              'Drizzle ORM',           TRUE,  'recommended'),
  ('Backend',  'auth',       'José (JWT)',          'JWT Signing/Verification',               'jsonwebtoken',          TRUE,  'recommended'),
  ('Backend',  'email',      'Resend',              'Email Service',                          'Nodemailer + SMTP',     TRUE,  'recommended'),
  -- Database & Infrastructure
  ('Database', 'database',   'PostgreSQL 15',       'قاعدة البيانات الرئيسية',               NULL,                    TRUE,  'adopted'),
  ('Database', 'cache',      'Redis 7',             'Caching + Sessions + Rate Limiting',     'KeyDB',                 TRUE,  'recommended'),
  ('Database', 'queue',      'BullMQ',              'Background Jobs',                        NULL,                    TRUE,  'recommended'),
  ('Database', 'search',     'Meilisearch',         'Full-text Search',                       'Elasticsearch',         TRUE,  'recommended'),
  ('Database', 'storage',    'Cloudflare R2',       'Object Storage',                         'AWS S3',                TRUE,  'recommended'),
  -- Frontend
  ('Frontend', 'framework',  'React 18 + Vite',     'UI Framework',                           'Next.js',               TRUE,  'recommended'),
  ('Frontend', 'state',      'Zustand',             'Global State',                           'Redux Toolkit',         TRUE,  'recommended'),
  ('Frontend', 'data',       'TanStack Query',      'Server State + Caching',                 'SWR',                   TRUE,  'recommended'),
  ('Frontend', 'ui',         'Shadcn/ui + Radix',   'Accessible Components',                  'MUI',                   TRUE,  'recommended'),
  ('Frontend', 'forms',      'React Hook Form + Zod','Form Handling + Validation',            'Formik',                TRUE,  'recommended'),
  ('Frontend', 'tables',     'TanStack Table',      'Data Tables',                            'AG Grid',               TRUE,  'recommended'),
  ('Frontend', 'charts',     'Recharts',            'Data Visualization',                     'Chart.js',              TRUE,  'recommended'),
  ('Frontend', 'i18n',       'react-i18next',       'Internationalization',                   NULL,                    TRUE,  'recommended'),
  -- Testing & Monitoring
  ('DevOps',   'testing',    'Vitest + Playwright',  'Unit + E2E Testing',                    'Jest + Cypress',        TRUE,  'recommended'),
  ('DevOps',   'monitoring', 'Sentry + PostHog',     'Errors + Analytics',                    NULL,                    TRUE,  'adopted')
ON CONFLICT (layer, name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed permissions for roadmap management
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO permissions (permission_code, resource, action, description) VALUES
  ('roadmap:view',       'roadmap', 'view',   'View development roadmap and sprints'),
  ('roadmap:manage',     'roadmap', 'manage', 'Create/update/delete sprints and deliverables'),
  ('tech_stack:view',    'tech_stack', 'view',   'View technology stack registry'),
  ('tech_stack:manage',  'tech_stack', 'manage', 'Manage technology stack entries')
ON CONFLICT (permission_code) DO NOTHING;
