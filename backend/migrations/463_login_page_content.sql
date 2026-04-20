-- ============================================================================
-- Migration 463: Login Page Content Management
-- ============================================================================
-- Dynamic, admin-managed content blocks for the public login page.
-- Allows platform admins to configure announcements, news, banners,
-- promotional slides, feature highlights, and contact information.
-- ============================================================================

-- Login page content blocks (slides, announcements, news, features)
CREATE TABLE IF NOT EXISTS login_page_content (
  id            SERIAL PRIMARY KEY,
  section       VARCHAR(50) NOT NULL CHECK (section IN (
    'hero_slide', 'announcement', 'news', 'feature', 'promo_banner', 'partner_logo', 'testimonial', 'faq'
  )),
  title         VARCHAR(255),
  title_ar      VARCHAR(255),
  subtitle      VARCHAR(500),
  subtitle_ar   VARCHAR(500),
  body          TEXT,
  body_ar       TEXT,
  image_url     VARCHAR(500),
  icon          VARCHAR(100),         -- heroicon name or custom class
  link_url      VARCHAR(500),
  link_label    VARCHAR(100),
  link_label_ar VARCHAR(100),
  badge_text    VARCHAR(50),
  badge_text_ar VARCHAR(50),
  bg_color      VARCHAR(30),          -- CSS color / tailwind class
  text_color    VARCHAR(30),
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  starts_at     TIMESTAMPTZ,          -- optional scheduling
  ends_at       TIMESTAMPTZ,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_page_content_section ON login_page_content(section);
CREATE INDEX IF NOT EXISTS idx_login_page_content_active  ON login_page_content(is_active, section);

-- Login page settings (general configuration)
CREATE TABLE IF NOT EXISTS login_page_settings (
  id              SERIAL PRIMARY KEY,
  key             VARCHAR(100) UNIQUE NOT NULL,
  value           TEXT,
  value_type      VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'boolean', 'number', 'json', 'color')),
  description     VARCHAR(255),
  description_ar  VARCHAR(255),
  updated_by      INTEGER REFERENCES users(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO login_page_settings (key, value, value_type, description, description_ar) VALUES
  ('show_announcements',  'true',    'boolean', 'Show announcements ticker',     'عرض شريط الإعلانات'),
  ('show_news',           'true',    'boolean', 'Show news section',             'عرض قسم الأخبار'),
  ('show_features',       'true',    'boolean', 'Show features showcase',        'عرض مميزات النظام'),
  ('show_promo_banner',   'true',    'boolean', 'Show promotional banner',       'عرض البانر الترويجي'),
  ('show_partners',       'true',    'boolean', 'Show partner logos',            'عرض شعارات الشركاء'),
  ('show_testimonials',   'true',    'boolean', 'Show testimonials',             'عرض آراء العملاء'),
  ('show_faq',            'true',    'boolean', 'Show FAQ section',              'عرض الأسئلة الشائعة'),
  ('show_account_request','true',    'boolean', 'Show new account request btn',  'عرض زر طلب فتح حساب'),
  ('auto_slide_interval', '5000',    'number',  'Hero slider interval (ms)',     'فترة تغيير الشرائح (مللي ثانية)'),
  ('primary_gradient',    'from-slate-900 via-blue-900 to-indigo-900', 'string', 'Login page gradient', 'تدرج لون الخلفية'),
  ('contact_email',       'support@slms.sa', 'string', 'Support email',         'بريد الدعم'),
  ('contact_phone',       '+966 50 000 0000', 'string', 'Support phone',        'رقم الدعم'),
  ('contact_whatsapp',    '+966500000000', 'string', 'WhatsApp number',          'رقم واتساب'),
  ('footer_text',         'Smart Logistics Management System', 'string', 'Footer text', 'نص التذييل'),
  ('footer_text_ar',      'نظام إدارة اللوجستيات الذكي', 'string', 'Footer text AR', 'نص التذييل بالعربية')
ON CONFLICT (key) DO NOTHING;

-- Seed sample content
INSERT INTO login_page_content (section, title, title_ar, subtitle, subtitle_ar, image_url, icon, sort_order, is_active) VALUES
  ('hero_slide', 'Smart Logistics at Your Fingertips', 'اللوجستيات الذكية في متناول يدك',
   'Manage shipments, track expenses, and optimize your supply chain with AI-powered insights.',
   'إدارة الشحنات، تتبع المصروفات، وتحسين سلسلة التوريد بتقنيات الذكاء الاصطناعي.',
   NULL, 'TruckIcon', 1, true),
  ('hero_slide', 'Complete Financial Control', 'تحكم مالي شامل',
   'Full accounting suite with multi-currency support, automated reconciliation, and real-time reporting.',
   'نظام محاسبي متكامل مع دعم العملات المتعددة والتسوية التلقائية والتقارير الفورية.',
   NULL, 'CurrencyDollarIcon', 2, true),
  ('hero_slide', 'Enterprise-Grade Security', 'أمان على مستوى المؤسسات',
   'Multi-factor authentication, role-based access control, and full audit trail for compliance.',
   'مصادقة متعددة العوامل، تحكم بالصلاحيات، وسجل تدقيق كامل للامتثال.',
   NULL, 'ShieldCheckIcon', 3, true),
  ('announcement', 'System Update v3.5', 'تحديث النظام v3.5',
   'New procurement module and enhanced reporting features are now live!',
   'وحدة المشتريات الجديدة وميزات التقارير المحسنة متاحة الآن!',
   NULL, 'SparklesIcon', 1, true),
  ('feature', 'Shipment Tracking', 'تتبع الشحنات',
   'Real-time GPS tracking with automated alerts and milestone notifications.',
   'تتبع GPS مباشر مع تنبيهات تلقائية وإشعارات المراحل.',
   NULL, 'TruckIcon', 1, true),
  ('feature', 'Financial Management', 'الإدارة المالية',
   'Complete accounting with GL, AP/AR, bank reconciliation, and multi-currency.',
   'محاسبة متكاملة مع دفتر أستاذ، ذمم، تسوية بنكية، وعملات متعددة.',
   NULL, 'BanknotesIcon', 2, true),
  ('feature', 'Procurement Suite', 'إدارة المشتريات',
   'End-to-end procurement with RFQ, PO management, and supplier evaluation.',
   'مشتريات شاملة مع طلبات عروض أسعار، أوامر شراء، وتقييم موردين.',
   NULL, 'ShoppingCartIcon', 3, true),
  ('feature', 'Project Management', 'إدارة المشاريع',
   'Track projects, phases, budgets, and link to shipments and expenses.',
   'تتبع المشاريع والمراحل والميزانيات وربطها بالشحنات والمصروفات.',
   NULL, 'FolderIcon', 4, true),
  ('news', 'SLMS Wins Best ERP Award 2026', 'SLMS يفوز بجائزة أفضل نظام ERP 2026',
   'Recognized for innovation in logistics management technology.',
   'تقديرًا للابتكار في تقنية إدارة اللوجستيات.',
   NULL, 'SparklesIcon', 1, true)
ON CONFLICT DO NOTHING;
