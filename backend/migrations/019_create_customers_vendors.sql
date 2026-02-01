-- =============================================
-- Customers & Vendors (Partners) Master Data
-- With accounting integration
-- =============================================

-- =============================================
-- CUSTOMER GROUPS
-- =============================================
CREATE TABLE IF NOT EXISTS customer_groups (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    
    -- Default Settings
    default_payment_terms_id INTEGER REFERENCES payment_terms(id),
    default_price_list_id INTEGER REFERENCES price_lists(id),
    credit_limit DECIMAL(18, 4),
    discount_percent DECIMAL(5, 2),
    
    -- Accounting
    receivable_account_id INTEGER REFERENCES accounts(id),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- CUSTOMERS
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identification
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    
    -- Classification
    customer_type VARCHAR(20) DEFAULT 'company',  -- company, individual
    customer_group_id INTEGER REFERENCES customer_groups(id),
    
    -- Tax Information
    tax_number VARCHAR(50),                       -- VAT/Tax ID
    commercial_register VARCHAR(50),
    
    -- Contact
    primary_contact_name VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Address
    country_id INTEGER REFERENCES countries(id),
    city_id INTEGER REFERENCES cities(id),
    address TEXT,
    postal_code VARCHAR(20),
    
    -- Shipping Address (if different)
    shipping_address TEXT,
    shipping_city_id INTEGER REFERENCES cities(id),
    shipping_country_id INTEGER REFERENCES countries(id),
    
    -- Credit & Payment
    payment_terms_id INTEGER REFERENCES payment_terms(id),
    price_list_id INTEGER REFERENCES price_lists(id),
    currency_id INTEGER REFERENCES currencies(id),
    credit_limit DECIMAL(18, 4) DEFAULT 0,
    credit_days INTEGER DEFAULT 0,
    current_balance DECIMAL(18, 4) DEFAULT 0,    -- Denormalized for quick access
    
    -- Accounting
    receivable_account_id INTEGER REFERENCES accounts(id),  -- Override group default
    
    -- Sales Info
    sales_person_id INTEGER REFERENCES users(id),
    territory VARCHAR(50),
    
    -- Banking
    bank_id INTEGER REFERENCES banks(id),
    bank_account_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_iban VARCHAR(50),
    
    -- Settings
    is_tax_exempt BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',         -- active, inactive, blocked
    blocked_reason TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- CUSTOMER CONTACTS (Multiple contacts per customer)
-- =============================================
CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100),
    department VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    
    is_primary BOOLEAN DEFAULT false,
    is_billing_contact BOOLEAN DEFAULT false,
    is_shipping_contact BOOLEAN DEFAULT false,
    
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CUSTOMER ADDRESSES (Multiple addresses)
-- =============================================
CREATE TABLE IF NOT EXISTS customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    address_type VARCHAR(20) DEFAULT 'billing',  -- billing, shipping, both
    address_name VARCHAR(100),                   -- "Main Office", "Warehouse"
    
    country_id INTEGER REFERENCES countries(id),
    city_id INTEGER REFERENCES cities(id),
    address_line1 TEXT,
    address_line2 TEXT,
    postal_code VARCHAR(20),
    
    contact_name VARCHAR(100),
    phone VARCHAR(50),
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- VENDOR GROUPS
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_groups (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    
    -- Default Settings
    default_payment_terms_id INTEGER REFERENCES payment_terms(id),
    
    -- Accounting
    payable_account_id INTEGER REFERENCES accounts(id),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- VENDORS (Suppliers)
-- =============================================
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identification
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    
    -- Classification
    vendor_type VARCHAR(20) DEFAULT 'supplier',   -- supplier, contractor, service, freight
    vendor_group_id INTEGER REFERENCES vendor_groups(id),
    
    -- Tax Information
    tax_number VARCHAR(50),
    commercial_register VARCHAR(50),
    
    -- Contact
    primary_contact_name VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Address
    country_id INTEGER REFERENCES countries(id),
    city_id INTEGER REFERENCES cities(id),
    address TEXT,
    postal_code VARCHAR(20),
    
    -- Credit & Payment
    payment_terms_id INTEGER REFERENCES payment_terms(id),
    currency_id INTEGER REFERENCES currencies(id),
    current_balance DECIMAL(18, 4) DEFAULT 0,    -- Amount we owe
    
    -- Accounting
    payable_account_id INTEGER REFERENCES accounts(id),  -- Override group default
    expense_account_id INTEGER REFERENCES accounts(id),  -- Default expense account
    
    -- Banking
    bank_id INTEGER REFERENCES banks(id),
    bank_account_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_iban VARCHAR(50),
    bank_swift VARCHAR(20),
    
    -- Purchasing
    lead_time_days INTEGER DEFAULT 0,
    min_order_amount DECIMAL(18, 4),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',         -- active, inactive, blocked
    blocked_reason TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- VENDOR CONTACTS
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_contacts (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100),
    department VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    
    is_primary BOOLEAN DEFAULT false,
    is_payment_contact BOOLEAN DEFAULT false,
    
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- VENDOR ITEMS (Vendor-Item relationship)
-- =============================================
CREATE TABLE IF NOT EXISTS vendor_items (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    vendor_item_code VARCHAR(50),                -- Vendor's own item code
    vendor_item_name VARCHAR(200),               -- Vendor's item name
    
    -- Pricing
    unit_price DECIMAL(18, 4),
    currency_id INTEGER REFERENCES currencies(id),
    min_order_qty DECIMAL(18, 4),
    uom_id INTEGER REFERENCES uom(id),
    
    -- Lead Time
    lead_time_days INTEGER,
    
    -- Priority
    is_preferred BOOLEAN DEFAULT false,          -- Preferred vendor for this item
    priority INTEGER DEFAULT 1,
    
    last_purchase_date DATE,
    last_purchase_price DECIMAL(18, 4),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, item_id)
);

-- =============================================
-- EMPLOYEES (For HR & Expense tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),        -- Link to system user
    
    -- Identification
    employee_code VARCHAR(20) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    full_name_ar VARCHAR(150),
    
    -- Personal
    national_id VARCHAR(50),
    passport_number VARCHAR(50),
    nationality INTEGER REFERENCES countries(id),
    date_of_birth DATE,
    gender VARCHAR(10),                          -- male, female
    marital_status VARCHAR(20),
    
    -- Employment
    branch_id INTEGER REFERENCES branches(id),
    department VARCHAR(100),
    job_title VARCHAR(100),
    hire_date DATE,
    termination_date DATE,
    employment_type VARCHAR(20) DEFAULT 'full_time', -- full_time, part_time, contract
    
    -- Contact
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    
    -- Compensation
    base_salary DECIMAL(18, 4),
    currency_id INTEGER REFERENCES currencies(id),
    
    -- Banking
    bank_id INTEGER REFERENCES banks(id),
    bank_account_number VARCHAR(50),
    bank_iban VARCHAR(50),
    
    -- Accounting
    expense_account_id INTEGER REFERENCES accounts(id),  -- For employee advances
    payable_account_id INTEGER REFERENCES accounts(id),  -- Salary payable
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',         -- active, on_leave, terminated
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, employee_code)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_group ON customers(customer_group_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);

CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(code);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_group ON vendors(vendor_group_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor ON vendor_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_item ON vendor_items(item_id);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

-- =============================================
-- TRIGGERS: Update customer/vendor balance
-- =============================================

-- Function to create partner account when needed
CREATE OR REPLACE FUNCTION create_partner_account()
RETURNS TRIGGER AS $$
DECLARE
    v_control_account_id INTEGER;
    v_account_code VARCHAR(20);
    v_account_type_id INTEGER;
BEGIN
    -- For customers, create sub-account under AR control account
    IF TG_TABLE_NAME = 'customers' AND NEW.receivable_account_id IS NULL THEN
        -- Get the AR control account
        SELECT account_id INTO v_control_account_id
        FROM default_accounts
        WHERE company_id = NEW.company_id AND account_key = 'AR_TRADE';
        
        IF v_control_account_id IS NOT NULL THEN
            -- Create account code from customer code
            v_account_code := '1201-' || NEW.code;
            
            SELECT account_type_id INTO v_account_type_id FROM accounts WHERE id = v_control_account_id;
            
            -- Insert new account
            INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_control_account, control_type, created_by)
            VALUES (NEW.company_id, v_control_account_id, v_account_code, NEW.name, NEW.name_ar, v_account_type_id, 5, false, null, NEW.created_by)
            ON CONFLICT (company_id, code) DO NOTHING
            RETURNING id INTO NEW.receivable_account_id;
        END IF;
    END IF;
    
    -- For vendors, create sub-account under AP control account
    IF TG_TABLE_NAME = 'vendors' AND NEW.payable_account_id IS NULL THEN
        SELECT account_id INTO v_control_account_id
        FROM default_accounts
        WHERE company_id = NEW.company_id AND account_key = 'AP_TRADE';
        
        IF v_control_account_id IS NOT NULL THEN
            v_account_code := '2101-' || NEW.code;
            
            SELECT account_type_id INTO v_account_type_id FROM accounts WHERE id = v_control_account_id;
            
            INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_control_account, control_type, created_by)
            VALUES (NEW.company_id, v_control_account_id, v_account_code, NEW.name, NEW.name_ar, v_account_type_id, 5, false, null, NEW.created_by)
            ON CONFLICT (company_id, code) DO NOTHING
            RETURNING id INTO NEW.payable_account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Triggers can be created if automatic account creation is needed
-- DROP TRIGGER IF EXISTS trg_customer_create_account ON customers;
CREATE TRIGGER trg_customer_create_account BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION create_partner_account();
-- DROP TRIGGER IF EXISTS trg_vendor_create_account ON vendors;
CREATE TRIGGER trg_vendor_create_account BEFORE INSERT ON vendors FOR EACH ROW EXECUTE FUNCTION create_partner_account();

COMMENT ON TABLE customer_groups IS 'Customer classification groups';
COMMENT ON TABLE customers IS 'Customer master with accounting integration';
COMMENT ON TABLE customer_contacts IS 'Multiple contacts per customer';
COMMENT ON TABLE customer_addresses IS 'Multiple addresses per customer';
COMMENT ON TABLE vendor_groups IS 'Vendor classification groups';
COMMENT ON TABLE vendors IS 'Vendor/Supplier master with accounting integration';
COMMENT ON TABLE vendor_contacts IS 'Multiple contacts per vendor';
COMMENT ON TABLE vendor_items IS 'Vendor-Item relationship with pricing';
COMMENT ON TABLE employees IS 'Employee master for HR and expense tracking';
