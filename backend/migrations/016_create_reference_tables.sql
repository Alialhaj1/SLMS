-- =============================================
-- ERP Master Data - Reference Tables
-- Foundation tables for the entire system
-- =============================================

-- =============================================
-- COUNTRIES
-- =============================================
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,          -- ISO 3166-1 alpha-3
    code_2 VARCHAR(2) UNIQUE,                  -- ISO 3166-1 alpha-2
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    nationality VARCHAR(100),
    nationality_ar VARCHAR(100),
    phone_code VARCHAR(10),
    currency_code VARCHAR(3),
    region VARCHAR(50),                        -- Middle East, Europe, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CITIES
-- =============================================
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id),
    code VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    state_province VARCHAR(100),
    timezone VARCHAR(50),
    is_port_city BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CURRENCIES
-- =============================================
CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,          -- ISO 4217
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    symbol VARCHAR(10),
    decimal_places INTEGER DEFAULT 2,
    is_base_currency BOOLEAN DEFAULT false,   -- Only one per company
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- EXCHANGE RATES
-- =============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    from_currency_id INTEGER NOT NULL REFERENCES currencies(id),
    to_currency_id INTEGER NOT NULL REFERENCES currencies(id),
    rate DECIMAL(18, 8) NOT NULL,
    rate_date DATE NOT NULL,
    rate_type VARCHAR(20) DEFAULT 'standard', -- standard, buying, selling, customs
    source VARCHAR(50),                        -- central_bank, manual, api
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, from_currency_id, to_currency_id, rate_date, rate_type)
);

-- =============================================
-- PORTS (Sea, Air, Land)
-- =============================================
CREATE TABLE IF NOT EXISTS ports (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id),
    city_id INTEGER REFERENCES cities(id),
    code VARCHAR(20) UNIQUE NOT NULL,         -- UN/LOCODE
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    port_type VARCHAR(20) NOT NULL,           -- sea, air, land, rail, multi
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    customs_office_id INTEGER,                -- Will reference customs_offices
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CUSTOMS OFFICES
-- =============================================
CREATE TABLE IF NOT EXISTS customs_offices (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    working_hours VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key after customs_offices is created


-- =============================================
-- PAYMENT TERMS
-- =============================================
CREATE TABLE IF NOT EXISTS payment_terms (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    days INTEGER DEFAULT 0,                    -- Net days
    discount_days INTEGER,                     -- Days for early payment discount
    discount_percent DECIMAL(5, 2),
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- PAYMENT METHODS
-- =============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    payment_type VARCHAR(20) NOT NULL,        -- cash, bank, check, credit_card, wire
    requires_bank_account BOOLEAN DEFAULT false,
    default_account_id INTEGER,               -- Will reference accounts (COA)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- BANKS
-- =============================================
CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES countries(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    swift_code VARCHAR(11),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BANK ACCOUNTS (Company's own accounts)
-- =============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    bank_id INTEGER NOT NULL REFERENCES banks(id),
    branch_id INTEGER REFERENCES branches(id),
    account_number VARCHAR(50) NOT NULL,
    iban VARCHAR(50),
    account_name VARCHAR(100),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    account_type VARCHAR(20) DEFAULT 'current', -- current, savings, fixed
    gl_account_id INTEGER,                      -- Will reference accounts (COA)
    opening_balance DECIMAL(18, 4) DEFAULT 0,
    current_balance DECIMAL(18, 4) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, bank_id, account_number)
);

-- =============================================
-- TAX TYPES
-- =============================================
CREATE TABLE IF NOT EXISTS tax_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    tax_category VARCHAR(20) NOT NULL,        -- vat, customs, withholding, zakat
    rate DECIMAL(5, 2) NOT NULL,
    is_compound BOOLEAN DEFAULT false,         -- Applied on top of other taxes
    is_inclusive BOOLEAN DEFAULT false,        -- Tax included in price
    purchase_account_id INTEGER,               -- Input VAT account
    sales_account_id INTEGER,                  -- Output VAT account
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- INCOTERMS (Trade Terms)
-- =============================================
CREATE TABLE IF NOT EXISTS incoterms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,         -- EXW, FOB, CIF, etc.
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    risk_transfer_point TEXT,
    cost_responsibility TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SHIPPING METHODS
-- =============================================
CREATE TABLE IF NOT EXISTS shipping_methods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    transport_mode VARCHAR(20) NOT NULL,      -- sea, air, land, rail, multi
    default_carrier_id INTEGER,               -- Will reference vendors
    transit_days INTEGER,
    tracking_available BOOLEAN DEFAULT true,
    expense_account_id INTEGER,               -- GL account for shipping expense
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(is_active);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(rate_date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency_id, to_currency_id);
CREATE INDEX IF NOT EXISTS idx_ports_country ON ports(country_id);
CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(port_type);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_types_company ON tax_types(company_id);

-- =============================================
-- INSERT DEFAULT DATA
-- =============================================

-- Insert common currencies
INSERT INTO currencies (code, name, name_ar, symbol, decimal_places) VALUES
('SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', 2),
('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 2),
('USD', 'US Dollar', 'دولار أمريكي', '$', 2),
('EUR', 'Euro', 'يورو', '€', 2),
('GBP', 'British Pound', 'جنيه إسترليني', '£', 2),
('YER', 'Yemeni Rial', 'ريال يمني', 'ر.ي', 2),
('EGP', 'Egyptian Pound', 'جنيه مصري', 'ج.م', 2),
('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', 3),
('BHD', 'Bahraini Dinar', 'دينار بحريني', 'د.ب', 3),
('OMR', 'Omani Rial', 'ريال عماني', 'ر.ع', 3),
('QAR', 'Qatari Riyal', 'ريال قطري', 'ر.ق', 2),
('JOD', 'Jordanian Dinar', 'دينار أردني', 'د.أ', 3),
('CNY', 'Chinese Yuan', 'يوان صيني', '¥', 2),
('INR', 'Indian Rupee', 'روبية هندية', '₹', 2),
('TRY', 'Turkish Lira', 'ليرة تركية', '₺', 2)
ON CONFLICT (code) DO NOTHING;

-- Insert common countries (Arab + major trading partners)
INSERT INTO countries (code, code_2, name, name_ar, phone_code, currency_code, region) VALUES
('SAU', 'SA', 'Saudi Arabia', 'المملكة العربية السعودية', '+966', 'SAR', 'Middle East'),
('ARE', 'AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', '+971', 'AED', 'Middle East'),
('YEM', 'YE', 'Yemen', 'اليمن', '+967', 'YER', 'Middle East'),
('EGY', 'EG', 'Egypt', 'مصر', '+20', 'EGP', 'Middle East'),
('JOR', 'JO', 'Jordan', 'الأردن', '+962', 'JOD', 'Middle East'),
('KWT', 'KW', 'Kuwait', 'الكويت', '+965', 'KWD', 'Middle East'),
('BHR', 'BH', 'Bahrain', 'البحرين', '+973', 'BHD', 'Middle East'),
('OMN', 'OM', 'Oman', 'عمان', '+968', 'OMR', 'Middle East'),
('QAT', 'QA', 'Qatar', 'قطر', '+974', 'QAR', 'Middle East'),
('USA', 'US', 'United States', 'الولايات المتحدة', '+1', 'USD', 'North America'),
('GBR', 'GB', 'United Kingdom', 'المملكة المتحدة', '+44', 'GBP', 'Europe'),
('DEU', 'DE', 'Germany', 'ألمانيا', '+49', 'EUR', 'Europe'),
('FRA', 'FR', 'France', 'فرنسا', '+33', 'EUR', 'Europe'),
('CHN', 'CN', 'China', 'الصين', '+86', 'CNY', 'Asia'),
('IND', 'IN', 'India', 'الهند', '+91', 'INR', 'Asia'),
('TUR', 'TR', 'Turkey', 'تركيا', '+90', 'TRY', 'Europe')
ON CONFLICT (code) DO NOTHING;

-- Insert Incoterms 2020
INSERT INTO incoterms (code, name, name_ar, description) VALUES
('EXW', 'Ex Works', 'تسليم المصنع', 'Seller makes goods available at their premises'),
('FCA', 'Free Carrier', 'تسليم الناقل', 'Seller delivers goods to carrier nominated by buyer'),
('CPT', 'Carriage Paid To', 'أجور النقل مدفوعة إلى', 'Seller pays for carriage to destination'),
('CIP', 'Carriage and Insurance Paid To', 'أجور النقل والتأمين مدفوعة إلى', 'Seller pays carriage and insurance'),
('DAP', 'Delivered at Place', 'التسليم في مكان معين', 'Seller delivers at named place'),
('DPU', 'Delivered at Place Unloaded', 'التسليم في مكان معين بعد التفريغ', 'Seller delivers and unloads'),
('DDP', 'Delivered Duty Paid', 'التسليم مع دفع الرسوم', 'Seller bears all costs including duties'),
('FAS', 'Free Alongside Ship', 'تسليم بجانب السفينة', 'Seller delivers alongside vessel'),
('FOB', 'Free on Board', 'تسليم على ظهر السفينة', 'Seller delivers on board vessel'),
('CFR', 'Cost and Freight', 'التكلفة والشحن', 'Seller pays costs and freight'),
('CIF', 'Cost, Insurance and Freight', 'التكلفة والتأمين والشحن', 'Seller pays costs, insurance and freight')
ON CONFLICT (code) DO NOTHING;

-- Insert default payment terms
INSERT INTO payment_terms (code, name, name_ar, days) VALUES
('CASH', 'Cash', 'نقدي', 0),
('NET15', 'Net 15 Days', 'صافي 15 يوم', 15),
('NET30', 'Net 30 Days', 'صافي 30 يوم', 30),
('NET45', 'Net 45 Days', 'صافي 45 يوم', 45),
('NET60', 'Net 60 Days', 'صافي 60 يوم', 60),
('NET90', 'Net 90 Days', 'صافي 90 يوم', 90)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE countries IS 'Master list of countries with ISO codes';
COMMENT ON TABLE cities IS 'Cities linked to countries';
COMMENT ON TABLE currencies IS 'Currency master with ISO 4217 codes';
COMMENT ON TABLE exchange_rates IS 'Daily/historical exchange rates';
COMMENT ON TABLE ports IS 'Sea, air, and land ports for logistics';
COMMENT ON TABLE customs_offices IS 'Customs authorities by country';
COMMENT ON TABLE payment_terms IS 'Standard payment terms for invoices';
COMMENT ON TABLE payment_methods IS 'Payment methods (cash, bank, etc.)';
COMMENT ON TABLE banks IS 'Bank master list';
COMMENT ON TABLE bank_accounts IS 'Company bank accounts';
COMMENT ON TABLE tax_types IS 'Tax types (VAT, customs, etc.)';
COMMENT ON TABLE incoterms IS 'International trade terms (Incoterms 2020)';
COMMENT ON TABLE shipping_methods IS 'Shipping/delivery methods';


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_ports_customs_office' AND table_name='ports') THEN
    ALTER TABLE ports
      ADD CONSTRAINT fk_ports_customs_office
      FOREIGN KEY (customs_office_id) REFERENCES customs_offices(id);
  END IF;

END $$;