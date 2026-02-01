# SLMS Master Data Architecture - Complete Design

**Version:** 1.0  
**Date:** 2025-12-25  
**Status:** Planning Phase  

## 📋 Executive Summary

This document defines the complete database architecture for SLMS Master Data Setup covering 120+ entities across 10 functional groups. All tables follow multi-tenant architecture with `company_id` isolation, soft delete with `deleted_at`, and audit trail with `created_at/updated_at/created_by/updated_by`.

**Estimated Implementation:** 50-60 hours  
**Total Tables:** 120+  
**Total API Endpoints:** 400+  
**Frontend Pages:** 120+  

---

## 🏗️ Architecture Principles

### 1. Multi-Tenancy
```sql
-- Every master data table MUST have company_id
company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
```

### 2. Soft Delete
```sql
-- Never physically delete master data
deleted_at TIMESTAMP NULL
```

### 3. Audit Trail
```sql
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
created_by INTEGER REFERENCES users(id)
updated_by INTEGER REFERENCES users(id)
```

### 4. Naming Conventions
- **Tables:** snake_case, plural (e.g., `shipping_lines`, `tax_codes`)
- **Columns:** snake_case (e.g., `display_name_en`, `is_active`)
- **Indexes:** `idx_table_column` (e.g., `idx_items_company_id`)
- **Foreign Keys:** `fk_table_ref` (e.g., `fk_items_item_group_id`)

### 5. Bilingual Support
```sql
-- All master data with display names must have en/ar
name_en VARCHAR(255) NOT NULL
name_ar VARCHAR(255) NOT NULL
description_en TEXT
description_ar TEXT
```

### 6. Status Management
```sql
-- Use ENUM for fixed status lists
status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))
is_active BOOLEAN DEFAULT TRUE
is_default BOOLEAN DEFAULT FALSE
```

---

## 📊 Group 1: System & General Settings

### ✅ Already Implemented (Skip)
- `companies` - Multi-tenant company master
- `branches` - Company branches
- `users` - System users
- `roles` - User roles
- `permissions` - System permissions
- `role_permissions` - Role-permission mapping
- `user_roles` - User-role mapping

### 🆕 New Tables

#### 1.1 Numbering Series (`numbering_series`)
```sql
CREATE TABLE numbering_series (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL, -- 'shipments', 'invoices', 'vouchers', etc.
  prefix VARCHAR(10),
  suffix VARCHAR(10),
  current_number INTEGER NOT NULL DEFAULT 1,
  padding_length INTEGER DEFAULT 6, -- 000001
  format VARCHAR(100), -- {PREFIX}{YYYY}{MM}{NNNNNN}{SUFFIX}
  sample_output VARCHAR(100), -- SHP-2025-12-000001
  is_active BOOLEAN DEFAULT TRUE,
  notes_en TEXT,
  notes_ar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  UNIQUE(company_id, module, deleted_at)
);
CREATE INDEX idx_numbering_series_company_id ON numbering_series(company_id);
```

#### 1.2 Printed Templates (`printed_templates`)
```sql
CREATE TABLE printed_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'invoice', 'shipment', 'voucher', 'contract'
  language VARCHAR(10) DEFAULT 'en', -- 'en', 'ar', 'both'
  header_html TEXT, -- HTML header
  body_html TEXT, -- HTML body with {{placeholders}}
  footer_html TEXT, -- HTML footer
  css TEXT, -- Custom CSS
  paper_size VARCHAR(20) DEFAULT 'A4', -- 'A4', 'Letter', 'Legal'
  orientation VARCHAR(20) DEFAULT 'portrait', -- 'portrait', 'landscape'
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  preview_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_printed_templates_company_id ON printed_templates(company_id);
CREATE INDEX idx_printed_templates_type ON printed_templates(template_type);
```

#### 1.3 Digital Signatures (`digital_signatures`)
```sql
CREATE TABLE digital_signatures (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  signature_name_en VARCHAR(255) NOT NULL,
  signature_name_ar VARCHAR(255) NOT NULL,
  signature_title_en VARCHAR(255), -- 'CEO', 'Finance Manager'
  signature_title_ar VARCHAR(255),
  signature_image_url VARCHAR(500), -- Path to uploaded signature image
  certificate_path VARCHAR(500), -- Digital certificate for e-signatures
  certificate_expiry DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_digital_signatures_company_id ON digital_signatures(company_id);
CREATE INDEX idx_digital_signatures_user_id ON digital_signatures(user_id);
```

#### 1.4 System Languages (`system_languages`)
```sql
CREATE TABLE system_languages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE, -- 'en', 'ar', 'fr'
  name_en VARCHAR(100) NOT NULL,
  name_native VARCHAR(100) NOT NULL, -- 'English', 'العربية', 'Français'
  direction VARCHAR(3) DEFAULT 'ltr', -- 'ltr', 'rtl'
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  flag_icon VARCHAR(100), -- Country flag code
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
INSERT INTO system_languages (code, name_en, name_native, direction, is_default, is_active) VALUES
('en', 'English', 'English', 'ltr', TRUE, TRUE),
('ar', 'Arabic', 'العربية', 'rtl', FALSE, TRUE);
```

#### 1.5 UI Themes (`ui_themes`)
```sql
CREATE TABLE ui_themes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE, -- NULL = system-wide
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  theme_code VARCHAR(50) NOT NULL, -- 'default', 'dark', 'blue', 'green'
  primary_color VARCHAR(7), -- Hex color #3B82F6
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  logo_url VARCHAR(500),
  favicon_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### 1.6 System Policies (`system_policies`)
```sql
CREATE TABLE system_policies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  policy_key VARCHAR(100) NOT NULL, -- 'session_timeout', 'password_policy', 'max_login_attempts'
  policy_value TEXT NOT NULL, -- JSON or plain text
  description_en TEXT,
  description_ar TEXT,
  data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'integer', 'boolean', 'json'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  UNIQUE(company_id, policy_key, deleted_at)
);
```

---

## 🌍 Group 2: General Reference Data

#### 2.1 Countries (`countries`)
```sql
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-3 (SAU, ARE, USA)
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  alpha_2 VARCHAR(2), -- ISO 3166-1 alpha-2 (SA, AE, US)
  phone_code VARCHAR(10), -- +966, +971
  currency_code VARCHAR(3), -- SAR, AED, USD
  continent VARCHAR(50),
  region VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_countries_code ON countries(code);

-- Seed major countries
INSERT INTO countries (code, name_en, name_ar, alpha_2, phone_code, currency_code, continent) VALUES
('SAU', 'Saudi Arabia', 'المملكة العربية السعودية', 'SA', '+966', 'SAR', 'Asia'),
('ARE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'AE', '+971', 'AED', 'Asia'),
('USA', 'United States', 'الولايات المتحدة', 'US', '+1', 'USD', 'North America'),
('CHN', 'China', 'الصين', 'CN', '+86', 'CNY', 'Asia'),
('DEU', 'Germany', 'ألمانيا', 'DE', '+49', 'EUR', 'Europe');
```

#### 2.2 Cities (`cities`)
```sql
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  code VARCHAR(20), -- RUH, JED, DXB
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_cities_code ON cities(code);

-- Seed major Saudi cities
INSERT INTO cities (country_id, name_en, name_ar, code) VALUES
((SELECT id FROM countries WHERE code='SAU'), 'Riyadh', 'الرياض', 'RUH'),
((SELECT id FROM countries WHERE code='SAU'), 'Jeddah', 'جدة', 'JED'),
((SELECT id FROM countries WHERE code='SAU'), 'Dammam', 'الدمام', 'DMM');
```

#### 2.3 Regions/Zones (`regions`)
```sql
CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  region_type VARCHAR(50), -- 'province', 'state', 'emirate', 'district'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_regions_country_id ON regions(country_id);
```

#### 2.4 Ports & Airports (`ports`)
```sql
CREATE TABLE ports (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id),
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE, -- IATA/ICAO codes (JED, OEJN)
  port_type VARCHAR(20) NOT NULL CHECK (port_type IN ('seaport', 'airport', 'land_port')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_ports_country_id ON ports(country_id);
CREATE INDEX idx_ports_type ON ports(port_type);

-- Seed Saudi ports
INSERT INTO ports (country_id, city_id, name_en, name_ar, code, port_type) VALUES
((SELECT id FROM countries WHERE code='SAU'), (SELECT id FROM cities WHERE code='JED'), 'King Abdulaziz International Airport', 'مطار الملك عبدالعزيز الدولي', 'JED', 'airport'),
((SELECT id FROM countries WHERE code='SAU'), (SELECT id FROM cities WHERE code='JED'), 'Jeddah Islamic Port', 'ميناء جدة الإسلامي', 'JEDA', 'seaport');
```

#### 2.5 Border Points (`border_points`)
```sql
CREATE TABLE border_points (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  border_type VARCHAR(20) CHECK (border_type IN ('land', 'sea', 'air')),
  connecting_country_id INTEGER REFERENCES countries(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_border_points_country_id ON border_points(country_id);
```

#### 2.6 Customs Offices (`customs_offices`)
```sql
CREATE TABLE customs_offices (
  id SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id),
  port_id INTEGER REFERENCES ports(id),
  border_point_id INTEGER REFERENCES border_points(id),
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE,
  office_type VARCHAR(30) CHECK (office_type IN ('main', 'branch', 'checkpoint')),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  address_en TEXT,
  address_ar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX idx_customs_offices_country_id ON customs_offices(country_id);
CREATE INDEX idx_customs_offices_port_id ON customs_offices(port_id);
```

#### 2.7 Currencies (`currencies`)
```sql
CREATE TABLE currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE, -- ISO 4217 (SAR, USD, EUR)
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  symbol VARCHAR(10), -- ر.س, $, €
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  is_base_currency BOOLEAN DEFAULT FALSE, -- One base currency per company
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

INSERT INTO currencies (code, name_en, name_ar, symbol, decimal_places, is_active) VALUES
('SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', 2, TRUE),
('USD', 'US Dollar', 'دولار أمريكي', '$', 2, TRUE),
('EUR', 'Euro', 'يورو', '€', 2, TRUE),
('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 2, TRUE),
('CNY', 'Chinese Yuan', 'يوان صيني', '¥', 2, TRUE);
```

#### 2.8 Exchange Rates (`exchange_rates`)
```sql
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_currency_id INTEGER NOT NULL REFERENCES currencies(id),
  to_currency_id INTEGER NOT NULL REFERENCES currencies(id),
  rate DECIMAL(18, 6) NOT NULL, -- 1 USD = 3.75 SAR
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  source VARCHAR(100), -- 'manual', 'SAMA', 'Bloomberg', 'Central Bank'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  UNIQUE(company_id, from_currency_id, to_currency_id, effective_date, deleted_at)
);
CREATE INDEX idx_exchange_rates_company_id ON exchange_rates(company_id);
CREATE INDEX idx_exchange_rates_effective_date ON exchange_rates(effective_date);
```

#### 2.9 Time Zones (`time_zones`)
```sql
CREATE TABLE time_zones (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE, -- 'Asia/Riyadh', 'America/New_York'
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  utc_offset VARCHAR(10), -- '+03:00', '-05:00'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### 2.10 Address Types (`address_types`)
```sql
CREATE TABLE address_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE, -- 'billing', 'shipping', 'warehouse', 'headquarters'
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

INSERT INTO address_types (code, name_en, name_ar) VALUES
('billing', 'Billing Address', 'عنوان الفواتير'),
('shipping', 'Shipping Address', 'عنوان الشحن'),
('warehouse', 'Warehouse Address', 'عنوان المستودع'),
('headquarters', 'Headquarters', 'المقر الرئيسي');
```

#### 2.11 Contact Methods (`contact_methods`)
```sql
CREATE TABLE contact_methods (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE, -- 'email', 'phone', 'mobile', 'fax', 'website', 'whatsapp'
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  icon VARCHAR(50), -- Icon name for UI
  validation_regex TEXT, -- Email/phone validation pattern
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

INSERT INTO contact_methods (code, name_en, name_ar, validation_regex) VALUES
('email', 'Email', 'البريد الإلكتروني', '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
('phone', 'Phone', 'هاتف', '^\+?[0-9]{7,15}$'),
('mobile', 'Mobile', 'جوال', '^\+?[0-9]{10,15}$'),
('fax', 'Fax', 'فاكس', '^\+?[0-9]{7,15}$'),
('website', 'Website', 'موقع إلكتروني', '^https?://[^\s]+$'),
('whatsapp', 'WhatsApp', 'واتساب', '^\+?[0-9]{10,15}$');
```

---

## 📦 Group 3: Items & Inventory

*(Continuing with detailed schema for remaining 8 groups...)*

**⚠️ NOTE:** Due to response length limits, I'll continue with implementation. The complete architecture document will be generated during implementation.

---

## 🎯 Next Steps

1. Complete schema design for Groups 3-10
2. Generate migration files (numbered sequentially)
3. Implement backend routes and controllers
4. Create frontend pages with RBAC
5. Add translations (en/ar)
6. Generate test data and documentation

**Estimated Timeline:** 50-60 hours (5-6 full working days)
