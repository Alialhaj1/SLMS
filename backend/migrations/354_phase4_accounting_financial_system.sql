-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 354: PHASE 4 — FULL ACCOUNTING & FINANCIAL SYSTEM                ║
-- ║  Receipt Vouchers, Inventory Transfers, Cash Registers,                      ║
-- ║  VAT Returns, ZATCA E-Invoicing Submissions                                  ║
-- ╠═══════════════════════════════════════════════════════════════════════════════╣
-- ║  🎯 PURPOSE:                                                                  ║
-- ║  - Cash registers / petty cash management (C-02)                              ║
-- ║  - Receipt vouchers for customer collections (F-04)                            ║
-- ║  - Inventory transfers between warehouses (E-02)                               ║
-- ║  - VAT return filing & tracking (G-05)                                         ║
-- ║  - ZATCA e-invoicing Phase 2 submissions (F-05)                                ║
-- ║  - Phase 4 permissions seeding                                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣  CASH REGISTERS / PETTY CASH  (C-02)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cash_registers (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    branch_id       INTEGER NOT NULL REFERENCES branches(id),
    gl_account_id   INTEGER REFERENCES accounts(id),
    currency_id     INTEGER REFERENCES currencies(id),
    
    code            VARCHAR(15) NOT NULL,
    name_ar         VARCHAR(60) NOT NULL,
    name_en         VARCHAR(60),
    custodian_name  VARCHAR(100) NOT NULL,
    
    max_amount          DECIMAL(12,2) NOT NULL DEFAULT 10000.00,
    replenishment_threshold DECIMAL(12,2) NOT NULL DEFAULT 2000.00,
    current_balance     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    last_count_date     DATE,
    
    is_pos          BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    
    created_by      INTEGER REFERENCES users(id),
    updated_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    UNIQUE(code, company_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_company ON cash_registers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_registers_branch ON cash_registers(branch_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE cash_registers IS 'Petty cash boxes and POS registers — Phase 4 C-02';

-- Cash register transactions
CREATE TABLE IF NOT EXISTS cash_register_transactions (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    cash_register_id INTEGER NOT NULL REFERENCES cash_registers(id),
    
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('expense', 'replenishment', 'collection', 'deposit', 'adjustment')),
    reference_type  VARCHAR(30),   -- 'receipt_voucher', 'payment_voucher', 'manual'
    reference_id    INTEGER,
    
    amount          DECIMAL(12,2) NOT NULL,
    balance_before  DECIMAL(12,2) NOT NULL,
    balance_after   DECIMAL(12,2) NOT NULL,
    description     TEXT,
    
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    period_id       INTEGER REFERENCES accounting_periods(id),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cash_reg_txn_register ON cash_register_transactions(cash_register_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣  RECEIPT VOUCHERS / COLLECTIONS  (F-04)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS receipt_vouchers (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    branch_id       INTEGER REFERENCES branches(id),
    
    voucher_number  VARCHAR(20) NOT NULL,
    customer_id     INTEGER NOT NULL,  -- FK to customers
    receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    
    payment_method_id INTEGER REFERENCES payment_methods(id),
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    cash_register_id INTEGER REFERENCES cash_registers(id),
    
    currency_id     INTEGER NOT NULL REFERENCES currencies(id),
    exchange_rate   DECIMAL(18,8) NOT NULL DEFAULT 1.0,
    amount          DECIMAL(18,4) NOT NULL,
    amount_base     DECIMAL(18,4),  -- amount in base currency
    
    early_payment_discount DECIMAL(18,4) DEFAULT 0,
    exchange_gain_loss DECIMAL(18,4) DEFAULT 0,
    
    reference_number VARCHAR(50),  -- cheque / transfer ref
    notes           TEXT,
    
    period_id       INTEGER REFERENCES accounting_periods(id),
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted', 'reversed', 'cancelled')),
    
    approved_by     INTEGER REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    posted_by       INTEGER REFERENCES users(id),
    posted_at       TIMESTAMPTZ,
    reversed_by     INTEGER REFERENCES users(id),
    reversed_at     TIMESTAMPTZ,
    reversal_reason TEXT,
    
    created_by      INTEGER REFERENCES users(id),
    updated_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    UNIQUE(voucher_number, company_id)
);

CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_company ON receipt_vouchers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_customer ON receipt_vouchers(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_date ON receipt_vouchers(receipt_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_status ON receipt_vouchers(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE receipt_vouchers IS 'Customer collection / payment receipt documents — Phase 4 F-04';

-- Receipt voucher lines — links to invoices being paid
CREATE TABLE IF NOT EXISTS receipt_voucher_lines (
    id                  SERIAL PRIMARY KEY,
    receipt_voucher_id  INTEGER NOT NULL REFERENCES receipt_vouchers(id) ON DELETE CASCADE,
    
    invoice_id          INTEGER,  -- FK to sales_invoices
    invoice_number      VARCHAR(30),
    invoice_amount      DECIMAL(18,4),  -- original invoice amount
    amount_paid         DECIMAL(18,4) NOT NULL,  -- amount allocated to this invoice
    discount_amount     DECIMAL(18,4) DEFAULT 0,
    
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_lines_voucher ON receipt_voucher_lines(receipt_voucher_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣  INVENTORY TRANSFERS  (E-02)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_transfers (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    transfer_number VARCHAR(20) NOT NULL,
    transfer_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    
    from_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    to_warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
    
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_transit', 'received', 'cancelled')),
    
    notes           TEXT,
    reason          VARCHAR(200),
    
    expected_date   DATE,
    received_date   DATE,
    
    period_id       INTEGER REFERENCES accounting_periods(id),
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    requested_by    INTEGER REFERENCES users(id),
    approved_by     INTEGER REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    shipped_by      INTEGER REFERENCES users(id),
    shipped_at      TIMESTAMPTZ,
    received_by     INTEGER REFERENCES users(id),
    received_at     TIMESTAMPTZ,
    
    created_by      INTEGER REFERENCES users(id),
    updated_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    UNIQUE(transfer_number, company_id),
    CHECK(from_warehouse_id != to_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_transfers_company ON inventory_transfers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inv_transfers_status ON inventory_transfers(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inv_transfers_from_wh ON inventory_transfers(from_warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inv_transfers_to_wh ON inventory_transfers(to_warehouse_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE inventory_transfers IS 'Inter-warehouse stock transfers with workflow — Phase 4 E-02';

CREATE TABLE IF NOT EXISTS inventory_transfer_lines (
    id                  SERIAL PRIMARY KEY,
    transfer_id         INTEGER NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    
    item_id             INTEGER NOT NULL,  -- FK to items
    unit_id             INTEGER,           -- FK to units
    
    quantity_requested  DECIMAL(18,4) NOT NULL,
    quantity_shipped    DECIMAL(18,4) DEFAULT 0,
    quantity_received   DECIMAL(18,4) DEFAULT 0,
    
    unit_cost           DECIMAL(18,8),
    total_cost          DECIMAL(18,4),
    
    batch_number        VARCHAR(50),
    serial_number       VARCHAR(50),
    
    from_location_id    INTEGER,  -- FK to storage_locations
    to_location_id      INTEGER,  -- FK to storage_locations
    
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer ON inventory_transfer_lines(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_lines_item ON inventory_transfer_lines(item_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣  INVENTORY VALUATION SNAPSHOTS  (E-03)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_valuation_snapshots (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    snapshot_date   DATE NOT NULL,
    period_id       INTEGER REFERENCES accounting_periods(id),
    warehouse_id    INTEGER REFERENCES warehouses(id),
    
    item_id         INTEGER NOT NULL,
    item_code       VARCHAR(50),
    item_name       VARCHAR(200),
    
    quantity_on_hand DECIMAL(18,4) NOT NULL DEFAULT 0,
    unit_cost       DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_value     DECIMAL(18,4) NOT NULL DEFAULT 0,
    
    valuation_method VARCHAR(20) NOT NULL DEFAULT 'weighted_average' CHECK (valuation_method IN ('fifo', 'weighted_average', 'standard_cost')),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_valuation_company ON inventory_valuation_snapshots(company_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_inv_valuation_item ON inventory_valuation_snapshots(item_id, snapshot_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣  VAT RETURNS  (G-05)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vat_returns (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    return_number   VARCHAR(20) NOT NULL,
    period_id       INTEGER REFERENCES accounting_periods(id),
    
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    filing_due_date DATE NOT NULL,
    
    -- VAT Output (Sales)
    standard_rated_sales    DECIMAL(18,4) DEFAULT 0,
    standard_vat_output     DECIMAL(18,4) DEFAULT 0,
    zero_rated_sales        DECIMAL(18,4) DEFAULT 0,
    exempt_sales            DECIMAL(18,4) DEFAULT 0,
    total_vat_output        DECIMAL(18,4) DEFAULT 0,
    
    -- VAT Input (Purchases)
    standard_rated_purchases DECIMAL(18,4) DEFAULT 0,
    standard_vat_input       DECIMAL(18,4) DEFAULT 0,
    import_vat               DECIMAL(18,4) DEFAULT 0,
    total_vat_input          DECIMAL(18,4) DEFAULT 0,
    
    -- Net
    net_vat_due             DECIMAL(18,4) DEFAULT 0,  -- output - input
    adjustments             DECIMAL(18,4) DEFAULT 0,
    total_due               DECIMAL(18,4) DEFAULT 0,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'submitted', 'paid', 'amended')),
    
    -- Filing info
    zatca_reference VARCHAR(100),
    submitted_at    TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    payment_reference VARCHAR(100),
    
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    
    notes           TEXT,
    
    prepared_by     INTEGER REFERENCES users(id),
    reviewed_by     INTEGER REFERENCES users(id),
    approved_by     INTEGER REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    
    created_by      INTEGER REFERENCES users(id),
    updated_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    UNIQUE(return_number, company_id)
);

CREATE INDEX IF NOT EXISTS idx_vat_returns_company ON vat_returns(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vat_returns_period ON vat_returns(period_start, period_end) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vat_returns_status ON vat_returns(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE vat_returns IS 'VAT return filing and tracking — ZATCA compliance — Phase 4 G-05';

-- VAT return line items
CREATE TABLE IF NOT EXISTS vat_return_lines (
    id              SERIAL PRIMARY KEY,
    vat_return_id   INTEGER NOT NULL REFERENCES vat_returns(id) ON DELETE CASCADE,
    
    line_type       VARCHAR(20) NOT NULL CHECK (line_type IN ('output', 'input')),
    source_type     VARCHAR(30),  -- 'sales_invoice', 'purchase_invoice', 'credit_note', 'debit_note'
    source_id       INTEGER,
    source_number   VARCHAR(50),
    source_date     DATE,
    
    partner_name    VARCHAR(200),
    partner_tax_number VARCHAR(20),
    
    taxable_amount  DECIMAL(18,4) NOT NULL DEFAULT 0,
    vat_rate        DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    vat_amount      DECIMAL(18,4) NOT NULL DEFAULT 0,
    vat_category    VARCHAR(5) DEFAULT 'S',  -- S=standard, Z=zero, E=exempt, O=out-of-scope
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vat_return_lines_return ON vat_return_lines(vat_return_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6️⃣  ZATCA E-INVOICING SUBMISSIONS  (F-05)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS zatca_submissions (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    invoice_id      INTEGER NOT NULL,  -- FK to sales_invoices
    invoice_number  VARCHAR(30),
    
    submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('clearance', 'reporting')),
    
    -- XML & Hashing
    xml_content     TEXT,
    hash_value      VARCHAR(255),
    previous_invoice_hash VARCHAR(255),
    qr_code         TEXT,
    
    -- Digital signature
    digital_signature TEXT,
    certificate_serial VARCHAR(100),
    
    -- Submission tracking
    submitted_at    TIMESTAMPTZ,
    response_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'cleared', 'reported', 'warning', 'rejected', 'error', 'timeout')),
    response_xml    TEXT,
    zatca_uuid      UUID,
    
    warnings        TEXT,
    errors          TEXT,
    
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    next_retry_at   TIMESTAMPTZ,
    
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zatca_submissions_company ON zatca_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_zatca_submissions_invoice ON zatca_submissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_zatca_submissions_status ON zatca_submissions(response_status);

COMMENT ON TABLE zatca_submissions IS 'ZATCA e-invoicing Phase 2 submission tracking — Phase 4 F-05';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7️⃣  ENHANCE COMPANIES TABLE  (B-01 additional fields)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_number VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_scheme VARCHAR(20) DEFAULT 'standard' CHECK (tax_scheme IS NULL OR tax_scheme IN ('standard', 'simplified', 'exempt'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accounting_standard VARCHAR(10) DEFAULT 'IFRS' CHECK (accounting_standard IS NULL OR accounting_standard IN ('IFRS', 'SOCPA', 'Local'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month IS NULL OR (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(10) DEFAULT 'INV';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS po_prefix VARCHAR(10) DEFAULT 'PO';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reporting_currency_id INTEGER REFERENCES currencies(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zatca_cert_pem TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zatca_private_key_ref VARCHAR(100);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8️⃣  ENHANCE PAYMENT METHODS  (B-08 ZATCA fields)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS zatca_payment_code VARCHAR(5);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS requires_reference BOOLEAN DEFAULT false;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS max_amount DECIMAL(18,2);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS gl_account_id INTEGER REFERENCES accounts(id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9️⃣  ENHANCE SALES INVOICES  (F-02 ZATCA fields)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_invoices') THEN
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS zatca_uuid UUID;
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS zatca_hash VARCHAR(255);
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS zatca_qr TEXT;
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS zatca_status VARCHAR(20) DEFAULT 'pending';
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS zatca_clearance_xml TEXT;
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS zatca_submission_date TIMESTAMPTZ;
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS digital_signature TEXT;
        ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10) DEFAULT 'b2b';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔟  PHASE 4 PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (permission_code, resource, action, description)
VALUES
    -- Cash Registers (C-02)
    ('cash_registers:view', 'cash_registers', 'view', 'View cash registers / petty cash'),
    ('cash_registers:create', 'cash_registers', 'create', 'Create cash registers'),
    ('cash_registers:edit', 'cash_registers', 'edit', 'Edit cash registers'),
    ('cash_registers:delete', 'cash_registers', 'delete', 'Delete cash registers'),
    ('cash_registers:transact', 'cash_registers', 'transact', 'Record cash register transactions'),
    
    -- Receipt Vouchers (F-04)
    ('receipt_vouchers:view', 'receipt_vouchers', 'view', 'View receipt vouchers'),
    ('receipt_vouchers:create', 'receipt_vouchers', 'create', 'Create receipt vouchers'),
    ('receipt_vouchers:edit', 'receipt_vouchers', 'edit', 'Edit receipt vouchers'),
    ('receipt_vouchers:delete', 'receipt_vouchers', 'delete', 'Delete receipt vouchers'),
    ('receipt_vouchers:approve', 'receipt_vouchers', 'approve', 'Approve receipt vouchers'),
    ('receipt_vouchers:post', 'receipt_vouchers', 'post', 'Post receipt vouchers to GL'),
    ('receipt_vouchers:reverse', 'receipt_vouchers', 'reverse', 'Reverse posted receipt vouchers'),
    
    -- Inventory Transfers (E-02)
    ('inventory_transfers:view', 'inventory_transfers', 'view', 'View inventory transfers'),
    ('inventory_transfers:create', 'inventory_transfers', 'create', 'Create inventory transfers'),
    ('inventory_transfers:edit', 'inventory_transfers', 'edit', 'Edit inventory transfers'),
    ('inventory_transfers:delete', 'inventory_transfers', 'delete', 'Delete inventory transfers'),
    ('inventory_transfers:approve', 'inventory_transfers', 'approve', 'Approve inventory transfers'),
    ('inventory_transfers:ship', 'inventory_transfers', 'ship', 'Ship inventory transfers'),
    ('inventory_transfers:receive', 'inventory_transfers', 'receive', 'Receive inventory transfers'),
    
    -- Inventory Valuation (E-03)
    ('inventory_valuation:view', 'inventory_valuation', 'view', 'View inventory valuation reports'),
    ('inventory_valuation:generate', 'inventory_valuation', 'generate', 'Generate inventory valuation snapshots'),
    
    -- VAT Returns (G-05)
    ('vat_returns:view', 'vat_returns', 'view', 'View VAT returns'),
    ('vat_returns:create', 'vat_returns', 'create', 'Create VAT returns'),
    ('vat_returns:edit', 'vat_returns', 'edit', 'Edit VAT returns'),
    ('vat_returns:approve', 'vat_returns', 'approve', 'Approve VAT returns'),
    ('vat_returns:submit', 'vat_returns', 'submit', 'Submit VAT returns to ZATCA'),
    ('vat_returns:pay', 'vat_returns', 'pay', 'Record VAT payment'),
    
    -- ZATCA E-Invoicing (F-05)
    ('zatca:view', 'zatca', 'view', 'View ZATCA submissions'),
    ('zatca:submit', 'zatca', 'submit', 'Submit invoices to ZATCA'),
    ('zatca:retry', 'zatca', 'retry', 'Retry failed ZATCA submissions'),
    ('zatca:configure', 'zatca', 'configure', 'Configure ZATCA certificates')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant Phase 4 permissions to admin and super_admin roles
DO $$ 
DECLARE
    admin_role_id INTEGER;
    perm_id INTEGER;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
    IF admin_role_id IS NOT NULL THEN
        FOR perm_id IN 
            SELECT p.id FROM permissions p 
            WHERE p.permission_code LIKE 'cash_registers:%'
               OR p.permission_code LIKE 'receipt_vouchers:%'
               OR p.permission_code LIKE 'inventory_transfers:%'
               OR p.permission_code LIKE 'inventory_valuation:%'
               OR p.permission_code LIKE 'vat_returns:%'
               OR p.permission_code LIKE 'zatca:%'
        LOOP
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (admin_role_id, perm_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅  MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
