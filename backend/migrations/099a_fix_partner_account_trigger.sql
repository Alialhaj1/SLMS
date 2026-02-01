-- =============================================
-- HOTFIX: create_partner_account trigger safety
--
-- Fixes a runtime error when the trigger is attached to both `customers`
-- and `vendors`. The old implementation referenced `NEW.receivable_account_id`
-- even on vendor inserts, which raises:
--   record "new" has no field "receivable_account_id"
--
-- This migration is intentionally named to run after 099_* and before 100_*.
-- =============================================

CREATE OR REPLACE FUNCTION create_partner_account()
RETURNS TRIGGER AS $$
DECLARE
    v_control_account_id INTEGER;
    v_account_code VARCHAR(20);
    v_account_type_id INTEGER;
BEGIN
    -- Customers: create sub-account under AR control account
    IF TG_TABLE_NAME = 'customers' THEN
        IF NEW.receivable_account_id IS NULL THEN
            SELECT account_id INTO v_control_account_id
            FROM default_accounts
            WHERE company_id = NEW.company_id AND account_key = 'AR_TRADE';

            IF v_control_account_id IS NOT NULL THEN
                v_account_code := '1201-' || NEW.code;
                SELECT account_type_id INTO v_account_type_id FROM accounts WHERE id = v_control_account_id;

                INSERT INTO accounts (
                    company_id, parent_id, code, name, name_ar,
                    account_type_id, level, is_control_account, control_type, created_by
                )
                VALUES (
                    NEW.company_id, v_control_account_id, v_account_code, NEW.name, NEW.name_ar,
                    v_account_type_id, 5, false, null, NEW.created_by
                )
                ON CONFLICT (company_id, code) DO NOTHING
                RETURNING id INTO NEW.receivable_account_id;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    -- Vendors: create sub-account under AP control account
    IF TG_TABLE_NAME = 'vendors' THEN
        IF NEW.payable_account_id IS NULL THEN
            SELECT account_id INTO v_control_account_id
            FROM default_accounts
            WHERE company_id = NEW.company_id AND account_key = 'AP_TRADE';

            IF v_control_account_id IS NOT NULL THEN
                v_account_code := '2101-' || NEW.code;
                SELECT account_type_id INTO v_account_type_id FROM accounts WHERE id = v_control_account_id;

                INSERT INTO accounts (
                    company_id, parent_id, code, name, name_ar,
                    account_type_id, level, is_control_account, control_type, created_by
                )
                VALUES (
                    NEW.company_id, v_control_account_id, v_account_code, NEW.name, NEW.name_ar,
                    v_account_type_id, 5, false, null, NEW.created_by
                )
                ON CONFLICT (company_id, code) DO NOTHING
                RETURNING id INTO NEW.payable_account_id;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
