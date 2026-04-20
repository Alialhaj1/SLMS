-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 461: Multi-Vendor Marketplace Layer                          ║
-- ║  Adds: marketplace_vendors, marketplace_listings, order splitting,     ║
-- ║        vendor wallets, commission, platform governance                  ║
-- ║  Built ON TOP of migration 460 (e-commerce store module)               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. MARKETPLACE CONFIG — Platform-level settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_config (
    id                  SERIAL PRIMARY KEY,
    
    -- Platform identity
    platform_name       VARCHAR(200) NOT NULL DEFAULT 'SLMS Marketplace',
    platform_name_ar    VARCHAR(200) DEFAULT 'سوق SLMS',
    platform_slug       VARCHAR(100) NOT NULL DEFAULT 'marketplace',
    
    -- Commission defaults
    default_commission_rate   DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- % platform takes
    commission_type           VARCHAR(20) DEFAULT 'percentage',     -- percentage | flat | tiered
    
    -- Vendor onboarding
    auto_approve_vendors      BOOLEAN DEFAULT false,
    auto_approve_listings     BOOLEAN DEFAULT false,
    require_vendor_documents  BOOLEAN DEFAULT true,
    
    -- Settlement
    settlement_frequency      VARCHAR(20) DEFAULT 'weekly', -- daily | weekly | biweekly | monthly
    settlement_min_amount     DECIMAL(15,2) DEFAULT 100.00,
    settlement_hold_days      INTEGER DEFAULT 7, -- Hold days after delivery before payout
    
    -- Policies
    max_listing_images        INTEGER DEFAULT 10,
    allow_vendor_coupons      BOOLEAN DEFAULT true,
    allow_vendor_shipping     BOOLEAN DEFAULT false, -- false = platform handles shipping
    vendor_registration_enabled BOOLEAN DEFAULT true,
    
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config
INSERT INTO marketplace_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 1b. MARKETPLACE PLANS — Subscription tiers for vendors (created before vendors table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_plans (
    id              SERIAL PRIMARY KEY,
    
    name            VARCHAR(100) NOT NULL,
    name_ar         VARCHAR(100),
    slug            VARCHAR(50) NOT NULL,
    description     TEXT,
    description_ar  TEXT,
    
    -- Pricing
    price_monthly       DECIMAL(15,2) NOT NULL DEFAULT 0,
    price_yearly        DECIMAL(15,2),
    currency_id         INTEGER REFERENCES currencies(id),
    
    -- Limits
    max_listings        INTEGER, -- NULL = unlimited
    max_images_per_listing INTEGER DEFAULT 10,
    
    -- Commission override (lower commission for higher plans)
    commission_rate     DECIMAL(5,2),
    
    -- Features
    features            JSONB DEFAULT '[]', -- ["featured_listings", "analytics", "priority_support"]
    
    is_active       BOOLEAN DEFAULT true,
    sort_order      INTEGER DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO marketplace_plans (name, name_ar, slug, price_monthly, max_listings, commission_rate, features) VALUES
    ('Free', 'مجاني', 'free', 0, 20, 15.00, '["basic_analytics"]'),
    ('Pro', 'احترافي', 'pro', 99.00, 200, 10.00, '["basic_analytics", "featured_listings", "priority_support"]'),
    ('Enterprise', 'مؤسسات', 'enterprise', 299.00, NULL, 5.00, '["advanced_analytics", "featured_listings", "priority_support", "custom_branding", "api_access"]')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. MARKETPLACE VENDORS — Each tenant/company can become a vendor
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_vendors (
    id              SERIAL PRIMARY KEY,
    
    -- Link to tenant/company (the seller's own ERP)
    tenant_id       INTEGER REFERENCES tenants(id),
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    store_id        INTEGER REFERENCES stores(id), -- Their existing store (if any)
    
    -- Vendor identity
    vendor_name     VARCHAR(200) NOT NULL,
    vendor_name_ar  VARCHAR(200),
    slug            VARCHAR(100) NOT NULL,
    logo_url        VARCHAR(500),
    banner_url      VARCHAR(500),
    description     TEXT,
    description_ar  TEXT,
    
    -- Contact
    contact_email   VARCHAR(200) NOT NULL,
    contact_phone   VARCHAR(50),
    business_address VARCHAR(500),
    city_id         INTEGER REFERENCES cities(id),
    country_id      INTEGER REFERENCES countries(id),
    
    -- Business info
    business_type   VARCHAR(50), -- individual | company | brand
    tax_number      VARCHAR(100),
    commercial_register VARCHAR(100),
    bank_name       VARCHAR(200),
    bank_iban       VARCHAR(50),
    bank_account_name VARCHAR(200),
    
    -- Commission (overrides platform default)
    commission_rate     DECIMAL(5,2), -- NULL = use platform default
    commission_type     VARCHAR(20),  -- NULL = use platform default
    
    -- Status
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending | under_review | active | suspended | banned | closed
    approved_at     TIMESTAMPTZ,
    approved_by     INTEGER REFERENCES users(id),
    suspended_at    TIMESTAMPTZ,
    suspended_reason VARCHAR(500),
    
    -- Metrics (denormalized for performance)
    total_products  INTEGER DEFAULT 0,
    total_orders    INTEGER DEFAULT 0,
    total_revenue   DECIMAL(15,2) DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    rating_count    INTEGER DEFAULT 0,
    
    -- Subscription plan
    plan_id         INTEGER REFERENCES marketplace_plans(id),
    plan_expires_at TIMESTAMPTZ,
    
    -- Flags
    is_featured     BOOLEAN DEFAULT false,
    is_verified     BOOLEAN DEFAULT false,
    
    -- Audit
    created_by      INTEGER REFERENCES users(id),
    updated_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_vendor_company ON marketplace_vendors(company_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_vendor_slug ON marketplace_vendors(slug) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_mp_vendors_status ON marketplace_vendors(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_vendors_slug ON marketplace_vendors(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_vendors_company ON marketplace_vendors(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_vendors_featured ON marketplace_vendors(is_featured) WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================================================
-- 3. VENDOR DOCUMENTS — KYC/verification documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_documents (
    id              SERIAL PRIMARY KEY,
    vendor_id       INTEGER NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
    
    document_type   VARCHAR(50) NOT NULL, -- commercial_register | tax_certificate | id_card | bank_letter
    document_url    VARCHAR(500) NOT NULL,
    document_name   VARCHAR(200),
    
    status          VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
    reviewed_by     INTEGER REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    rejection_reason VARCHAR(500),
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_documents ON vendor_documents(vendor_id);

-- ============================================================================
-- 4. MARKETPLACE CATEGORIES — Unified categories across all vendors
--    (moved before listings because listings reference this table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_categories (
    id              SERIAL PRIMARY KEY,
    parent_id       INTEGER REFERENCES marketplace_categories(id),
    
    name            VARCHAR(200) NOT NULL,
    name_ar         VARCHAR(200),
    slug            VARCHAR(100) NOT NULL,
    description     TEXT,
    description_ar  TEXT,
    icon_url        VARCHAR(500),
    image_url       VARCHAR(500),
    
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    is_featured     BOOLEAN DEFAULT false,
    
    -- SEO
    meta_title      VARCHAR(200),
    meta_description TEXT,
    
    -- Metadata
    product_count   INTEGER DEFAULT 0, -- denormalized
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_category_slug ON marketplace_categories(slug) WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_mp_categories_parent ON marketplace_categories(parent_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. MARKETPLACE LISTINGS — Products published to the marketplace
--    This is the HEART of the marketplace — decouples vendor items from catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id              SERIAL PRIMARY KEY,
    vendor_id       INTEGER NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
    
    -- Source product (from vendor's ERP)
    item_id         INTEGER NOT NULL REFERENCES items(id),
    variant_id      INTEGER REFERENCES item_variants(id),
    company_id      INTEGER NOT NULL REFERENCES companies(id), -- vendor's company
    
    -- Marketplace display (can differ from ERP)
    listing_title       VARCHAR(300) NOT NULL,
    listing_title_ar    VARCHAR(300),
    listing_description TEXT,
    listing_description_ar TEXT,
    slug                VARCHAR(200) NOT NULL,
    
    -- Pricing (marketplace-specific, may differ from vendor's price list)
    price               DECIMAL(15,4) NOT NULL,
    compare_at_price    DECIMAL(15,4), -- "was" price for showing discount
    currency_id         INTEGER REFERENCES currencies(id),
    price_list_id       INTEGER REFERENCES price_lists(id), -- Source price list
    
    -- Stock
    stock_source        VARCHAR(30) DEFAULT 'warehouse', -- warehouse | manual
    warehouse_id        INTEGER REFERENCES warehouses(id),
    manual_stock        INTEGER, -- If stock_source = 'manual'
    low_stock_threshold INTEGER DEFAULT 5,
    
    -- Category mapping
    marketplace_category_id INTEGER REFERENCES marketplace_categories(id),
    
    -- SEO
    meta_title          VARCHAR(200),
    meta_description    TEXT,
    
    -- Media (marketplace-specific images, can overlay ERP images)
    images              JSONB DEFAULT '[]', -- [{url, thumbnailUrl, altText, sortOrder, isPrimary}]
    
    -- Status & moderation
    status              VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- draft | pending_review | approved | rejected | suspended | archived
    is_published        BOOLEAN DEFAULT false,
    published_at        TIMESTAMPTZ,
    
    -- Moderation
    reviewed_by         INTEGER REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    VARCHAR(500),
    
    -- Metrics
    view_count          INTEGER DEFAULT 0,
    order_count         INTEGER DEFAULT 0,
    avg_rating          DECIMAL(3,2) DEFAULT 0,
    rating_count        INTEGER DEFAULT 0,
    
    -- Flags
    is_featured         BOOLEAN DEFAULT false,
    is_best_seller      BOOLEAN DEFAULT false,
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_listing_slug ON marketplace_listings(slug) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_listing_item_vendor ON marketplace_listings(vendor_id, item_id, variant_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_mp_listings_vendor ON marketplace_listings(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_listings_item ON marketplace_listings(item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_listings_status ON marketplace_listings(status, is_published) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_listings_category ON marketplace_listings(marketplace_category_id) WHERE is_published = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_listings_price ON marketplace_listings(price) WHERE is_published = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_listings_featured ON marketplace_listings(is_featured) WHERE is_published = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_categories_slug ON marketplace_categories(slug) WHERE deleted_at IS NULL;

-- ============================================================================
-- 6. MARKETPLACE ORDERS — Master orders (one per checkout, spans vendors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id              SERIAL PRIMARY KEY,
    
    -- Customer
    store_customer_id   INTEGER NOT NULL REFERENCES store_customers(id),
    
    -- Order number
    order_number    VARCHAR(50) NOT NULL,
    
    -- Totals (across all vendors)
    subtotal            DECIMAL(15,2) NOT NULL,
    discount_amount     DECIMAL(15,2) DEFAULT 0,
    tax_amount          DECIMAL(15,2) DEFAULT 0,
    shipping_amount     DECIMAL(15,2) DEFAULT 0,
    platform_fee        DECIMAL(15,2) DEFAULT 0,
    total               DECIMAL(15,2) NOT NULL,
    
    currency_id         INTEGER REFERENCES currencies(id),
    
    -- Addresses (snapshot)
    billing_address     JSONB NOT NULL,
    shipping_address    JSONB NOT NULL,
    
    -- Payment (single payment for entire order)
    payment_status      VARCHAR(20) DEFAULT 'unpaid',
    -- unpaid | paid | partially_refunded | refunded | failed
    payment_gateway     VARCHAR(50),
    payment_reference   VARCHAR(200),
    paid_at             TIMESTAMPTZ,
    
    -- Coupon (platform-level coupon)
    coupon_id           INTEGER REFERENCES coupons(id),
    coupon_code         VARCHAR(50),
    
    -- Overall status
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending | confirmed | partially_shipped | shipped | delivered | cancelled | refunded
    
    -- Notes
    customer_notes      TEXT,
    
    -- Metadata
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    vendor_count        INTEGER DEFAULT 1,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_order_number ON marketplace_orders(order_number) WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_mp_orders_customer ON marketplace_orders(store_customer_id);
CREATE INDEX IF NOT EXISTS idx_mp_orders_status ON marketplace_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_orders_payment ON marketplace_orders(payment_status) WHERE deleted_at IS NULL;

-- ============================================================================
-- 7. MARKETPLACE ORDER VENDORS — Sub-orders per vendor (order splitting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_order_vendors (
    id                  SERIAL PRIMARY KEY,
    marketplace_order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    vendor_id           INTEGER NOT NULL REFERENCES marketplace_vendors(id),
    
    -- Sub-order number (e.g., MKT-000001-V1)
    sub_order_number    VARCHAR(60) NOT NULL,
    
    -- Link to vendor's ERP Sales Order
    sales_order_id      INTEGER REFERENCES sales_orders(id),
    sales_invoice_id    INTEGER REFERENCES sales_invoices(id),
    
    -- Vendor sub-totals
    subtotal            DECIMAL(15,2) NOT NULL,
    discount_amount     DECIMAL(15,2) DEFAULT 0,
    tax_amount          DECIMAL(15,2) DEFAULT 0,
    shipping_amount     DECIMAL(15,2) DEFAULT 0,
    total               DECIMAL(15,2) NOT NULL,
    
    -- Commission
    commission_rate     DECIMAL(5,2) NOT NULL,
    commission_amount   DECIMAL(15,2) NOT NULL,
    vendor_payout       DECIMAL(15,2) NOT NULL, -- total - commission
    
    -- Status (independent per vendor)
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending | confirmed | processing | shipped | delivered | cancelled | refunded
    
    -- Shipping (each vendor ships independently)
    tracking_number     VARCHAR(200),
    shipping_provider   VARCHAR(100),
    shipped_at          TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    estimated_delivery  DATE,
    
    -- Settlement
    settlement_status   VARCHAR(20) DEFAULT 'pending',
    -- pending | eligible | processing | settled | held
    settlement_eligible_at TIMESTAMPTZ, -- After hold period
    settled_at          TIMESTAMPTZ,
    
    -- Notes
    vendor_notes        TEXT,
    cancel_reason       VARCHAR(500),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_mp_order_vendor UNIQUE (marketplace_order_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_order_vendors_order ON marketplace_order_vendors(marketplace_order_id);
CREATE INDEX IF NOT EXISTS idx_mp_order_vendors_vendor ON marketplace_order_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_order_vendors_status ON marketplace_order_vendors(status);
CREATE INDEX IF NOT EXISTS idx_mp_order_vendors_settlement ON marketplace_order_vendors(settlement_status) WHERE settlement_status != 'settled';

-- ============================================================================
-- 8. MARKETPLACE ORDER ITEMS — Items within each vendor sub-order
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_order_items (
    id                      SERIAL PRIMARY KEY,
    marketplace_order_id    INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    order_vendor_id         INTEGER NOT NULL REFERENCES marketplace_order_vendors(id) ON DELETE CASCADE,
    listing_id              INTEGER NOT NULL REFERENCES marketplace_listings(id),
    
    -- Product snapshot
    item_id                 INTEGER NOT NULL REFERENCES items(id),
    variant_id              INTEGER REFERENCES item_variants(id),
    item_name               VARCHAR(200) NOT NULL,
    item_name_ar            VARCHAR(200),
    item_code               VARCHAR(50),
    image_url               VARCHAR(500),
    
    -- Quantity & pricing
    quantity                DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    uom_id                  INTEGER REFERENCES units(id),
    unit_price              DECIMAL(15,4) NOT NULL,
    discount_percent        DECIMAL(5,2) DEFAULT 0,
    discount_amount         DECIMAL(15,2) DEFAULT 0,
    tax_rate                DECIMAL(5,2) DEFAULT 0,
    tax_amount              DECIMAL(15,2) DEFAULT 0,
    line_total              DECIMAL(15,2) NOT NULL,
    
    -- Fulfillment
    fulfilled_qty           DECIMAL(15,3) DEFAULT 0,
    warehouse_id            INTEGER REFERENCES warehouses(id),
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_order_items_order ON marketplace_order_items(marketplace_order_id);
CREATE INDEX IF NOT EXISTS idx_mp_order_items_vendor ON marketplace_order_items(order_vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_order_items_listing ON marketplace_order_items(listing_id);

-- ============================================================================
-- 9. VENDOR WALLETS — Financial balance per vendor
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_wallets (
    id              SERIAL PRIMARY KEY,
    vendor_id       INTEGER NOT NULL REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
    
    -- Balances
    available_balance   DECIMAL(15,2) NOT NULL DEFAULT 0,
    pending_balance     DECIMAL(15,2) NOT NULL DEFAULT 0, -- Earned but in hold period
    total_earned        DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_withdrawn     DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_commission    DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    currency_id         INTEGER REFERENCES currencies(id),
    
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_vendor_wallet UNIQUE (vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_wallets ON vendor_wallets(vendor_id);

-- ============================================================================
-- 10. VENDOR PAYOUTS — Scheduled payouts to vendors
--     (moved before transactions because transactions reference this table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_payouts (
    id              SERIAL PRIMARY KEY,
    vendor_id       INTEGER NOT NULL REFERENCES marketplace_vendors(id),
    
    -- Payout details
    amount          DECIMAL(15,2) NOT NULL,
    currency_id     INTEGER REFERENCES currencies(id),
    
    -- Bank details (snapshot at payout time)
    bank_name       VARCHAR(200),
    bank_iban       VARCHAR(50),
    bank_account_name VARCHAR(200),
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | processing | completed | failed | cancelled
    
    -- Payment reference
    payment_reference VARCHAR(200),
    payment_method  VARCHAR(50), -- bank_transfer | check
    
    -- ERP link
    payment_voucher_id INTEGER,
    journal_entry_id   INTEGER,
    
    -- Processing
    processed_at    TIMESTAMPTZ,
    processed_by    INTEGER REFERENCES users(id),
    failure_reason  VARCHAR(500),
    
    -- Period
    period_from     DATE,
    period_to       DATE,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status);

-- ============================================================================
-- 11. VENDOR TRANSACTIONS — Ledger of all financial movements
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_transactions (
    id              SERIAL PRIMARY KEY,
    vendor_id       INTEGER NOT NULL REFERENCES marketplace_vendors(id),
    wallet_id       INTEGER NOT NULL REFERENCES vendor_wallets(id),
    
    -- Transaction type
    transaction_type VARCHAR(30) NOT NULL,
    -- sale | commission | refund | payout | adjustment | subscription_fee | penalty
    
    -- Amounts
    amount          DECIMAL(15,2) NOT NULL, -- Positive = credit, negative = debit
    balance_after   DECIMAL(15,2) NOT NULL,
    
    -- References
    marketplace_order_id    INTEGER REFERENCES marketplace_orders(id),
    order_vendor_id         INTEGER REFERENCES marketplace_order_vendors(id),
    payout_id               INTEGER REFERENCES vendor_payouts(id),
    
    -- Description
    description     VARCHAR(500),
    description_ar  VARCHAR(500),
    
    -- Metadata
    metadata        JSONB DEFAULT '{}',
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_transactions_vendor ON vendor_transactions(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_type ON vendor_transactions(transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_order ON vendor_transactions(marketplace_order_id);

-- ============================================================================
-- 12. (marketplace_plans moved to section 1b above)
-- ============================================================================

-- ============================================================================
-- 13. MARKETPLACE REVIEWS — Reviews that link to vendor + listing
-- ============================================================================
-- We extend the existing store_reviews to work with marketplace
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES marketplace_vendors(id);
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS listing_id INTEGER REFERENCES marketplace_listings(id);

-- ============================================================================
-- 14. VENDOR COUPONS — Vendor-specific coupons
-- ============================================================================
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES marketplace_vendors(id);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_scope VARCHAR(20) DEFAULT 'store';
-- store | vendor | platform

CREATE INDEX IF NOT EXISTS idx_coupons_vendor ON coupons(vendor_id) WHERE vendor_id IS NOT NULL;

-- ============================================================================
-- 15. EXTEND CART ITEMS — Add vendor tracking to cart
-- ============================================================================
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES marketplace_vendors(id);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS listing_id INTEGER REFERENCES marketplace_listings(id);

CREATE INDEX IF NOT EXISTS idx_cart_items_vendor ON cart_items(vendor_id) WHERE vendor_id IS NOT NULL;

-- ============================================================================
-- 16. MARKETPLACE NUMBER SEQUENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_sequences (
    id          SERIAL PRIMARY KEY,
    seq_type    VARCHAR(30) NOT NULL, -- 'order' | 'payout' | 'vendor'
    prefix      VARCHAR(20) DEFAULT 'MKT',
    next_value  INTEGER NOT NULL DEFAULT 1,
    
    CONSTRAINT uq_mp_sequence UNIQUE (seq_type)
);

INSERT INTO marketplace_sequences (seq_type, prefix, next_value) VALUES
    ('order', 'MKT', 1),
    ('payout', 'PAY', 1),
    ('vendor', 'VND', 1)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 17. MARKETPLACE PERMISSIONS
-- ============================================================================
INSERT INTO permissions (permission_code, resource, action, description, module)
SELECT * FROM (VALUES
    ('marketplace:view',                'marketplace',           'view',     'View marketplace settings',       'marketplace'),
    ('marketplace:manage',              'marketplace',           'manage',   'Manage marketplace platform',     'marketplace'),
    ('marketplace_vendors:view',        'marketplace_vendors',   'view',     'View vendors',                    'marketplace'),
    ('marketplace_vendors:manage',      'marketplace_vendors',   'manage',   'Manage vendor approvals',         'marketplace'),
    ('marketplace_listings:view',       'marketplace_listings',  'view',     'View listings',                   'marketplace'),
    ('marketplace_listings:manage',     'marketplace_listings',  'manage',   'Moderate listings',               'marketplace'),
    ('marketplace_orders:view',         'marketplace_orders',    'view',     'View marketplace orders',         'marketplace'),
    ('marketplace_orders:manage',       'marketplace_orders',    'manage',   'Manage marketplace orders',       'marketplace'),
    ('marketplace_finance:view',        'marketplace_finance',   'view',     'View financials/settlements',     'marketplace'),
    ('marketplace_finance:manage',      'marketplace_finance',   'manage',   'Process payouts',                 'marketplace'),
    ('marketplace_categories:view',     'marketplace_categories','view',     'View marketplace categories',     'marketplace'),
    ('marketplace_categories:manage',   'marketplace_categories','manage',   'Manage marketplace categories',   'marketplace'),
    ('vendor_dashboard:view',           'vendor_dashboard',      'view',     'View vendor dashboard',           'marketplace'),
    ('vendor_listings:manage',          'vendor_listings',       'manage',   'Manage own listings',             'marketplace'),
    ('vendor_orders:view',              'vendor_orders',         'view',     'View vendor orders',              'marketplace'),
    ('vendor_orders:manage',            'vendor_orders',         'manage',   'Manage vendor orders (ship etc)', 'marketplace'),
    ('vendor_wallet:view',              'vendor_wallet',         'view',     'View wallet/transactions',        'marketplace'),
    ('vendor_payouts:request',          'vendor_payouts',        'request',  'Request payout',                  'marketplace')
) AS v(permission_code, resource, action, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permissions.permission_code = v.permission_code);

-- ============================================================================
-- 18. MARKETPLACE DISPUTES — Order disputes between customer & vendor
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_disputes (
    id              SERIAL PRIMARY KEY,
    marketplace_order_id INTEGER NOT NULL REFERENCES marketplace_orders(id),
    order_vendor_id INTEGER NOT NULL REFERENCES marketplace_order_vendors(id),
    
    -- Parties
    opened_by       VARCHAR(20) NOT NULL, -- customer | vendor | platform
    store_customer_id INTEGER REFERENCES store_customers(id),
    vendor_id       INTEGER REFERENCES marketplace_vendors(id),
    
    -- Details
    reason          VARCHAR(50) NOT NULL,
    -- not_received | wrong_item | damaged | not_as_described | other
    description     TEXT NOT NULL,
    evidence_urls   JSONB DEFAULT '[]',
    
    -- Resolution
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    -- open | under_review | resolved | escalated | closed
    resolution      VARCHAR(50),
    -- refund_full | refund_partial | replacement | rejected | mediated
    resolution_notes TEXT,
    resolved_by     INTEGER REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    
    refund_amount   DECIMAL(15,2),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_disputes_order ON marketplace_disputes(marketplace_order_id);
CREATE INDEX IF NOT EXISTS idx_mp_disputes_vendor ON marketplace_disputes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_disputes_status ON marketplace_disputes(status) WHERE status != 'closed';
