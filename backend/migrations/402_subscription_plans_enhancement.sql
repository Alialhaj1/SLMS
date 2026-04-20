-- ============================================================
-- Migration 402: Subscription Plans Enhancement
-- ============================================================
-- Adapts the existing subscription_plans table (which uses
-- plan_code / plan_name columns) to add multi-tenancy fields:
--   - max_branches, max_storage_mb, max_api_calls_per_day
--   - name_ar, description_ar, is_default, trial_days, expires_at
--   - price_monthly, price_yearly
-- Seeds four plan tiers: free, basic, professional, enterprise
-- ============================================================

DO $$ BEGIN RAISE NOTICE '=== Migration 402: Subscription Plans Enhancement ==='; END $$;

-- ────────────────────────────────────────────
-- 1. Add missing columns to existing subscription_plans table
--    (existing columns: id, plan_name, plan_code, description, price,
--     currency, billing_cycle, max_users, max_companies, max_shipments,
--     features, is_active, is_popular, sort_order, created_at, updated_at, deleted_at)
-- ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'name_ar') THEN
    ALTER TABLE subscription_plans ADD COLUMN name_ar VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'description_ar') THEN
    ALTER TABLE subscription_plans ADD COLUMN description_ar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'max_branches') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_branches INTEGER DEFAULT 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'max_storage_mb') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_storage_mb INTEGER DEFAULT 1024;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'max_api_calls_per_day') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_api_calls_per_day INTEGER DEFAULT 10000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_monthly') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_monthly DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_yearly') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_yearly DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'is_default') THEN
    ALTER TABLE subscription_plans ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'trial_days') THEN
    ALTER TABLE subscription_plans ADD COLUMN trial_days INTEGER DEFAULT 14;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'expires_at') THEN
    ALTER TABLE subscription_plans ADD COLUMN expires_at TIMESTAMP;
  END IF;
END $$;

-- ────────────────────────────────────────────
-- 2. Seed default subscription plans
--    Uses plan_code (the actual column name in the existing table)
-- ────────────────────────────────────────────
INSERT INTO subscription_plans (plan_code, plan_name, name_ar, max_users, max_companies, max_branches, max_storage_mb, max_api_calls_per_day, price_monthly, price_yearly, features, is_active, is_default, sort_order, trial_days)
VALUES
  ('free', 'Free Trial', 'تجربة مجانية', 3, 1, 1, 512, 1000, 0, 0,
   '{"custom_reports": false, "ai_features": false, "api_access": false, "multi_currency": false, "advanced_accounting": false, "procurement": false, "sales": false, "inventory": true, "shipments": true}'::JSONB,
   true, false, 1, 14),

  ('basic', 'Basic', 'أساسي', 10, 1, 3, 2048, 5000, 199, 1990,
   '{"custom_reports": false, "ai_features": false, "api_access": true, "multi_currency": false, "advanced_accounting": true, "procurement": true, "sales": true, "inventory": true, "shipments": true}'::JSONB,
   true, true, 2, 0),

  ('professional', 'Professional', 'احترافي', 50, 5, 20, 10240, 50000, 499, 4990,
   '{"custom_reports": true, "ai_features": false, "api_access": true, "multi_currency": true, "advanced_accounting": true, "procurement": true, "sales": true, "inventory": true, "shipments": true, "customs": true, "multi_branch": true}'::JSONB,
   true, false, 3, 0),

  ('enterprise', 'Enterprise', 'مؤسسي', 999, 999, 999, 102400, 999999, 999, 9990,
   '{"custom_reports": true, "ai_features": true, "api_access": true, "multi_currency": true, "advanced_accounting": true, "procurement": true, "sales": true, "inventory": true, "shipments": true, "customs": true, "multi_branch": true, "consolidation": true, "data_governance": true, "sla_monitoring": true}'::JSONB,
   true, false, 4, 0)
ON CONFLICT (plan_code) DO UPDATE SET
  max_users = EXCLUDED.max_users,
  max_companies = EXCLUDED.max_companies,
  max_branches = EXCLUDED.max_branches,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_api_calls_per_day = EXCLUDED.max_api_calls_per_day,
  features = EXCLUDED.features,
  updated_at = CURRENT_TIMESTAMP;

-- ────────────────────────────────────────────
-- 3. Ensure tenants table links to subscription_plans
-- ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'subscription_plan_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN subscription_plan_id INTEGER REFERENCES subscription_plans(id);
  END IF;
END $$;

-- Assign default plan to tenants without one
UPDATE tenants
SET subscription_plan_id = (SELECT id FROM subscription_plans WHERE is_default = true LIMIT 1)
WHERE subscription_plan_id IS NULL
  AND EXISTS (SELECT 1 FROM subscription_plans WHERE is_default = true);

-- ────────────────────────────────────────────
-- 4. Add subscription tracking fields to tenants
-- ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_started_at') THEN
    ALTER TABLE tenants ADD COLUMN subscription_started_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_expires_at') THEN
    ALTER TABLE tenants ADD COLUMN subscription_expires_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'billing_email') THEN
    ALTER TABLE tenants ADD COLUMN billing_email VARCHAR(255);
  END IF;
END $$;

-- ────────────────────────────────────────────
-- 5. Create subscription history table
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_history (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  plan_id INTEGER REFERENCES subscription_plans(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'expired'
  previous_plan_id INTEGER REFERENCES subscription_plans(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'SAR',
  notes TEXT,
  performed_by INTEGER, -- platform admin who made the change
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_tenant ON subscription_history(tenant_id);

DO $$ BEGIN RAISE NOTICE '=== Migration 402 Complete ==='; END $$;
