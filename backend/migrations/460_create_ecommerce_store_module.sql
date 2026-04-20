-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 460: E-Commerce Store Module — Foundation Tables             ║
-- ║  Creates stores, store_settings, store_domains, store_customers,       ║
-- ║  product_images, carts, cart_items, wishlists, shipping_zones,         ║
-- ║  shipping_rates, coupons, promotions, store_reviews, store_orders      ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. STORES — One store per company (tenant can have multiple companies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stores (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tenant_id       INTEGER REFERENCES tenants(id),

    -- Store identity
    store_name      VARCHAR(200) NOT NULL,
    store_name_ar   VARCHAR(200),
    slug            VARCHAR(100) NOT NULL,
    logo_url        VARCHAR(500),
    favicon_url     VARCHAR(500),
    banner_url      VARCHAR(500),

    -- Store config
    default_currency_id  INTEGER REFERENCES currencies(id),
    default_language     VARCHAR(5) DEFAULT 'ar',
    timezone             VARCHAR(50) DEFAULT 'Asia/Riyadh',
    tax_included         BOOLEAN DEFAULT true,
    
    -- Contact
    support_email   VARCHAR(200),
    support_phone   VARCHAR(50),
    
    -- Status
    is_active       BOOLEAN DEFAULT false,
    is_published    BOOLEAN DEFAULT false,
    published_at    TIMESTAMPTZ,

    -- SEO defaults
    meta_title      VARCHAR(200),
    meta_title_ar   VARCHAR(200),
    meta_description TEXT,
    meta_description_ar TEXT,

    -- Social
    social_links    JSONB DEFAULT '{}',

    -- Audit
    created_by      INTEGER REFERENCES users(id),
    updated_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stores_company ON stores(company_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stores_slug ON stores(slug) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_stores_company ON stores(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. STORE SETTINGS — Key-value config per store
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_settings (
    id          SERIAL PRIMARY KEY,
    store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    setting_key     VARCHAR(100) NOT NULL,
    setting_value   JSONB NOT NULL DEFAULT '{}',
    
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_store_settings_key UNIQUE (store_id, setting_key)
);

-- ============================================================================
-- 3. STORE DOMAINS — Custom domains / subdomains
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_domains (
    id          SERIAL PRIMARY KEY,
    store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    domain      VARCHAR(253) NOT NULL,   -- client1.yourapp.com or custom.com
    domain_type VARCHAR(20) NOT NULL DEFAULT 'subdomain', -- 'subdomain' | 'custom'
    is_primary  BOOLEAN DEFAULT false,
    ssl_status  VARCHAR(20) DEFAULT 'pending', -- pending | active | failed
    verified_at TIMESTAMPTZ,
    
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_store_domains_domain UNIQUE (domain)
);

CREATE INDEX IF NOT EXISTS idx_store_domains_store ON store_domains(store_id);
CREATE INDEX IF NOT EXISTS idx_store_domains_domain ON store_domains(domain);

-- ============================================================================
-- 4. STORE CUSTOMERS — External customer accounts (separate from ERP users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_customers (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    -- Auth
    email           VARCHAR(200) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    email_verified  BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    
    -- Profile
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    phone           VARCHAR(50),
    avatar_url      VARCHAR(500),
    locale          VARCHAR(5) DEFAULT 'ar',
    
    -- Link to ERP customer (created on first order)
    erp_customer_id INTEGER REFERENCES customers(id),
    
    -- Status
    is_active       BOOLEAN DEFAULT true,
    blocked_at      TIMESTAMPTZ,
    blocked_reason  VARCHAR(500),
    
    -- Auth tracking
    last_login_at   TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    
    -- Preferences
    preferences     JSONB DEFAULT '{}',
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_customers_email ON store_customers(store_id, email) WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_store_customers_store ON store_customers(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_customers_email ON store_customers(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_customers_erp ON store_customers(erp_customer_id);

-- ============================================================================
-- 5. STORE CUSTOMER ADDRESSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_customer_addresses (
    id              SERIAL PRIMARY KEY,
    store_customer_id INTEGER NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
    
    label           VARCHAR(50) DEFAULT 'home', -- home | office | other
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    phone           VARCHAR(50),
    address_line1   VARCHAR(300) NOT NULL,
    address_line2   VARCHAR(300),
    city            VARCHAR(100) NOT NULL,
    city_id         INTEGER REFERENCES cities(id),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country_id      INTEGER REFERENCES countries(id),
    country_code    VARCHAR(3),
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    
    is_default_billing  BOOLEAN DEFAULT false,
    is_default_shipping BOOLEAN DEFAULT false,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_customer_addresses ON store_customer_addresses(store_customer_id);

-- ============================================================================
-- 6. PRODUCT IMAGES — Dedicated image management (replaces JSONB)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_images (
    id          SERIAL PRIMARY KEY,
    item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    company_id  INTEGER NOT NULL REFERENCES companies(id),
    variant_id  INTEGER REFERENCES item_variants(id),
    
    url         VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    alt_text    VARCHAR(200),
    alt_text_ar VARCHAR(200),
    sort_order  INTEGER DEFAULT 0,
    is_primary  BOOLEAN DEFAULT false,
    
    file_size   INTEGER, -- bytes
    width       INTEGER,
    height      INTEGER,
    mime_type   VARCHAR(50),
    
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_item ON product_images(item_id);
CREATE INDEX IF NOT EXISTS idx_product_images_company ON product_images(company_id);

-- ============================================================================
-- 7. PRODUCT SEO — SEO metadata for store products
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_seo (
    id          SERIAL PRIMARY KEY,
    item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    company_id  INTEGER NOT NULL REFERENCES companies(id),
    
    slug            VARCHAR(200) NOT NULL,
    meta_title      VARCHAR(200),
    meta_title_ar   VARCHAR(200),
    meta_description TEXT,
    meta_description_ar TEXT,
    meta_keywords   VARCHAR(500),
    og_image_url    VARCHAR(500),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_product_seo_slug UNIQUE (company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_seo_item ON product_seo(item_id);
CREATE INDEX IF NOT EXISTS idx_product_seo_slug ON product_seo(company_id, slug);

-- ============================================================================
-- 8. CARTS — Shopping carts (guest + authenticated)
-- ============================================================================
CREATE TABLE IF NOT EXISTS carts (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    -- Owner (one of these)
    store_customer_id INTEGER REFERENCES store_customers(id),
    session_id      VARCHAR(100), -- for guest carts
    
    -- Totals (calculated)
    subtotal        DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    shipping_amount DECIMAL(15,2) DEFAULT 0,
    total           DECIMAL(15,2) DEFAULT 0,
    
    currency_id     INTEGER REFERENCES currencies(id),
    coupon_id       INTEGER, -- FK added after coupons table
    
    -- Status
    status          VARCHAR(20) DEFAULT 'active', -- active | abandoned | converted
    
    -- Metadata
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    
    expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carts_store ON carts(store_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(store_customer_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id) WHERE status = 'active';

-- ============================================================================
-- 9. CART ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id          SERIAL PRIMARY KEY,
    cart_id     INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    
    item_id     INTEGER NOT NULL REFERENCES items(id),
    variant_id  INTEGER REFERENCES item_variants(id),
    
    quantity    DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    uom_id      INTEGER REFERENCES units(id),
    
    -- Pricing snapshot (at add-to-cart time)
    unit_price      DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_rate        DECIMAL(5,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    line_total      DECIMAL(15,2) NOT NULL,
    
    -- Metadata
    price_list_id   INTEGER REFERENCES price_lists(id),
    notes           VARCHAR(500),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_cart_item UNIQUE (cart_id, item_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- ============================================================================
-- 10. SHIPPING ZONES — B2C delivery zones
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_zones (
    id          SERIAL PRIMARY KEY,
    store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    company_id  INTEGER NOT NULL REFERENCES companies(id),
    
    name        VARCHAR(100) NOT NULL,
    name_ar     VARCHAR(100),
    
    -- Zone definition (one of these)
    zone_type   VARCHAR(20) NOT NULL DEFAULT 'country', -- country | state | city | postal
    countries   JSONB, -- [{"country_id": 1, "country_code": "SA"}]
    states      JSONB, -- [{"state": "Riyadh"}]
    cities      JSONB, -- [{"city_id": 1}]
    postal_codes JSONB, -- [{"from": "11000", "to": "11999"}]
    
    is_active   BOOLEAN DEFAULT true,
    sort_order  INTEGER DEFAULT 0,
    
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shipping_zones_store ON shipping_zones(store_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 11. SHIPPING RATES — Rates per zone
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_rates (
    id              SERIAL PRIMARY KEY,
    shipping_zone_id INTEGER NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
    
    name            VARCHAR(100) NOT NULL,
    name_ar         VARCHAR(100),
    
    -- Rate calculation
    rate_type       VARCHAR(20) NOT NULL DEFAULT 'flat', -- flat | weight_based | price_based | free
    flat_rate       DECIMAL(15,2),
    
    -- Weight-based tiers
    weight_rates    JSONB, -- [{"from_kg": 0, "to_kg": 5, "rate": 25}, ...]
    
    -- Price-based tiers (free shipping above X)
    min_order_amount DECIMAL(15,2) DEFAULT 0,
    free_shipping_above DECIMAL(15,2),
    
    -- Delivery time
    min_delivery_days INTEGER,
    max_delivery_days INTEGER,
    
    currency_id     INTEGER REFERENCES currencies(id),
    is_active       BOOLEAN DEFAULT true,
    sort_order      INTEGER DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_zone ON shipping_rates(shipping_zone_id);

-- ============================================================================
-- 12. COUPONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupons (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    code            VARCHAR(50) NOT NULL,
    description     VARCHAR(300),
    description_ar  VARCHAR(300),
    
    -- Discount type
    discount_type   VARCHAR(20) NOT NULL, -- percent | fixed | free_shipping
    discount_value  DECIMAL(15,2) NOT NULL DEFAULT 0,
    max_discount_amount DECIMAL(15,2), -- cap for percentage discounts
    
    -- Conditions
    min_order_amount    DECIMAL(15,2) DEFAULT 0,
    min_items_count     INTEGER DEFAULT 0,
    
    -- Scope
    applies_to      VARCHAR(20) DEFAULT 'all', -- all | categories | items
    applicable_items    JSONB, -- [item_id, ...]
    applicable_categories JSONB, -- [category_id, ...]
    excluded_items  JSONB,
    
    -- Limits
    usage_limit     INTEGER, -- total usage limit (NULL = unlimited)
    usage_per_customer INTEGER DEFAULT 1,
    times_used      INTEGER DEFAULT 0,
    
    -- Validity
    starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    
    is_active       BOOLEAN DEFAULT true,
    
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code ON coupons(store_id, code) WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_coupons_store ON coupons(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE deleted_at IS NULL AND is_active = true;

-- ============================================================================
-- 13. COUPON USAGE — Track coupon redemptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupon_usage (
    id              SERIAL PRIMARY KEY,
    coupon_id       INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    store_customer_id INTEGER REFERENCES store_customers(id),
    order_id        INTEGER, -- FK to store_orders added below
    
    discount_applied DECIMAL(15,2) NOT NULL,
    used_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage(store_customer_id);

-- ============================================================================
-- 14. STORE ORDERS — E-commerce orders (links to sales_orders)
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_orders (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id),
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    store_customer_id INTEGER NOT NULL REFERENCES store_customers(id),
    
    -- Order number
    order_number    VARCHAR(50) NOT NULL,
    
    -- Link to ERP
    sales_order_id  INTEGER REFERENCES sales_orders(id),
    sales_invoice_id INTEGER REFERENCES sales_invoices(id),
    
    -- Addresses (snapshot at order time)
    billing_address     JSONB NOT NULL,
    shipping_address    JSONB NOT NULL,
    
    -- Totals
    subtotal        DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    shipping_amount DECIMAL(15,2) DEFAULT 0,
    total           DECIMAL(15,2) NOT NULL,
    
    currency_id     INTEGER REFERENCES currencies(id),
    coupon_id       INTEGER REFERENCES coupons(id),
    coupon_code     VARCHAR(50),
    
    -- Status
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending | confirmed | processing | shipped | delivered | cancelled | refunded
    
    -- Payment
    payment_status  VARCHAR(20) DEFAULT 'unpaid',
    -- unpaid | paid | partially_refunded | refunded
    payment_method  VARCHAR(50),
    payment_gateway VARCHAR(50), -- stripe | paypal | mada | cod
    payment_reference VARCHAR(200),
    paid_at         TIMESTAMPTZ,
    
    -- Shipping
    shipping_method VARCHAR(100),
    shipping_zone_id INTEGER REFERENCES shipping_zones(id),
    tracking_number VARCHAR(200),
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    estimated_delivery_date DATE,
    
    -- Notes
    customer_notes  TEXT,
    internal_notes  TEXT,
    cancel_reason   VARCHAR(500),
    
    -- IP/UA for fraud detection
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_orders_number ON store_orders(store_id, order_number) WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_store_orders_store ON store_orders(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_orders_customer ON store_orders(store_customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_orders_sales_order ON store_orders(sales_order_id);

-- ============================================================================
-- 15. STORE ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_order_items (
    id              SERIAL PRIMARY KEY,
    store_order_id  INTEGER NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
    
    item_id         INTEGER NOT NULL REFERENCES items(id),
    variant_id      INTEGER REFERENCES item_variants(id),
    item_code       VARCHAR(50),
    item_name       VARCHAR(200) NOT NULL,
    item_name_ar    VARCHAR(200),
    
    quantity        DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    uom_id          INTEGER REFERENCES units(id),
    
    unit_price      DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_rate        DECIMAL(5,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    line_total      DECIMAL(15,2) NOT NULL,
    
    -- Fulfillment
    fulfilled_qty   DECIMAL(15,3) DEFAULT 0,
    warehouse_id    INTEGER REFERENCES warehouses(id),
    
    -- Snapshot of product image
    image_url       VARCHAR(500),
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items ON store_order_items(store_order_id);

-- ============================================================================
-- 16. STORE REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_reviews (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id),
    item_id         INTEGER NOT NULL REFERENCES items(id),
    store_customer_id INTEGER NOT NULL REFERENCES store_customers(id),
    store_order_id  INTEGER REFERENCES store_orders(id),
    
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(200),
    body            TEXT,
    
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved     BOOLEAN DEFAULT false, -- moderation
    is_featured     BOOLEAN DEFAULT false,
    
    helpful_count   INTEGER DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    CONSTRAINT uq_review_per_order UNIQUE (store_customer_id, item_id, store_order_id)
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_item ON store_reviews(item_id) WHERE deleted_at IS NULL AND is_approved = true;
CREATE INDEX IF NOT EXISTS idx_store_reviews_customer ON store_reviews(store_customer_id);

-- ============================================================================
-- 17. WISHLISTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_wishlists (
    id              SERIAL PRIMARY KEY,
    store_customer_id INTEGER NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
    item_id         INTEGER NOT NULL REFERENCES items(id),
    variant_id      INTEGER REFERENCES item_variants(id),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_wishlist_item UNIQUE (store_customer_id, item_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON store_wishlists(store_customer_id);

-- ============================================================================
-- 18. PAYMENT TRANSACTIONS — Online payment tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_payment_transactions (
    id              SERIAL PRIMARY KEY,
    store_order_id  INTEGER NOT NULL REFERENCES store_orders(id),
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    
    -- Gateway info
    gateway         VARCHAR(50) NOT NULL, -- stripe | paypal | mada | cod
    gateway_transaction_id VARCHAR(200),
    gateway_status  VARCHAR(50),
    gateway_response JSONB,
    
    -- Amounts
    amount          DECIMAL(15,2) NOT NULL,
    currency_code   VARCHAR(3) NOT NULL,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | authorized | captured | failed | refunded | cancelled
    
    -- ERP links (created after successful payment)
    payment_voucher_id INTEGER,
    journal_entry_id INTEGER,
    
    -- Metadata
    ip_address      VARCHAR(45),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_payments_order ON store_payment_transactions(store_order_id);
CREATE INDEX IF NOT EXISTS idx_store_payments_gateway ON store_payment_transactions(gateway, gateway_transaction_id);

-- ============================================================================
-- 19. STORE ANALYTICS EVENTS — Lightweight event tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_analytics_events (
    id              BIGSERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id),
    store_customer_id INTEGER REFERENCES store_customers(id),
    session_id      VARCHAR(100),
    
    event_type      VARCHAR(50) NOT NULL, -- page_view | product_view | add_to_cart | checkout_start | purchase
    event_data      JSONB DEFAULT '{}',
    
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    referrer        VARCHAR(500),
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_analytics_store ON store_analytics_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_analytics_type ON store_analytics_events(event_type, created_at DESC);

-- ============================================================================
-- 20. ADD FK for coupon_usage.order_id
-- ============================================================================
ALTER TABLE coupon_usage ADD CONSTRAINT fk_coupon_usage_order FOREIGN KEY (order_id) REFERENCES store_orders(id);

-- ============================================================================
-- 21. ADD FK for carts.coupon_id
-- ============================================================================
ALTER TABLE carts ADD CONSTRAINT fk_carts_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id);

-- ============================================================================
-- 22. STORE PERMISSIONS — Seed permissions for store management
-- ============================================================================
INSERT INTO permissions (permission_code, resource, action, description, module)
SELECT * FROM (VALUES
    ('store:view',              'store',           'view',     'View store settings',          'store'),
    ('store:manage',            'store',           'manage',   'Manage store settings',        'store'),
    ('store_products:view',     'store_products',  'view',     'View store products',          'store'),
    ('store_products:manage',   'store_products',  'manage',   'Manage store products',        'store'),
    ('store_orders:view',       'store_orders',    'view',     'View store orders',            'store'),
    ('store_orders:manage',     'store_orders',    'manage',   'Manage store orders',          'store'),
    ('store_customers:view',    'store_customers', 'view',     'View store customers',         'store'),
    ('store_customers:manage',  'store_customers', 'manage',   'Manage store customers',       'store'),
    ('store_coupons:view',      'store_coupons',   'view',     'View coupons',                 'store'),
    ('store_coupons:manage',    'store_coupons',   'manage',   'Manage coupons',               'store'),
    ('store_shipping:view',     'store_shipping',  'view',     'View shipping settings',       'store'),
    ('store_shipping:manage',   'store_shipping',  'manage',   'Manage shipping settings',     'store'),
    ('store_reviews:view',      'store_reviews',   'view',     'View product reviews',         'store'),
    ('store_reviews:manage',    'store_reviews',   'manage',   'Moderate reviews',             'store'),
    ('store_analytics:view',    'store_analytics', 'view',     'View store analytics',         'store')
) AS v(permission_code, resource, action, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permissions.permission_code = v.permission_code);

-- ============================================================================
-- 23. STORE NUMBER SEQUENCE — Auto-increment order numbers per store
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_sequences (
    id          SERIAL PRIMARY KEY,
    store_id    INTEGER NOT NULL REFERENCES stores(id),
    seq_type    VARCHAR(30) NOT NULL, -- 'order' | 'invoice'
    prefix      VARCHAR(20) DEFAULT 'ORD',
    next_value  INTEGER NOT NULL DEFAULT 1,
    
    CONSTRAINT uq_store_sequence UNIQUE (store_id, seq_type)
);
